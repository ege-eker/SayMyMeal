import { tools } from "@/utils/functions";
import { searchRestaurants, getMenuForRestaurant, createOrder } from "./api";

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

  const resp = await fetch("https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17", {
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
        instructions: `You are the dedicated ordering assistant for **${restaurant.name}**.  
Behave like a friendly waiter of this specific restaurant.  

### Context:
Only use the following menu items for this restaurant:  
${restaurant.menus.map((m: any) => `
Menu: ${m.name}
Foods:
${m.foods.map((f: any) => `- ${f.name} (₺${f.price}, id=${f.id})`).join("\n")}
`).join("\n\n")}

### Rules:
- **Do not talk about or suggest other restaurants.** You ONLY serve ${restaurant.name}.  
- When the user mentions a food by name (e.g., "Margarita"), look it up in the menu above and use its **id** in your create_order function call.  
- Always confirm:
  - The exact item(s) chosen  
  - Quantity  
  - Customer's name  
  - Delivery address  
before you finalize the order.  
- If any of these are missing, **ask the user first**. Never submit an incomplete order.  
- In your responses, never reveal tool names, IDs, or technical details. Speak only naturally, like a human waiter.  

### Conversation Behavior:
- Greet the customer naturally and confirm they are ordering from ${restaurant.name}.  
- Offer menu items casually.  
- When the user orders something, acknowledge and confirm.  
- After placing the order (\`create_order\`), always summarize clearly what was ordered:  
  - Example: "I have placed an order for 1 Margarita Pizza. It should arrive in about 30 minutes."  
- Keep the flow friendly and conversational. Always try to keep the dialogue going. `,
        tools,
        modalities: ["audio", "text"],
        voice: "verse",
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