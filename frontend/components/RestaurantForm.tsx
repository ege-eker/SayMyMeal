"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// --- Tip Tanımları ---
interface DeliveryZone {
  postcode: string;
  etaMinutes: number;
}

interface RestaurantFormData {
  name: string;
  houseNumber: string;
  street: string;
  city: string;
  postcode: string;
  rating?: number;
  deliveryZones: DeliveryZone[];
}

export default function RestaurantForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<RestaurantFormData>({
    name: "",
    houseNumber: "",
    street: "",
    city: "",
    postcode: "",
    rating: 0,
    deliveryZones: [{ postcode: "", etaMinutes: 20 }],
  });

  const handleChange = (field: keyof RestaurantFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleZoneChange = <K extends keyof DeliveryZone>(
    index: number,
    key: K,
    value: DeliveryZone[K]
  ) => {
    const zones = [...form.deliveryZones];
    zones[index] = { ...zones[index], [key]: value };
    setForm((prev) => ({ ...prev, deliveryZones: zones }));
  };

  const addZone = () => {
    setForm((prev) => ({
      ...prev,
      deliveryZones: [...prev.deliveryZones, { postcode: "", etaMinutes: 20 }],
    }));
  };

  const removeZone = (index: number) => {
    setForm((prev) => ({
      ...prev,
      deliveryZones: prev.deliveryZones.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    await fetch(`${API_URL}/restaurants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setForm({
      name: "",
      houseNumber: "",
      street: "",
      city: "",
      postcode: "",
      rating: 0,
      deliveryZones: [{ postcode: "", etaMinutes: 20 }],
    });

    onSuccess();
  };

  return (
    <div className="flex flex-col space-y-3">
      {/* Temel Bilgiler */}
      <Input
        placeholder="Restaurant Name"
        value={form.name}
        onChange={(e) => handleChange("name", e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="House Number"
          value={form.houseNumber}
          onChange={(e) => handleChange("houseNumber", e.target.value)}
        />
        <Input
          placeholder="Street"
          value={form.street}
          onChange={(e) => handleChange("street", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="City"
          value={form.city}
          onChange={(e) => handleChange("city", e.target.value)}
        />
        <Input
          placeholder="Postcode (e.g. SW1A 1AA)"
          value={form.postcode}
          onChange={(e) => handleChange("postcode", e.target.value)}
        />
      </div>

      {/* Delivery Zones */}
      <div className="mt-3 border-t pt-3 space-y-2">
        <label className="font-semibold text-sm">Delivery Zones</label>

        {form.deliveryZones.map((zone, idx) => (
          <div key={idx} className="flex items-center space-x-2">
            <Input
              placeholder="Postcode"
              value={zone.postcode}
              onChange={(e) => handleZoneChange(idx, "postcode", e.target.value)}
              className="flex-1"
            />
            <Input
              type="number"
              min={5}
              placeholder="ETA (mins)"
              value={zone.etaMinutes}
              onChange={(e) =>
                handleZoneChange(idx, "etaMinutes", Number(e.target.value))
              }
              className="w-32"
            />
            <Button
              type="button"
              variant="destructive"
              onClick={() => removeZone(idx)}
            >
              ✕
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={addZone}>
          ➕ Add Zone
        </Button>
      </div>

      {/* Rating */}
      <Input
        type="number"
        min={0}
        max={5}
        step={0.1}
        placeholder="Rating (0–5)"
        value={form.rating}
        onChange={(e) => handleChange("rating", Number(e.target.value))}
      />

      <Button onClick={handleSubmit} className="mt-3">
        Save Restaurant
      </Button>
    </div>
  );
}