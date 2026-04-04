"use client";

import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import { getMyRestaurants, createRestaurant, deleteRestaurant, activateRestaurant } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ConfirmDelete from "@/components/ConfirmDelete";
import { Trash2 } from "lucide-react";

export default function DashboardPage() {
  const { data: restaurants, error, mutate } = useSWR("my-restaurants", getMyRestaurants);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    houseNumber: "",
    street: "",
    city: "",
    postcode: "",
    deliveryZones: [{ postcode: "", etaMinutes: 20 }],
  });
  const [formError, setFormError] = useState("");

  if (error) return <div className="text-red-500">Error loading restaurants</div>;
  if (!restaurants) return <div>Loading...</div>;

  const handleSubmit = async () => {
    setFormError("");
    try {
      const result = await createRestaurant(form);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setOpen(false);
      setForm({
        name: "",
        slug: "",
        houseNumber: "",
        street: "",
        city: "",
        postcode: "",
        deliveryZones: [{ postcode: "", etaMinutes: 20 }],
      });
      mutate();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleZoneChange = (idx: number, key: string, value: string | number) => {
    const zones = [...form.deliveryZones];
    zones[idx] = { ...zones[idx], [key]: value };
    setForm({ ...form, deliveryZones: zones });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Restaurants</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add Restaurant</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <div className="space-y-3">
              <h3 className="text-lg font-bold">New Restaurant</h3>
              {formError && (
                <div className="bg-red-50 text-red-600 p-2 rounded text-sm">{formError}</div>
              )}
              <Input
                placeholder="Restaurant Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                placeholder="Slug (e.g. my-restaurant)"
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="House Number"
                  value={form.houseNumber}
                  onChange={(e) => setForm({ ...form, houseNumber: e.target.value })}
                />
                <Input
                  placeholder="Street"
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
                <Input
                  placeholder="Postcode"
                  value={form.postcode}
                  onChange={(e) => setForm({ ...form, postcode: e.target.value })}
                />
              </div>

              <div className="border-t pt-3 space-y-2">
                <label className="font-semibold text-sm">Delivery Zones</label>
                {form.deliveryZones.map((zone, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="Postcode"
                      value={zone.postcode}
                      onChange={(e) => handleZoneChange(idx, "postcode", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={5}
                      placeholder="ETA"
                      value={zone.etaMinutes}
                      onChange={(e) => handleZoneChange(idx, "etaMinutes", Number(e.target.value))}
                      className="w-24"
                    />
                    {form.deliveryZones.length > 1 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setForm({
                            ...form,
                            deliveryZones: form.deliveryZones.filter((_, i) => i !== idx),
                          })
                        }
                      >
                        X
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm({
                      ...form,
                      deliveryZones: [...form.deliveryZones, { postcode: "", etaMinutes: 20 }],
                    })
                  }
                >
                  Add Zone
                </Button>
              </div>

              <Button onClick={handleSubmit} className="w-full">
                Save Restaurant
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {restaurants.length === 0 ? (
        <p className="text-gray-500">You haven&apos;t created any restaurants yet.</p>
      ) : (
        <div className="grid gap-4">
          {restaurants.map((r: any) => (
            <div key={r.id} className="bg-white rounded-lg shadow-sm p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h3 className="font-semibold text-lg">{r.name}</h3>
                <p className="text-sm text-gray-500">/{r.slug}</p>
                <p className="text-sm text-gray-400">
                  {r.houseNumber} {r.street}, {r.city}
                </p>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    r.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {r.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/${r.slug}`}>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </Link>
                <Link href={`/dashboard/${r.slug}`}>
                  <Button size="sm">Manage</Button>
                </Link>
                <Link href={`/dashboard/${r.slug}/live`}>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Live
                  </Button>
                </Link>
                <Link href={`/dashboard/${r.slug}/orders`}>
                  <Button size="sm" variant="outline">
                    Orders
                  </Button>
                </Link>
                <Link href={`/dashboard/${r.slug}/blacklist`}>
                  <Button size="sm" variant="outline">
                    Blacklist
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant={r.isActive ? "secondary" : "outline"}
                  onClick={async () => {
                    await activateRestaurant(r.id);
                    mutate();
                  }}
                >
                  {r.isActive ? "Whatsapp Active" : "Activate"}
                </Button>
                <ConfirmDelete
                  title={`Delete "${r.name}"?`}
                  description="This will permanently delete the restaurant and all its menus, foods, and options. This action cannot be undone."
                  onConfirm={async () => {
                    await deleteRestaurant(r.id);
                    mutate();
                  }}
                  trigger={
                    <Button size="sm" variant="destructive">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
