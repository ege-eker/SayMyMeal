import { FastifyInstance } from "fastify";
import OpenAI from "openai";
import { tools } from "../../shared/tools";
import { toolHandlers, getFollowUpInstruction } from "./toolHandlers";
import { instructionsTemplate } from "./instructions";
import { normalizePhone } from "../blacklist/blacklist.service";
import { resolveCaller, ResolvedCaller } from "../../shared/identityResolver";
import { MenuSnapshot } from "../../shared/menuSnapshot";
import { ValidatedCartItem } from "../../modules/order/order.types";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

interface SessionState {
  messages: ChatCompletionMessageParam[];
  lastUpdated: number;
  caller?: ResolvedCaller;
  cart: ValidatedCartItem[];
}

async function loadRestaurantById(app: FastifyInstance, restaurantId: string) {
  const restaurant = await app.prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      isBusy: true,
      busyExtraMinutes: true,
      acceptingOrders: true,
      menus: {
        select: {
          id: true,
          name: true,
          foods: {
            where: { isAvailable: true },
            select: { id: true, name: true, basePrice: true },
          },
        },
      },
    },
  });
  if (!restaurant) throw new Error(`Restaurant not found: ${restaurantId}`);
  return restaurant;
}

/**
 * Downloads audio from Twilio's MediaUrl with Basic Auth
 */
async function downloadTwilioAudio(mediaUrl: string): Promise<Buffer> {
  const accountSid = process.env.TWILIO_WA_ACCOUNT_SID;
  const authToken = process.env.TWILIO_WA_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("TWILIO_WA_ACCOUNT_SID and TWILIO_WA_AUTH_TOKEN must be set");
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

  function sessionKey(restaurantId: string, phone: string): string {
    return `${restaurantId}:${phone}`;
  }

  function clearSessions(restaurantId?: string) {
    if (restaurantId) {
      const prefix = `${restaurantId}:`;
      for (const key of sessions.keys()) {
        if (key.startsWith(prefix)) sessions.delete(key);
      }
      app.log.warn(`🧹 Cleared WhatsApp sessions for restaurant ${restaurantId}`);
    } else {
      sessions.clear();
      app.log.warn("🧹 Cleared all WhatsApp sessions");
    }
  }

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

  async function handleMessage(phone: string, text: string, restaurantId: string): Promise<string> {
    const restaurant = await loadRestaurantById(app, restaurantId);

    // Blacklist check — before any AI processing
    const blacklisted = await app.prisma.blacklist.findUnique({
      where: {
        phone_restaurantId: {
          phone: normalizePhone(phone),
          restaurantId: restaurant.id,
        },
      },
    });
    if (blacklisted) {
      await app.prisma.blacklist.update({
        where: { id: blacklisted.id },
        data: { attemptCount: { increment: 1 }, lastAttemptAt: new Date() },
      });
      return "I am sorry, I can't assist you right now.";
    }

    const key = sessionKey(restaurantId, phone);
    const session =
      sessions.get(key) ?? { messages: [], lastUpdated: Date.now(), cart: [] };
    session.lastUpdated = Date.now();

    if (!session.caller) {
      session.caller = await resolveCaller(app, normalizePhone(phone));
    }

    session.messages.push({ role: "user", content: text });

    // Retry logic for LLM calls
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        app.log.info(`🔄 Retrying LLM call (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
      }

      const result = await processWithLLM(key, session, restaurant, phone);
      
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
    sKey: string,
    session: SessionState,
    restaurant: { id: string; name: string; isBusy?: boolean; busyExtraMinutes?: number; acceptingOrders?: boolean; menus?: MenuSnapshot[] },
    phone: string
  ): Promise<string> {
    let finalText = "";
    let running = true;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: instructionsTemplate({ restaurant, phone, caller: session.caller }) },
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

      const pendingFollowUps: ChatCompletionMessageParam[] = [];

      for (const call of msg.tool_calls) {
        if (call.type !== "function") continue;

        const fn = call.function.name;
        const rawArgs = call.function.arguments ?? "{}";
        app.log.info(`🧰 Running tool: ${fn} with ${rawArgs}`);

        const args = JSON.parse(rawArgs);
        const handler = toolHandlers(app)[fn as keyof ReturnType<typeof toolHandlers>];
        if (!handler) {
          app.log.warn(`❌ Unknown tool: ${fn}`);
          // Push an error tool message so the tool_call_id is accounted for
          messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: `Unknown tool: ${fn}` }) });
          session.messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: `Unknown tool: ${fn}` }) });
          continue;
        }

        let result: unknown;
        try {
          if (fn === "confirm_item") {
            const itemResult = await handler(args) as Awaited<ReturnType<ReturnType<typeof toolHandlers>["confirm_item"]>>;
            session.cart.push(itemResult.confirmedItem);
            itemResult.cartSize = session.cart.length;
            result = itemResult;
          } else if (fn === "create_order") {
            if (session.cart.length === 0) {
              result = {
                error: "Cart is empty.",
                _instruction: "No items have been confirmed yet. Use confirm_item for each food item before calling create_order.",
              };
            } else {
              (args as any).items = session.cart;
              result = await handler(args);
              if (!(result as any)?.error) {
                session.cart = [];
              }
            }
          } else {
            result = await handler(args);
          }
        } catch (err: any) {
          app.log.error({ err }, `Tool execution failed: ${fn}`);
          let instruction: string;
          if (fn === "confirm_item" && (err.message as string)?.includes("Missing required selection")) {
            instruction =
              "The customer has not specified a choice for this required option group. " +
              "Ask the customer about this specific option naturally — show only that option group and its choices. " +
              "Do NOT guess, auto-select, or retry silently. Do NOT mention an error.";
          } else if (fn === "create_order" || fn === "confirm_item") {
            instruction =
              "Do NOT tell the customer about this error. The error message above contains the correct IDs. " +
              "Fix the invalid ID(s) using the values listed in the error, then immediately retry. " +
              "Handle this silently — the customer should not know a retry happened.";
          } else {
            instruction =
              "This tool call failed. Do NOT invent or guess any data. " +
              "Retry the tool call once. If it fails again, apologize and tell the customer there was a technical issue.";
          }
          result = {
            error: err.message ?? "Tool execution failed",
            _instruction: instruction,
          };
        }

        const toolMessage = {
          role: "tool" as const,
          tool_call_id: call.id,
          content: JSON.stringify(result),
        };
        messages.push(toolMessage);
        session.messages.push(toolMessage);

        // Collect follow-ups — pushed AFTER all tool responses to satisfy OpenAI ordering
        const followUp = getFollowUpInstruction(fn);
        if (followUp && !(result as any)?.error) {
          pendingFollowUps.push({ role: "system" as const, content: followUp });
        }
      }

      // Push follow-up system messages after ALL tool responses for this batch
      for (const guidance of pendingFollowUps) {
        messages.push(guidance);
        session.messages.push(guidance);
      }
    }

    session.lastUpdated = Date.now();
    sessions.set(sKey, session);

    return finalText;
  }

  /**
   * Handle voice messages by transcribing them with OpenAI Whisper
   * and then processing as a regular text message
   */
  async function handleVoiceMessage(phone: string, mediaUrl: string, restaurantId: string): Promise<string> {
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
    return handleMessage(phone, transcribedText, restaurantId);
  }

  return { handleMessage, handleVoiceMessage, clearSessions };
}
