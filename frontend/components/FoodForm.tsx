"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function FoodForm({ menuId, onSuccess }: { menuId: string; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: "", price: 0 });

  return (
    <div className="flex space-x-2 mt-3">
      <Input
        placeholder="Yemek adı"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <Input
        type="number"
        placeholder="Fiyat"
        value={form.price}
        onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })}
      />
      <Button
        onClick={async () => {
          await fetch(`${API_URL}/foods`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, menuId }),
          });
          setForm({ name: "", price: 0 });
          onSuccess();
        }}
      >
        ➕ Ekle
      </Button>
    </div>
  );
}