"use client";

import useSWR from "swr";
import { useState, useMemo } from "react";
import { authFetch } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const statusOptions = ["pending", "preparing", "delivering", "completed", "canceled"];

export default function AdminOrdersPage() {
  const fetcher = async (url: string) => {
    const res = await authFetch(url);
    return res.json();
  };
  const { data: orders, error, mutate } = useSWR(`${API_URL}/orders`, fetcher);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (error) return <div className="text-red-500">Error loading orders</div>;
  if (!orders) return <div>Loading...</div>;

  const updateStatus = async (id: string, status: string) => {
    setLoadingId(id);
    await authFetch(`${API_URL}/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    setLoadingId(null);
    mutate();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Orders Management</h2>

      {orders.length === 0 ? (
        <p className="text-gray-600">No orders found.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={updateStatus}
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
  const total = useMemo(() => calculateTotal(order), [order]);

  return (
    <div className="border rounded-lg bg-white shadow-sm hover:shadow-md transition p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">
            {order.customer}{" "}
            <span className="text-gray-500 text-sm ml-1">
              ({order.phone})
            </span>
          </h3>
          <p className="text-sm text-gray-600">
            {renderAddress(order.address)}
          </p>
          <p className="text-sm text-gray-500">
            {order.restaurant?.name ?? "N/A"}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-green-600 text-lg">£{total.toFixed(2)}</p>
          <p className="text-xs text-gray-400">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="border-t pt-2">
        {order.items && order.items.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {order.items.map((item: any) => (
              <li
                key={item.id}
                className="py-2 flex justify-between text-sm text-gray-800"
              >
                <div>
                  <span className="font-medium">
                    {item.food?.name ?? "Unknown"} x{item.quantity}
                  </span>
                  {item.selected && item.selected.length > 0 && (
                    <div className="text-gray-600 text-xs mt-1">
                      {item.selected.map((sel: any, idx: number) => (
                        <span key={idx}>
                          {sel.optionTitle}: {sel.choiceLabel}
                          {sel.extraPrice ? (
                            <span className="text-gray-400">
                              {" "}
                              (+£{sel.extraPrice})
                            </span>
                          ) : null}
                          {idx < item.selected.length - 1 ? " | " : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right text-sm text-gray-700">
                  £{calculateItemPrice(item).toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 italic">No items</p>
        )}
      </div>

      <div className="flex justify-between items-center border-t pt-2">
        <span className="capitalize font-semibold">
          {order.status}
        </span>

        <select
          value={order.status}
          disabled={loading}
          onChange={(e) => onStatusChange(order.id, e.target.value)}
          className="border rounded px-2 py-1 text-sm focus:ring focus:ring-purple-300"
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

function renderAddress(addr: any) {
  if (!addr) return "-";
  const parts = [
    addr.houseNumber,
    addr.street,
    addr.city,
    addr.postcode,
    addr.country,
  ].filter(Boolean);
  return parts.join(", ");
}

function calculateItemPrice(item: any): number {
  const base = item.food?.basePrice ?? item.food?.price ?? 0;
  const extras = item.selected
    ? item.selected.reduce(
        (sum: number, s: any) => sum + (s.extraPrice || 0),
        0
      )
    : 0;
  return (base + extras) * (item.quantity ?? 1);
}

function calculateTotal(order: any): number {
  if (!order.items) return 0;
  return order.items.reduce((sum: number, i: any) => sum + calculateItemPrice(i), 0);
}
