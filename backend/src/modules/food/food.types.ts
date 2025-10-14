export interface Food {
  id: string;
  name: string;
  basePrice: number;
  menuId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFoodInput {
  name: string;
  basePrice: number;
  menuId: string;
}

export interface UpdateFoodInput {
  name?: string;
  basePrice?: number;
}