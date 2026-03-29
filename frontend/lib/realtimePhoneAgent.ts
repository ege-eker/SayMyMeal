import { getNoiseCancelledStream, type AudioStats } from "./noiseCancellation";

let pc: RTCPeerConnection | null = null;
let dc: RTCDataChannel | null = null;
let cleanupNoise: (() => void) | null = null;
let phoneStatsSubscriber: ((cb: (stats: AudioStats) => void) => void) | null = null;

/** Subscribe to real-time audio stats during phone collection phase */
export function subscribePhoneAudioStats(cb: (stats: AudioStats) => void) {
  phoneStatsSubscriber?.(cb);
}

const phoneTools = [
  {
    type: "function",
    name: "handoff_to_restaurant_agent",
    description: "Collects the user's phone number and hands off immediately.",
    parameters: {
      type: "object",
      properties: {
        phone: { type: "string", description: "User's provided phone number (any format)." },
      },
      required: ["phone"],
    },
  },
];

export async function startPhoneCollector(onPhoneCollected: (phone: string) => Promise<void>) {
  if (pc) return;

  pc = new RTCPeerConnection();
  const { stream: mic, cleanup, setReference, onStats } = await getNoiseCancelledStream();
  cleanupNoise = cleanup;
  phoneStatsSubscriber = onStats;
  mic.getTracks().forEach((t) => pc!.addTrack(t, mic));

  const audioEl = document.createElement("audio");
  audioEl.autoplay = true;
  pc.ontrack = (e) => {
    // Feed the AI's audio output as echo reference
    setReference(e.streams[0]);
    audioEl.srcObject = e.streams[0];
  };

  dc = pc.createDataChannel("oai-events");
  const pendingArgs: Record<string, string> = {};
  const pendingCalls: Record<string, string> = {};

  dc.onmessage = async (event) => {
    const msg = JSON.parse(event.data);

    // collect function call args
    if (msg.type === "response.output_item.added" && msg.item.type === "function_call") {
      pendingCalls[msg.item.call_id!] = msg.item.name;
      pendingArgs[msg.item.call_id!] = "";
    }
    if (msg.type === "response.function_call_arguments.delta") {
      pendingArgs[msg.call_id] += msg.delta;
    }
    if (msg.type === "response.function_call_arguments.done") {
      const fnName = pendingCalls[msg.call_id];
      if (fnName === "handoff_to_restaurant_agent") {
        try {
          const { phone } = JSON.parse(pendingArgs[msg.call_id] || "{}");
          console.log("📞 Phone collected:", phone);
          stopPhoneCollector();
          await onPhoneCollected(phone);
        } catch (err) {
          console.error("❌ JSON parse failed:", err);
        }
      }
    }
  };

  // SDP
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  const resp = await fetch("https://api.openai.com/v1/realtime?model=gpt-realtime", {
    method: "POST",
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
      "Content-Type": "application/sdp",
      "OpenAI-Beta": "realtime=v1",
    },
  });
  const answer = { type: "answer", sdp: await resp.text() };
  await pc.setRemoteDescription(answer as RTCSessionDescriptionInit);

  dc.onopen = () => {
    console.log("🎧 Phone collection agent started");
    const setup = {
      type: "session.update",
      session: {
        instructions: `
You are a friendly phone-collection agent. DO NOT SPEAK LANGUAGES OTHER THAN ENGLISH UNDER ANY CIRCUMSTANCES.
Ask the user for their phone number.
Repeat the number back for confirmation.
IF THE USER SAYS NUMBER IS INCORRECT WIPE OUT YOUR MEMORY ABOUT THE NUMBER AND ASK AGAIN. THE NUMBER WILL NOT BE SAME AS BEFORE. DON'T ASSUME IT IS A CORRECTION OF THE SAME NUMBER.
As soon as the user CLEARLY confirms (for example, says "yes" or "correct"),
immediately call the function handoff_to_restaurant_agent with that phone number.
Do not wait for additional confirmation or steps.
DO NOT SPEAK LANGUAGES OTHER THAN ENGLISH UNDER ANY CIRCUMSTANCES. JUST SPEAK IN ENGLISH EVEN IF USER ASKS IN ANOTHER LANGUAGE. If the user speaks in another language, respond politely in English: "I'm sorry, I can only assist you in English. Could you please provide your phone number in English?".
DO NOT SPEAK ABOUT ANY OTHER TOPICS OTHER THAN THE PHONE NUMBER COLLECTION PROCESS. YOUR SOLE PURPOSE IS TO COLLECT THE USER'S PHONE NUMBER.
        `,
        tools: phoneTools,
        modalities: ["audio", "text"],
        voice: "marin",
        turn_detection: { type: "semantic_vad", eagerness: "medium", create_response: true },
      },
    };
    dc!.send(JSON.stringify(setup));

      const greet = {
    type: "response.create",
    response: {
      instructions: "Say your greeting and start by asking the caller for their phone number. DO NOT SPEAK LANGUAGES OTHER THAN ENGLISH UNDER ANY CIRCUMSTANCES. JUST SPEAK IN ENGLISH EVEN IF USER ASKS IN ANOTHER LANGUAGE.",
    },
  };
  dc!.send(JSON.stringify(greet));
  };
}

export function stopPhoneCollector() {
  if (cleanupNoise) {
    cleanupNoise();
    cleanupNoise = null;
  }
  if (dc) dc.close();
  if (pc) {
    pc.getSenders().forEach((s) => s.track?.stop());
    pc.close();
  }
  dc = null;
  pc = null;
  console.log("⏹ Phone collector stopped");
}
