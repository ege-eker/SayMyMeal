"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { updateAllergenProfile, getMyAddresses, createAddress, updateAddress, deleteAddress, type SavedAddress } from "@/lib/api";
import { EU_ALLERGENS, DIET_TAGS, ALLERGEN_LABELS, DIET_LABELS } from "@/lib/allergens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import useSWR from "swr";

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedDiet, setSelectedDiet] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: addresses, mutate: mutateAddresses } = useSWR(
    user ? "my-addresses" : null,
    getMyAddresses,
    { fallbackData: [] }
  );
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrForm, setAddrForm] = useState({ label: "", houseNumber: "", street: "", city: "", postcode: "" });
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrError, setAddrError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?returnUrl=/profile");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      setSelectedAllergens(user.allergens ?? []);
      setSelectedDiet(user.dietaryPreferences ?? []);
    }
  }, [user]);

  if (authLoading || !user) return <div className="p-8">Loading...</div>;

  const toggleAllergen = (tag: string) => {
    setSelectedAllergens(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
    setSaved(false);
  };

  const toggleDiet = (tag: string) => {
    setSelectedDiet(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
    setSaved(false);
  };

  const addrFormValid =
    addrForm.label.trim().length > 0 &&
    addrForm.houseNumber.trim().length > 0 &&
    addrForm.street.trim().length > 0 &&
    addrForm.city.trim().length > 0 &&
    addrForm.postcode.trim().length > 0;

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddrError("");
    setAddrSaving(true);
    try {
      await createAddress({
        label: addrForm.label.trim(),
        houseNumber: addrForm.houseNumber.trim(),
        street: addrForm.street.trim(),
        city: addrForm.city.trim(),
        postcode: addrForm.postcode.trim(),
        isDefault: (addresses?.length ?? 0) === 0,
      });
      await mutateAddresses();
      setAddrForm({ label: "", houseNumber: "", street: "", city: "", postcode: "" });
      setShowAddrForm(false);
    } catch (err: any) {
      setAddrError(err.message || "Failed to save address");
    } finally {
      setAddrSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAddress(id);
      await mutateAddresses();
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    try {
      await updateAddress(id, { isDefault: true });
      await mutateAddresses();
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAllergenProfile({ allergens: selectedAllergens, dietaryPreferences: selectedDiet });
      await refreshUser();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Profile</h1>
          <div className="flex gap-3 text-sm">
            <Link href="/orders" className="text-amber-600 hover:underline">
              Orders
            </Link>
            <Link href="/" className="text-amber-600 hover:underline">
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* User Info */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="font-semibold mb-2">Account</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            {user.phone && <p><strong>Phone:</strong> {user.phone}</p>}
          </div>
        </div>

        {/* Saved Addresses */}
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
          <h2 className="font-semibold">Saved Addresses</h2>

          {addresses && addresses.length === 0 && !showAddrForm && (
            <p className="text-sm text-gray-500">No saved addresses yet.</p>
          )}

          {addresses && addresses.map((addr: SavedAddress) => (
            <div key={addr.id} className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{addr.label}</p>
                  {addr.isDefault && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Default</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {addr.houseNumber} {addr.street}, {addr.city}, {addr.postcode}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
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
                  onClick={() => handleDeleteAddress(addr.id)}
                  disabled={deletingId === addr.id}
                  className="text-xs text-red-500 hover:underline disabled:opacity-50"
                >
                  {deletingId === addr.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}

          {showAddrForm ? (
            <form onSubmit={handleAddAddress} className="space-y-3 pt-1">
              {addrError && <p className="text-xs text-red-500">{addrError}</p>}
              <div className="space-y-1">
                <Label htmlFor="addr-label">Address Label</Label>
                <Input id="addr-label" placeholder="e.g. Home, Work" value={addrForm.label}
                  onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="addr-house">House Number</Label>
                  <Input id="addr-house" value={addrForm.houseNumber}
                    onChange={(e) => setAddrForm({ ...addrForm, houseNumber: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="addr-street">Street</Label>
                  <Input id="addr-street" value={addrForm.street}
                    onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="addr-city">City</Label>
                  <Input id="addr-city" value={addrForm.city}
                    onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="addr-postcode">Postcode</Label>
                  <Input id="addr-postcode" value={addrForm.postcode}
                    onChange={(e) => setAddrForm({ ...addrForm, postcode: e.target.value })} required />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={addrSaving || !addrFormValid} className="flex-1">
                  {addrSaving ? "Saving..." : "Save Address"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowAddrForm(false); setAddrError(""); }} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setShowAddrForm(true)}>
              + Add New Address
            </Button>
          )}
        </div>

        {/* Allergen Profile */}
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
          <h2 className="font-semibold">Allergen & Dietary Profile</h2>
          <p className="text-sm text-gray-500">
            Select your allergens and dietary preferences. We will warn you during checkout if any items conflict.
          </p>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Allergens</h4>
            <div className="flex flex-wrap gap-2">
              {EU_ALLERGENS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleAllergen(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedAllergens.includes(tag)
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {ALLERGEN_LABELS[tag]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Dietary Preferences</h4>
            <div className="flex flex-wrap gap-2">
              {DIET_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleDiet(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedDiet.includes(tag)
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {DIET_LABELS[tag]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            {saved && <span className="text-sm text-green-600">Saved successfully!</span>}
          </div>
        </div>
      </main>
    </div>
  );
}
