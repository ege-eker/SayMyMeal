"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-context";
import { getMyAddresses, createAddress, updateAddress, deleteAddress, type SavedAddress } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function AddressesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data: addresses, mutate } = useSWR(
    user ? "my-addresses" : null,
    getMyAddresses,
    { fallbackData: [] }
  );

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", houseNumber: "", street: "", city: "", postcode: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login?returnUrl=/addresses");
  }, [authLoading, user, router]);

  if (authLoading || !user) return <div className="p-8">Loading...</div>;

  const formValid =
    form.label.trim().length > 0 &&
    form.houseNumber.trim().length > 0 &&
    form.street.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.postcode.trim().length > 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await createAddress({
        label: form.label.trim(),
        houseNumber: form.houseNumber.trim(),
        street: form.street.trim(),
        city: form.city.trim(),
        postcode: form.postcode.trim(),
        isDefault: (addresses?.length ?? 0) === 0,
      });
      await mutate();
      setForm({ label: "", houseNumber: "", street: "", city: "", postcode: "" });
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAddress(id);
      await mutate();
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    try {
      await updateAddress(id, { isDefault: true });
      await mutate();
    } finally {
      setSettingDefaultId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href="/orders" className="text-sm text-amber-600 hover:underline">
            ← Back to Orders
          </Link>
          <h1 className="text-2xl font-bold mt-1">Saved Addresses</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {addresses && addresses.length === 0 && !showForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
            No saved addresses yet.
          </div>
        )}

        {addresses && addresses.map((addr: SavedAddress) => (
          <div
            key={addr.id}
            className="bg-white rounded-lg shadow-sm p-4 flex items-start justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium">{addr.label}</p>
                {addr.isDefault && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    Default
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                {addr.houseNumber} {addr.street}, {addr.city}, {addr.postcode}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!addr.isDefault && (
                <button
                  onClick={() => handleSetDefault(addr.id)}
                  disabled={settingDefaultId === addr.id}
                  className="text-xs text-amber-600 hover:underline disabled:opacity-50"
                >
                  {settingDefaultId === addr.id ? "Saving..." : "Set default"}
                </button>
              )}
              <button
                onClick={() => handleDelete(addr.id)}
                disabled={deletingId === addr.id}
                className="text-xs text-red-500 hover:underline disabled:opacity-50"
              >
                {deletingId === addr.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ))}

        {showForm ? (
          <form
            onSubmit={handleAdd}
            className="bg-white rounded-lg shadow-sm p-4 space-y-3"
          >
            <h2 className="font-semibold">New Address</h2>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
            )}

            <div className="space-y-1">
              <Label htmlFor="label">Address Label</Label>
              <Input
                id="label"
                placeholder="e.g. Home, Work"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="houseNumber">House Number</Label>
                <Input
                  id="houseNumber"
                  value={form.houseNumber}
                  onChange={(e) => setForm({ ...form, houseNumber: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="street">Street</Label>
                <Input
                  id="street"
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  placeholder="e.g. SW1A 2BC"
                  value={form.postcode}
                  onChange={(e) => setForm({ ...form, postcode: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-500">UK format: SW1A 2BC or M1 1AE</p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saving || !formValid} className="flex-1">
                {saving ? "Saving..." : "Save Address"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowForm(false); setError(""); }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button
            onClick={() => setShowForm(true)}
            variant="outline"
            className="w-full"
          >
            + Add New Address
          </Button>
        )}
      </main>
    </div>
  );
}
