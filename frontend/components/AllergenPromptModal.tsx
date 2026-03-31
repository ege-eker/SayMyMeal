"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EU_ALLERGENS, DIET_TAGS, ALLERGEN_LABELS, DIET_LABELS } from "@/lib/allergens";
import { updateAllergenProfile } from "@/lib/api";

interface AllergenPromptModalProps {
  onComplete: () => void;
}

export default function AllergenPromptModal({ onComplete }: AllergenPromptModalProps) {
  const [open, setOpen] = useState(true);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedDiet, setSelectedDiet] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleAllergen = (tag: string) => {
    setSelectedAllergens(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleDiet = (tag: string) => {
    setSelectedDiet(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAllergenProfile({ allergens: selectedAllergens, dietaryPreferences: selectedDiet });
      setOpen(false);
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await updateAllergenProfile({ allergens: [], dietaryPreferences: [] });
      setOpen(false);
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-lg font-bold">Do you have any food allergies?</DialogTitle>
        <p className="text-sm text-gray-500">
          Help us keep you safe. Select any allergens or dietary preferences below. We will warn you if your future orders contain these items.
        </p>

        <div className="space-y-4 mt-4">
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
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={handleSkip} disabled={saving}>
            No allergies / Skip
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
