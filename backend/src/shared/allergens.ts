export const EU_ALLERGENS = [
  "celery",
  "gluten",
  "crustaceans",
  "eggs",
  "fish",
  "lupin",
  "milk",
  "molluscs",
  "mustard",
  "nuts",
  "peanuts",
  "sesame",
  "soybeans",
  "sulphites",
] as const;

export const DIET_TAGS = [
  "halal",
  "kosher",
  "vegetarian",
  "vegan",
  "diet",
] as const;

export type Allergen = (typeof EU_ALLERGENS)[number];
export type DietTag = (typeof DIET_TAGS)[number];

export function isValidAllergen(tag: string): tag is Allergen {
  return EU_ALLERGENS.includes(tag as Allergen);
}

export function isValidDietTag(tag: string): tag is DietTag {
  return DIET_TAGS.includes(tag as DietTag);
}
