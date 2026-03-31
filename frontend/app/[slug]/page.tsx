"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { getRestaurantBySlug } from "@/lib/api";
import { useCart, CartItemOption } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import CartDrawer from "@/components/CartDrawer";
import AllergenBadges from "@/components/AllergenBadges";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (restaurant) {
      cart.setRestaurant(restaurant.id, restaurant.slug);
    }
  }, [restaurant]);

  const toggleMenu = (menuId: string) => {
    setOpenMenus((prev) => ({ ...prev, [menuId]: !prev[menuId] }));
  };
  const isMenuOpen = (menuId: string) => openMenus[menuId] === true;

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
      {/* Hero / Header */}
      {restaurant.imageUrl ? (
        <div className="relative h-48 sm:h-64 bg-gray-200">
          <img
            src={`${API_URL}${restaurant.imageUrl}`}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 max-w-4xl mx-auto px-4 pb-4">
            <Link href="/" className="text-sm text-white/80 hover:text-white">
              Home
            </Link>
            <h1 className="text-3xl font-bold text-white">{restaurant.name}</h1>
            <p className="text-sm text-white/80">
              {restaurant.houseNumber} {restaurant.street}, {restaurant.city}, {restaurant.postcode}
            </p>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="absolute top-4 right-4 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 shadow-lg"
          >
            Cart
            {cart.itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cart.itemCount}
              </span>
            )}
          </button>
        </div>
      ) : (
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
              className="relative bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
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
      )}

      {/* Sticky cart bar when hero is used */}
      {restaurant.imageUrl && (
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b">
          <div className="max-w-4xl mx-auto px-4 py-2 flex justify-between items-center">
            <h2 className="font-semibold text-lg truncate">{restaurant.name}</h2>
            <button
              onClick={() => setDrawerOpen(true)}
              className="relative bg-amber-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-amber-700"
            >
              Cart
              {cart.itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cart.itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Menu */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Search menu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {restaurant.menus.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No menus available yet.</p>
        ) : (
          restaurant.menus.map((menu: any) => {
            const term = searchTerm.toLowerCase();
            const filteredFoods = term
              ? menu.foods?.filter((food: any) =>
                  food.name.toLowerCase().includes(term) ||
                  (food.description && food.description.toLowerCase().includes(term))
                )
              : menu.foods;

            if (term && (!filteredFoods || filteredFoods.length === 0)) return null;

            return (
              <div key={menu.id} className="space-y-4">
                {/* Menu Header */}
                {menu.imageUrl ? (
                  <button
                    type="button"
                    onClick={() => toggleMenu(menu.id)}
                    className="relative w-full h-40 rounded-xl overflow-hidden text-left"
                  >
                    <img
                      src={`${API_URL}${menu.imageUrl}`}
                      alt={menu.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-end justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-white">{menu.name}</h2>
                        {menu.description && (
                          <p className="text-sm text-white/80">{menu.description}</p>
                        )}
                      </div>
                      <ChevronDown className={`w-5 h-5 text-white/80 shrink-0 transition-transform duration-300 ${isMenuOpen(menu.id) ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleMenu(menu.id)}
                    className="w-full px-1 flex items-center justify-between text-left"
                  >
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{menu.name}</h2>
                      {menu.description && (
                        <p className="text-sm text-gray-500">{menu.description}</p>
                      )}
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${isMenuOpen(menu.id) ? "rotate-180" : ""}`} />
                  </button>
                )}

                {/* Food Items */}
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: isMenuOpen(menu.id) ? "2000px" : "0px",
                    opacity: isMenuOpen(menu.id) ? 1 : 0,
                  }}
                >
                  {filteredFoods?.map((food: any) => (
                    <div
                      key={food.id}
                      className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
                        !food.imageUrl ? "sm:col-span-1" : ""
                      }`}
                      onClick={() => handleAddToCart(food)}
                    >
                      {/* Food Image — full width on top */}
                      {food.imageUrl && (
                        <div className="w-full h-44 overflow-hidden">
                          <img
                            src={`${API_URL}${food.imageUrl}`}
                            alt={food.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      {/* Food Info */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900">{food.name}</h3>
                            {food.description && (
                              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{food.description}</p>
                            )}
                            <AllergenBadges allergens={food.allergens} dietTags={food.dietTags} compact />
                            {food.options?.length > 0 && (
                              <p className="text-xs text-amber-600 mt-1.5">
                                {food.options.length} option{food.options.length > 1 ? "s" : ""} available
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <span className="font-bold text-green-700 text-lg">
                            £{food.basePrice.toFixed(2)}
                          </span>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(food);
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Option Selection Modal */}
      <Dialog open={!!optionModal} onOpenChange={() => setOptionModal(null)}>
        <DialogContent className="max-w-md">
          {optionModal && (
            <div className="space-y-4">
              {/* Food image in modal */}
              {optionModal.imageUrl && (
                <div className="w-full h-48 -mt-2 rounded-lg overflow-hidden">
                  <img
                    src={`${API_URL}${optionModal.imageUrl}`}
                    alt={optionModal.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <DialogTitle className="text-lg font-bold">{optionModal.name}</DialogTitle>
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
                            isSelected ? "border-amber-500 bg-amber-50" : "border-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type={option.multiple ? "checkbox" : "radio"}
                              name={option.id}
                              checked={isSelected}
                              onChange={() => handleOptionSelect(option, choice)}
                              className="accent-amber-600"
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
