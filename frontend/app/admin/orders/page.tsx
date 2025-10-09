"use client";
import useSWR from "swr";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusOptions = ["pending", "preparing", "delivering", "completed", "canceled"];

export default function AdminOrdersPage() {
  const { data: orders, error, mutate } = useSWR(`${API_URL}/orders`, fetcher);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (error) return <div className="text-red-500">❌ Error loading orders</div>;
  if (!orders) return <div>⏳ Loading orders...</div>;

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

      <table className="table-auto w-full bg-white shadow rounded-lg text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-3">Customer</th>
            <th className="p-3">Phone</th>
            <th className="p-3 w-60">Address</th>
            <th className="p-3">Restaurant</th>
            <th className="p-3">Status</th>
            <th className="p-3">Delivery ETA</th>
            <th className="p-3">Change Status</th>
            <th className="p-3">Created</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o: any) => {
            const addr = o.address || {};
            return (
              <tr key={o.id} className="border-t">
                <td className="p-3 font-medium">{o.customer}</td>
                <td className="p-3">{o.phone ?? "-"}</td>
                <td className="p-3 w-60">
                  {addr.houseNumber || addr.street || addr.city ? (
                    <>
                      {addr.houseNumber ?? ""} {addr.street ?? ""},{" "}
                      {addr.city ?? ""}, {addr.postcode ?? ""}
                    </>
                  ) : (
                    <span className="text-gray-400">No address</span>
                  )}
                </td>
                <td className="p-3">{o.restaurant?.name ?? "-"}</td>
                <td className="p-3 font-semibold capitalize">{o.status}</td>
                <td className="p-3">
                  {o.etaMinutes ? `${o.etaMinutes} min` : "-"}
                </td>
                <td className="p-3">
                  <select
                    value={o.status}
                    disabled={loadingId === o.id}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                    className="border rounded px-2 py-1 focus:ring focus:ring-purple-300"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3 text-gray-500">
                  {new Date(o.createdAt).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}