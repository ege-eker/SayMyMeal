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

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  celery: "Celery",
  gluten: "Gluten",
  crustaceans: "Crustaceans",
  eggs: "Eggs",
  fish: "Fish",
  lupin: "Lupin",
  milk: "Milk",
  molluscs: "Molluscs",
  mustard: "Mustard",
  nuts: "Tree Nuts",
  peanuts: "Peanuts",
  sesame: "Sesame",
  soybeans: "Soybeans",
  sulphites: "Sulphites",
};

export const DIET_LABELS: Record<DietTag, string> = {
  halal: "Halal",
  kosher: "Kosher",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  diet: "Diet",
};
