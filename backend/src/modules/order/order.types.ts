export interface UKAddress {
  houseNumber: string;
  street: string;
  city: string;
  postcode: string;
  country?: string;
}

export interface Order {
  id: string;
  customer: string;
  phone: string;
  address: UKAddress;
  status: OrderStatus;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  foodId: string;
  quantity: number;
}

export type OrderStatus = | "pending" | "preparing" | "delivering" | "completed" | "canceled";

export interface CreateOrderItemInput {
  foodId: string;
  quantity: number;
  selectedOptions?: {
    optionId: string;
    optionTitle?: string;
    choiceId: string;
    choiceLabel?: string;
    extraPrice?: number;
  }[];
}

export interface CreateOrderInput {
  customer: string;
  phone: string;
  address: UKAddress;
  restaurantId: string;
  items: CreateOrderItemInput[];
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
}