export interface Restaurant {
    id: string;
    name: string;
    address: string;
    rating?: number | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateRestaurantInput {
    name: string;
    address: string;
    rating?: number;
}

export interface UpdateRestaurantInput {
    name?: string;
    address?: string;
    rating?: number;
}