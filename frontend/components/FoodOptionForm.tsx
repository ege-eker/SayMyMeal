// frontend/components/FoodOptionForm.tsx
"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authFetch, deleteChoice as deleteChoiceApi, updateFoodOption, updateFoodOptionChoice } from "@/lib/api";
import ConfirmDelete from "@/components/ConfirmDelete";
import { Trash2, Star, Plus } from "lucide-react";

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
    setOptions(await res.json());
  }

  useEffect(() => { fetchOptions(); }, [foodId]);

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
    await authFetch(`${API_URL}/foods/options/${optionId}`, { method: "DELETE" });
    fetchOptions();
  };

  return (
    <div className={`rounded-xl mt-3 overflow-hidden border ${compact ? "bg-gray-50" : "bg-white shadow-sm"}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Options</h3>
      </div>

      {/* Add option group */}
      <div className="px-4 py-3 border-b">
        <div className="flex gap-2">
          <Input
            placeholder="Group name (e.g. Sauce Choice)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 h-9 text-sm"
          />
          <label className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap cursor-pointer select-none">
            <input
              type="checkbox"
              checked={multiple}
              onChange={(e) => setMultiple(e.target.checked)}
              className="rounded"
            />
            Multi
          </label>
          <Button size="sm" onClick={createOption} disabled={isLoading} className="h-9 px-3 shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Option groups */}
      {options.length === 0 && (
        <div className="px-4 py-6 text-center text-sm text-gray-400 italic">No options yet</div>
      )}

      <div className="divide-y">
        {options.map((opt) => (
          <div key={opt.id} className="px-4 py-4">
            {/* Group header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-sm font-semibold truncate ${opt.isAvailable ? "text-gray-800" : "text-gray-400 line-through"}`}>
                  {opt.title}
                </span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                  {opt.multiple ? "multi" : "single"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={async () => { await updateFoodOption(opt.id, { isAvailable: !opt.isAvailable }); fetchOptions(); }}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    opt.isAvailable ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-600 hover:bg-red-200"
                  }`}
                >
                  {opt.isAvailable ? "On" : "Off"}
                </button>
                <ConfirmDelete
                  title={`Delete "${opt.title}"?`}
                  description="This will delete the option group and all its choices. This action cannot be undone."
                  onConfirm={() => deleteOption(opt.id)}
                  trigger={
                    <button type="button" className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  }
                />
              </div>
            </div>

            {/* Choices — card layout */}
            <div className="space-y-2">
              {opt.choices.map((ch) => (
                <div
                  key={ch.id}
                  className={`rounded-lg border px-3 py-2.5 transition-opacity ${
                    ch.isAvailable ? "bg-white" : "bg-gray-50 opacity-60"
                  }`}
                >
                  {/* Row 1: name + price */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${ch.isAvailable ? "text-gray-800" : "text-gray-400 line-through"}`}>
                      {ch.label}
                    </span>
                    {ch.extraPrice > 0 && (
                      <span className="text-xs font-semibold text-amber-600 ml-2 shrink-0">
                        +£{ch.extraPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {/* Row 2: actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={async () => { await updateFoodOptionChoice(ch.id, { isStandard: !ch.isStandard }); fetchOptions(); }}
                      title={ch.isStandard ? "Remove from standard" : "Mark as standard"}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${
                        ch.isStandard
                          ? "bg-amber-100 text-amber-700 font-medium"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      }`}
                    >
                      <Star className={`w-3 h-3 shrink-0 ${ch.isStandard ? "fill-amber-500 text-amber-500" : ""}`} />
                      <span>Std</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => { await updateFoodOptionChoice(ch.id, { isAvailable: !ch.isAvailable }); fetchOptions(); }}
                      className={`text-xs px-2 py-1 rounded-full transition-all ${
                        ch.isAvailable
                          ? "bg-emerald-100 text-emerald-700 font-medium hover:bg-emerald-200"
                          : "bg-red-100 text-red-500 font-medium hover:bg-red-200"
                      }`}
                    >
                      {ch.isAvailable ? "Available" : "Off"}
                    </button>
                    <div className="ml-auto">
                      <ConfirmDelete
                        title={`Delete "${ch.label}"?`}
                        description="This action cannot be undone."
                        onConfirm={async () => { await deleteChoiceApi(ch.id); fetchOptions(); }}
                        trigger={
                          <button type="button" className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}

              {opt.choices.length === 0 && (
                <p className="text-xs text-gray-400 italic py-1 pl-1">No choices yet</p>
              )}
            </div>

            <AddChoiceForm optionId={opt.id} onSuccess={fetchOptions} />
          </div>
        ))}
      </div>
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
      body: JSON.stringify({ optionId, label, extraPrice: Number(extra) || 0, isStandard }),
    });
    setLabel("");
    setExtra(0);
    setIsStandard(false);
    setLoading(false);
    onSuccess();
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          placeholder="Choice name"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1 h-9 text-sm"
        />
        <Input
          placeholder="£ extra"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          className="w-20 h-9 text-sm shrink-0"
          type="number"
          step="0.01"
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isStandard}
            onChange={(e) => setIsStandard(e.target.checked)}
            className="rounded"
          />
          <Star className={`w-3 h-3 ${isStandard ? "fill-amber-500 text-amber-500" : "text-gray-400"}`} />
          Standard
        </label>
        <Button onClick={submit} disabled={loading} size="sm" className="h-8 ml-auto">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}
