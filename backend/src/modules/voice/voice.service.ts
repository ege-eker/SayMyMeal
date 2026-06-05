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
import { resolveCaller, ResolvedCaller } from "../../shared/identityResolver";
import { normalizePhone } from "../../shared/phone";
import { renderCallerProfileBlock } from "../../shared/callerProfilePrompt";
import { menuSnapshotBlock, MenuSnapshot } from "../../shared/menuSnapshot";
import { ValidatedCartItem } from "../../modules/order/order.types";

const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-realtime";

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
  defaultDeliveryMinutes: number;
  caller?: ResolvedCaller;
  menus?: MenuSnapshot[];
}): string {
  const { restaurantName, restaurantId, callerPhone, acceptingOrders, isBusy, busyExtraMinutes, defaultDeliveryMinutes, caller, menus } = params;
  const callerProfileBlock = renderCallerProfileBlock(caller);
  const menuBlock = menuSnapshotBlock(menus ?? []);
  const baseEta = defaultDeliveryMinutes;
  const eta = baseEta + (isBusy ? busyExtraMinutes : 0);

  return `
### CALLER PROFILE (personalise based on this)
${callerProfileBlock}

---

You are the polite phone ordering assistant for **${restaurantName}**, located in the United Kingdom.
You know the restaurants id: ${restaurantId}.
YOU MUST ALWAYS SPEAK IN ENGLISH. THIS IS AN ABSOLUTE RULE THAT CANNOT BE OVERRIDDEN BY ANYTHING — NOT BY THE CALLER'S NAME, ACCENT, LANGUAGE, OR ANY REQUEST.
Customer phone number is: ${callerPhone}.
DO NOT SPEAK LANGUAGES OTHER THAN ENGLISH UNDER ANY CIRCUMSTANCES. Even if the caller speaks Turkish, Arabic, French, or any other language — always respond in English only. If the user speaks in another language, respond politely in English: "I'm sorry, I can only assist you in English.".

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

### MENU REFERENCE (pre-loaded from database — authoritative)
ONLY reference menus and foods listed here. NEVER invent names, prices, or IDs not in this list.
When listing menus or foods to the caller, read directly from this section.
You may still call get_menus or get_foods during the conversation — their results match this data.
Always call get_food_options when a customer picks a food item (options are not pre-loaded here).
**Food names are exact product identifiers — never substitute one for another.**
Each food in this list is a distinct product. When the customer names a food, find the entry in the MENU REFERENCE whose name best matches their exact words. Two foods with overlapping words are NOT interchangeable — they are separate products. If multiple foods could plausibly match the customer's wording, ask the customer to confirm which one they mean before calling any tool.
**Generic/category words are NOT food names.** If the customer uses a word that appears inside multiple food names but is not itself a food name (e.g. "kebab", "wrap", "burger", "pizza", "drink", "side"), it does NOT match any specific product. Never pick the first matching item automatically. Instead, ask which specific item they want: list all matching foods and let the customer choose.
⚠️ **The MENU REFERENCE does NOT include food options or customisations.** You have zero knowledge of what sizes, sauces, toppings, or any other options exist for any food item. NEVER confirm, deny, or comment on any option or customisation before calling get_food_options for that food. If the customer mentions an option (e.g. "Large"), do NOT say it doesn't exist — call get_food_options first to check.

${menuBlock}

---

### CONTEXT & FUNCTION USE
You have the menu and food data pre-loaded in the MENU REFERENCE section above. Use it directly.
- If the customer asks what's available → call **\`get_menus\`** first. NEVER list or describe any food item before calling get_menus and get_foods.
- When they choose a menu → call **\`get_foods\`**. Only mention foods returned in the result.
- When they choose a food → call **\`get_food_options\`**. Only mention options returned in the result.
- When order details are complete → call **\`create_order\`**.
- For delivery tracking → call **\`get_order_status\`**.

**CRITICAL: Never speak about any specific food, dish, drink, option, or menu category from memory or training data. If you have not fetched it, you do not know it exists.**

Acknowledge new information naturally and remember it for the call.

---

### UPFRONT SELECTION DETECTION
If the caller already names a food item with its options (e.g. "a large chicken pitta with chilli"), do NOT ask about those options again — process immediately:
1. Find the foodId in MENU REFERENCE above. Match each food to the entry whose name best matches the customer's exact wording. A word is a valid match ONLY if it matches one specific food name exactly. If the customer's word is a generic/category term that appears in multiple food names (e.g. "kebab", "wrap", "burger"), list all matching foods and ask which one they mean — never pick one automatically. If two specific food names are similar and either could match, also ask the customer to clarify before calling get_food_options.
2. Call **get_food_options** for the food.
3. Match the stated options to the correct choiceIds from the results.
4. If a REQUIRED option group has no clear match, ask only about that gap.
5. Call **request_item_confirmation** with a summary for each item, then read it back to the customer and ask "Shall I add this to your order?" — wait for an explicit yes (yes / sure / go ahead / ok / correct / add it).
6. Call **confirm_item** for each food ONLY after that explicit confirmation. **The server enforces this — confirm_item will be rejected without a prior request_item_confirmation.**

This applies to single items and full order lists alike. Skip the step-by-step option questioning whenever the customer has already provided their selections.

---

### ORDERING FLOW
1. Greet customer
   "Thank you for calling **${restaurantName}**. How can I help you today?"

2. **Get customer name**
   - If the CALLER PROFILE above already includes a name, skip this step — you already know it. Use it directly in create_order.
   - If no name is known: ask "And your full name please?" — once they answer, repeat it back naturally (e.g. "Great, thanks [name]!") to confirm you heard it correctly. You MUST use this exact name in create_order — do not alter or invent it.

3. **Offer menus or respond to interest**
   - If asked what's served, fetch menus with \`get_menus\`.
   - List menu names and invite a choice.

4. **Handle food selection**
   - After fetching foods, mention names and prices.
   - **FORBIDDEN:** Calling \`get_food_options\` when the customer's request is still ambiguous. Only call it once the customer has unambiguously identified a specific food — either by full name or by a clear contextual reference (e.g. "the chicken one" after you listed options). If the request could still match multiple items, list them all and wait for the customer to pick one.
   - When the customer has named a specific food, fetch options with \`get_food_options\`.
   - Ask about each option group one at a time. **Never skip a group.** You MUST go through ALL option groups before moving on.
   - **Single-select groups** (choose 1): ask normally. Example: "What size — Small or Large?"
   - **Multi-select groups with 1-2 choices**: ask normally. Example: "Any sauce — Chilli or BBQ?"
   - **Multi-select groups with 3 or more choices**: list ALL choices upfront in one sentence and ask in a single question. Use natural phrasing based on the group name:
     - Salad/vegetable/topping type → state all as included and ask what to remove: "It comes with Lettuce, Tomato, Onion, Cucumber, and Red Cabbage — anything you'd like to leave out?"
     - Sauce/extra/drink type → list all and ask what to pick: "For sauces we have Chilli, Garlic Mayo, BBQ, and Burger Sauce — which would you like?"
     After the customer answers, acknowledge briefly only what changed or was selected — do NOT read the full list back: "Got it, no onion." or "Chilli and Garlic Mayo, perfect."
   - Only after ALL groups are answered, call **request_item_confirmation**. In the summary string, include only: single-select choices (e.g. Large), removals from multi-select groups (e.g. "no Onion"), and selections from sauce/extra groups (e.g. "Chilli, Garlic Mayo"). Do NOT list every item from a large multi-select group if all/most were kept. Read the summary back and ask: "Shall I add this to your order?"
   - Call **confirm_item({ restaurantId, foodId, quantity, selectedOptions })** ONLY after the customer gives an explicit yes. **The server enforces this — confirm_item will be rejected without a prior request_item_confirmation.**
   - If the customer asks to remove an item already in the cart, call **remove_item({ foodId })** with the foodId from the MENU REFERENCE, then confirm the removal.
   - These option groups are for this food only — when adding a new item, call get_food_options again for that item's foodId.

5. **Confirm the item, then add-on prompt**
   - After confirm_item succeeds, read back what was added.
   - Then ask ONCE: "Would you like to add anything else?"
   - If they say **no** → move directly to step 6. Do NOT ask again.
   - If they say **yes** → go back to step 3 and call get_menus → get_foods → get_food_options → confirm_item for the new item. Never name or suggest items from memory.
     Do NOT offer another add-on prompt. Proceed to step 6.
   - Ask add-ons exactly ONCE. Never be pushy. Accept "no" immediately.

5b. **Confirm overall order** *(only after all items confirmed and add-on declined)*
   - Say how many items are in the cart and the estimated total. Ask: "Shall I proceed with this order?"

7. **Collect delivery address**
   - If the CALLER PROFILE lists saved addresses, offer the first one — just say its details and ask "Shall I deliver there?". If yes, use it. If no, collect a new one.
   - If no saved address or they want a new one: collect house number, street, city, and postcode. Do NOT confirm yet — just store what they said.
   - For postcodes: customers often spell letters using city names or words (e.g. "S for Southampton, W for Winchester, 1, A, 2, B, C"). Extract only the letters and numbers — the postcode is SW1A 2BC. Never write out the full words.
   - Do not alter any field.

7. **Final confirmation & create the order**
   - Before placing the order, read back the name and address in a single sentence: "Just to confirm — I'll place the order for [name], delivering to [house number] [street], [city], [postcode]. Shall I go ahead?" Wait for the customer to confirm.
   - Accept any positive response ("yes", "correct", "that's right", "go ahead", "yeah", etc.) as confirmation. Do NOT ask again if they said yes.
   - If the customer corrects something, update only that field and read the corrected detail back once, then call \`create_order\`.
   - If the customer has an existing allergen profile with allergens, call \`check_food_allergens\` with ALL foodIds before creating the order. If warnings are returned, inform the customer and wait for their confirmation before proceeding.
   - Call \`create_order\` with the confirmed name, phone, address, and restaurantId only. ⚠️ Do NOT include items — they are automatically taken from the cart (confirmed via confirm_item).
   - After success, confirm naturally: "Your order has been placed. Delivery in about ${eta} minutes."

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
${isBusy ? `⚠️ The restaurant is currently BUSY. Estimated delivery time is around ${eta} minutes (${baseEta} min normal + ${busyExtraMinutes} min extra).
Before placing any order, inform the customer:
"We're currently experiencing high demand. Estimated delivery time will be around ${eta} minutes. Would you like to proceed?"
Only create the order after the customer confirms.` : "The restaurant is not busy. No extra delivery time warning needed."}

---

### ALLERGEN FLOW
The customer's allergen status is pre-loaded in CALLER PROFILE above — do **NOT** call \`get_allergen_profile\`.

After a successful order:
- Check \`allergenAsked\` from CALLER PROFILE above.
- If allergenAsked is **no**, ask: "Do you have any food allergies or dietary preferences we should know about? For example gluten, nuts, milk, eggs, vegan, or halal."
- Save their response using **set_allergen_profile**. If they say "none", save with empty arrays.

Before placing any order (if customer has allergens listed in CALLER PROFILE):
- Call **check_food_allergens** with the foodIds about to be ordered and the customer's phone.
- If warnings are returned, tell the customer: "Just to let you know, [food] contains [allergen] which is in your allergen profile. Would you still like to proceed?"
- Only call create_order after they confirm.

---

### BEHAVIOUR & MEMORY
- **NEVER invent or guess any ID (food, menu, option, choice).** Every ID used in create_order MUST come directly from a get_menus, get_foods, or get_food_options response. If the customer names a dish you have not fetched yet, call get_menus → get_foods to find it first — never skip this.
- **NEVER invent food names, option groups, choices, or menu categories.** Do not name or suggest any food item, drink, side, or category that you have not received from get_foods. The food name in create_order must exactly match the name returned by get_foods. Option groups and choices must come from get_food_options — never guess or assume them.
- **NEVER summarise or repeat the order more than once.** Summarise only once at step 5. Do not list items again after tool calls, after add-ons, or when confirming address/name. When adding an extra item, say only what was added and the new total — do not re-read the full order.
- Fetch only when necessary.
- Remember all fetched data (IDs, names, options) until the call ends.
- **If you are ever unsure about a food ID, menu ID, option ID, food name, or price from earlier in the call, call the relevant function again to refresh — never guess.**
- Confirm corrections aloud.

---

### STYLE
Keep tone friendly, concise, and natural.
Use short confirmations ("Perfect", "Great choice").
Never mention technology or APIs.
Refrain from unnecessary repetitions.
Do not repeat order details multiple times unless asked.
Your only goal is to take accurate, polite phone orders for **${restaurantName}**.

---

### VOICE & TONE
You are a calm, confident, and professional British male assistant.
Speak with a natural British accent and use British English spelling and phrasing.
Your delivery is warm and measured — never rushed, never robotic.
Use natural pauses to let the customer think and respond.
Your tone is friendly and reassuring, like a knowledgeable member of staff at a well-run takeaway.
Avoid filler words. Keep sentences short and clear.
When repeating back an order, speak slowly and clearly so the customer can follow.
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

    // Barge-in tracking
    let lastAssistantItemId: string | null = null;
    let totalAudioMs = 0;

    // Server-side cart and confirmation state
    const cart: ValidatedCartItem[] = [];
    const pendingConfirmations = new Set<string>();


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
        const defaultDeliveryMinutes = parseInt(params.defaultDeliveryMinutes) || 30;
        const normalizedPhone = normalizePhone(params.callerPhone);
        const [caller, menus] = await Promise.all([
          resolveCaller(app, normalizedPhone),
          app.prisma.menu.findMany({
            where: { restaurantId: params.restaurantId },
            select: {
              id: true,
              name: true,
              foods: {
                where: { isAvailable: true },
                select: { id: true, name: true, basePrice: true },
              },
            },
          }),
        ]);

        const callerName =
          caller.type === "user" ? caller.user.name :
          caller.type === "whatsapp" ? caller.profile.name ?? null :
          null;

        // Connect to OpenAI Realtime API
        openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        });

        openaiWs.on("open", () => {
          app.log.info(`🤖 OpenAI Realtime connected for stream ${streamSid}`);

          // Configure session
          const sessionUpdate = {
            type: "session.update",
            session: {
              type: "realtime",
              instructions: buildInstructions({
                restaurantName: params.restaurantName,
                restaurantId: params.restaurantId,
                callerPhone: normalizedPhone,
                acceptingOrders,
                isBusy,
                busyExtraMinutes,
                defaultDeliveryMinutes,
                caller,
                menus,
              }),
              tools: toRealtimeTools(tools),
              tool_choice: "auto",
              output_modalities: ["audio"],
              audio: {
                output: { voice: "ballad" },
                input: {
                  noise_reduction: { type: "near_field" },
                  turn_detection: {
                    type: "semantic_vad",
                    eagerness: "medium",
                    interrupt_response: true,
                    create_response: true,
                  },
                },
              },
            },
          };
          openaiWs!.send(JSON.stringify(sessionUpdate));

          // Send initial greeting
          const greet = {
            type: "response.create",
            response: {
              instructions: !acceptingOrders
                ? `Inform the customer politely in English that ${params.restaurantName} is not taking orders right now. Say: "Thank you for calling ${params.restaurantName}. Unfortunately, we are not accepting orders at the moment. Please try again later. Have a lovely day!"`
                : callerName
                ? `Greet the customer by name. Speak in English only. Say something like: "Thank you for calling ${params.restaurantName}, ${callerName}! How can I help you today?"`
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

          if (msg.type === "error") {
            app.log.error(`❌ OpenAI Realtime error: ${JSON.stringify(msg)}`);
            return;
          }
          if (msg.type === "session.created" || msg.type === "session.updated") {
            app.log.info(`🔧 OpenAI session event: ${msg.type}`);
          }

          // Response finished naturally — clear barge-in tracking so we don't truncate a completed item
          if (msg.type === "response.done" || msg.type === "response.cancelled") {
            lastAssistantItemId = null;
            totalAudioMs = 0;
          }

          // Barge-in: user started speaking — clear Twilio buffer and truncate AI context
          if (msg.type === "input_audio_buffer.speech_started") {
            app.log.info(`🎤 Barge-in at ${totalAudioMs}ms`);
            if (twilioWs.readyState === WebSocket.OPEN && streamSid) {
              twilioWs.send(JSON.stringify({ event: "clear", streamSid }));
            }
            if (lastAssistantItemId && openaiWs?.readyState === WebSocket.OPEN) {
              openaiWs.send(JSON.stringify({
                type: "conversation.item.truncate",
                item_id: lastAssistantItemId,
                content_index: 0,
                audio_end_ms: Math.round(totalAudioMs),
              }));
            }
            lastAssistantItemId = null;
            totalAudioMs = 0;
            for (const key of Object.keys(pendingArgs)) delete pendingArgs[key];
            for (const key of Object.keys(pendingCalls)) delete pendingCalls[key];
          }

          // Audio output from OpenAI → Twilio
          if (msg.type === "response.output_audio.delta" && msg.delta) {
            const audioBase64 = msg.delta as string;
            const audioBuffer = Buffer.from(audioBase64, "base64");
            totalAudioMs += (audioBuffer.length / 2 / 24000) * 1000;
            const mulawAudio = pcm16ToMulawBase64(audioBase64);
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

          // Function call started — track assistant item id and reset audio counter
          if (msg.type === "response.output_item.added") {
            const item = msg.item as { type: string; id?: string; role?: string; call_id?: string; name?: string };
            if (item.type === "message" && item.role === "assistant" && item.id) {
              lastAssistantItemId = item.id;
              totalAudioMs = 0;
            }
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
              if (fnName === "request_item_confirmation") {
                const { items } = args as { items: { foodId: string; summary: string }[] };
                items.forEach((i) => pendingConfirmations.add(i.foodId));
                result = {
                  summaryLines: items.map((i) => i.summary),
                  message: "Summary shown to customer. Wait for explicit yes before calling confirm_item.",
                };
              } else if (fnName === "remove_item") {
                const { foodId } = args as { foodId: string };
                let idx = -1;
                for (let i = cart.length - 1; i >= 0; i--) {
                  if (cart[i].foodId === foodId) { idx = i; break; }
                }
                if (idx === -1) {
                  result = {
                    error: `No item with foodId "${foodId}" in cart.`,
                    _instruction: "The item was not in the cart. Check the cart contents and inform the customer.",
                  };
                } else {
                  const [removed] = cart.splice(idx, 1);
                  result = { removed: removed.foodName, cartSize: cart.length };
                }
              } else if (!handler) {
                result = { error: `Unknown tool: ${fnName}` };
              } else if (fnName === "confirm_item") {
                const { foodId } = args as { foodId: string };
                if (!pendingConfirmations.has(foodId)) {
                  result = {
                    error: `foodId "${foodId}" is not in pending confirmations.`,
                    pendingFoodIds: Array.from(pendingConfirmations),
                    _instruction:
                      "Check pendingFoodIds above. If it contains a foodId for the same food, " +
                      "retry confirm_item with that correct foodId — do NOT ask the customer again. " +
                      "Only call request_item_confirmation if this food was genuinely never shown to the customer for confirmation.",
                  };
                } else {
                  pendingConfirmations.delete(foodId);
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const itemResult = await (handler as (args: any) => Promise<any>)(args);
                  cart.push(itemResult.confirmedItem);
                  itemResult.cartSize = cart.length;
                  result = itemResult;
                }
              } else if (fnName === "create_order") {
                if (cart.length === 0) {
                  result = {
                    error: "Cart is empty.",
                    _instruction: "No items confirmed yet. Use confirm_item for each food item before calling create_order.",
                  };
                } else {
                  (args as any).items = cart;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  result = await (handler as (args: any) => Promise<unknown>)(args);
                  if (!(result as any)?.error) {
                    cart.length = 0;
                  }
                }
              } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                result = await (handler as (args: any) => Promise<unknown>)(args);
              }
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : "Tool execution failed";
              app.log.error(`❌ Voice tool failed: ${fnName} - ${message}`);
              let _instruction: string | undefined;
              if (fnName === "confirm_item" && message.includes("Missing required selection")) {
                _instruction =
                  "First, check whether the food name in this error matches what the customer ordered. " +
                  "If the name in the error is different (e.g. error says 'Pitta' but customer said 'Wrap'), " +
                  "you have used the wrong foodId — find the correct one in the MENU REFERENCE and retry confirm_item with the correct ID. " +
                  "If the food name is correct and the customer simply did not specify this option, " +
                  "ask the customer now — present only that option group and its choices. " +
                  "Do NOT proceed to checkout, order summary, or add-on prompts until this item is confirmed.";
              } else if (fnName === "confirm_item") {
                _instruction =
                  "Do NOT tell the customer about this error. Fix the invalid ID(s) using the correct values listed in the error above, then immediately retry silently.";
              } else if (fnName === "create_order") {
                _instruction =
                  "The order could not be placed due to invalid input. " +
                  "Do NOT invent or guess a correct value — the error examples are NOT the customer's real data. " +
                  "Tell the customer what is wrong and ask them to provide the correct value. " +
                  "Only retry create_order once the customer has given you the corrected information.";
              }
              result = { error: message, ...(_instruction ? { _instruction } : {}) };
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
            const eta = defaultDeliveryMinutes + (isBusy ? busyExtraMinutes : 0);
            const followUpInstruction =
              fnName === "create_order" && !(result as any)?.error
                ? `The order was placed successfully. You MUST immediately say: "Your order has been placed. Delivery in about ${eta} minutes." Do NOT call any more tools. Do NOT ask about allergens yet — you can do that after confirming the order.`
                : getFollowUpInstruction(fnName) + "\n\nAlways respond in English only. Never switch to any other language.";
            openaiWs.send(
              JSON.stringify({
                type: "response.create",
                response: {
                  instructions: followUpInstruction,
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
