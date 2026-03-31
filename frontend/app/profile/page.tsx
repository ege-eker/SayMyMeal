"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { updateAllergenProfile } from "@/lib/api";
import { EU_ALLERGENS, DIET_TAGS, ALLERGEN_LABELS, DIET_LABELS } from "@/lib/allergens";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedDiet, setSelectedDiet] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
