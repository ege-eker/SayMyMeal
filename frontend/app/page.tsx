"use client";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-red-500 to-yellow-300 text-white">
      <h1 className="text-5xl font-bold mb-6">🍔 Voice Ordering Assistant</h1>
      <p className="mb-6 text-xl text-center max-w-lg">
        Welcome to Restaurant Voice Ordering Assistant!
        <br />
        First select a restaurant to start your order.
      </p>

      <div className="flex space-x-4">
        <Link
          href="/restaurants"
          className="bg-white text-purple-700 px-6 py-3 rounded-lg font-semibold shadow-lg hover:bg-gray-100 transition"
        >
            View Restaurants
        </Link>
      </div>
      <div className="flex space-x-4">
        <Link
          href="/admin/restaurants"
          className="bg-white text-purple-700 px-6 py-3 rounded-lg font-semibold shadow-lg hover:bg-gray-100 transition"
        >
          Admin Panel
        </Link>
      </div>
    </main>
  );
}