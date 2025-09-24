"use client";
import { useState } from "react";
import Link from "next/link";
import { initRealtime } from "@/lib/realtime"; // Sesli asistan fonksiyonu

export default function HomePage() {
  const [connected, setConnected] = useState(false);

  const startAssistant = async () => {
    try {
      await initRealtime();
      setConnected(true);
    } catch (err) {
      console.error("Asistan başlatılamadı:", err);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-red-700 to-yellow-500 text-white">
      <h1 className="text-5xl font-bold mb-6">🍔 Voice Ordering Assistant</h1>
      <p className="mb-6 text-xl text-center max-w-lg">
        Sesli asistanla restoranlardan sipariş ver!
        <br />
        <span className="italic">Örn: "... restoranınındaki tüm menüleri listele"</span>
      </p>

      <div className="flex space-x-6">
        {/* Restoran Yönetim Linki */}
        <Link
          href="/restaurants"
          className="bg-white text-purple-700 px-6 py-3 rounded-lg font-semibold shadow-lg hover:bg-gray-100 transition"
        >
          🛠 Restoranları Yönet
        </Link>

        {/* Asistan Başlat Butonu */}
        <button
          onClick={startAssistant}
          className={`px-6 py-3 rounded-lg font-semibold shadow-lg transition ${
            connected
              ? "bg-green-400 text-black hover:bg-green-300"
              : "bg-yellow-400 text-black hover:bg-yellow-300"
          }`}
        >
          {connected ? "🎧 Asistan Dinliyor" : "▶️ Asistanı Başlat"}
        </button>
      </div>
    </main>
  );
}