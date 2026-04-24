import { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { tools } from "../../shared/tools";
import { toolHandlers, getFollowUpInstruction } from "../../shared/toolHandlers";
import { TwilioStreamEvent } from "./voice.types";
import {
  searchAvailableNumbers,
  purchaseNumber,
  releaseNumber,
  AvailableNumber,
} from "../../shared/twilioClient";

const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview";

/**
 * Build the system prompt for the voice assistant.
 * Mirrors the frontend realtime.ts instructions with restaurant context.
 */
function buildInstructions(params: {
  restaurantName: string;
  restaurantId: string;
  callerPhone: string;
  acceptingOrders: boolean;
  isBusy: boolean;
  busyExtraMinutes: number;
}): string {
  const { restaurantName, restaurantId, callerPhone, acceptingOrders, isBusy, busyExtraMinutes } = params;

  return `
You are the polite phone ordering assistant for **${restaurantName}**, located in the United Kingdom.
You know the restaurants id: ${restaurantId}.
YOU MUST ALWAYS SPEAK IN ENGLISH.
Customer phone number is: ${callerPhone}.
DO NOT SPEAK LANGUAGES OTHER THAN ENGLISH UNDER ANY CIRCUMSTANCES. JUST SPEAK IN ENGLISH EVEN IF USER ASKS IN ANOTHER LANGUAGE. If the user speaks in another language, respond politely in English: "I'm sorry, I can only assist you in English.".

### ORDER AVAILABILITY (HIGHEST PRIORITY)
${!acceptingOrders ? `🚫 The restaurant is currently NOT ACCEPTING ORDERS.
This overrides ALL other instructions below. Do NOT take any orders, do NOT show menus for ordering purposes.
When the customer calls, immediately say:
"Thank you for calling ${restaurantName}. Unfortunately, we are not taking orders at the moment. Please try again later. Have a lovely day!"
Then end the conversation. You may still check order status if asked, but do NOT create any new orders under any circumstances.` : "The restaurant is accepting orders normally."}

---

### ROLE
Act like a friendly waiter taking telephone orders.
Always be respectful, warm, and efficient.
You represent only **${restaurantName}**.

---

### CONTEXT & FUNCTION USE
You know basic restaurant info, but start with no menus or foods.
Fetch data only when needed:
- If the customer asks what's available → call **\`get_menus\`**.
- When they choose a menu → call **\`get_foods\`**.
- When they choose a food → call **\`get_food_options\`**.
- When order details are complete → call **\`create_order\`**.
- For delivery tracking → call **\`get_order_status\`**.

Acknowledge new information naturally and remember it for the call.

---

### ORDERING FLOW
1. Greet customer
   "Thank you for calling **${restaurantName}**. How can I help you today?"

2. **Get customer name**
   "And your full name please?"

3. **Offer menus or respond to interest**
   - If asked what's served, fetch menus with \`get_menus\`.
   - List menu names and invite a choice.

4. **Handle food selection**
   - After fetching foods, mention names and prices.
   - When the customer chooses, fetch options with \`get_food_options\`.
   - Discuss required options, quantity, and confirm the item.
   - Repeat if adding more items.

5. **Confirm order summary**
   - Summarize all selected items, quantities, options, and estimated total.
   - Ask: "Let me confirm your order: [items]. Is that correct?"
   - Wait for the customer to confirm before proceeding.

6. **MANDATORY: One-time add-on prompt** *(YOU MUST ASK THIS — DO NOT SKIP)*
   - ⚠️ THIS STEP IS REQUIRED. After the customer confirms their order summary, you MUST ask:
     "Would you like to add anything else — perhaps a drink or a side?"
   - You MUST NOT skip this step. You MUST NOT go to step 7 without asking this first.
   - If they say **no** → move directly to step 7. Do NOT ask again.
   - If they say **yes** → go back to step 3 to browse menus/foods/options for additional items.
     After add-on items are selected, confirm the FULL updated order summary (original + add-ons).
     Do NOT offer another add-on prompt. Proceed to step 7.
   - Ask add-ons exactly ONCE. Never be pushy. Accept "no" immediately.

7. **Collect delivery address**
   Get house number, street, city, and postcode, then confirm aloud.

8. **Allergen check & create the order**
   - If the customer has an existing allergen profile with allergens,
     call \`check_food_allergens\` with ALL foodIds being ordered and the customer's phone.
   - If warnings are returned, inform the customer and wait for confirmation.
   - Call \`create_order\` with confirmed name, phone, address, and the complete items list.
   - After success, confirm naturally:
     "Your order has been placed. Delivery in about 30 minutes."

---

### ADD-ON RULES (CRITICAL)
- You MUST offer add-ons exactly ONCE per order, at step 6. NEVER skip this step.
- The flow is ALWAYS: confirm summary (step 5) → ask add-on (step 6) → collect address (step 7).
- Never suggest or upsell extras during menu browsing or food selection (steps 3–4).
- If the customer declines, move on immediately. Do not insist or suggest specific items.
- If the customer adds items, confirm the full updated order and proceed. No second add-on prompt.

---

### ORDER STATUS MODE
YOU CAN CHECK ORDER STATUS WITH EITHER PHONE OR NAME ANYTIME.
IF YOU KNOW EITHER OF THOSE JUST CHECK WITHOUT ASKING.
If the customer asks to track an order immediately try with their phone number even if you don't know their name, if you don't succeed ask for their name too.:
1. Call \`get_order_status\`.
2. Respond with current status or say it's not found.
3. End politely: "Thank you for calling ${restaurantName}. Have a lovely day!"

---

### BUSY MODE
${isBusy ? `⚠️ The restaurant is currently BUSY. Estimated delivery times are increased by ${busyExtraMinutes} minutes.
Before placing any order, inform the customer:
"We're currently experiencing high demand. Estimated delivery time will be around [normal ETA + ${busyExtraMinutes}] minutes. Would you like to proceed?"
Only create the order after the customer confirms.` : "The restaurant is not busy. No extra delivery time warning needed."}

---

### ALLERGEN FLOW
After a successful order:
- Call **get_allergen_profile({ phone: "${callerPhone}" })** to check if allergenAsked is true.
- If allergenAsked is false, ask: "Do you have any food allergies or dietary preferences we should know about? For example gluten, nuts, milk, eggs, vegan, or halal."
- Save their response using **set_allergen_profile**. If they say "none", save with empty arrays.

Before placing any order (if customer has allergen profile):
- Call **check_food_allergens** with the foodIds about to be ordered and the customer's phone.
- If warnings are returned, tell the customer: "Just to let you know, [food] contains [allergen] which is in your allergen profile. Would you still like to proceed?"
- Only call create_order after they confirm.

---

### BEHAVIOUR & MEMORY
- Fetch only when necessary.
- Use real IDs returned from previous responses.
- Remember known data until the call ends.
- Confirm corrections aloud.

---

### STYLE
Keep tone friendly, concise, and natural.
Use short confirmations ("Perfect", "Great choice").
Never mention technology or APIs.
Refrain from unnecessary repetitions.
Do not repeat order details multiple times unless asked.
Your only goal is to take accurate, polite phone orders for **${restaurantName}**.
`;
}

/**
 * Convert tools from ChatCompletion format to OpenAI Realtime format.
 * Realtime API expects { type, name, description, parameters } at the top level,
 * while ChatCompletion tools wrap them in { type: "function", function: { ... } }.
 */
function toRealtimeTools(chatTools: typeof tools) {
  return chatTools.map((t) => {
    if ("function" in t) {
      return {
        type: "function",
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      };
    }
    return t;
  });
}

// ── μ-law ↔ PCM16 conversion ──────────────────────────────────────────

const MULAW_DECODE_TABLE = new Int16Array(256);
(function buildMulawTable() {
  for (let i = 0; i < 256; i++) {
    let mu = ~i & 0xff;
    const sign = mu & 0x80 ? -1 : 1;
    mu &= 0x7f;
    const exponent = (mu >> 4) & 0x07;
    const mantissa = mu & 0x0f;
    let sample = ((mantissa << 1) + 33) << (exponent + 2);
    sample -= 0x84;
    MULAW_DECODE_TABLE[i] = sign * sample;
  }
})();

/**
 * Decode μ-law 8kHz audio to PCM16 24kHz (3x upsample via linear interpolation).
 * Returns base64-encoded PCM16 audio for OpenAI Realtime API.
 */
function mulawToPcm16Base64(mulawBase64: string): string {
  const mulawBuf = Buffer.from(mulawBase64, "base64");
  const samples8k = new Int16Array(mulawBuf.length);
  for (let i = 0; i < mulawBuf.length; i++) {
    samples8k[i] = MULAW_DECODE_TABLE[mulawBuf[i]];
  }

  // Upsample 8kHz → 24kHz (3x)
  const outLen = samples8k.length * 3;
  const samples24k = new Int16Array(outLen);
  for (let i = 0; i < samples8k.length - 1; i++) {
    const s0 = samples8k[i];
    const s1 = samples8k[i + 1];
    const base = i * 3;
    samples24k[base] = s0;
    samples24k[base + 1] = Math.round(s0 + (s1 - s0) / 3) as number;
    samples24k[base + 2] = Math.round(s0 + (2 * (s1 - s0)) / 3) as number;
  }
  // Last sample
  const last = samples8k.length - 1;
  samples24k[last * 3] = samples8k[last];
  samples24k[last * 3 + 1] = samples8k[last];
  samples24k[last * 3 + 2] = samples8k[last];

  return Buffer.from(samples24k.buffer).toString("base64");
}

const MULAW_ENCODE_TABLE = new Uint8Array(65536);
(function buildMulawEncodeTable() {
  const BIAS = 0x84;
  const CLIP = 32635;
  for (let i = 0; i < 65536; i++) {
    let sample = (i < 32768 ? i : i - 65536) as number;
    const sign = sample < 0 ? 0x80 : 0;
    if (sample < 0) sample = -sample;
    if (sample > CLIP) sample = CLIP;
    sample += BIAS;
    let exponent = 7;
    const expMask = 0x4000;
    for (; exponent > 0; exponent--) {
      if (sample & (expMask >> (7 - exponent))) break;
    }
    const mantissa = (sample >> (exponent + 3)) & 0x0f;
    const muByte = ~(sign | (exponent << 4) | mantissa) & 0xff;
    MULAW_ENCODE_TABLE[i] = muByte;
  }
})();

/**
 * Encode PCM16 24kHz audio to μ-law 8kHz (3x downsample, pick every 3rd sample).
 * Returns base64-encoded μ-law audio for Twilio media stream.
 */
function pcm16ToMulawBase64(pcm16Base64: string): string {
  const pcmBuf = Buffer.from(pcm16Base64, "base64");
  const samples24k = new Int16Array(pcmBuf.buffer, pcmBuf.byteOffset, pcmBuf.byteLength / 2);

  // Downsample 24kHz → 8kHz (pick every 3rd)
  const outLen = Math.floor(samples24k.length / 3);
  const mulawBuf = Buffer.alloc(outLen);
  for (let i = 0; i < outLen; i++) {
    const sample = samples24k[i * 3];
    mulawBuf[i] = MULAW_ENCODE_TABLE[sample & 0xffff];
  }
  return mulawBuf.toString("base64");
}

// ── Main WebSocket handler ─────────────────────────────────────────────

export class AlreadyProvisionedError extends Error {
  constructor(message = "Restaurant already has a provisioned phone number") {
    super(message);
    this.name = "AlreadyProvisionedError";
  }
}

export function voiceService(app: FastifyInstance) {
  const handlers = toolHandlers(app);

  async function searchNumbers(country: string, areaCode?: number): Promise<AvailableNumber[]> {
    return searchAvailableNumbers(country, areaCode);
  }

  async function provisionForRestaurant(restaurantId: string, phoneNumber: string) {
    const existing = await app.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, twilioPhoneSid: true, voicePhone: true },
    });
    if (!existing) {
      throw new Error("Restaurant not found");
    }
    if (existing.twilioPhoneSid || existing.voicePhone) {
      throw new AlreadyProvisionedError();
    }

    const publicUrl = process.env.PUBLIC_WEBHOOK_URL;
    if (!publicUrl) {
      throw new Error("PUBLIC_WEBHOOK_URL is not configured");
    }
    const voiceUrl = `${publicUrl.replace(/\/$/, "")}/voice/incoming`;
    const statusUrl = `${publicUrl.replace(/\/$/, "")}/voice/status`;
    const addressSid = process.env.TWILIO_ADDRESS_SID;
    const bundleSid = process.env.TWILIO_BUNDLE_SID;

    const purchased = await purchaseNumber(phoneNumber, voiceUrl, statusUrl, addressSid, bundleSid);
    app.log.info(`📞 Purchased Twilio number ${purchased.phoneNumber} (${purchased.sid}) for restaurant ${restaurantId}`);

    try {
      const updated = await app.prisma.restaurant.update({
        where: { id: restaurantId },
        data: {
          voicePhone: purchased.phoneNumber,
          twilioPhoneSid: purchased.sid,
        },
        select: { id: true, voicePhone: true, twilioPhoneSid: true },
      });
      return updated;
    } catch (err) {
      app.log.error(`❌ DB update failed after purchasing ${purchased.sid}; releasing number`);
      try {
        await releaseNumber(purchased.sid);
      } catch (releaseErr) {
        app.log.error(`❌ Failed to release orphaned Twilio number ${purchased.sid}: ${(releaseErr as Error).message}`);
      }
      throw err;
    }
  }

  async function releaseForRestaurantInternal(restaurantId: string): Promise<void> {
    const r = await app.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { twilioPhoneSid: true },
    });
    if (!r?.twilioPhoneSid) return;
    try {
      await releaseNumber(r.twilioPhoneSid);
      app.log.info(`🔓 Released Twilio number ${r.twilioPhoneSid} for restaurant ${restaurantId}`);
    } catch (err) {
      app.log.error(`❌ Failed to release Twilio number ${r.twilioPhoneSid}: ${(err as Error).message}`);
    }
  }

  function handleMediaStream(twilioWs: WebSocket) {
    let openaiWs: WebSocket | null = null;
    let streamSid: string | null = null;

    // Pending function call accumulation
    const pendingArgs: Record<string, string> = {};
    const pendingCalls: Record<string, string> = {};

    twilioWs.on("message", async (data: WebSocket.Data) => {
      let event: TwilioStreamEvent;
      try {
        event = JSON.parse(data.toString());
      } catch {
        return;
      }

      if (event.event === "start") {
        const params = event.start.customParameters;
        streamSid = event.start.streamSid;

        app.log.info(`🎙️ Voice stream started: ${streamSid} for restaurant ${params.restaurantName}`);

        const acceptingOrders = params.acceptingOrders === "true";
        const isBusy = params.isBusy === "true";
        const busyExtraMinutes = parseInt(params.busyExtraMinutes) || 15;

        // Connect to OpenAI Realtime API
        openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "OpenAI-Beta": "realtime=v1",
          },
        });

        openaiWs.on("open", () => {
          app.log.info(`🤖 OpenAI Realtime connected for stream ${streamSid}`);

          // Configure session
          const sessionUpdate = {
            type: "session.update",
            session: {
              instructions: buildInstructions({
                restaurantName: params.restaurantName,
                restaurantId: params.restaurantId,
                callerPhone: params.callerPhone,
                acceptingOrders,
                isBusy,
                busyExtraMinutes,
              }),
              tools: toRealtimeTools(tools),
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              modalities: ["audio", "text"],
              voice: "coral",
              turn_detection: { type: "server_vad", threshold: 0.5 },
            },
          };
          openaiWs!.send(JSON.stringify(sessionUpdate));

          // Send initial greeting
          const greet = {
            type: "response.create",
            response: {
              instructions: !acceptingOrders
                ? `Inform the customer politely in English that ${params.restaurantName} is not taking orders right now. Say: "Thank you for calling ${params.restaurantName}. Unfortunately, we are not accepting orders at the moment. Please try again later. Have a lovely day!"`
                : `Greet the customer politely in English, mention the restaurant name **${params.restaurantName}**, and ask how you can help them today. For example: "Thank you for calling ${params.restaurantName}. How can I help you today?"`,
            },
          };
          openaiWs!.send(JSON.stringify(greet));
        });

        openaiWs.on("message", async (data: WebSocket.Data) => {
          let msg: { type: string; [key: string]: unknown };
          try {
            msg = JSON.parse(data.toString());
          } catch {
            return;
          }

          // Audio output from OpenAI → Twilio
          if (msg.type === "response.audio.delta" && msg.delta) {
            const mulawAudio = pcm16ToMulawBase64(msg.delta as string);
            if (twilioWs.readyState === WebSocket.OPEN && streamSid) {
              twilioWs.send(
                JSON.stringify({
                  event: "media",
                  streamSid,
                  media: { payload: mulawAudio },
                })
              );
            }
          }

          // Function call started
          if (msg.type === "response.output_item.added") {
            const item = msg.item as { type: string; call_id?: string; name?: string };
            if (item.type === "function_call" && item.call_id) {
              pendingCalls[item.call_id] = item.name || "";
              pendingArgs[item.call_id] = "";
            }
          }

          // Function call arguments streaming
          if (msg.type === "response.function_call_arguments.delta") {
            const callId = msg.call_id as string;
            if (callId) {
              pendingArgs[callId] = (pendingArgs[callId] || "") + (msg.delta as string);
            }
          }

          // Function call complete — execute it
          if (msg.type === "response.function_call_arguments.done") {
            const callId = msg.call_id as string;
            const fnName = pendingCalls[callId];
            if (!fnName || !openaiWs) return;

            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(pendingArgs[callId] || "{}");
            } catch (e) {
              app.log.error(`❌ Failed to parse tool args for ${fnName}: ${e}`);
            }

            app.log.info(`🧰 Voice tool call: ${fnName} with ${JSON.stringify(args)}`);

            let result: unknown;
            try {
              const handler = handlers[fnName as keyof typeof handlers];
              if (handler) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                result = await (handler as (args: any) => Promise<unknown>)(args);
              } else {
                result = { error: `Unknown tool: ${fnName}` };
              }
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : "Tool execution failed";
              app.log.error(`❌ Voice tool failed: ${fnName} - ${message}`);
              result = { error: message };
            }

            // Send result back to OpenAI
            openaiWs.send(
              JSON.stringify({
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: callId,
                  output: JSON.stringify(result ?? {}),
                },
              })
            );

            // Trigger follow-up response
            openaiWs.send(
              JSON.stringify({
                type: "response.create",
                response: {
                  instructions: getFollowUpInstruction(fnName),
                },
              })
            );

            delete pendingArgs[callId];
            delete pendingCalls[callId];
          }
        });

        openaiWs.on("error", (err) => {
          app.log.error(`❌ OpenAI WS error: ${err.message}`);
        });

        openaiWs.on("close", () => {
          app.log.info(`🔌 OpenAI Realtime disconnected for stream ${streamSid}`);
        });
      }

      // Audio from Twilio → OpenAI
      if (event.event === "media" && openaiWs?.readyState === WebSocket.OPEN) {
        const pcm16Audio = mulawToPcm16Base64(event.media.payload);
        openaiWs.send(
          JSON.stringify({
            type: "input_audio_buffer.append",
            audio: pcm16Audio,
          })
        );
      }

      // Call ended
      if (event.event === "stop") {
        app.log.info(`📞 Voice stream stopped: ${streamSid}`);
        if (openaiWs) {
          openaiWs.close();
          openaiWs = null;
        }
      }
    });

    twilioWs.on("close", () => {
      app.log.info(`📞 Twilio WS closed for stream ${streamSid}`);
      if (openaiWs) {
        openaiWs.close();
        openaiWs = null;
      }
    });

    twilioWs.on("error", (err) => {
      app.log.error(`❌ Twilio WS error: ${err.message}`);
    });
  }

  return { handleMediaStream, searchNumbers, provisionForRestaurant, releaseForRestaurantInternal };
}
