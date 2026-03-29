/**
 * Client-side noise cancellation + echo suppression for WebRTC voice streams.
 *
 * Mimics Teams/Meet approach:
 * 1. Browser-level AEC, noise suppression, and auto gain control.
 * 2. Web Audio API noise gate to cut ambient noise below threshold.
 * 3. Reference-based echo suppression: monitors the AI speaker output in real-time
 *    and aggressively gates the mic when speaker audio is detected — no event latency.
 *    Barge-in still works if the user speaks significantly louder than the echo.
 */

const NOISE_GATE_THRESHOLD = -50; // dB — ambient noise cutoff
const ECHO_GATE_THRESHOLD = -20;  // dB — during speaker output, mic must exceed this to pass (barge-in)
const SPEAKER_ACTIVE_THRESHOLD = -55; // dB — reference level that indicates speaker is playing
const SMOOTHING = 0.8;

export interface AudioStats {
  micDb: number;
  speakerDb: number;
  speakerActive: boolean;
  gateOpen: boolean;
  activeThreshold: number; // which threshold is currently in use
}

interface NoiseCancelledStream {
  /** The processed MediaStream to send over WebRTC */
  stream: MediaStream;
  /** Pass the AI's audio output stream as echo reference — call once when pc.ontrack fires */
  setReference: (remoteStream: MediaStream) => void;
  /** Subscribe to real-time audio stats for UI indicators */
  onStats: (cb: (stats: AudioStats) => void) => void;
  /** Release all audio resources */
  cleanup: () => void;
}

export async function getNoiseCancelledStream(): Promise<NoiseCancelledStream> {
  const raw = await navigator.mediaDevices.getUserMedia({
    audio: {
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true,
    },
  });

  const ctx = new AudioContext();

  // --- Mic chain ---
  const micSource = ctx.createMediaStreamSource(raw);
  const micAnalyser = ctx.createAnalyser();
  micAnalyser.fftSize = 2048;
  micAnalyser.smoothingTimeConstant = SMOOTHING;
  const gate = ctx.createGain();
  gate.gain.value = 1;

  micSource.connect(micAnalyser);
  micAnalyser.connect(gate);

  const dest = ctx.createMediaStreamDestination();
  gate.connect(dest);

  // --- Reference (speaker) chain — set up later via setReference() ---
  let refAnalyser: AnalyserNode | null = null;
  let refSource: MediaStreamAudioSourceNode | null = null;
  const refDataArray = new Float32Array(2048) as Float32Array<ArrayBuffer>;

  function setReference(remoteStream: MediaStream) {
    if (refAnalyser) return; // already set

    refSource = ctx.createMediaStreamSource(remoteStream);
    refAnalyser = ctx.createAnalyser();
    refAnalyser.fftSize = 2048;
    refAnalyser.smoothingTimeConstant = SMOOTHING;
    refSource.connect(refAnalyser);
    // Don't connect to destination — we don't want to re-play it, just analyse it
  }

  // --- Stats callback ---
  let statsCallback: ((stats: AudioStats) => void) | null = null;
  function onStats(cb: (stats: AudioStats) => void) {
    statsCallback = cb;
  }

  // --- Noise gate + echo suppression loop ---
  const micDataArray = new Float32Array(2048) as Float32Array<ArrayBuffer>;
  let rafId: number;

  function measureDb(analyser: AnalyserNode, buffer: Float32Array<ArrayBuffer>): number {
    analyser.getFloatTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);
    return 20 * Math.log10(Math.max(rms, 1e-10));
  }

  let frameCount = 0;

  function tick() {
    const micDb = measureDb(micAnalyser, micDataArray);

    // Check if speaker is currently playing audio
    let speakerActive = false;
    let speakerDb = -100;
    if (refAnalyser) {
      speakerDb = measureDb(refAnalyser, refDataArray);
      speakerActive = speakerDb > SPEAKER_ACTIVE_THRESHOLD;
    }

    let target: number;
    const activeThreshold = speakerActive ? ECHO_GATE_THRESHOLD : NOISE_GATE_THRESHOLD;
    if (speakerActive) {
      // Speaker is playing → only let through loud speech (barge-in)
      target = micDb > ECHO_GATE_THRESHOLD ? 1 : 0;
    } else {
      // Speaker silent → normal noise gate
      target = micDb > NOISE_GATE_THRESHOLD ? 1 : 0;
    }

    gate.gain.setTargetAtTime(target, ctx.currentTime, 0.008);

    // Report stats every ~4 frames (~66ms) to avoid overwhelming React
    frameCount++;
    if (statsCallback && frameCount % 4 === 0) {
      statsCallback({
        micDb: Math.round(micDb),
        speakerDb: Math.round(speakerDb),
        speakerActive,
        gateOpen: target === 1,
        activeThreshold,
      });
    }

    rafId = requestAnimationFrame(tick);
  }

  tick();

  const cleanup = () => {
    cancelAnimationFrame(rafId);
    raw.getTracks().forEach((t) => t.stop());
    micSource.disconnect();
    micAnalyser.disconnect();
    gate.disconnect();
    refSource?.disconnect();
    refAnalyser?.disconnect();
    ctx.close();
  };

  return { stream: dest.stream, setReference, onStats, cleanup };
}
