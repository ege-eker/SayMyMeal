export interface Menu {
  id: string;
  name: string;
  imageUrl?: string | null;
  restaurantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMenuInput {
  name: string;
  restaurantId: string;
}

export interface UpdateMenuInput {
  name?: string;
}