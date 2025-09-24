"use client";
import { useState } from "react";
import { initRealtime } from "@/lib/realtime";

export default function HomePage() {
  const [connected, setConnected] = useState(false);

  const start = async () => {
    await initRealtime();
    setConnected(true);
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>🍕 Sesli Sipariş Asistanı</h1>
      <button onClick={start}>
        {connected ? "Bağlandı ✅" : "Başlat"}
      </button>
      <p>
        Sesli konuş ve sipariş ver: <br/>
        “restoranları neler” gibi <br/>
        Asistan önce restoran → menü → yemeği bulacak, ardından siparişi otmatik alacak.
      </p>
    </main>
  );
}