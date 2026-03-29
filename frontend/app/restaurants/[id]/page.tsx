"use client";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useState, useMemo, useEffect, useCallback } from "react";
import { initRestaurantAssistant, stopRealtime, subscribeAudioStats, type AudioStats } from "@/lib/realtime";
import { startPhoneCollector, stopPhoneCollector, subscribePhoneAudioStats } from "@/lib/realtimePhoneAgent";
import { ChevronDown, ChevronRight } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const { data: restaurant, error } = useSWR(`${API_URL}/restaurants/${id}`, fetcher);
  const [connected, setConnected] = useState(false);
  const [stage, setStage] = useState<"idle" | "collecting" | "assistant">("idle");
  const [phone, setPhone] = useState<string | null>(null);
  const [audioStats, setAudioStats] = useState<AudioStats | null>(null);

  // Subscribe to audio stats for both stages
  useEffect(() => {
    if (stage === "collecting") {
      subscribePhoneAudioStats(setAudioStats);
    } else if (connected) {
      subscribeAudioStats(setAudioStats);
    } else {
      setAudioStats(null);
    }
  }, [stage, connected]);

  if (error) return <div className="text-red-600">❌ Error loading: {String(error)}</div>;
  if (!restaurant) return <div>⏳ Loading restaurant...</div>;

  // 🔹 button
const toggleAssistant = async () => {
  if (stage !== "idle") {
    console.log("⏹ Stopping current agent(s)...");
    try {
      await stopPhoneCollector();
    } catch {}
    try {
      await stopRealtime();
    } catch {}
    setStage("idle");
    setConnected(false);
    console.log("🟥 Assistant fully stopped.");
    return;
  }
  console.log("🎤 Starting phone collection...");
  setStage("collecting");

  await startPhoneCollector(async (collectedPhone) => {
    console.log("📞 Collected phone:", collectedPhone);
    setStage("assistant");
    setPhone(collectedPhone);

    await initRestaurantAssistant(restaurant, collectedPhone);
    setConnected(true);
    console.log("🤖 Restaurant assistant started");
  });
};

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <img
          src="https://www.barbecook.com/cdn/shop/articles/barbecook_030321_23625.jpg?v=1678958368&width=1680"
          alt={restaurant.name}
          className="w-full h-56 object-cover rounded-lg"
        />
        <h1 className="text-3xl font-bold mt-4">{restaurant.name}</h1>
        <p className="text-gray-600">{restaurant.city}</p>
        <p className="text-yellow-500">⭐ {restaurant.rating ?? "-"}</p>
<button
  onClick={toggleAssistant}
  className={`mt-4 px-6 py-2 rounded font-semibold transition ${
    connected || stage !== "idle"
      ? "bg-red-500 hover:bg-red-600 text-white"
      : "bg-green-600 hover:bg-green-700 text-white"
  }`}
>
  {connected || stage !== "idle" ? "⏹ Stop Assistant" : "🎤 Start Assistant"}
</button>
        <p className="text-sm text-gray-500 mt-2 italic">
          {stage === "collecting"
            ? "📱 Asking for phone number..."
            : stage === "assistant"
            ? `☎️ Connected (phone: ${phone ?? "-"})`
            : ""}
        </p>

        {/* Audio Debug Panel */}
        {audioStats && <AudioDebugPanel stats={audioStats} />}
      </div>

      <MenuAccordion menus={restaurant.menus ?? []} />
    </div>
  );
}

