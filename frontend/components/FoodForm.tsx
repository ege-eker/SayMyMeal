"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function FoodForm({ menuId, onSuccess }: { menuId: string; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: "", basePrice: 0 });

  return (
    <div className="flex space-x-2 mt-3">
      <Input
        placeholder="Food Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <Input
        type="number"
        placeholder="Price"
        value={form.basePrice}
        onChange={(e) => setForm({ ...form, basePrice: parseFloat(e.target.value) })}
      />
      <Button
        onClick={async () => {
          await fetch(`${API_URL}/foods`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: form.name,
                basePrice: form.basePrice,
                menuId,
            }),
          });
          setForm({ name: "", basePrice: 0 });
          onSuccess();
        }}
      >
        ➕ Add
      </Button>
    </div>
  );
}