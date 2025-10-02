"use client";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import MenuForm from "@/components/MenuForm";
import FoodForm from "@/components/FoodForm";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RestaurantDetail() {
  const { id } = useParams();
  const { data, error, mutate } = useSWR(`${API_URL}/restaurants/${id}`, fetcher);
  const [openMenu, setOpenMenu] = useState(false);

  if (error) return <div>❌ Error</div>;
  if (!data) return <div>⏳ Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">{data.name}</h1>

      <Dialog open={openMenu} onOpenChange={setOpenMenu}>
        <DialogTrigger asChild>
          <Button>➕ Add Menu</Button>
        </DialogTrigger>
        <DialogContent>
          <MenuForm restaurantId={id as string} onSuccess={() => { setOpenMenu(false); mutate(); }} />
        </DialogContent>
      </Dialog>

      {data.menus.map((menu: any) => (
        <div key={menu.id} className="my-6 p-4 border rounded shadow">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-2xl font-semibold">{menu.name}</h2>
            <Button
              variant="destructive"
              onClick={async () => {
                await fetch(`${API_URL}/menus/${menu.id}`, { method: "DELETE" });
                mutate();
              }}
            >
              Sil
            </Button>
          </div>

          <ul className="space-y-2">
            {menu.foods.map((food: any) => (
              <li key={food.id} className="flex justify-between p-2 bg-gray-50 rounded">
                <span>{food.name}</span>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    defaultValue={food.price}
                    className="border p-1 w-20"
                    onBlur={async (e) => {
                      await fetch(`${API_URL}/foods/${food.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ price: parseFloat(e.target.value) }),
                      });
                      mutate();
                    }}
                  />
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      await fetch(`${API_URL}/foods/${food.id}`, { method: "DELETE" });
                      mutate();
                    }}
                  >
                    Sil
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {/* Food Ekleme */}
          <FoodForm menuId={menu.id} onSuccess={mutate} />
        </div>
      ))}
    </div>
  );
}