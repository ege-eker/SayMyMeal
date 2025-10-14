const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function searchRestaurants(name?: string) {
  const url = name ? `${API_URL}/restaurants?name=${name}` : `${API_URL}/restaurants`;
  const res = await fetch(url);
  return res.json();
}

export async function getMenuForRestaurant(restaurantId: string) {
  const res = await fetch(`${API_URL}/restaurants/${restaurantId}`);
  return res.json();
}

export async function getFoodsForMenu(menuId: string) {
    const res = await fetch(`${API_URL}/menus/${menuId}`);
    return res.json();
}

export async function getOptionsForFood(foodId: string) {
    const res = await fetch(`${API_URL}/foods/${foodId}/options`);
    return res.json();
}

export async function createOrder(data: {
  customer: string;
  phone: string;
  restaurantId: string;
  address: any;
  items: {
    foodId: string;
    quantity: number;
    selectedOptions?: {
      optionId: string;
      optionTitle?: string;
      choiceId: string;
      choiceLabel?: string;
      extraPrice?: number;
    }[];
  }[];
}) {
  const res = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getOrderStatus(params: { phone?: string; name?: string }) {
  const url = new URL(`${API_URL}/orders/status`);
  if (params.phone) url.searchParams.append("phone", params.phone);
  if (params.name)  url.searchParams.append("name", params.name);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to get order status (${res.status})`);
  return res.json();
}