"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function MenuForm({ restaurantId, onSuccess }: { restaurantId: string; onSuccess: () => void }) {
  const [name, setName] = useState("");

  return (
    <div className="space-y-3">
      <Input placeholder="Menu Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Button
        onClick={async () => {
          await authFetch(`${API_URL}/menus`, {
            method: "POST",
            body: JSON.stringify({ name, restaurantId }),
          });
          setName("");
          onSuccess();
        }}
      >
        Save
      </Button>
    </div>
  );
}