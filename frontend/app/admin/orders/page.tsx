"use client";

import useSWR from "swr";
import { useState, useMemo } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const fetcher = (url: string) => fetch(url).then((res) => res.json());
const statusOptions = ["pending", "preparing", "delivering", "completed", "canceled"];

export default function AdminOrdersPage() {
  const { data: orders, error, mutate } = useSWR(`${API_URL}/orders`, fetcher);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (error) return <div className="text-red-500">❌ Error loading orders</div>;
  if (!orders) return <div>⏳ Loading...</div>;

  const updateStatus = async (id: string, status: string) => {
    setLoadingId(id);
    await fetch(`${API_URL}/orders/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoadingId(null);
    mutate();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">📦 Orders Management</h2>

      {orders.length === 0 ? (
        <p className="text-gray-600">No orders found.</p>
      ) : (
        <div className="space-y-4">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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

/* ---------- Order Card ---------- */
function OrderCard({
  order,
  onStatusChange,
  loading,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any;
  onStatusChange: (id: string, status: string) => void;
  loading: boolean;
}) {
  const total = useMemo(() => calculateTotal(order), [order]);

  return (
    <div className="border rounded-lg bg-white shadow-sm hover:shadow-md transition p-4 space-y-3">
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">
            👤 {order.customer}{" "}
            <span className="text-gray-500 text-sm ml-1">
              ({order.phone})
            </span>
          </h3>
          <p className="text-sm text-gray-600">
            🏠 {renderAddress(order.address)}
          </p>
          <p className="text-sm text-gray-500">
            🍴 {order.restaurant?.name ?? "N/A"}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-green-600 text-lg">£{total.toFixed(2)}</p>
          <p className="text-xs text-gray-400">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* ITEMS */}
      <div className="border-t pt-2">
        {order.items && order.items.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {order.items.map((item: any) => (
              <li
                key={item.id}
                className="py-2 flex justify-between text-sm text-gray-800"
              >
                <div>
                  <span className="font-medium">
                    {item.food?.name ?? "Unknown"} ×{item.quantity}
                  </span>
                  {item.selected && item.selected.length > 0 && (
                    <div className="text-gray-600 text-xs mt-1">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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

      {/* FOOTER / STATUS */}
      <div className="flex justify-between items-center border-t pt-2">
        <span className={`capitalize font-semibold text-${statusColor(order.status)}`}>
          {renderStatusLabel(order.status)}
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

/* ---------- Helpers ---------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateItemPrice(item: any): number {
  const base = item.food?.basePrice ?? item.food?.price ?? 0;
  const extras = item.selected
    ? item.selected.reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (sum: number, s: any) => sum + (s.extraPrice || 0),
        0
      )
    : 0;
  return (base + extras) * (item.quantity ?? 1);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateTotal(order: any): number {
  if (!order.items) return 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return order.items.reduce((sum: number, i: any) => sum + calculateItemPrice(i), 0);
}

function statusColor(status: string) {
  switch (status) {
    case "pending":
      return "yellow-600";
    case "preparing":
      return "orange-600";
    case "delivering":
      return "blue-600";
    case "completed":
      return "green-600";
    case "canceled":
      return "red-600";
    default:
      return "gray-500";
  }
}

function renderStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "⏳ Pending";
    case "preparing":
      return "👨‍🍳 Preparing";
    case "delivering":
      return "🚚 Delivering";
    case "completed":
      return "✅ Completed";
    case "canceled":
      return "❌ Canceled";
    default:
      return status;
  }
}