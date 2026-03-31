"use client";

import { ALLERGEN_LABELS, DIET_LABELS } from "@/lib/allergens";
import type { Allergen, DietTag } from "@/lib/allergens";

interface AllergenBadgesProps {
  allergens?: string[];
  dietTags?: string[];
  compact?: boolean;
}

export default function AllergenBadges({ allergens = [], dietTags = [], compact = false }: AllergenBadgesProps) {
  if (!allergens.length && !dietTags.length) return null;

  const cls = compact ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5";

  return (
    <div className="flex flex-wrap gap-1">
      {dietTags.map(tag => (
        <span key={tag} className={`rounded-full font-medium bg-green-100 text-green-700 ${cls}`}>
          {DIET_LABELS[tag as DietTag] ?? tag}
        </span>
      ))}
      {allergens.map(tag => (
        <span key={tag} className={`rounded-full font-medium bg-amber-100 text-amber-700 ${cls}`}>
          {ALLERGEN_LABELS[tag as Allergen] ?? tag}
        </span>
      ))}
    </div>
  );
}
