import { tools } from "@/utils/functions";
import {
    searchRestaurants,
    getMenuForRestaurant,
    createOrder,
    getOrderStatus,
    getFoodsForMenu,
    getOptionsForFood,
    getAllergenProfileByPhone,
    setAllergenProfileByPhone,
    checkFoodAllergensByPhone,
} from "./api";
import {createOrderSchema} from "@/utils/schemes";
import { getNoiseCancelledStream, AudioStats } from "./noiseCancellation";

// Argümanları call_id bazlı toplamak için
const pendingArgs: Record<string, string> = {};
const pendingCalls: Record<string, string> = {};

let pc: RTCPeerConnection | null = null;
let dc: RTCDataChannel | null = null;
let cleanupNoise: (() => void) | null = null;
let statsSubscriber: ((cb: (stats: AudioStats) => void) => void) | null = null;

export { type AudioStats };

/** Subscribe to real-time audio stats — call after initRestaurantAssistant */
export function subscribeAudioStats(cb: (stats: AudioStats) => void) {
  statsSubscriber?.(cb);
}

/**
 * Restoran seçildikten sonra asistanı başlatır.
 * restaurant parametresi backend'den fetch edilen { name, menus: [{ foods: [...] }] } yapısıdır.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function initRestaurantAssistant(restaurant: any, phone: string) {

  if (phone == null || phone.trim() === "") {
    console.error("❌ Geçersiz telefon numarası ile asistan başlatılamaz.");
    return { pc, dc };
  }

  if (pc) {
    console.warn("Asistan zaten çalışıyor!");
    return { pc, dc };
  }

  pc = new RTCPeerConnection();

  const { stream: mic, cleanup, setReference, onStats } = await getNoiseCancelledStream();
  cleanupNoise = cleanup;
  statsSubscriber = onStats;
  mic.getTracks().forEach(track => pc!.addTrack(track, mic));

  pc.ontrack = (event) => {
    // Feed the AI's audio output as echo reference — this is what Teams/Meet do
    setReference(event.streams[0]);

    const audioEl = document.createElement("audio");
    audioEl.srcObject = event.streams[0];
    audioEl.autoplay = true;
    document.body.appendChild(audioEl);
  };

  dc = pc.createDataChannel("oai-events");

  dc.onmessage = async (event) => {
    const msg = JSON.parse(event.data);
    console.debug("💬 Realtime event:", msg);

    // 1) Function Call start
    if (msg.type === "response.output_item.added" && msg.item.type === "function_call") {
      pendingCalls[msg.item.call_id!] = msg.item.name;
      pendingArgs[msg.item.call_id!] = "";
    }

    // 2) Argümanlar parça parça geliyor
    if (msg.type === "response.function_call_arguments.delta") {
      if (!pendingArgs[msg.call_id]) pendingArgs[msg.call_id] = "";
      pendingArgs[msg.call_id] += msg.delta;
    }

    // 3) Argümanlar tamamlandı
    if (msg.type === "response.function_call_arguments.done") {
      const callId = msg.call_id;
      const argString = pendingArgs[callId] || "{}";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let args: any = {};
      try {
        args = JSON.parse(argString);
      } catch (e) {
        console.error("❌ JSON parse failed:", e);
      }

      const fnName = pendingCalls[callId];
      if (fnName) {
        await handleFunctionCall(fnName, callId, args, dc!);
      }

      delete pendingArgs[callId];
      delete pendingCalls[callId];
    }
  };

  // SDP Offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const resp = await fetch("https://api.openai.com/v1/realtime?model=gpt-realtime", {
    method: "POST",
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
      "Content-Type": "application/sdp",
      "OpenAI-Beta": "realtime=v1"
    }
  });

  const answer = { type: "answer", sdp: await resp.text() };
  await pc.setRemoteDescription(answer as RTCSessionDescriptionInit);

  // Session start
  dc.onopen = () => {
    console.log("🚀 Asistan başladı:", restaurant.name);
    const debug = {
      type: "session.update",
      session: {
      instructions: `
You are the polite phone ordering assistant for **${restaurant.name}**, located in the United Kingdom.
You know the restaurants id: ${restaurant.id}.
YOU MUST ALWAYS SPEAK IN ENGLISH.
Customer phone number is: ${phone}.
DO NOT SPEAK LANGUAGES OTHER THAN ENGLISH UNDER ANY CIRCUMSTANCES. JUST SPEAK IN ENGLISH EVEN IF USER ASKS IN ANOTHER LANGUAGE. If the user speaks in another language, respond politely in English: "I'm sorry, I can only assist you in English.".

### ROLE
Act like a friendly waiter taking telephone orders.
Always be respectful, warm, and efficient.
You represent only **${restaurant.name}**.

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
   "Thank you for calling **${restaurant.name}**. How can I help you today?"

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
   - Summarize clearly before moving on.

5. **Collect delivery address**
   Get house number, street, city, and postcode, then confirm aloud.

6. **Create and confirm the order**
   Call \`create_order\` with confirmed name, phone, address, and items.
   After success, confirm naturally:
   "Your order for 2 Bold Meal Deals (Chicken Gyro with Coke) for John Smith, 10 Downing Street, London SW1A 2AA, phone 07700 900 982 has been placed. Delivery in about 30 minutes."

---

### ORDER STATUS MODE
YOU CAN CHECK ORDER STATUS WITH EITHER PHONE OR NAME ANYTIME.
IF YOU KNOW EITHER OF THOSE JUST CHECK WITHOUT ASKING.
If the customer asks to track an order immidiately try with their phone number even if you don't know their name, if you don't succeed ask for their name too.:
1. Call \`get_order_status\`.
2. Respond with current status or say it's not found.
3. End politely: "Thank you for calling ${restaurant.name}. Have a lovely day!"

---

### BUSY MODE
${restaurant.isBusy ? `⚠️ The restaurant is currently BUSY. Estimated delivery times are increased by ${restaurant.busyExtraMinutes ?? 15} minutes.
Before placing any order, inform the customer:
"We're currently experiencing high demand. Estimated delivery time will be around [normal ETA + ${restaurant.busyExtraMinutes ?? 15}] minutes. Would you like to proceed?"
Only create the order after the customer confirms.` : "The restaurant is not busy. No extra delivery time warning needed."}

---

### ALLERGEN FLOW
After a successful order:
- Call **get_allergen_profile({ phone: "${phone}" })** to check if allergenAsked is true.
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
Your only goal is to take accurate, polite phone orders for **${restaurant.name}**.
`,
        tools,
        modalities: ["audio", "text"],
        voice: "marin",
        turn_detection: { type: "semantic_vad", eagerness: "medium", create_response: true },
      }};
    console.dir(debug)
    dc!.send(JSON.stringify(debug));
    const greet = {
  type: "response.create",
  response: {
    instructions: `
Greet the customer politely in English,
mention the restaurant name **${restaurant.name}**,
and ask if they would like to hear today's menu or place an order.
For example: "Thank you for calling ${restaurant.name}. Would you like to hear our menu, or are you ready to place an order?"`,
  },
};
dc!.send(JSON.stringify(greet));
  };

  return { pc, dc };
}

/**
 * Close assistant
 */
