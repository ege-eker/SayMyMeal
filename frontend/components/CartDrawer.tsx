"use client";

import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const cart = useCart();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold">Your Cart</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            X
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Your cart is empty</p>
          ) : (
            <div className="space-y-3">
              {cart.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start border-b pb-3">
                  <div className="flex-1">
                    <h3 className="font-medium">{item.foodName}</h3>
                    {item.selectedOptions.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {item.selectedOptions.map((o) => o.choiceLabel).join(", ")}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0"
                        onClick={() =>
                          cart.updateQuantity(item.foodId, item.selectedOptions, item.quantity - 1)
                        }
                      >
                        -
                      </Button>
                      <span className="text-sm">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0"
                        onClick={() =>
                          cart.updateQuantity(item.foodId, item.selectedOptions, item.quantity + 1)
                        }
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      £{(
                        (item.basePrice + item.selectedOptions.reduce((s, o) => s + o.extraPrice, 0)) *
                        item.quantity
                      ).toFixed(2)}
                    </p>
                    <button
                      className="text-red-500 text-xs hover:underline"
                      onClick={() => cart.removeItem(item.foodId, item.selectedOptions)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>£{cart.totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              <Link href={`/${cart.restaurantSlug}/cart`} className="flex-1" onClick={onClose}>
                <Button variant="outline" className="w-full">
                  View Cart
                </Button>
              </Link>
              <Link href={`/${cart.restaurantSlug}/checkout`} className="flex-1" onClick={onClose}>
                <Button className="w-full">Checkout</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
