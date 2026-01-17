import { FastifyInstance } from "fastify";
import OpenAI from "openai";
import { tools } from "../../shared/tools";
import { toolHandlers } from "./toolHandlers";
import { instructionsTemplate } from "./instructions";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

interface SessionState {
  messages: ChatCompletionMessageParam[];
  lastUpdated: number;
}

async function loadRestaurant(app: FastifyInstance) {
  // todo findUnique(where:{id:…})
  const restaurant = await app.prisma.restaurant.findFirst();
  if (!restaurant) throw new Error("No restaurant found in database");
  return { id: restaurant.id, name: restaurant.name };
}

/**
 * Downloads audio from Twilio's MediaUrl with Basic Auth
 */
async function downloadTwilioAudio(mediaUrl: string): Promise<Buffer> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set");
  }

  const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  // Twilio media URLs require authentication and may redirect
  const response = await fetch(mediaUrl, {
    headers: {
      Authorization: authHeader,
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function whatsappService(app: FastifyInstance) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const sessions = new Map<string, SessionState>();

  // Clear old sessions every 15mins
  setInterval(() => {
    const now = Date.now();
    for (const [phone, session] of sessions) {
      if (now - session.lastUpdated > 15 * 60 * 1000) {
        sessions.delete(phone);
      }
    }
  }, 60_000);

  const MAX_RETRIES = 2;

  async function handleMessage(phone: string, text: string): Promise<string> {
    const session =
      sessions.get(phone) ?? { messages: [], lastUpdated: Date.now() };
    session.lastUpdated = Date.now();
    session.messages.push({ role: "user", content: text });

    const restaurant = await loadRestaurant(app);

    // Retry logic for LLM calls
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        app.log.info(`🔄 Retrying LLM call (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
      }

      const result = await processWithLLM(phone, session, restaurant);
      
      if (result && result.trim() !== "") {
        return result;
      }

      app.log.warn(`⚠️ LLM returned empty response on attempt ${attempt + 1}`);
    }

    // All retries exhausted, return fallback
    app.log.error(`❌ LLM failed to return response after ${MAX_RETRIES + 1} attempts`);
    return "I'm sorry, I couldn't process your request. How can I help you today?";
  }

  async function processWithLLM(
    phone: string,
    session: SessionState,
    restaurant: { id: string; name: string }
  ): Promise<string> {
    let finalText = "";
    let running = true;

    // memory
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: instructionsTemplate({ restaurant, phone }) },
      ...session.messages,
    ];

    while (running) {
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools,
      });

      const choice = response.choices[0];
      const msg = choice.message;

      if (choice.finish_reason !== "tool_calls" || !msg.tool_calls) {
        finalText = msg.content ?? "";
        if (finalText) {
          messages.push({ role: "assistant", content: finalText });
          session.messages.push({ role: "assistant", content: finalText });
        }
        running = false;
        break;
      }

      messages.push(msg);
      session.messages.push(msg);

      for (const call of msg.tool_calls) {
        if (call.type !== "function") continue;

        const fn = call.function.name;
        const rawArgs = call.function.arguments ?? "{}";
        app.log.info(`🧰 Running tool: ${fn} with ${rawArgs}`);

        const args = JSON.parse(rawArgs);
        const handler = toolHandlers(app)[fn as keyof ReturnType<typeof toolHandlers>];
        if (!handler) {
          app.log.warn(`❌ Unknown tool: ${fn}`);
          continue;
        }

        let result: unknown;
        try {
          result = await handler(args);
        } catch (err: any) {
          app.log.error({ err }, `Tool execution failed: ${fn}`);
          result = { error: err.message ?? "Tool execution failed" };
        }

        const toolMessage = {
          role: "tool" as const,
          tool_call_id: call.id,
          content: JSON.stringify(result),
        };
        messages.push(toolMessage);
        session.messages.push(toolMessage);
      }
    }

    session.lastUpdated = Date.now();
    sessions.set(phone, session);

    return finalText;
  }

  /**
   * Handle voice messages by transcribing them with OpenAI Whisper
   * and then processing as a regular text message
   */
  async function handleVoiceMessage(phone: string, mediaUrl: string): Promise<string> {
    app.log.info(`🎤 Downloading voice message from ${mediaUrl}`);

    // Download the audio file from Twilio
    const audioBuffer = await downloadTwilioAudio(mediaUrl);
    app.log.info(`📥 Downloaded ${audioBuffer.length} bytes of audio`);

    // Create a File object for OpenAI Whisper API
    // Twilio WhatsApp voice messages are typically in OGG format
    // Convert Buffer to Uint8Array for File constructor compatibility
    const uint8Array = new Uint8Array(audioBuffer);
    const audioFile = new File([uint8Array], "voice_message.ogg", {
      type: "audio/ogg",
    });

    // Transcribe using OpenAI Whisper (force English)
    app.log.info(`🗣️ Transcribing voice message...`);
    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
    });

    const transcribedText = transcription.text;
    app.log.info(`📝 Transcribed: "${transcribedText}"`);

    if (!transcribedText || transcribedText.trim() === "") {
      return "I couldn't understand your voice message. Could you please try again or send a text message?";
    }

    // Process the transcribed text as a regular message
    return handleMessage(phone, transcribedText);
  }

  return { handleMessage, handleVoiceMessage };
}
