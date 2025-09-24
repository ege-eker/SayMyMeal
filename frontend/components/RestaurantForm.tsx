"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function RestaurantForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ name: "", address: "", rating: 0 });

  return (
    <div className="flex flex-col space-y-3">
      <Input
        placeholder="Restoran Adı"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <Input
        placeholder="Adres"
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
      />
      <Input
        placeholder="Rating"
        type="number"
        value={form.rating}
        onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
      />
      <Button
        onClick={async () => {
          await fetch(`${API_URL}/restaurants`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
          setForm({ name: "", address: "", rating: 0 });
          onSuccess();
        }}
      >
        Kaydet
      </Button>
    </div>
  );
}