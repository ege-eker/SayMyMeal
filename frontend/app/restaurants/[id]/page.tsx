"use client";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useState, useMemo } from "react";
import { initRestaurantAssistant, stopRealtime } from "@/lib/realtime";
import { startPhoneCollector, stopPhoneCollector } from "@/lib/realtimePhoneAgent";
import { ChevronDown, ChevronRight } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const { data: restaurant, error } = useSWR(`${API_URL}/restaurants/${id}`, fetcher);
  const [connected, setConnected] = useState(false);
  const [stage, setStage] = useState<"idle" | "collecting" | "assistant">("idle");
  const [phone, setPhone] = useState<string | null>(null);

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
      </div>

      <MenuAccordion menus={restaurant.menus ?? []} />
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
    <div className="ml-3 border-l-2 border-purple-100 pl-3 mt-3 space-y-3">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {options.map((opt: any) => (
        <div key={opt.id}>
          <h4 className="text-sm font-semibold text-purple-700">
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