/* ---------------- AUDIO DEBUG PANEL ---------------- */
function AudioDebugPanel({ stats }: { stats: AudioStats }) {
  // Normalize dB to 0–100% for the bars (range: -100 to 0 dB)
  const micPct = Math.max(0, Math.min(100, ((stats.micDb + 100) / 100) * 100));
  const spkPct = Math.max(0, Math.min(100, ((stats.speakerDb + 100) / 100) * 100));
  const threshPct = ((stats.activeThreshold + 100) / 100) * 100;

  return (
    <div className="mt-4 p-4 bg-gray-900 rounded-lg text-xs font-mono text-gray-300 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-semibold text-sm">Echo Cancellation Monitor</span>
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
          stats.speakerActive
            ? "bg-amber-500/20 text-amber-400"
            : "bg-green-500/20 text-green-400"
        }`}>
          {stats.speakerActive ? "AI SPEAKING — Echo gate active" : "LISTENING"}
        </span>
      </div>

      {/* Mic Level */}
      <div>
        <div className="flex justify-between mb-1">
          <span>Mic Level</span>
          <span>{stats.micDb} dB</span>
        </div>
        <div className="relative h-3 bg-gray-700 rounded overflow-hidden">
          <div
            className={`h-full transition-all duration-75 rounded ${
              stats.gateOpen ? "bg-green-500" : "bg-red-500"
            }`}
            style={{ width: `${micPct}%` }}
          />
          {/* Threshold marker */}
          <div
            className="absolute top-0 h-full w-0.5 bg-yellow-400"
            style={{ left: `${threshPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-0.5 text-gray-500">
          <span>-100 dB</span>
          <span className="text-yellow-400">Threshold: {stats.activeThreshold} dB</span>
          <span>0 dB</span>
        </div>
      </div>

      {/* Speaker Level */}
      <div>
        <div className="flex justify-between mb-1">
          <span>Speaker (AI) Level</span>
          <span>{stats.speakerDb} dB</span>
        </div>
        <div className="relative h-3 bg-gray-700 rounded overflow-hidden">
          <div
            className={`h-full transition-all duration-75 rounded ${
              stats.speakerActive ? "bg-amber-500" : "bg-blue-500"
            }`}
            style={{ width: `${spkPct}%` }}
          />
        </div>
      </div>

      {/* Gate Status */}
      <div className="flex items-center gap-4 pt-1 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${stats.gateOpen ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" : "bg-red-400"}`} />
          <span>Gate: {stats.gateOpen ? "OPEN (sending audio)" : "CLOSED (muted)"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${stats.speakerActive ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" : "bg-gray-500"}`} />
          <span>Echo suppression: {stats.speakerActive ? "ON" : "OFF"}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- MENU ACCORDION ---------------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MenuAccordion({ menus }: { menus: any[] }) {
  const [openIds, setOpenIds] = useState<string[]>([]);
  const toggle = (id: string) =>
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  if (!menus?.length) return <p className="text-gray-500 italic">No menus available.</p>;

  return (
    <div className="space-y-4">
      {menus.map((menu) => (
        <MenuCard
          key={menu.id}
          menu={menu}
          isOpen={openIds.includes(menu.id)}
          onToggle={() => toggle(menu.id)}
        />
      ))}
    </div>
  );
}

/* ---------------- SINGLE MENU ---------------- */
function MenuCard({
  menu,
  isOpen,
  onToggle,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  menu: any;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { data, error } = useSWR(`${API_URL}/menus/${menu.id}`, fetcher);

  const minPrice = useMemo(() => {
    if (!data?.foods?.length) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prices = data.foods.map((f: any) => f.basePrice ?? f.price ?? 0);
    return Math.min(...prices);
  }, [data]);

  return (
    <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
      <div
        onClick={onToggle}
        className="cursor-pointer flex justify-between items-center px-4 py-3 hover:bg-gray-100 transition"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{menu.name}</h2>
          {minPrice !== null && (
            <span className="text-gray-600 text-sm">from £{minPrice.toFixed(2)}</span>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-600" />
        )}
      </div>

      {isOpen && (
        <div className="p-4 border-t bg-gray-50">
          {error && <div className="text-red-500 text-sm">Error loading foods</div>}
          {!data && <div className="text-gray-500 italic">Loading foods...</div>}
          {data && <MenuFoods foods={data.foods ?? []} />}
        </div>
      )}
    </div>
  );
}

/* ---------------- FOODS ---------------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MenuFoods({ foods }: { foods: any[] }) {
  const [openFoods, setOpenFoods] = useState<string[]>([]);
  const toggle = (id: string) =>
    setOpenFoods((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  if (!foods?.length)
    return <p className="text-gray-500 italic">No foods in this menu.</p>;

  return (
    <div className="space-y-3">
      {foods.map((food) => (
        <div key={food.id} className="border rounded bg-white p-3 shadow-sm hover:shadow-md">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggle(food.id)}>
            <div>
              <h3 className="font-medium">
                {food.name}{" "}
                <span className="text-gray-500">
                  £{(food.basePrice ?? food.price ?? 0).toFixed(2)}
                </span>
              </h3>
              {food.description && <p className="text-xs text-gray-500">{food.description}</p>}
            </div>
            {openFoods.includes(food.id) ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </div>
          {openFoods.includes(food.id) && <FoodOptions foodId={food.id} />}
        </div>
      ))}
    </div>
  );
}

/* ---------------- FOOD OPTIONS ---------------- */
function FoodOptions({ foodId }: { foodId: string }) {
  const { data, error } = useSWR(`${API_URL}/foods/${foodId}/options`, fetcher);
  if (error) return <div className="text-red-500">Error loading options</div>;
  if (!data) return <div className="text-gray-400 italic">Loading options...</div>;

  const options = data ?? [];
  if (!options.length)
    return <p className="text-gray-400 text-sm italic">No options for this food.</p>;

  return (
    <div className="ml-3 border-l-2 border-amber-100 pl-3 mt-3 space-y-3">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {options.map((opt: any) => (
        <div key={opt.id}>
          <h4 className="text-sm font-semibold text-amber-700">
            {opt.title}{" "}
            <span className="text-xs text-gray-400 ml-1">
              ({opt.multiple ? "multiple" : "choose 1"})
            </span>
          </h4>
          <ul className="ml-3 mt-1">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {opt.choices.map((ch: any) => (
              <li key={ch.id} className="text-sm text-gray-700">
                • {ch.label}
                {ch.extraPrice > 0 && (
                  <span className="text-gray-500 ml-1">
                    (+£{ch.extraPrice.toFixed(2)})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}