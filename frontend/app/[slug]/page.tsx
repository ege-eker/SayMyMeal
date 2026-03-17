"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { getRestaurantBySlug } from "@/lib/api";
import { useCart, CartItemOption } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import CartDrawer from "@/components/CartDrawer";
import Link from "next/link";

export default function RestaurantMenuPage() {
  const { slug } = useParams();
  const { data: restaurant, error } = useSWR(
    slug ? `restaurant-${slug}` : null,
    () => getRestaurantBySlug(slug as string)
  );
  const cart = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [optionModal, setOptionModal] = useState<any>(null);
  const [selectedOptions, setSelectedOptions] = useState<CartItemOption[]>([]);
  const [addQuantity, setAddQuantity] = useState(1);

  useEffect(() => {
    if (restaurant) {
      cart.setRestaurant(restaurant.id, restaurant.slug);
    }
  }, [restaurant]);

  if (error) return <div className="p-8 text-red-500">Error loading restaurant</div>;
  if (!restaurant) return <div className="p-8">Loading...</div>;
  if (restaurant.message) return <div className="p-8 text-center text-gray-500">Restaurant not found</div>;

  const handleAddToCart = (food: any) => {
    if (food.options && food.options.length > 0) {
      setOptionModal(food);
      setSelectedOptions([]);
      setAddQuantity(1);
    } else {
      cart.addItem({
        foodId: food.id,
        foodName: food.name,
        basePrice: food.basePrice,
        selectedOptions: [],
      });
    }
  };

  const handleConfirmOptions = () => {
    if (!optionModal) return;
    cart.addItem(
      {
        foodId: optionModal.id,
        foodName: optionModal.name,
        basePrice: optionModal.basePrice,
        selectedOptions,
      },
      addQuantity
    );
    setOptionModal(null);
  };

  const handleOptionSelect = (option: any, choice: any) => {
    setSelectedOptions((prev) => {
      const filtered = option.multiple
        ? prev
        : prev.filter((o) => o.optionId !== option.id);
      const exists = filtered.find(
        (o) => o.optionId === option.id && o.choiceId === choice.id
      );
      if (exists) {
        return filtered.filter(
          (o) => !(o.optionId === option.id && o.choiceId === choice.id)
        );
      }
      return [
        ...filtered,
        {
          optionId: option.id,
          optionTitle: option.title,
          choiceId: choice.id,
          choiceLabel: choice.label,
          extraPrice: choice.extraPrice || 0,
        },
      ];
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              Home
            </Link>
            <h1 className="text-2xl font-bold">{restaurant.name}</h1>
            <p className="text-sm text-gray-500">
              {restaurant.houseNumber} {restaurant.street}, {restaurant.city}, {restaurant.postcode}
            </p>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="relative bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Cart
            {cart.itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cart.itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Menu */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {restaurant.menus.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No menus available yet.</p>
        ) : (
          restaurant.menus.map((menu: any) => (
            <div key={menu.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gray-100 px-4 py-3">
                <h2 className="text-lg font-semibold">{menu.name}</h2>
                {menu.description && (
                  <p className="text-sm text-gray-500">{menu.description}</p>
                )}
              </div>
              <div className="divide-y">
                {menu.foods?.map((food: any) => (
                  <div
                    key={food.id}
                    className="px-4 py-3 flex justify-between items-center hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{food.name}</h3>
                      {food.description && (
                        <p className="text-sm text-gray-500">{food.description}</p>
                      )}
                      {food.options?.length > 0 && (
                        <p className="text-xs text-purple-500 mt-1">
                          {food.options.length} option{food.options.length > 1 ? "s" : ""} available
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-green-700">
                        £{food.basePrice.toFixed(2)}
                      </span>
                      <Button size="sm" onClick={() => handleAddToCart(food)}>
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Option Selection Modal */}
      <Dialog open={!!optionModal} onOpenChange={() => setOptionModal(null)}>
        <DialogContent className="max-w-md">
          {optionModal && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold">{optionModal.name}</h3>
              <p className="text-gray-600">£{optionModal.basePrice.toFixed(2)}</p>

              {optionModal.options.map((option: any) => (
                <div key={option.id} className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">
                    {option.title} {option.multiple ? "(multiple)" : "(pick one)"}
                  </h4>
                  <div className="space-y-1">
                    {option.choices.map((choice: any) => {
                      const isSelected = selectedOptions.some(
                        (o) => o.optionId === option.id && o.choiceId === choice.id
                      );
                      return (
                        <label
                          key={choice.id}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer border ${
                            isSelected ? "border-purple-500 bg-purple-50" : "border-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type={option.multiple ? "checkbox" : "radio"}
                              name={option.id}
                              checked={isSelected}
                              onChange={() => handleOptionSelect(option, choice)}
                              className="accent-purple-600"
                            />
                            <span>{choice.label}</span>
                          </div>
                          {choice.extraPrice > 0 && (
                            <span className="text-sm text-gray-500">
                              +£{choice.extraPrice.toFixed(2)}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Quantity:</label>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddQuantity(Math.max(1, addQuantity - 1))}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{addQuantity}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddQuantity(addQuantity + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>

              <Button className="w-full" onClick={handleConfirmOptions}>
                Add to Cart
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart Drawer */}
      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
