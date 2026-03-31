"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-context";
import { getMyOrders } from "@/lib/api";
import AllergenPromptModal from "@/components/AllergenPromptModal";
import Link from "next/link";
import { MapPin, StickyNote } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function statusStyle(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700";
    case "canceled":
      return "bg-red-100 text-red-700";
    case "preparing":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

function formatAddress(addr: any) {
  if (!addr) return null;
  const parts = [addr.houseNumber, addr.street, addr.city, addr.postcode].filter(Boolean);
  return parts.join(", ");
}

export default function MyOrdersPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
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
      {/* Allergen prompt after first order */}
      {user && user.allergenAsked === false && orders && orders.length > 0 && (
        <AllergenPromptModal onComplete={() => refreshUser()} />
      )}

      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Orders</h1>
          <Link href="/" className="text-amber-600 hover:underline text-sm">
            Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
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

            const address = formatAddress(order.address);
            const restaurantImg = order.restaurant?.imageUrl
              ? `${API_URL}${order.restaurant.imageUrl}`
              : null;

            return (
              <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Restaurant header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50/50">
                  {restaurantImg ? (
                    <img
                      src={restaurantImg}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="text-amber-600 font-bold text-sm">
                        {(order.restaurant?.name ?? "?")[0]}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {order.restaurant?.name ?? "Unknown Restaurant"}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusStyle(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Order items */}
                <div className="px-4 py-3 space-y-3">
                  {order.items?.map((item: any) => {
                    const base = item.food?.basePrice ?? 0;
                    const extras = item.selected
                      ? item.selected.reduce((s: number, sel: any) => s + (sel.extraPrice || 0), 0)
                      : 0;
                    const itemTotal = (base + extras) * (item.quantity ?? 1);
                    const foodImg = item.food?.imageUrl
                      ? `${API_URL}${item.food.imageUrl}`
                      : null;

                    return (
                      <div key={item.id} className="flex items-start gap-3">
                        {foodImg ? (
                          <img
                            src={foodImg}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-sm">
                                {item.food?.name ?? "Unknown"}{" "}
                                <span className="text-gray-400">x{item.quantity}</span>
                              </p>
                              {item.selected?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.selected.map((sel: any, i: number) => (
                                    <span
                                      key={i}
                                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                                    >
                                      {sel.choiceLabel}
                                      {sel.extraPrice > 0 && (
                                        <span className="text-gray-400 ml-1">
                                          +£{sel.extraPrice.toFixed(2)}
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-700 shrink-0">
                              £{itemTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer: address, notes, total */}
                <div className="px-4 py-3 border-t bg-gray-50/50 space-y-2">
                  {address && (
                    <div className="flex items-start gap-2 text-sm text-gray-500">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="break-words">{address}</span>
                    </div>
                  )}
                  {order.notes && (
                    <div className="flex items-start gap-2 text-sm text-gray-500 italic">
                      <StickyNote className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{order.notes}</span>
                    </div>
                  )}
                  <div className="flex justify-end pt-1">
                    <span className="font-bold text-green-700 text-lg">
                      £{total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
