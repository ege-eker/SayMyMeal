import { tools } from "@/utils/functions";
import { searchRestaurants, getMenuForRestaurant, createOrder } from "./api";

// Call_id -> args parçalarını biriktirmek için
const pendingArgs: Record<string, string> = {};
// Call_id -> function name eşlemesi
const pendingCalls: Record<string, string> = {};

export async function initRealtime() {
  const pc = new RTCPeerConnection();

  const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
  mic.getTracks().forEach(track => pc.addTrack(track, mic));

  // gelen sesi çal
  pc.ontrack = (event) => {
    const audioEl = document.createElement("audio");
    audioEl.srcObject = event.streams[0];
    audioEl.autoplay = true;
    document.body.appendChild(audioEl);
  };

  // DataChannel JSON eventler
  const dc = pc.createDataChannel("oai-events");

  // Event handler
  dc.onmessage = async (event) => {
    const msg = JSON.parse(event.data);
    console.log("Realtime event:", msg);

    // start function call
    if (msg.type === "response.output_item.added" && msg.item.type === "function_call") {
      console.log("📢 Function call started:", msg.item.name, " (call_id:", msg.item.call_id, ")");
      pendingCalls[msg.item.call_id!] = msg.item.name;
      pendingArgs[msg.item.call_id!] = "";
    }

    // args
    if (msg.type === "response.function_call_arguments.delta") {
      if (!pendingArgs[msg.call_id]) pendingArgs[msg.call_id] = "";
      pendingArgs[msg.call_id] += msg.delta;
    }

    // args done
    if (msg.type === "response.function_call_arguments.done") {
      const callId = msg.call_id;
      const finalArgsStr = pendingArgs[callId] || "";
      let args: any = {};

      try {
        args = finalArgsStr ? JSON.parse(finalArgsStr) : {};
      } catch (e) {
        console.warn("❌ Args JSON parse failed:", finalArgsStr);
      }

      console.log("🚀 Final args for", callId, ":", args);

      const fnName = pendingCalls[callId];
      if (fnName) {
        await handleFunctionCall(fnName, callId, args, dc);
      }

      // cleanup
      delete pendingArgs[callId];
      delete pendingCalls[callId];
    }
  };

  // WebRTC offer/answer
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

  // dc open → send tool schemas
  dc.onopen = () => {
    console.log("✅ DataChannel open, sending tool schemas to model");

    dc.send(JSON.stringify({
      type: "session.update",
      session: {
        instructions: `
          Sen bir restoran sipariş asistanısın. Kullanıcıyla doğal şekilde konuş.

          Adımların:
          1. Kullanıcı "restoranları listele" derse → search_restaurants tool'unu çağır.
          2. Kullanıcı bir restoran seçince → search_restaurants çıktısındaki name → id eşleşmesini yap.
             Sadece o restoranın 'id' değerini get_menu tool'una gönder.
          3. Menü çıktıktan sonra → kullanıcı yemek adı söylerse foods[].name ile eşleştir,
             sadece ilgili foods[].id parametresini create_order'a geçir.
          4. Siparişi tamamlamadan önce kullanıcıdan adresini ve ismini iste.

          Çok önemli:
          - Sakın boş args gönderme.
          - Sakın id uydurma.
          - Tool parametrelerinde sadece API'nin döndürdüğü id'leri doldur.
        `,
        tools,
        modalities: ["audio", "text"],
        voice: "verse"
      }
    }));
  };

  return { pc, dc };
}

// Tool Call Handler
async function handleFunctionCall(name: string, call_id: string, args: any, dc: RTCDataChannel) {
  let result;

  if (name === "search_restaurants") {
    result = await searchRestaurants(args.name);
  }

  else if (name === "get_menu") {
    // Eğer restaurantId boş ama name geldiyse → eşleştir (test)
    if (!args.restaurantId && args.name) {
      console.log("⚠️ restaurantId yok, name ile arıyoruz:", args.name);
      const found = await searchRestaurants(args.name);
      if (found?.length > 0) {
        args.restaurantId = found[0].id;
      }
    }

    if (args.restaurantId) {
      result = await getMenuForRestaurant(args.restaurantId);
    } else {
      result = { error: "restaurantId bulunamadı" };
    }
  }

  else if (name === "create_order") {
    result = await createOrder(args);
  }

  // return result to model
  dc.send(JSON.stringify({
    type: "conversation.item.create",
    item: {
      type: "function_call_output",
      call_id,
      output: JSON.stringify(result ?? {})
    }
  }));

  // make it speak
    dc.send(JSON.stringify({
        type: "response.create",
        response: {
            instructions: `
                Fonksiyon başarıyla çağrıldı: ${name}
                Açık ve dostane bir şekilde kullanıcıya sonucu bildir ve kısaca özetle. Sohbeti devam ettir.
            `
        }
    }));
}