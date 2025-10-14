"use client";
import useSWR from "swr";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function RestaurantsPage() {
  const { data, error } = useSWR(`${API_URL}/restaurants`, fetcher);

  if (error) return <div>❌ Hata: {error.message}</div>;
  if (!data) return <div>⏳ Yükleniyor...</div>;

  return (
    <div className="max-w-5xl mx-auto p-10">
      <h1 className="text-3xl font-bold mb-6">🍴 Restoranlar</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {data.map((rest: any) => (
          <div key={rest.id} className="bg-white shadow rounded-lg overflow-hidden">
            <img
              src="https://www.precisionorthomd.com/wp-content/uploads/2023/10/percision-blog-header-junk-food-102323.jpg" // şimdilik stok görsel
              alt={rest.name}
              className="w-full h-40 object-cover"
            />
            <div className="p-4">
              <h2 className="text-xl font-semibold">{rest.name}</h2>
              <p className="text-gray-600">{rest.address}</p>
              <p className="text-yellow-500">⭐ {rest.rating}</p>
              <div className="mt-3">
                <Link
                  href={`/restaurants/${rest.id}`}
                  className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
                >
                  Select
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}