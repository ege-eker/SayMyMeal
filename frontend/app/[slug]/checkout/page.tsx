"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { getRestaurantBySlug, createOrder, checkAllergens, getMyAddresses, createAddress, updateAddress, deleteAddress, type SavedAddress } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALLERGEN_LABELS } from "@/lib/allergens";
import type { Allergen } from "@/lib/allergens";
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
  const { data: savedAddresses, mutate: mutateAddresses } = useSWR(
    user ? "my-addresses" : null,
    getMyAddresses,
    { fallbackData: [] }
  );

  const [selectedAddressId, setSelectedAddressId] = useState<string | "new" | null>(null);
  const [newAddress, setNewAddress] = useState({ label: "", houseNumber: "", street: "", city: "", postcode: "" });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [allergenWarnings, setAllergenWarnings] = useState<{ foodId: string; foodName: string; matchedAllergens: string[] }[]>([]);
  const [allergenAcknowledged, setAllergenAcknowledged] = useState(false);
  const [busyAcknowledged, setBusyAcknowledged] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant) cart.setRestaurant(restaurant.id, restaurant.slug);
  }, [restaurant]);

  useEffect(() => {
    if (!authLoading && !user) router.push(`/login?returnUrl=/${slug}/checkout`);
  }, [authLoading, user, router, slug]);

  // Pre-select default address when addresses load
  useEffect(() => {
    if (savedAddresses && savedAddresses.length > 0 && selectedAddressId === null) {
      const def = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
      setSelectedAddressId(def.id);
    }
    if (savedAddresses && savedAddresses.length === 0 && selectedAddressId === null) {
      setSelectedAddressId("new");
    }
  }, [savedAddresses]);

  useEffect(() => {
    if (user?.allergens && user.allergens.length > 0 && cart.items.length > 0) {
      const foodIds = [...new Set(cart.items.map((i) => i.foodId))];
      checkAllergens(foodIds).then((res) => {
        if (res.warnings?.length > 0) setAllergenWarnings(res.warnings);
      }).catch(() => {});
    }
  }, [user, cart.items]);

  if (authLoading || !user) return <div className="p-8">Loading...</div>;
  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <Link href={`/${slug}`}><Button>Browse Menu</Button></Link>
        </div>
      </div>
    );
  }

  const selectedSaved = savedAddresses?.find((a) => a.id === selectedAddressId);

  const getDeliveryAddress = () => {
    if (selectedSaved) {
      return {
        houseNumber: selectedSaved.houseNumber,
        street: selectedSaved.street,
        city: selectedSaved.city,
        postcode: selectedSaved.postcode,
      };
    }
    return {
      houseNumber: newAddress.houseNumber,
      street: newAddress.street,
      city: newAddress.city,
      postcode: newAddress.postcode,
    };
  };

  const postcodeClean = newAddress.postcode.replace(/\s+/g, "").toUpperCase();
  const postcodeNormalized = postcodeClean.length >= 3 ? postcodeClean.slice(0, -3) + " " + postcodeClean.slice(-3) : "";
  const postcodeValid = /^[A-Z]{1,2}[0-9][0-9A-Z]? [0-9][A-Z]{2}$/.test(postcodeNormalized);

  const newAddressValid =
    selectedAddressId !== "new" ||
    (newAddress.label.trim().length > 0 &&
      newAddress.houseNumber.trim().length > 0 &&
      newAddress.street.trim().length > 0 &&
      newAddress.city.trim().length > 0 &&
      newAddress.postcode.trim().length > 0 &&
      postcodeValid);

  const handleDeleteAddress = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAddress(id);
      await mutateAddresses();
      if (selectedAddressId === id) setSelectedAddressId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    try {
      await updateAddress(id, { isDefault: true });
      await mutateAddresses();
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      let deliveryAddress = getDeliveryAddress();

      if (selectedAddressId === "new") {
        const saved = await createAddress({
          label: newAddress.label,
          houseNumber: newAddress.houseNumber,
          street: newAddress.street,
          city: newAddress.city,
          postcode: newAddress.postcode,
          isDefault: (savedAddresses?.length ?? 0) === 0,
        });
        mutateAddresses();
        deliveryAddress = {
          houseNumber: saved.houseNumber,
          street: saved.street,
          city: saved.city,
          postcode: saved.postcode,
        };
      }

      const orderData = {
        customer: user.name,
        phone: user.phone || "",
        restaurantId: cart.restaurantId!,
        address: deliveryAddress,
        notes: notes.trim() || undefined,
        allergenAcknowledged: allergenAcknowledged || undefined,
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
          <Link href={`/${slug}/cart`} className="text-sm text-amber-600 hover:underline">
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

        {/* Not Accepting Orders */}
        {restaurant?.acceptingOrders === false && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4">
            <h3 className="font-semibold text-red-800">Not Accepting Orders</h3>
            <p className="text-sm text-red-700 mt-1">
              This restaurant is currently not accepting orders. Please try again later.
            </p>
          </div>
        )}

        {/* Delivery estimate */}
        {restaurant?.acceptingOrders !== false && !restaurant?.isBusy && (
          <p className="text-xs text-gray-500 text-center">
            Estimated delivery: ~{restaurant?.defaultDeliveryMinutes ?? 30} minutes
          </p>
        )}

        {/* Busy Mode Warning */}
        {restaurant?.acceptingOrders !== false && restaurant?.isBusy && (
          <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-orange-800">High Demand</h3>
            <p className="text-sm text-orange-700">
              This restaurant is currently experiencing high demand. Estimated delivery time is approximately{" "}
              <strong>~{(restaurant.defaultDeliveryMinutes ?? 30) + (restaurant.busyExtraMinutes ?? 15)} minutes</strong>.
              Do you wish to continue?
            </p>
            <label className="flex items-center gap-2 text-sm text-orange-800 cursor-pointer">
              <input
                type="checkbox"
                checked={busyAcknowledged}
                onChange={(e) => setBusyAcknowledged(e.target.checked)}
                className="accent-orange-600"
              />
              I understand delivery will take longer and wish to proceed
            </label>
          </div>
        )}

        {/* Allergen Warnings */}
        {allergenWarnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-amber-800">Allergen Warning</h3>
            <ul className="text-sm text-amber-700 space-y-1">
              {allergenWarnings.map((w) => (
                <li key={w.foodId}>
                  <strong>{w.foodName}</strong> contains{" "}
                  {w.matchedAllergens.map((a) => ALLERGEN_LABELS[a as Allergen] ?? a).join(", ")}
                </li>
              ))}
            </ul>
            <label className="flex items-center gap-2 text-sm text-amber-800 cursor-pointer">
              <input
                type="checkbox"
                checked={allergenAcknowledged}
                onChange={(e) => setAllergenAcknowledged(e.target.checked)}
                className="accent-amber-600"
              />
              I acknowledge the allergen risks and wish to proceed
            </label>
          </div>
        )}

        {/* Delivery Address */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-4 space-y-4">
          <h2 className="font-semibold">Delivery Address</h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
          )}

          {/* Saved address cards */}
          {(savedAddresses?.length ?? 0) > 0 && (
            <div className="space-y-2">
              {savedAddresses!.map((addr) => (
                <div
                  key={addr.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    selectedAddressId === addr.id
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200"
                  }`}
                >
                  <label className="flex items-start gap-3 flex-1 cursor-pointer min-w-0">
                    <input
                      type="radio"
                      name="address"
                      value={addr.id}
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-0.5 accent-amber-600 shrink-0"
                    />
                    <div className="text-sm min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-medium">{addr.label}</p>
                        {addr.isDefault && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Default</span>
                        )}
                      </div>
                      <p className="text-gray-600 truncate">
                        {addr.houseNumber} {addr.street}, {addr.city}, {addr.postcode}
                      </p>
                    </div>
                  </label>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    {!addr.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(addr.id)}
                        disabled={settingDefaultId === addr.id}
                        className="text-xs text-amber-600 hover:underline disabled:opacity-40"
                      >
                        {settingDefaultId === addr.id ? "..." : "Default"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      disabled={deletingId === addr.id}
                      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
                    >
                      {deletingId === addr.id ? "..." : "✕"}
                    </button>
                  </div>
                </div>
              ))}

              {/* New address option */}
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedAddressId === "new"
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="address"
                  value="new"
                  checked={selectedAddressId === "new"}
                  onChange={() => setSelectedAddressId("new")}
                  className="accent-amber-600"
                />
                <span className="text-sm font-medium">Add a new address</span>
              </label>
            </div>
          )}

          {/* New address form */}
          {selectedAddressId === "new" && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label htmlFor="label">Address Label</Label>
                <Input
                  id="label"
                  placeholder="e.g. Home, Work"
                  value={newAddress.label}
                  onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="houseNumber">House Number</Label>
                  <Input
                    id="houseNumber"
                    value={newAddress.houseNumber}
                    onChange={(e) => setNewAddress({ ...newAddress, houseNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="street">Street</Label>
                  <Input
                    id="street"
                    value={newAddress.street}
                    onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    value={newAddress.postcode}
                    onChange={(e) => setNewAddress({ ...newAddress, postcode: e.target.value })}
                    required
                  />
                  {newAddress.postcode.trim().length > 0 && !postcodeValid && (
                    <p className="text-xs text-red-500">Invalid postcode format (e.g. SW1A 2BC)</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="notes">Order Notes</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special requests..."
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              submitting ||
              !selectedAddressId ||
              !newAddressValid ||
              restaurant?.acceptingOrders === false ||
              (allergenWarnings.length > 0 && !allergenAcknowledged) ||
              (restaurant?.isBusy && !busyAcknowledged)
            }
          >
            {submitting ? "Placing Order..." : "Place Order"}
          </Button>
        </form>
      </main>
    </div>
  );
}
