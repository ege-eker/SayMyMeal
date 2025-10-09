"use client";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";
import { initRestaurantAssistant, stopRealtime } from "@/lib/realtime";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const { data: restaurant, error } = useSWR(`${API_URL}/restaurants/${id}`, fetcher);
  const [connected, setConnected] = useState(false);

  if (error) return <div>❌ Error {error.message}</div>;
  if (!restaurant) return <div>⏳ Loading...</div>;

  const toggleAssistant = async () => {
    if (connected) {
      await stopRealtime();
      setConnected(false);
    } else {
      await initRestaurantAssistant(restaurant);
      setConnected(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-10">
      {/* Restoran Bilgisi */}
      <div className="mb-6">
        <img
          src="https://assets.tmecosys.com/image/upload/t_web_rdp_recipe_584x480_1_5x/img/recipe/ras/Assets/48a49653c8716457eb0b2f7eb3c7d74c/Derivates/8d83d9ed4567fa15456d8eec7557e60006a15576.jpg"
          alt={restaurant.name}
          className="w-full h-60 object-cover rounded-lg"
        />
        <h1 className="text-3xl font-bold mt-4">{restaurant.name}</h1>
        <p className="text-gray-600">{restaurant.address}</p>
        <p className="text-yellow-500">⭐ {restaurant.rating}</p>

        {/* ✅ Asistan Başlat Butonu */}
        <button
          onClick={toggleAssistant}
          className={`mt-4 px-6 py-2 rounded font-semibold shadow-lg transition
            ${connected ? "bg-red-500 text-white hover:bg-red-600" : "bg-green-600 text-white hover:bg-green-700"}
          `}
        >
          {connected ? "⏹ Stop Assistant" : "🎤 Start Assistant"}
        </button>
      </div>

      {/* Menü */}
      {restaurant.menus.map((menu: any) => (
        <div key={menu.id} className="mb-8">
          <h2 className="text-2xl font-semibold">{menu.name}</h2>
          <ul className="space-y-2 mt-2">
            {menu.foods.map((food: any) => (
              <li key={food.id} className="flex justify-between bg-gray-100 p-3 rounded">
                <span>{food.name}</span>
                <span className="font-bold">₺ {food.price}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}