"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface CartItemOption {
  optionId: string;
  optionTitle: string;
  choiceId: string;
  choiceLabel: string;
  extraPrice: number;
}

export interface CartItem {
  foodId: string;
  foodName: string;
  basePrice: number;
  quantity: number;
  selectedOptions: CartItemOption[];
}

interface CartContextType {
  items: CartItem[];
  restaurantId: string | null;
  restaurantSlug: string | null;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (foodId: string, selectedOptions: CartItemOption[]) => void;
  updateQuantity: (foodId: string, selectedOptions: CartItemOption[], quantity: number) => void;
  clearCart: () => void;
  setRestaurant: (id: string, slug: string) => void;
  totalPrice: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

function getCartKey(restaurantId: string) {
  return `cart_${restaurantId}`;
}

function optionsKey(opts: CartItemOption[]): string {
  return opts.map((o) => `${o.optionId}:${o.choiceId}`).sort().join("|");
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null);

  // Load cart from localStorage when restaurant changes
  useEffect(() => {
    if (restaurantId) {
      const stored = localStorage.getItem(getCartKey(restaurantId));
      setItems(stored ? JSON.parse(stored) : []);
    }
  }, [restaurantId]);

  // Persist to localStorage on change
  useEffect(() => {
    if (restaurantId) {
      localStorage.setItem(getCartKey(restaurantId), JSON.stringify(items));
    }
  }, [items, restaurantId]);

  const setRestaurant = useCallback((id: string, slug: string) => {
    setRestaurantId(id);
    setRestaurantSlug(slug);
  }, []);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const key = optionsKey(item.selectedOptions);
      const existing = prev.find(
        (i) => i.foodId === item.foodId && optionsKey(i.selectedOptions) === key
      );
      if (existing) {
        return prev.map((i) =>
          i.foodId === item.foodId && optionsKey(i.selectedOptions) === key
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
  }, []);

  const removeItem = useCallback((foodId: string, selectedOptions: CartItemOption[]) => {
    const key = optionsKey(selectedOptions);
    setItems((prev) => prev.filter((i) => !(i.foodId === foodId && optionsKey(i.selectedOptions) === key)));
  }, []);

  const updateQuantity = useCallback((foodId: string, selectedOptions: CartItemOption[], quantity: number) => {
    if (quantity <= 0) {
      removeItem(foodId, selectedOptions);
      return;
    }
    const key = optionsKey(selectedOptions);
    setItems((prev) =>
      prev.map((i) =>
        i.foodId === foodId && optionsKey(i.selectedOptions) === key
          ? { ...i, quantity }
          : i
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    if (restaurantId) {
      localStorage.removeItem(getCartKey(restaurantId));
    }
  }, [restaurantId]);

  const totalPrice = items.reduce((sum, item) => {
    const optExtra = item.selectedOptions.reduce((s, o) => s + o.extraPrice, 0);
    return sum + (item.basePrice + optExtra) * item.quantity;
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        restaurantId,
        restaurantSlug,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        setRestaurant,
        totalPrice,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
