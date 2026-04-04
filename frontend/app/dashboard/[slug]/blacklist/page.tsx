"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";
import { getRestaurantBySlug, getBlacklist, addToBlacklist, removeFromBlacklist } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ConfirmDelete from "@/components/ConfirmDelete";
import { Ban, Trash2, ArrowLeft, Phone, ShieldAlert } from "lucide-react";
import Link from "next/link";

interface BlacklistEntry {
  id: string;
  phone: string;
  reason: string | null;
  restaurantId: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  createdAt: string;
}

export default function BlacklistPage() {
  const { slug } = useParams();
  const { data: restaurant } = useSWR(
    slug ? `dashboard-restaurant-${slug}` : null,
    () => getRestaurantBySlug(slug as string)
  );
  const { data: blacklist, mutate } = useSWR<BlacklistEntry[]>(
    restaurant?.id ? `blacklist-${restaurant.id}` : null,
    () => getBlacklist(restaurant.id)
  );

  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !restaurant) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await addToBlacklist({
        restaurantId: restaurant.id,
        phone: phone.trim(),
        reason: reason.trim() || undefined,
      });
      if (res.error) {
        setError(res.error);
      } else {
        setPhone("");
        setReason("");
        mutate();
      }
    } catch {
      setError("Failed to add to blacklist");
    }
    setSubmitting(false);
  };

  const handleRemove = async (id: string) => {
    await removeFromBlacklist(id);
    mutate();
  };

  if (!restaurant) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/${slug}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6" /> Blacklist
          </h1>
          <p className="text-sm text-gray-500">{restaurant.name}</p>
        </div>
      </div>

      {/* Add to blacklist form */}
      <form onSubmit={handleAdd} className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <h2 className="font-semibold">Add Phone Number</h2>
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+44 7123 456789"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Repeated no-shows"
            />
          </div>
        </div>
        <Button type="submit" disabled={submitting || !phone.trim()} variant="destructive">
          <Ban className="w-4 h-4 mr-1" />
          {submitting ? "Adding..." : "Add to Blacklist"}
        </Button>
      </form>

      {/* Blacklist table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold">
            Blacklisted Numbers ({blacklist?.length ?? 0})
          </h2>
        </div>
        {!blacklist || blacklist.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Phone className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No blacklisted numbers</p>
          </div>
        ) : (
          <div className="divide-y">
            {blacklist.map((entry) => (
              <div key={entry.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="space-y-1 min-w-0">
                  <p className="font-mono font-medium">{entry.phone}</p>
                  {entry.reason && (
                    <p className="text-sm text-gray-500">{entry.reason}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    <span>Added: {new Date(entry.createdAt).toLocaleDateString()}</span>
                    <span>Attempts blocked: {entry.attemptCount}</span>
                    {entry.lastAttemptAt && (
                      <span>Last attempt: {new Date(entry.lastAttemptAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <ConfirmDelete
                  title="Remove from blacklist?"
                  description="This person will be able to order from your restaurant again."
                  onConfirm={() => handleRemove(entry.id)}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Trash2 className="w-4 h-4 mr-1" /> Remove
                    </Button>
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
