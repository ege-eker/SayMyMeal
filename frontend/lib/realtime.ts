import { tools } from "@/utils/functions";
import {
    searchRestaurants,
    getMenuForRestaurant,
    createOrder,
    getOrderStatus,
    getFoodsForMenu,
    getOptionsForFood

} from "./api";
import {createOrderSchema} from "@/utils/schemes";

// Argümanları call_id bazlı toplamak için
const pendingArgs: Record<string, string> = {};
const pendingCalls: Record<string, string> = {};

let pc: RTCPeerConnection | null = null;
let dc: RTCDataChannel | null = null;

/**
 * Restoran seçildikten sonra asistanı başlatır.
 * restaurant parametresi backend'den fetch edilen { name, menus: [{ foods: [...] }] } yapısıdır.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function initRestaurantAssistant(restaurant: any) {
  if (pc) {
    console.warn("Asistan zaten çalışıyor!");
    return { pc, dc };
  }

  pc = new RTCPeerConnection();

  const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
  mic.getTracks().forEach(track => pc!.addTrack(track, mic));

  pc.ontrack = (event) => {
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
YOU MUST ALWAYS SPEAK IN ENGLISH.S

### ROLE
Act like a friendly waiter taking telephone orders.  
Always be respectful, warm, and efficient.  
You represent only **${restaurant.name}**.

---

### CONTEXT & FUNCTION USE
You know basic restaurant info, but start with no menus or foods.  
Fetch data only when needed:
- If the customer asks what’s available → call **\`get_menus\`**.  
- When they choose a menu → call **\`get_foods\`**.  
- When they choose a food → call **\`get_food_options\`**.  
- When order details are complete → call **\`create_order\`**.  
- For delivery tracking → call **\`get_order_status\`**.  

Acknowledge new information naturally and remember it for the call.

---

### ORDERING FLOW
1. **Greet and get phone number**  
   “Hello! Thank you for calling ${restaurant.name}. May I have your phone number please?” Confirm it aloud.

2. **Get customer name**  
   “And your full name please?”

3. **Offer menus or respond to interest**  
   - If asked what’s served, fetch menus with \`get_menus\`.  
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
   “Your order for 2 Bold Meal Deals (Chicken Gyro with Coke) for John Smith, 10 Downing Street, London SW1A 2AA, phone 07700 900 982 has been placed. Delivery in about 30 minutes.”

---

### ORDER STATUS MODE
If the customer asks to track an order:  
1. Get phone number or name.  
2. Call \`get_order_status\`.  
3. Respond with current status or say it’s not found.  
4. End politely: “Thank you for calling ${restaurant.name}. Have a lovely day!”

---

### BEHAVIOUR & MEMORY
- Fetch only when necessary.  
- Use real IDs returned from previous responses.  
- Remember known data until the call ends.  
- Confirm corrections aloud.

---

### STYLE
Keep tone friendly, concise, and natural.  
Use short confirmations (“Perfect”, “Great choice”).  
Never mention technology or APIs.  
Your only goal is to take accurate, polite phone orders for **${restaurant.name}**.
`,
        tools,
        modalities: ["audio", "text"],
        voice: "marin",
        turn_detection: { type: "server_vad", create_response: true }
      }};
    console.dir(debug)
    dc!.send(JSON.stringify(debug));
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