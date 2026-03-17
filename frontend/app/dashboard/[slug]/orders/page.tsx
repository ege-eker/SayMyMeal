"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { useState, useMemo } from "react";
import { getRestaurantBySlug, getOrders, updateOrderStatus } from "@/lib/api";

const statusOptions = ["pending", "preparing", "delivering", "completed", "canceled"];

export default function DashboardOrdersPage() {
  const { slug } = useParams();
  const { data: restaurant } = useSWR(
    slug ? `dashboard-restaurant-${slug}` : null,
    () => getRestaurantBySlug(slug as string)
  );

  const restaurantId = restaurant?.id;
  const { data: orders, error, mutate } = useSWR(
    restaurantId ? `orders-${restaurantId}` : null,
    () => getOrders(restaurantId)
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!restaurant) return <div>Loading restaurant...</div>;
  if (error) return <div className="text-red-500">Error loading orders</div>;
  if (!orders) return <div>Loading orders...</div>;

  const handleStatusChange = async (id: string, status: string) => {
    setLoadingId(id);
    await updateOrderStatus(id, status);
    setLoadingId(null);
    mutate();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Orders — {restaurant.name}</h2>

      {orders.length === 0 ? (
        <p className="text-gray-500">No orders found.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
              loading={loadingId === order.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  onStatusChange,
  loading,
}: {
  order: any;
  onStatusChange: (id: string, status: string) => void;
  loading: boolean;
}) {
  const total = useMemo(() => {
    if (!order.items) return 0;
    return order.items.reduce((sum: number, item: any) => {
      const base = item.food?.basePrice ?? 0;
      const extras = item.selected
        ? item.selected.reduce((s: number, sel: any) => s + (sel.extraPrice || 0), 0)
        : 0;
      return sum + (base + extras) * (item.quantity ?? 1);
    }, 0);
  }, [order]);

  const addr = order.address;
  const addressStr = addr
    ? [addr.houseNumber, addr.street, addr.city, addr.postcode].filter(Boolean).join(", ")
    : "-";

  return (
    <div className="border rounded-lg bg-white shadow-sm p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{order.customer} ({order.phone})</h3>
          <p className="text-sm text-gray-500">{addressStr}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-green-600">£{total.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="border-t pt-2">
        {order.items?.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {order.items.map((item: any) => (
              <li key={item.id} className="py-1 flex justify-between text-sm">
                <span>
                  {item.food?.name ?? "Unknown"} x{item.quantity}
                  {item.selected?.length > 0 && (
                    <span className="text-gray-400 text-xs ml-1">
                      ({item.selected.map((s: any) => s.choiceLabel).join(", ")})
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No items</p>
        )}
      </div>

      <div className="flex justify-between items-center border-t pt-2">
        <span className="capitalize font-semibold">{order.status}</span>
        <select
          value={order.status}
          disabled={loading}
          onChange={(e) => onStatusChange(order.id, e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
