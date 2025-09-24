"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function MenuForm({ restaurantId, onSuccess }: { restaurantId: string; onSuccess: () => void }) {
  const [name, setName] = useState("");

  return (
    <div className="space-y-3">
      <Input placeholder="Menü adı" value={name} onChange={(e) => setName(e.target.value)} />
      <Button
        onClick={async () => {
          await fetch(`${API_URL}/menus`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, restaurantId }),
          });
          setName("");
          onSuccess();
        }}
      >
        Kaydet
      </Button>
    </div>
  );
}