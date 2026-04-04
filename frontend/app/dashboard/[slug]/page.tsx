"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import { getRestaurantBySlug, createMenu, deleteMenu, createFood, deleteFood, updateRestaurant } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import FoodOptionForm from "@/components/FoodOptionForm";
import ConfirmDelete from "@/components/ConfirmDelete";
import ImageUpload from "@/components/ImageUpload";
import { Trash2, ChevronDown, AlertTriangle, Ban, ShieldCheck } from "lucide-react";
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
