export interface Food {
  id: string;
  name: string;
  price: number;
  menuId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFoodInput {
  name: string;
  price: number;
  menuId: string;
}

export interface UpdateFoodInput {
  name?: string;
  price?: number;
}