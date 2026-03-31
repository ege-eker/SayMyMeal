export interface Food {
  id: string;
  name: string;
  imageUrl?: string | null;
  basePrice: number;
  allergens: string[];
  dietTags: string[];
  menuId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFoodInput {
  name: string;
  basePrice: number;
  menuId: string;
  allergens?: string[];
  dietTags?: string[];
}

export interface UpdateFoodInput {
  name?: string;
  basePrice?: number;
  allergens?: string[];
  dietTags?: string[];
}