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
import { restaurantService } from "../restaurant/restaurant.service";
import { waIdToE164 } from "../../shared/phone";
import {
  exchangeCodeForToken,
  subscribeAppToWaba,
  getPhoneNumberInfo,
  listWabaPhoneNumbers,
  deregisterPhoneNumber,
  sendTextMessage,
  markMessageRead,
  downloadMedia,
  GraphApiError,
} from "../../shared/metaGraph";
import type { MetaWebhookPayload, ConnectWhatsappInput } from "./whatsapp.types";

/** Thrown when connecting a restaurant that already has a WhatsApp number. */
export class WhatsappAlreadyConnectedError extends Error {}
/** Thrown when the WhatsApp number is already linked to another restaurant. */
export class WhatsappNumberTakenError extends Error {}

type LoadedRestaurant = Awaited<ReturnType<typeof loadRestaurantById>>;

interface SessionState {
  messages: ChatCompletionMessageParam[];
  lastUpdated: number;
  caller?: ResolvedCaller;
  restaurant?: LoadedRestaurant;
  cart: ValidatedCartItem[];
  pendingConfirmations: Set<string>;
  allergenConflictPending: boolean;
  allergenAcknowledged: boolean;
}

async function loadRestaurantById(app: FastifyInstance, restaurantId: string) {
  const restaurant = await app.prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      isBusy: true,
      busyExtraMinutes: true,
      defaultDeliveryMinutes: true,
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

export function whatsappService(app: FastifyInstance) {
  // Default SDK timeout is 10 minutes, which is far longer than any turn should
  // take and lets a stalled call hold the conversation open.
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60_000 });
  const restaurants = restaurantService(app);
  const sessions = new Map<string, SessionState>();

  // Dedupe inbound messages — Meta retries webhook delivery. Maps message.id → ms timestamp.
  const recentMessageIds = new Map<string, number>();
  const MESSAGE_DEDUP_TTL = 10 * 60 * 1000;

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

  // Clear old sessions every 15mins; also prune the webhook dedup map
  setInterval(() => {
    const now = Date.now();
    for (const [phone, session] of sessions) {
      if (now - session.lastUpdated > 15 * 60 * 1000) {
        sessions.delete(phone);
      }
    }
    for (const [id, ts] of recentMessageIds) {
      if (now - ts > MESSAGE_DEDUP_TTL) recentMessageIds.delete(id);
    }
  }, 60_000);

  const MAX_RETRIES = 2;

  async function handleMessage(phone: string, text: string, restaurantId: string): Promise<string> {
    const key = sessionKey(restaurantId, phone);
    const existingSession = sessions.get(key);

    const restaurant = existingSession?.restaurant ?? await loadRestaurantById(app, restaurantId);

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

    const session = existingSession ?? { messages: [], lastUpdated: Date.now(), cart: [], pendingConfirmations: new Set<string>(), restaurant, allergenConflictPending: false, allergenAcknowledged: false };
    if (!existingSession) sessions.set(key, session);
    session.lastUpdated = Date.now();
    if (!session.restaurant) session.restaurant = restaurant;

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
    restaurant: { id: string; name: string; isBusy?: boolean; busyExtraMinutes?: number; defaultDeliveryMinutes?: number; acceptingOrders?: boolean; menus?: MenuSnapshot[] },
    phone: string
  ): Promise<string> {
    let finalText = "";
    let running = true;
    let orderPlacedEta: number | undefined;

    // One round is one LLM call — every tool call in a response is handled in the
    // inner loop below, so a normal order takes a handful. This only bounds a
    // model that never stops asking for tools.
    const MAX_LLM_ROUNDS = 15;
    let rounds = 0;
    let hitRoundLimit = false;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: instructionsTemplate({ restaurant, phone, caller: session.caller }) },
      ...session.messages,
    ];

    while (running) {
      if (++rounds > MAX_LLM_ROUNDS) {
        app.log.error(`❌ Tool loop hit ${MAX_LLM_ROUNDS} LLM rounds — aborting turn`);
        hitRoundLimit = true;
        break;
      }

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
      let confirmationSetThisBatch = false;

      for (const call of msg.tool_calls) {
        if (call.type !== "function") continue;

        const fn = call.function.name;
        const rawArgs = call.function.arguments ?? "{}";
        app.log.info(`🧰 Running tool: ${fn} with ${rawArgs}`);

        const args = JSON.parse(rawArgs);
        const handler = toolHandlers(app)[fn as keyof ReturnType<typeof toolHandlers>];

        // remove_item is handled inline (cart mutation, no DB call)
        if (fn === "request_item_confirmation") {
          let ricResult: unknown;
          try {
            ricResult = await handler(args);
            const { items } = args as { items: { foodId: string }[] };
            items.forEach((i) => session.pendingConfirmations.add(i.foodId));
            confirmationSetThisBatch = true;
          } catch (err: any) {
            ricResult = { error: err.message ?? "request_item_confirmation failed", _instruction: "Fix the invalid IDs using the error above and retry request_item_confirmation." };
          }
          const toolMessage = {
            role: "tool" as const,
            tool_call_id: call.id,
            content: JSON.stringify(ricResult),
          };
          messages.push(toolMessage);
          session.messages.push(toolMessage);
          continue;
        }

        if (fn === "remove_item") {
          const { foodId } = args as { foodId: string };
          let idx = -1;
          for (let i = session.cart.length - 1; i >= 0; i--) {
            if (session.cart[i].foodId === foodId) { idx = i; break; }
          }
          let removeResult: unknown;
          if (idx === -1) {
            removeResult = {
              error: `No item with foodId "${foodId}" in cart.`,
              _instruction: "The item was not in the cart. Check the cart contents and inform the customer.",
            };
          } else {
            const [removed] = session.cart.splice(idx, 1);
            removeResult = { removed: removed.foodName, cartSize: session.cart.length };
          }
          const toolMessage = {
            role: "tool" as const,
            tool_call_id: call.id,
            content: JSON.stringify(removeResult),
          };
          messages.push(toolMessage);
          session.messages.push(toolMessage);
          continue;
        }

        if (fn === "get_cart") {
          const cartResult = {
            items: session.cart.map((item) => ({
              foodName: item.foodName,
              quantity: item.quantity,
              options: (item.selectedOptions ?? []).map((o) => o.choiceLabel ?? o.choiceId).filter(Boolean),
            })),
            cartSize: session.cart.length,
          };
          const toolMessage = { role: "tool" as const, tool_call_id: call.id, content: JSON.stringify(cartResult) };
          messages.push(toolMessage);
          session.messages.push(toolMessage);
          continue;
        }

        if (fn === "acknowledge_allergen_risk") {
          session.allergenAcknowledged = true;
          session.allergenConflictPending = false;
          const toolMessage = { role: "tool" as const, tool_call_id: call.id, content: JSON.stringify({ acknowledged: true }) };
          messages.push(toolMessage);
          session.messages.push(toolMessage);
          continue;
        }

        if (!handler) {
          app.log.warn(`❌ Unknown tool: ${fn}`);
          messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: `Unknown tool: ${fn}` }) });
          session.messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: `Unknown tool: ${fn}` }) });
          continue;
        }

        let result: unknown;
        try {
          if (fn === "confirm_item") {
            const { foodId } = args as { foodId: string };
            if (!session.pendingConfirmations.has(foodId) || confirmationSetThisBatch) {
              result = {
                error: `foodId "${foodId}" is not in pending confirmations.`,
                pendingFoodIds: Array.from(session.pendingConfirmations),
                _instruction:
                  "Check pendingFoodIds above. If it contains a foodId for the same food, " +
                  "retry confirm_item with that correct foodId — do NOT ask the customer again. " +
                  "Only call request_item_confirmation if this food was genuinely never shown to the customer for confirmation.",
              };
            } else {
              const itemResult = await handler(args) as Awaited<ReturnType<ReturnType<typeof toolHandlers>["confirm_item"]>>;
              session.pendingConfirmations.delete(foodId);
              session.cart.push(itemResult.confirmedItem);
              itemResult.cartSize = session.cart.length;
              result = itemResult;
            }
          } else if (fn === "create_order") {
            if (session.cart.length === 0) {
              result = {
                error: "Cart is empty.",
                _instruction: "No items have been confirmed yet. Use confirm_item for each food item before calling create_order.",
              };
            } else if (session.allergenConflictPending && !session.allergenAcknowledged) {
              result = {
                error: "Allergen conflict not yet acknowledged.",
                _instruction: "Inform the customer of the specific allergen warnings and wait for their explicit confirmation. Only call acknowledge_allergen_risk after they confirm, then retry create_order.",
              };
            } else {
              (args as any).items = session.cart;
              (args as any).allergenAcknowledged = session.allergenAcknowledged;
              result = await handler(args);
              if (!(result as any)?.error) {
                session.cart = [];
                session.allergenConflictPending = false;
                session.allergenAcknowledged = false;
                const baseEta = restaurant.defaultDeliveryMinutes ?? 30;
                orderPlacedEta = baseEta + (restaurant.isBusy ? (restaurant.busyExtraMinutes ?? 15) : 0);
              }
            }
          } else if (fn === "check_food_allergens") {
            result = await handler(args);
            if ((result as any)?.warnings?.length > 0) {
              session.allergenConflictPending = true;
              session.allergenAcknowledged = false;
            }
          } else {
            result = await handler(args);
          }
        } catch (err: any) {
          app.log.error({ err }, `Tool execution failed: ${fn}`);
          let instruction: string;
          if (fn === "confirm_item" && (err.message as string)?.includes("Missing required selection")) {
            instruction =
              "First, check whether the food name in this error matches what the customer ordered. " +
              "If the name in the error is different (e.g. error says 'Pitta' but customer said 'Wrap'), " +
              "you have used the wrong foodId — find the correct one in the MENU REFERENCE and retry confirm_item with the correct ID. " +
              "If the food name is correct and the customer simply did not specify this option, " +
              "ask the customer now — show only that option group's choices. " +
              "Do NOT proceed to checkout, order summary, or add-on prompts until this item is confirmed.";
          } else if (fn === "confirm_item") {
            instruction =
              "Do NOT tell the customer about this error. The error message above contains the correct IDs. " +
              "Fix the invalid ID(s) using the values listed in the error, then immediately retry. " +
              "Handle this silently — the customer should not know a retry happened.";
          } else if (fn === "create_order") {
            instruction =
              "The order could not be placed due to invalid input. " +
              "Do NOT invent or guess a correct value — the error examples are NOT the customer's real data. " +
              "Tell the customer what is wrong (e.g. 'invalid postcode') and ask them to provide the correct value. " +
              "Only retry create_order once the customer has given you the corrected information.";
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

    if (!finalText && orderPlacedEta !== undefined) {
      finalText = `✅ Your order has been placed! Delivery in about ${orderPlacedEta} minutes.`;
      session.messages.push({ role: "assistant", content: finalText });
    }

    // Answer here rather than returning "" — an empty result makes handleMessage
    // retry the whole turn, which would multiply the rounds we just capped.
    if (!finalText && hitRoundLimit) {
      finalText = "Sorry, I got stuck on that. Could you tell me again what you'd like to order?";
      session.messages.push({ role: "assistant", content: finalText });
    }

    return finalText;
  }

  /**
   * Handle voice messages by transcribing them with OpenAI Whisper
   * and then processing as a regular text message.
   * Audio is downloaded from Meta's media endpoint (mediaId + business token).
   */
  async function handleVoiceMessage(
    phone: string,
    mediaId: string,
    restaurantId: string,
    token: string
  ): Promise<string> {
    app.log.info(`🎤 Downloading voice message media ${mediaId}`);

    // Download the audio file from the Meta media endpoint
    const audioBuffer = await downloadMedia(mediaId, token);
    app.log.info(`📥 Downloaded ${audioBuffer.length} bytes of audio`);

    // Create a File object for OpenAI Whisper API
    // WhatsApp voice messages are OGG (opus). Convert Buffer → Uint8Array for File ctor.
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

  /**
   * Process an incoming Meta Cloud API webhook payload (fire-and-forget after
   * the controller has already replied 200). Routes by phone_number_id, dedupes
   * retries, runs the LLM, and sends the reply via the Graph API.
   */
  async function processIncomingWebhook(payload: MetaWebhookPayload): Promise<void> {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;

        const value = change.value;
        const messages = value?.messages;
        if (!messages || messages.length === 0) continue; // statuses-only / no-op

        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) {
          app.log.warn("📭 WhatsApp webhook missing phone_number_id — dropping");
          continue;
        }

        // No fallback: unknown numbers are logged and dropped (200 already sent).
        const restaurant = await restaurants.findByPhoneNumberId(phoneNumberId);
        if (!restaurant) {
          app.log.warn(`📭 No restaurant for phone_number_id ${phoneNumberId} — dropping`);
          continue;
        }
        const token = restaurant.whatsappAccessToken;
        if (!token) {
          app.log.error(`🔑 Restaurant ${restaurant.id} has no WhatsApp token — dropping`);
          continue;
        }

        for (const message of messages) {
          // Dedupe — Meta retries delivery until it gets a 200 in time.
          if (recentMessageIds.has(message.id)) {
            app.log.info(`♻️ Duplicate WhatsApp message ${message.id} — skipping`);
            continue;
          }
          recentMessageIds.set(message.id, Date.now());

          const phone = waIdToE164(message.from);
          void markMessageRead(phoneNumberId, token, message.id);

          let responseText: string;
          try {
            if (message.type === "text" && message.text) {
              app.log.info(`📩 WhatsApp ${phone}: ${message.text.body}`);
              responseText = await handleMessage(phone, message.text.body, restaurant.id);
            } else if (message.type === "audio" && message.audio) {
              app.log.info(`🎤 WhatsApp voice from ${phone}: ${message.audio.id}`);
              responseText = await handleVoiceMessage(phone, message.audio.id, restaurant.id, token);
            } else {
              responseText = "I can only process text and voice messages.";
            }
          } catch (err) {
            app.log.error({ err }, "WhatsApp message processing failed");
            responseText = "I'm sorry, something went wrong. Please try again.";
          }

          try {
            await sendTextMessage(phoneNumberId, token, message.from, responseText);
          } catch (err) {
            if (err instanceof GraphApiError && err.code === 190) {
              app.log.error(
                `🔒 WhatsApp token revoked for restaurant ${restaurant.id} (code 190) — owner must reconnect`
              );
            } else {
              app.log.error({ err }, "Failed to send WhatsApp reply");
            }
          }
        }
      }
    }
  }

  /**
   * Connect a restaurant's WhatsApp number via Embedded Signup (coexistence).
   * The number is linked through the QR step inside the popup, so registerPhoneNumber/PIN
   * is NOT called here (kept in metaGraph for a future migration path).
   */
  async function connectRestaurant(
    restaurantId: string,
    { code, wabaId, phoneNumberId }: ConnectWhatsappInput
  ): Promise<{ whatsappPhone: string; whatsappPhoneNumberId: string }> {
    const existing = await app.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { whatsappPhoneNumberId: true },
    });
    if (existing?.whatsappPhoneNumberId) {
      throw new WhatsappAlreadyConnectedError("This restaurant already has a WhatsApp number connected.");
    }

    const token = await exchangeCodeForToken(code);
    await subscribeAppToWaba(wabaId, token);

    // Coexistence signups return only a waba_id, so look the number up on the
    // account. A freshly connected WABA holds exactly one.
    let resolvedPhoneNumberId = phoneNumberId;
    let displayPhone: string;
    if (resolvedPhoneNumberId) {
      const info = await getPhoneNumberInfo(resolvedPhoneNumberId, token);
      displayPhone = normalizePhone(info.display_phone_number);
    } else {
      const numbers = await listWabaPhoneNumbers(wabaId, token);
      if (numbers.length === 0) {
        throw new GraphApiError(`No phone number found on WhatsApp Business Account ${wabaId}`);
      }
      if (numbers.length > 1) {
        app.log.warn(
          `WABA ${wabaId} has ${numbers.length} numbers; connecting the first (${numbers[0].id})`
        );
      }
      resolvedPhoneNumberId = numbers[0].id;
      displayPhone = normalizePhone(numbers[0].display_phone_number);
    }

    try {
      await app.prisma.restaurant.update({
        where: { id: restaurantId },
        data: {
          wabaId,
          whatsappPhoneNumberId: resolvedPhoneNumberId,
          whatsappAccessToken: token,
          whatsappPhone: displayPhone,
        },
      });
    } catch (err: any) {
      if (err?.code === "P2002") {
        throw new WhatsappNumberTakenError("This WhatsApp number is already connected to another restaurant.");
      }
      throw err;
    }

    clearSessions(restaurantId);
    return { whatsappPhone: displayPhone, whatsappPhoneNumberId: resolvedPhoneNumberId };
  }

  /** Disconnect a restaurant's WhatsApp number; best-effort deregister, then null the fields. */
  async function disconnectRestaurant(restaurantId: string): Promise<void> {
    const r = await app.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { whatsappPhoneNumberId: true, whatsappAccessToken: true },
    });
    if (r?.whatsappPhoneNumberId && r.whatsappAccessToken) {
      try {
        await deregisterPhoneNumber(r.whatsappPhoneNumberId, r.whatsappAccessToken);
      } catch (err) {
        app.log.warn({ err }, "WhatsApp deregister failed (best-effort)");
      }
    }
    await app.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        wabaId: null,
        whatsappPhoneNumberId: null,
        whatsappAccessToken: null,
        whatsappPin: null,
        whatsappPhone: null,
      },
    });
    clearSessions(restaurantId);
  }

  return {
    handleMessage,
    handleVoiceMessage,
    clearSessions,
    processIncomingWebhook,
    connectRestaurant,
    disconnectRestaurant,
  };
}
