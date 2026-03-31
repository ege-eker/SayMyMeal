"use client";

import { useState, useCallback } from "react";
import { EU_ALLERGENS, DIET_TAGS, ALLERGEN_LABELS, DIET_LABELS } from "@/lib/allergens";
import { updateFood } from "@/lib/api";

interface AllergenTagEditorProps {
  foodId: string;
  allergens: string[];
  dietTags: string[];
  onUpdate?: () => void;
}

export default function AllergenTagEditor({ foodId, allergens, dietTags, onUpdate }: AllergenTagEditorProps) {
  const [selected, setSelected] = useState<string[]>(allergens ?? []);
  const [selectedDiet, setSelectedDiet] = useState<string[]>(dietTags ?? []);
  const [saving, setSaving] = useState(false);

  const save = useCallback(async (newAllergens: string[], newDietTags: string[]) => {
    setSaving(true);
    try {
      await updateFood(foodId, { allergens: newAllergens, dietTags: newDietTags });
      onUpdate?.();
    } finally {
      setSaving(false);
    }
  }, [foodId, onUpdate]);

  const toggleAllergen = (tag: string) => {
    const next = selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag];
    setSelected(next);
    save(next, selectedDiet);
  };

  const toggleDiet = (tag: string) => {
    const next = selectedDiet.includes(tag) ? selectedDiet.filter(t => t !== tag) : [...selectedDiet, tag];
    setSelectedDiet(next);
    save(selected, next);
  };

  return (
    <div className={`space-y-2 ${saving ? "opacity-60" : ""}`}>
      <div>
        <span className="text-xs font-medium text-gray-500 mr-2">Allergens:</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {EU_ALLERGENS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleAllergen(tag)}
              className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                selected.includes(tag)
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {ALLERGEN_LABELS[tag]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="text-xs font-medium text-gray-500 mr-2">Diet:</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {DIET_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleDiet(tag)}
              className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                selectedDiet.includes(tag)
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {DIET_LABELS[tag]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
