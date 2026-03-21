const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export async function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}

// ---- Auth ----

export async function registerUser(data: { email: string; password: string; name: string; phone?: string; role?: string }) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function getCurrentUser() {
  const res = await authFetch(`${API_URL}/auth/me`);
  return res.json();
}

// ---- Restaurants ----

export async function searchRestaurants(name?: string) {
  const url = name ? `${API_URL}/restaurants?name=${name}` : `${API_URL}/restaurants`;
  const res = await fetch(url);
  return res.json();
}

export async function getMenuForRestaurant(restaurantId: string) {
  const res = await fetch(`${API_URL}/restaurants/${restaurantId}`);
  return res.json();
}

export async function getRestaurantBySlug(slug: string) {
  const res = await fetch(`${API_URL}/restaurants/by-slug/${slug}`);
  if (!res.ok) return null;
  return res.json();
}

export async function getMyRestaurants() {
  const res = await authFetch(`${API_URL}/restaurants/my`);
  return res.json();
}

export async function createRestaurant(data: any) {
  const res = await authFetch(`${API_URL}/restaurants`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateRestaurant(id: string, data: any) {
  const res = await authFetch(`${API_URL}/restaurants/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteRestaurant(id: string) {
  await authFetch(`${API_URL}/restaurants/${id}`, { method: "DELETE" });
}

export async function activateRestaurant(id: string) {
  const res = await authFetch(`${API_URL}/restaurants/${id}/activate`, { method: "POST" });
  return res.json();
}

// ---- Menus ----

export async function getFoodsForMenu(menuId: string) {
  const res = await fetch(`${API_URL}/menus/${menuId}`);
  return res.json();
}

export async function createMenu(data: { name: string; restaurantId: string }) {
  const res = await authFetch(`${API_URL}/menus`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteMenu(id: string) {
  await authFetch(`${API_URL}/menus/${id}`, { method: "DELETE" });
}

// ---- Foods ----

export async function createFood(data: { name: string; basePrice: number; menuId: string }) {
  const res = await authFetch(`${API_URL}/foods`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteFood(id: string) {
  await authFetch(`${API_URL}/foods/${id}`, { method: "DELETE" });
}

// ---- Options ----

export async function getOptionsForFood(foodId: string) {
  const res = await fetch(`${API_URL}/foods/${foodId}/options`);
  return res.json();
}

export async function createOption(data: { title: string; multiple?: boolean; foodId: string }) {
  const res = await authFetch(`${API_URL}/foods/options`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function addChoice(data: { label: string; extraPrice?: number; optionId: string }) {
  const res = await authFetch(`${API_URL}/foods/options/choice`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteOption(id: string) {
  await authFetch(`${API_URL}/foods/options/${id}`, { method: "DELETE" });
}

export async function deleteChoice(id: string) {
  await authFetch(`${API_URL}/foods/options/choice/${id}`, { method: "DELETE" });
}

// ---- Image Upload ----

export async function uploadImage(
  entity: "foods" | "menus" | "restaurants",
  id: string,
  file: File
): Promise<{ imageUrl: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/${entity}/${id}/image`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed");
  }
  return res.json();
}

export async function removeImage(
  entity: "foods" | "menus" | "restaurants",
  id: string
): Promise<void> {
  const res = await authFetch(`${API_URL}/${entity}/${id}/image`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Remove failed" }));
    throw new Error(err.error || "Remove failed");
  }
}

// ---- Orders ----

export async function createOrder(data: {
  customer: string;
  phone: string;
  restaurantId: string;
  address: any;
  notes?: string;
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
  const res = await authFetch(`${API_URL}/orders`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getMyOrders() {
  const res = await authFetch(`${API_URL}/orders/my`);
  return res.json();
}

export async function getOrders(restaurantId?: string) {
  const url = restaurantId ? `${API_URL}/orders?restaurantId=${restaurantId}` : `${API_URL}/orders`;
  const res = await authFetch(url);
  return res.json();
}

export async function updateOrderStatus(id: string, status: string) {
  const res = await authFetch(`${API_URL}/orders/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function getOrderStatus(params: { phone?: string; name?: string }) {
  const url = new URL(`${API_URL}/orders/status`);
  if (params.phone) url.searchParams.append("phone", params.phone);
  if (params.name) url.searchParams.append("name", params.name);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to get order status (${res.status})`);
  return res.json();
}
