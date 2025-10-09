import { tools } from "@/utils/functions";
import { searchRestaurants, getMenuForRestaurant, createOrder, getOrderStatus } from "./api";

// Argümanları call_id bazlı toplamak için
const pendingArgs: Record<string, string> = {};
const pendingCalls: Record<string, string> = {};

let pc: RTCPeerConnection | null = null;
let dc: RTCDataChannel | null = null;

/**
 * Restoran seçildikten sonra asistanı başlatır.
 * restaurant parametresi backend'den fetch edilen { name, menus: [{ foods: [...] }] } yapısıdır.
 */
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
    console.log("💬 Realtime event:", msg);

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
      let args: any = {};
      try {
        args = JSON.parse(argString);
      } catch (e) {
        console.error("❌ JSON parse failed:", argString);
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

    dc!.send(JSON.stringify({
      type: "session.update",
      session: {
        instructions: `You are the voice ordering assistant for **${restaurant.name}**, located in the United Kingdom.

### ROLE
Act like a friendly, polite waiter taking orders **by phone** in the UK.
You only represent **${restaurant.name}** — never mention or suggest other restaurants.

---

### CONTEXT
These are the available menus and foods for this restaurant:

${restaurant.menus
  .map(
    (m: any) => `Menu: ${m.name}
Foods:
${m.foods
  .map((f: any) => `- ${f.name} (£${f.price}, id=${f.id})`)
  .join("\n")}`
  )
  .join("\n\n")}

---

### ORDERING FLOW

Always handle the conversation in this order:

1. **Start by greeting and asking the customer's phone number first.**

   - For example: “Hello! Thank you for calling ${restaurant.name}. May I have your phone number please?”
   - Repeat the number back to confirm (“Is that 07700 900 982?”).

2. **Ask for the customer’s name.**

   - “And your full name please?”
   
3. **Take the order details.**
   - Ask which food items they would like.
   - Confirm *each* item name and quantity individually.
   - Mention total items briefly before confirming.

4. **Ask for the delivery address**, including all of:
   - House number
   - Street
   - City / Town
   - Postcode (UK format, e.g. SW1A 2AA)
   - Confirm the entire address back to the customer.

5. **Finalize and call \`create_order\`** when all information is ready, using:
   - restaurantId = ${restaurant.id}
   - customer = name
   - phone = confirmed phone number
   - address = { houseNumber, street, city, postcode, country: "UK" }
   - items = list of { foodId, quantity }

6. **After placing the order**, summarize naturally:
   “I’ve placed an order for 2 Margherita Pizzas for John Smith (phone 07700 900 982), 
    10 Downing Street,London SW1A 2AA. It should arrive in about 30 minutes.”

---

### ORDER STATUS CHECKING
If the caller asks about an order status (e.g. “Can you check my order?” or “Is my order ready?”):
- Politely ask for their **phone number** (preferred) or their **name**.
- Call \`get_order_status\` with either \`phone\` or \`name\`.
- When you receive the result:
  - If there’s one order → say:  
    “Your order for {{customer}} ({{phone}}) is currently *{{status}}*, estimated delivery in {{etaMinutes}} minutes.”
  - If multiple → mention the most recent order.
  - If none → “I couldn’t find any order under that name or number.”

---

### CONVERSATION STYLE
When the call starts, first determine what type of call this is:

1. **If the customer says anything related to checking an order status** —  
   phrases like:
   - “check my order”
   - “track my order”
   - “what’s the status”
   - “is my delivery on the way”
   - “I already ordered earlier”
   
   Then immediately switch to **Order Status Mode**:
   - Greet politely: “Of course, I can help check your order. May I have the phone number or the name on the order please?”
   - Ask only for (a) phone number or (b) full name.  
   - When provided, call \`get_order_status\` with the given parameter.
   - Read back the status and delivery time to the customer.  
   - End the conversation gracefully: “Thank you for calling ${restaurant.name}. Have a lovely day!”

   Do **not** attempt to collect a new order or ask for menu items in this mode.

### CORRECTIONS AND UPDATES
If the customer corrects you, or repeats information differently (for example a phone number or postcode):
- Always **forget the previous version** and use the **newly confirmed one**.
- Clearly acknowledge the correction with a short confirmation, such as:
  “Got it — the correct postcode is now SW1A 2AA.”
- Update your understanding in memory (overwrite the old value).  
Never argue or re‑use the old mistaken data.
- Before continuing, re‑confirm the corrected value back to the customer,
  to be sure you both have the same version.
`,
        tools,
        modalities: ["audio", "text"],
        voice: "marin",
        turn_detection: { type: "server_vad", create_response: true }
      }
    }));
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
async function handleFunctionCall(name: string, call_id: string, args: any, dc: RTCDataChannel) {
  let result;

  try {
    if (name === "search_restaurants") {
      result = await searchRestaurants(args.name);
    }

    else if (name === "get_menu") {
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

    else if (name === "get_order_status") {
      console.log("🔍 Checking order status:", args);
      result = await getOrderStatus({ phone: args.phone, name: args.name });
      console.log("✅ Order status result:", result);
    }

    else if (name === "create_order") {
      console.log("📦 create_order args:", args);
      result = await createOrder(args);
      console.log("✅ Order API response:", result);
    }
  } catch (err) {
    console.error("❌ API çağrısı hatası:", err);
    result = { error: "API call failed" };
  }

  // send function_call_output
  dc.send(JSON.stringify({
    type: "conversation.item.create",
    item: {
      type: "function_call_output",
      call_id,
      output: JSON.stringify(result ?? {})
    }
  }));

  // trigger function_call done
  dc.send(JSON.stringify({
    type: "response.create",
    response: {
      instructions: `Function done: ${name}. Explain the result to the user humanly.`
    }
  }));
}