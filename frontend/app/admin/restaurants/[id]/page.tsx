// frontend/app/admin/restaurants/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import MenuForm from "@/components/MenuForm";
import FoodForm from "@/components/FoodForm";
import FoodOptionForm from "@/components/FoodOptionForm";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const { data: restaurant, error, mutate } = useSWR(
    `${API_URL}/restaurants/${id}`,
    fetcher
  );
  const [openMenuDialog, setOpenMenuDialog] = useState(false);

  if (error) return <div>❌ Error fetching restaurant details</div>;
  if (!restaurant) return <div>⏳ Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>

        <Dialog open={openMenuDialog} onOpenChange={setOpenMenuDialog}>
          <DialogTrigger asChild>
            <Button>➕ Add Menu</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <MenuForm
              restaurantId={id as string}
              onSuccess={() => {
                setOpenMenuDialog(false);
                mutate(); // refresh restaurant data
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Menus */}
      {restaurant.menus.length === 0 ? (
        <p className="text-gray-600">No menus yet. Add one above.</p>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        restaurant.menus.map((menu: any) => (
          <MenuCard key={menu.id} menu={menu} onRefresh={mutate} />
        ))
      )}
    </div>
  );
}

/* ---- Subcomponent: MenuCard ---- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MenuCard({ menu, onRefresh }: { menu: any; onRefresh: () => void }) {
  const { data: menuDetail, mutate } = useSWR(
    `${API_URL}/menus/${menu.id}`,
    fetcher
  );

  if (!menuDetail) {
    return (
      <div className="border rounded-lg bg-white p-4 shadow-sm my-4">
        <h2 className="text-lg font-semibold">{menu.name}</h2>
        <p className="text-gray-400">Loading foods...</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white p-4 shadow-sm my-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">{menuDetail.name}</h2>

        <Button
          variant="destructive"
          onClick={async () => {
            await fetch(`${API_URL}/menus/${menu.id}`, { method: "DELETE" });
            onRefresh();
          }}
        >
          Delete
        </Button>
      </div>

      {/* Foods */}
      {menuDetail.foods?.length ? (
        <ul className="space-y-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {menuDetail.foods.map((food: any) => (
            <li
              key={food.id}
              className="border rounded p-3 bg-gray-50 flex flex-col gap-1"
            >
              <div className="flex justify-between items-center">
                <span>
                    🍽️ {food.name} — £{(food.basePrice ?? food.price ?? 0).toFixed(2)}
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    await fetch(`${API_URL}/foods/${food.id}`, {
                      method: "DELETE",
                    });
                    mutate(); // refresh foods under menu
                  }}
                >
                  Delete
                </Button>
              </div>

              {/* Food Options inline */}
              <div className="ml-4 border-l-2 border-purple-200 pl-3">
                <FoodOptionForm foodId={food.id} compact />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400 mb-3">No foods yet.</p>
      )}

      {/* Add Food */}
      <div className="mt-3">
        <FoodForm
          menuId={menu.id}
          onSuccess={() => {
            mutate();
          }}
        />
      </div>
    </div>
  );
}