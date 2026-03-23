"use client";
import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RestaurantForm from "@/components/RestaurantForm";
import { authFetch } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RestaurantsPage() {
  const { data: restaurants, error, mutate } = useSWR(`${API_URL}/restaurants`, fetcher);
  const [open, setOpen] = useState(false);

  if (error) return <div>Error</div>;
  if (!restaurants) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Restaurants</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add Restaurant</Button>
          </DialogTrigger>
          <DialogContent>
            <RestaurantForm
              onSuccess={() => {
                setOpen(false);
                mutate();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
      <table className="table-auto w-full bg-white rounded-lg shadow-md">
        <thead>
          <tr className="bg-gray-200 text-left">
            <th className="p-3 whitespace-nowrap">Name</th>
            <th className="p-3 whitespace-nowrap hidden md:table-cell">Slug</th>
            <th className="p-3 whitespace-nowrap hidden lg:table-cell">Address</th>
            <th className="p-3 whitespace-nowrap hidden md:table-cell">Rating</th>
            <th className="p-3 text-center whitespace-nowrap">Active</th>
            <th className="p-3 whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {restaurants.map((r: any) => (
            <tr key={r.id} className="border-t hover:bg-gray-50">
              <td className="p-3">{r.name}</td>
              <td className="p-3 text-sm text-gray-500 hidden md:table-cell">/{r.slug}</td>
              <td className="p-3 hidden lg:table-cell">
                {`${r.houseNumber} ${r.street}, ${r.city}, ${r.postcode}`}
              </td>
              <td className="p-3 text-yellow-600 hidden md:table-cell">{r.rating ?? "-"}</td>
              <td className="p-3 text-center">
                {r.isActive ? "Active" : ""}
              </td>
              <td className="p-3 flex flex-wrap gap-2">
                <Link href={`/admin/restaurants/${r.id}`}>
                  <Button variant="outline">Menus</Button>
                </Link>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await authFetch(`${API_URL}/restaurants/${r.id}`, {
                      method: "DELETE",
                    });
                    mutate();
                  }}
                >
                  Delete
                </Button>
                <Button
                    variant={r.isActive ? "secondary" : "outline"}
                    onClick={async () => {
                    await authFetch(`${API_URL}/restaurants/${r.id}/activate`, {
                        method: "POST",
                    });
                    mutate();
                    }}
                >
                    {r.isActive ? "Active" : "Activate"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
