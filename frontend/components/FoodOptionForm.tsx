// frontend/components/FoodOptionForm.tsx
"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authFetch, deleteChoice as deleteChoiceApi, updateFoodOption, updateFoodOptionChoice } from "@/lib/api";
import ConfirmDelete from "@/components/ConfirmDelete";
import { Trash2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface OptionChoice {
  id: string;
  label: string;
  extraPrice: number;
  isAvailable: boolean;
  isStandard: boolean;
}

interface FoodOption {
  id: string;
  title: string;
  multiple: boolean;
  isAvailable: boolean;
  choices: OptionChoice[];
}

export default function FoodOptionForm({
  foodId,
  compact = false,
}: {
  foodId: string;
  compact?: boolean;
}) {
  const [options, setOptions] = useState<FoodOption[]>([]);
  const [title, setTitle] = useState("");
  const [multiple, setMultiple] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function fetchOptions() {
    const res = await fetch(`${API_URL}/foods/${foodId}/options`);
    if (!res.ok) return;
    const data = await res.json();
    setOptions(data);
  }

  useEffect(() => {
    fetchOptions();
  }, [foodId]);

  const createOption = async () => {
    if (!title) return;
    setIsLoading(true);
    await authFetch(`${API_URL}/foods/options`, {
      method: "POST",
      body: JSON.stringify({ foodId, title, multiple }),
    });
    setIsLoading(false);
    setTitle("");
    setMultiple(false);
    fetchOptions();
  };

  const deleteOption = async (optionId: string) => {
    await authFetch(`${API_URL}/foods/options/${optionId}`, {
      method: "DELETE",
    });
    fetchOptions();
  };

  return (
    <div
      className={`border rounded mt-3 p-5 ${
        compact ? "bg-gray-50" : "bg-white shadow"
      }`}
    >
      <h3
        className={`font-semibold ${
          compact ? "text-sm text-gray-700" : "text-lg"
        } mb-2`}
      >
        Food Options
      </h3>

      {/* Add Option */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <Input
          placeholder="Option title (e.g. Choose your Side)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1"
        />
        <div className="flex items-center gap-2">
          <label className="flex items-center space-x-1 text-sm text-gray-500">
            <input
              type="checkbox"
              checked={multiple}
              onChange={(e) => setMultiple(e.target.checked)}
            />
            <span>Multiple</span>
          </label>
          <Button size="sm" disabled={isLoading} onClick={createOption}>
            Add
          </Button>
        </div>
      </div>

      {/* Existing options */}
      {options.map((opt) => (
        <div key={opt.id} className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center">
            <h4 className={`text-sm font-medium ${opt.isAvailable !== false ? "text-amber-700" : "text-gray-400 line-through"}`}>
              {opt.title}{" "}
              <span className="text-gray-500 text-xs">
                ({opt.multiple ? "multiple" : "single"})
              </span>
            </h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => { await updateFoodOption(opt.id, { isAvailable: !opt.isAvailable }); fetchOptions(); }}
                className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${opt.isAvailable !== false ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-600 hover:bg-red-200"}`}
              >
                {opt.isAvailable !== false ? "✓ Available" : "✗ Out of stock"}
              </button>
            <ConfirmDelete
              title={`Delete option "${opt.title}"?`}
              description="This will delete the option group and all its choices. This action cannot be undone."
              onConfirm={() => deleteOption(opt.id)}
              trigger={
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2">
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
              }
            />
            </div>
          </div>

          <ul className="ml-6 text-sm mt-2">
            {opt.choices.map((ch) => (
              <li key={ch.id} className="flex items-center justify-between py-2">
                <span className={ch.isAvailable !== false ? "" : "text-gray-400 line-through"}>
                  {ch.label}{" "}
                  {ch.extraPrice > 0 && (
                    <span className="text-gray-400">
                      (+£{ch.extraPrice.toFixed(2)})
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => { await updateFoodOptionChoice(ch.id, { isStandard: !ch.isStandard }); fetchOptions(); }}
                    title={ch.isStandard ? "Remove from standard" : "Mark as standard"}
                    className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${ch.isStandard ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                  >
                    {ch.isStandard ? "★ Standard" : "☆ Standard"}
                  </button>
                  <button
                    type="button"
                    onClick={async () => { await updateFoodOptionChoice(ch.id, { isAvailable: !ch.isAvailable }); fetchOptions(); }}
                    className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${ch.isAvailable !== false ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-600 hover:bg-red-200"}`}
                  >
                    {ch.isAvailable !== false ? "✓ Available" : "✗ Out of stock"}
                  </button>
                <ConfirmDelete
                  title={`Delete choice "${ch.label}"?`}
                  description="This action cannot be undone."
                  onConfirm={async () => {
                    await deleteChoiceApi(ch.id);
                    fetchOptions();
                  }}
                  trigger={
                    <button className="text-red-400 hover:text-red-600 ml-2">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  }
                />
                </div>
              </li>
            ))}
            {opt.choices.length === 0 && (
              <li className="text-gray-400 italic">No choices yet</li>
            )}
          </ul>

          <AddChoiceForm optionId={opt.id} onSuccess={fetchOptions} />
        </div>
      ))}

      {options.length === 0 && (
        <p className="text-gray-500 text-sm">No options created yet.</p>
      )}
    </div>
  );
}

function AddChoiceForm({
  optionId,
  onSuccess,
}: {
  optionId: string;
  onSuccess: () => void;
}) {
  const [label, setLabel] = useState("");
  const [extra, setExtra] = useState<number | string>(0);
  const [isStandard, setIsStandard] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!label) return;
    setLoading(true);
    await authFetch(`${API_URL}/foods/options/choice`, {
      method: "POST",
      body: JSON.stringify({
        optionId,
        label,
        extraPrice: Number(extra) || 0,
        isStandard,
      }),
    });
    setLabel("");
    setExtra(0);
    setIsStandard(false);
    setLoading(false);
    onSuccess();
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3">
      <Input
        placeholder="Choice name (e.g. Fries)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="flex-1 text-sm"
      />
      <Input
        placeholder="Extra"
        value={extra}
        onChange={(e) => setExtra(e.target.value)}
        className="w-full sm:w-24 text-sm"
        type="number"
      />
      <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap cursor-pointer">
        <input
          type="checkbox"
          checked={isStandard}
          onChange={(e) => setIsStandard(e.target.checked)}
        />
        Standard
      </label>
      <Button
        onClick={submit}
        disabled={loading}
        size="sm"
        className="whitespace-nowrap w-full sm:w-auto"
      >
        Add Choice
      </Button>
    </div>
  );
}
