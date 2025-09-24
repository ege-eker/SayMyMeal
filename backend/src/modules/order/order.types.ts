export interface Order {
    id: string;
    customer: string;
    address: string;
    status: OrderStatus;
    items: OrderItem[];
    totalPrice: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderItem {
    id: string;
    foodId: string;
    quantity: number;
}

export type OrderStatus = "pending" | "preparing" | "delivering" | "completed" | "canceled";

export interface CreateOrderItemInput {
    foodId: string;
    quantity: number;
}

export interface CreateOrderInput {
    customer: string;
    address: string;
    items: CreateOrderItemInput[];
}

export interface UpdateOrderStatusInput {
    status: OrderStatus;
}