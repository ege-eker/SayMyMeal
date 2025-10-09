export interface DeliveryZone {
  postcode: string;
  etaMinutes: number;
}

export interface Restaurant {
  id: string;
  name: string;

  houseNumber: string;
  street: string;
  city: string;
  postcode: string;
  deliveryZones: DeliveryZone[];
  rating?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRestaurantInput {
  name: string;
  houseNumber: string;
  street: string;
  city: string;
  postcode: string;
  deliveryZones: DeliveryZone[];
  rating?: number;
}

export interface UpdateRestaurantInput extends Partial<CreateRestaurantInput> {}