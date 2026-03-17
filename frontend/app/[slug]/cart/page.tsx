"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import useSWR from "swr";
import { getRestaurantBySlug } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CartPage() {
  const { slug } = useParams();
  const router = useRouter();
  const cart = useCart();
  const { data: restaurant } = useSWR(
    slug ? `restaurant-${slug}` : null,
    () => getRestaurantBySlug(slug as string)
  );

  useEffect(() => {
    if (restaurant) {
      cart.setRestaurant(restaurant.id, restaurant.slug);
    }
  }, [restaurant]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <Link href={`/${slug}`} className="text-sm text-purple-600 hover:underline">
              Back to Menu
            </Link>
            <h1 className="text-2xl font-bold">Your Cart</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {cart.items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Your cart is empty</p>
            <Link href={`/${slug}`}>
              <Button>Browse Menu</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm divide-y">
              {cart.items.map((item, idx) => (
                <div key={idx} className="p-4 flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-medium">{item.foodName}</h3>
                    {item.selectedOptions.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {item.selectedOptions.map((o) => o.choiceLabel).join(", ")}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      £{item.basePrice.toFixed(2)}
                      {item.selectedOptions.reduce((s, o) => s + o.extraPrice, 0) > 0 &&
                        ` + £${item.selectedOptions.reduce((s, o) => s + o.extraPrice, 0).toFixed(2)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          cart.updateQuantity(item.foodId, item.selectedOptions, item.quantity - 1)
                        }
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          cart.updateQuantity(item.foodId, item.selectedOptions, item.quantity + 1)
                        }
                      >
                        +
                      </Button>
                    </div>
                    <span className="font-semibold w-20 text-right">
                      £{(
                        (item.basePrice + item.selectedOptions.reduce((s, o) => s + o.extraPrice, 0)) *
                        item.quantity
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span>£{cart.totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => cart.clearCart()} className="flex-1">
                Clear Cart
              </Button>
              <Link href={`/${slug}/checkout`} className="flex-1">
                <Button className="w-full">Proceed to Checkout</Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