export async function stopRealtime() {
  if (dc) {
    dc.close();
    dc = null;
  }
  if (cleanupNoise) {
    cleanupNoise();
    cleanupNoise = null;
  }
  if (pc) {
    pc.getSenders().forEach(sender => sender.track?.stop());
    pc.close();
    pc = null;
  }
  console.log("⏹ Asistan kapatıldı");
}

/**
 * Function Call Handler
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleFunctionCall(name: string, call_id: string, args: any, dc: RTCDataChannel) {
  let result;

  try {
    if (name === "search_restaurants") {
      result = await searchRestaurants(args.name);
    }

    else if (name === "get_menus") {
      // Akıllı köprü: sadece isim geldi → id bul
      if (!args.restaurantId && args.name) {
        const found = await searchRestaurants(args.name);
        if (found?.length > 0) args.restaurantId = found[0].id;
      }

      if (args.restaurantId) {
        result = await getMenuForRestaurant(args.restaurantId);
      } else {
        result = { error: "restaurantId bulunamadı" };
      }
    }

    else if (name === "get_foods") {
        console.log("🔍 get_foods args:", args);
        result = await getFoodsForMenu(args.menuId);
        console.log("✅ get_foods result:", result);
    }

    else if (name === "get_food_options") {
        console.log("🔍 get_food_options args:", args);
        result = await getOptionsForFood(args.foodId);
    }

    else if (name === "get_order_status") {
      console.log("🔍 Checking order status:", args);
      result = await getOrderStatus({ phone: args.phone, name: args.name });
      console.log("✅ Order status result:", result);
    }

    else if (name === "get_allergen_profile") {
      result = await getAllergenProfileByPhone(args.phone);
    }

    else if (name === "set_allergen_profile") {
      result = await setAllergenProfileByPhone(args.phone, {
        allergens: args.allergens,
        dietaryPreferences: args.dietaryPreferences,
      });
    }

    else if (name === "check_food_allergens") {
      result = await checkFoodAllergensByPhone(args.phone, args.foodIds);
    }

    else if (name === "create_order") {
      console.log("📦 create_order args:", args);
      const parseResult = createOrderSchema.safeParse(args);
      if (!parseResult.success) {
        console.error("❌ createOrder validation failed:", parseResult.error);
        result = { error: "Invalid order data", details: parseResult.error };
      } else {
          result = await createOrder(args);
      }
      console.log("✅ Order API response:", result);
    }
  } catch (err) {
    console.error("❌ API çağrısı hatası:", err);
    result = { error: "API call failed" };
  }

  const debug = {
    type: "conversation.item.create",
    item: {
      type: "function_call_output",
      call_id,
      output: JSON.stringify(result ?? {})
    }
  }
  // send function_call_output
    console.info(debug)
  dc.send(JSON.stringify(debug));

  // trigger function_call done
  dc.send(JSON.stringify({
    type: "response.create",
    response: {
      instructions: `Function done: ${name}.`
    }
  }));
}
