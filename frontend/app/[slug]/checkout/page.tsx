"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { getRestaurantBySlug, createOrder } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function CheckoutPage() {
  const { slug } = useParams();
  const router = useRouter();
  const cart = useCart();
  const { user, loading: authLoading } = useAuth();
  const { data: restaurant } = useSWR(
    slug ? `restaurant-${slug}` : null,
    () => getRestaurantBySlug(slug as string)
  );

  const [address, setAddress] = useState({
    houseNumber: "",
    street: "",
    city: "",
    postcode: "",
  });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (restaurant) {
      cart.setRestaurant(restaurant.id, restaurant.slug);
    }
  }, [restaurant]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?returnUrl=/${slug}/checkout`);
    }
  }, [authLoading, user, router, slug]);

  if (authLoading || !user) return <div className="p-8">Loading...</div>;
  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <Link href={`/${slug}`}>
            <Button>Browse Menu</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const orderData = {
        customer: user.name,
        phone: user.phone || "",
        restaurantId: cart.restaurantId!,
        address,
        notes: notes.trim() || undefined,
        items: cart.items.map((item) => ({
          foodId: item.foodId,
          quantity: item.quantity,
          selectedOptions: item.selectedOptions.length > 0 ? item.selectedOptions : undefined,
        })),
      };
      const result = await createOrder(orderData);
      if (result.error) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      cart.clearCart();
      router.push("/orders");
    } catch (err: any) {
      setError(err.message || "Failed to place order");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href={`/${slug}/cart`} className="text-sm text-purple-600 hover:underline">
            Back to Cart
          </Link>
          <h1 className="text-2xl font-bold">Checkout</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="font-semibold mb-3">Order Summary</h2>
          <div className="divide-y">
            {cart.items.map((item, idx) => (
              <div key={idx} className="py-2 flex justify-between text-sm">
                <div>
                  <span>{item.foodName} x{item.quantity}</span>
                  {item.selectedOptions.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {item.selectedOptions.map((o) => o.choiceLabel).join(", ")}
                    </p>
                  )}
                </div>
                <span>
                  £{(
                    (item.basePrice + item.selectedOptions.reduce((s, o) => s + o.extraPrice, 0)) *
                    item.quantity
                  ).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t pt-2 mt-2 flex justify-between font-bold">
            <span>Total</span>
            <span>£{cart.totalPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Delivery Address */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-4 space-y-4">
          <h2 className="font-semibold">Delivery Address</h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="houseNumber">House Number</Label>
              <Input
                id="houseNumber"
                value={address.houseNumber}
                onChange={(e) => setAddress({ ...address, houseNumber: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="street">Street</Label>
              <Input
                id="street"
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={address.postcode}
                onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Order Notes</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special requests..."
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Placing Order..." : "Place Order"}
          </Button>
        </form>
      </main>
    </div>
  );
}
