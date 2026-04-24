"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import {
  getRestaurantBySlug,
  createMenu,
  deleteMenu,
  createFood,
  deleteFood,
  updateRestaurant,
  searchAvailableNumbers,
  provisionVoiceNumber,
  type AvailableNumber,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import FoodOptionForm from "@/components/FoodOptionForm";
import ConfirmDelete from "@/components/ConfirmDelete";
import ImageUpload from "@/components/ImageUpload";
import { Trash2, ChevronDown, AlertTriangle, Ban, ShieldCheck, Phone, MessageCircle, CheckCircle2, Search, Loader2 } from "lucide-react";
import AllergenTagEditor from "@/components/AllergenTagEditor";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardRestaurantPage() {
  const { slug } = useParams();
  const { data: restaurant, error, mutate } = useSWR(
    slug ? `dashboard-restaurant-${slug}` : null,
    () => getRestaurantBySlug(slug as string)
  );
  const [openMenuDialog, setOpenMenuDialog] = useState(false);
  const [menuName, setMenuName] = useState("");

  if (error) return <div className="text-red-500">Error loading restaurant</div>;
  if (!restaurant) return <div>Loading...</div>;

  const handleCreateMenu = async () => {
    if (!menuName.trim()) return;
    await createMenu({ name: menuName, restaurantId: restaurant.id });
    setMenuName("");
    setOpenMenuDialog(false);
    mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-center gap-4">
          <ImageUpload
            entity="restaurants"
            entityId={restaurant.id}
            currentImageUrl={restaurant.imageUrl}
            onSuccess={() => mutate()}
            size="md"
          />
          <div>
            <h1 className="text-2xl font-bold">{restaurant.name}</h1>
            <p className="text-sm text-gray-500">/{restaurant.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/${slug}/live`}>
            <Button variant="outline" className="gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live Dashboard
            </Button>
          </Link>
          <Dialog open={openMenuDialog} onOpenChange={setOpenMenuDialog}>
            <DialogTrigger asChild>
              <Button>Add Menu</Button>
            </DialogTrigger>
          <DialogContent className="max-w-sm">
            <div className="space-y-3">
              <h3 className="font-bold">New Menu</h3>
              <Input
                placeholder="Menu Name"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
              />
              <Button onClick={handleCreateMenu} className="w-full">
                Create Menu
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Accepting Orders Toggle */}
      <div className={`border rounded-lg p-4 shadow-sm transition-colors ${
        restaurant.acceptingOrders === false
          ? "bg-red-50 border-red-300"
          : "bg-emerald-50/50 border-emerald-200"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            {restaurant.acceptingOrders === false
              ? <Ban className="w-5 h-5 text-red-500" />
              : <ShieldCheck className="w-5 h-5 text-emerald-600" />}
            <div>
              <h3 className="font-semibold text-sm">
                {restaurant.acceptingOrders === false ? "Not Accepting Orders" : "Accepting Orders"}
              </h3>
              <p className="text-xs text-gray-500">
                {restaurant.acceptingOrders === false
                  ? "All ordering channels are disabled — web, WhatsApp, and phone"
                  : "Customers can place orders normally"}
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              await updateRestaurant(restaurant.id, { acceptingOrders: !restaurant.acceptingOrders });
              mutate();
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              restaurant.acceptingOrders !== false ? "bg-emerald-500" : "bg-red-400"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                restaurant.acceptingOrders !== false ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Busy Mode Toggle */}
      <div className={`border rounded-lg p-4 shadow-sm transition-colors ${
        restaurant.acceptingOrders === false
          ? "opacity-40 pointer-events-none"
          : restaurant.isBusy ? "bg-amber-50 border-amber-300" : "bg-white"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            {restaurant.isBusy && <AlertTriangle className="w-5 h-5 text-amber-600" />}
            <div>
              <h3 className="font-semibold text-sm">Busy Mode</h3>
              <p className="text-xs text-gray-500">
                {restaurant.isBusy
                  ? `Active — adding ${restaurant.busyExtraMinutes ?? 15} min to delivery times`
                  : "Off — normal delivery times"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {restaurant.isBusy && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-600 whitespace-nowrap">Extra min:</label>
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={restaurant.busyExtraMinutes ?? 15}
                  onChange={async (e) => {
                    const val = Math.min(120, Math.max(5, Number(e.target.value)));
                    await updateRestaurant(restaurant.id, { busyExtraMinutes: val });
                    mutate();
                  }}
                  className="w-20 h-8 text-sm"
                />
              </div>
            )}
            <button
              onClick={async () => {
                await updateRestaurant(restaurant.id, { isBusy: !restaurant.isBusy });
                mutate();
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                restaurant.isBusy ? "bg-amber-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  restaurant.isBusy ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Phone Numbers */}
      <PhoneNumbersCard restaurant={restaurant} onUpdate={() => mutate()} />

      {restaurant.menus.length === 0 ? (
        <p className="text-gray-500">No menus yet. Add one above.</p>
      ) : (
        restaurant.menus.map((menu: any) => (
          <MenuCard key={menu.id} menu={menu} onRefresh={mutate} />
        ))
      )}
    </div>
  );
}

function PhoneNumbersCard({ restaurant, onUpdate }: { restaurant: any; onUpdate: () => void }) {
  return (
    <div className="space-y-4">
      <VoicePhoneCard restaurant={restaurant} onUpdate={onUpdate} />
      <WhatsappPhoneCard restaurant={restaurant} onUpdate={onUpdate} />
    </div>
  );
}

function VoicePhoneCard({ restaurant, onUpdate }: { restaurant: any; onUpdate: () => void }) {
  const hasNumber = Boolean(restaurant.twilioPhoneSid);

  return (
    <div className="border rounded-lg p-4 shadow-sm bg-white">
      <div className="flex items-center gap-2 mb-3">
        <Phone className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-sm">Voice Phone</h3>
      </div>

      {hasNumber ? (
        <ProvisionedVoiceView voicePhone={restaurant.voicePhone} />
      ) : (
        <ProvisionVoiceFlow restaurantId={restaurant.id} onProvisioned={onUpdate} />
      )}
    </div>
  );
}

function ProvisionedVoiceView({ voicePhone }: { voicePhone: string | null }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-emerald-700">Dedicated number active</div>
          <div className="font-mono text-sm font-semibold text-emerald-900 break-all">{voicePhone}</div>
        </div>
      </div>

      <div className="text-xs text-gray-600 space-y-1.5">
        <p className="font-medium">Forward your restaurant phone to this number:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-1">
          <li>
            Mobile (most UK carriers): dial <code className="bg-gray-100 px-1 rounded font-mono">**21*{voicePhone}#</code> and press call
          </li>
          <li>Landline: set unconditional call forwarding through your provider</li>
        </ul>
      </div>

      <p className="text-xs text-gray-400 pt-1 border-t">
        To change or remove this number, contact platform support.
      </p>
    </div>
  );
}

function ProvisionVoiceFlow({ restaurantId, onProvisioned }: { restaurantId: string; onProvisioned: () => void }) {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState("GB");
  const [areaCode, setAreaCode] = useState("");
  const [numbers, setNumbers] = useState<AvailableNumber[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [provisioning, setProvisioning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setError(null);
    setNumbers(null);
    setSearching(true);
    try {
      const res = await searchAvailableNumbers(country.trim().toUpperCase(), areaCode ? Number(areaCode) : undefined);
      setNumbers(res.numbers);
    } catch (err: any) {
      setError(err.message || "Failed to search numbers");
    } finally {
      setSearching(false);
    }
  };

  const handleProvision = async (phoneNumber: string) => {
    if (!confirm(`Provision ${phoneNumber}? This will purchase the number (~$1.15/month) and cannot be easily undone.`)) return;
    setError(null);
    setProvisioning(phoneNumber);
    try {
      await provisionVoiceNumber(restaurantId, phoneNumber);
      setOpen(false);
      onProvisioned();
    } catch (err: any) {
      setError(err.message || "Failed to provision number");
    } finally {
      setProvisioning(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Get a dedicated Twilio number for your restaurant. Customers calling your existing number will be forwarded to the AI assistant.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="gap-2">
            <Phone className="w-4 h-4" />
            Get Dedicated Phone Number
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-base">Provision a Dedicated Number</h3>
              <p className="text-xs text-gray-500 mt-1">
                This costs ~$1.15/month. Once provisioned, contact support to change or release it.
              </p>
            </div>

            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Country (ISO-2)</label>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value.toUpperCase())}
                  maxLength={2}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Area Code (optional)</label>
                <Input
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="20"
                  className="font-mono"
                />
              </div>
              <Button size="sm" onClick={handleSearch} disabled={searching || !country.trim()}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            {numbers !== null && (
              <div className="border rounded-md max-h-64 overflow-auto divide-y">
                {numbers.length === 0 ? (
                  <p className="text-sm text-gray-400 p-3">No numbers available for this search.</p>
                ) : (
                  numbers.map((n) => (
                    <div key={n.phoneNumber} className="flex items-center justify-between p-2.5 hover:bg-gray-50">
                      <div>
                        <div className="font-mono text-sm font-medium">{n.phoneNumber}</div>
                        <div className="text-xs text-gray-500">
                          {[n.locality, n.region, n.isoCountry].filter(Boolean).join(" · ") || n.friendlyName}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={provisioning !== null}
                        onClick={() => handleProvision(n.phoneNumber)}
                      >
                        {provisioning === n.phoneNumber ? <Loader2 className="w-4 h-4 animate-spin" /> : "Provision"}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WhatsappPhoneCard({ restaurant, onUpdate }: { restaurant: any; onUpdate: () => void }) {
  const [whatsappPhone, setWhatsappPhone] = useState<string>(restaurant.whatsappPhone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const e164Pattern = /^\+[1-9]\d{1,14}$/;

  const handleSave = async () => {
    setError(null);
    const wp = whatsappPhone.trim() || null;
    if (wp && !e164Pattern.test(wp)) {
      setError("WhatsApp phone must be E.164 format (e.g. +447700900000)");
      return;
    }
    setSaving(true);
    try {
      await updateRestaurant(restaurant.id, { whatsappPhone: wp });
      onUpdate();
    } catch (err: any) {
      setError(err.message || "Failed to save WhatsApp phone");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 shadow-sm bg-white">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-5 h-5 text-emerald-600" />
        <h3 className="font-semibold text-sm">WhatsApp Phone</h3>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        WhatsApp number for this restaurant. Enter the E.164 number registered with your Twilio WhatsApp sender.
      </p>

      <div className="space-y-1.5">
        <Input
          placeholder="+447700900000"
          value={whatsappPhone}
          onChange={(e) => setWhatsappPhone(e.target.value)}
          className="font-mono text-sm"
        />
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${restaurant.whatsappPhone ? "bg-green-500" : "bg-gray-300"}`} />
          <span className="text-xs text-gray-400">
            {restaurant.whatsappPhone ? "Active" : "Not configured"}
          </span>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      <div className="flex gap-2 mt-3">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function MenuCard({ menu, onRefresh }: { menu: any; onRefresh: () => void }) {
  const { data: menuDetail, mutate } = useSWR(
    `${API_URL}/menus/${menu.id}`,
    fetcher
  );
  const [foodName, setFoodName] = useState("");
  const [foodPrice, setFoodPrice] = useState("");
  const [open, setOpen] = useState(true);

  const handleAddFood = async () => {
    if (!foodName.trim() || !foodPrice) return;
    await createFood({ name: foodName, basePrice: Number(foodPrice), menuId: menu.id });
    setFoodName("");
    setFoodPrice("");
    mutate();
    onRefresh();
  };

  if (!menuDetail) {
    return (
      <div className="border rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">{menu.name}</h2>
        <p className="text-gray-400">Loading foods...</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
        <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setOpen(!open)}>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          <ImageUpload
            entity="menus"
            entityId={menu.id}
            currentImageUrl={menuDetail.imageUrl}
            onSuccess={() => mutate()}
            size="sm"
          />
          <h2 className="text-lg font-semibold">{menuDetail.name}</h2>
        </div>
        <ConfirmDelete
          title={`Delete menu "${menuDetail.name}"?`}
          description="This will delete the menu and all its foods and options. This action cannot be undone."
          onConfirm={async () => {
            await deleteMenu(menu.id);
            onRefresh();
          }}
          trigger={
            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
              <Trash2 className="w-4 h-4 mr-1" />
              Delete Menu
            </Button>
          }
        />
      </div>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: open ? "5000px" : "0px",
          opacity: open ? 1 : 0,
        }}
      >
          {menuDetail.foods?.length > 0 ? (
            <ul className="space-y-2 mb-3">
              {menuDetail.foods.map((food: any) => (
                <li key={food.id} className="border rounded p-3 bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div className="flex items-center gap-3">
                      <ImageUpload
                        entity="foods"
                        entityId={food.id}
                        currentImageUrl={food.imageUrl}
                        onSuccess={() => mutate()}
                        size="sm"
                      />
                      <span>
                        {food.name} — £{(food.basePrice ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <ConfirmDelete
                      title={`Delete "${food.name}"?`}
                      description="This will delete the food and all its options. This action cannot be undone."
                      onConfirm={async () => {
                        await deleteFood(food.id);
                        mutate();
                      }}
                      trigger={
                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      }
                    />
                  </div>
                  <div className="ml-4 border-l-2 border-amber-200 pl-3 mt-2 space-y-2">
                    <AllergenTagEditor
                      foodId={food.id}
                      allergens={food.allergens ?? []}
                      dietTags={food.dietTags ?? []}
                      onUpdate={() => mutate()}
                    />
                    <FoodOptionForm foodId={food.id} compact />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 mb-3">No foods yet.</p>
          )}

          {/* Add Food inline */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Input
              placeholder="Food Name"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              className="flex-1"
            />
            <Input
              type="number"
              placeholder="Price"
              value={foodPrice}
              onChange={(e) => setFoodPrice(e.target.value)}
              className="w-full sm:w-24"
              step="0.01"
            />
            <Button size="sm" onClick={handleAddFood} className="w-full sm:w-auto">
              Add Food
            </Button>
          </div>
      </div>
    </div>
  );
}
