"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-context";
import { getMyOrders } from "@/lib/api";
import Link from "next/link";

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data: orders, error } = useSWR(
    user ? "my-orders" : null,
    getMyOrders
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?returnUrl=/orders");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">Error loading orders</div>;
  if (!orders) return <div className="p-8">Loading orders...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Orders</h1>
          <Link href="/" className="text-purple-600 hover:underline text-sm">
            Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {orders.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No orders yet.</p>
        ) : (
          orders.map((order: any) => {
            const total = order.items?.reduce((sum: number, item: any) => {
              const base = item.food?.basePrice ?? 0;
              const extras = item.selected
                ? item.selected.reduce((s: number, sel: any) => s + (sel.extraPrice || 0), 0)
                : 0;
              return sum + (base + extras) * (item.quantity ?? 1);
            }, 0) ?? 0;

            return (
              <div key={order.id} className="bg-white rounded-lg shadow-sm p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{order.restaurant?.name ?? "Unknown Restaurant"}</h3>
                    <p className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">£{total.toFixed(2)}</p>
                    <span
                      className={`text-xs px-2 py-1 rounded capitalize ${
                        order.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : order.status === "canceled"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
                {order.notes && (
                  <p className="text-sm text-gray-500 italic bg-gray-50 px-3 py-2 rounded">
                    Note: {order.notes}
                  </p>
                )}
                <div className="border-t pt-2">
                  {order.items?.map((item: any) => (
                    <p key={item.id} className="text-sm text-gray-600">
                      {item.food?.name ?? "Unknown"} x{item.quantity}
                      {item.selected?.length > 0 && (
                        <span className="text-gray-400">
                          {" "}({item.selected.map((s: any) => s.choiceLabel).join(", ")})
                        </span>
                      )}
                    </p>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
