export interface FoodSnapshot {
  id: string;
  name: string;
  basePrice: number;
}

export interface MenuSnapshot {
  id: string;
  name: string;
  foods: FoodSnapshot[];
}

export function menuSnapshotBlock(menus: MenuSnapshot[]): string {
  if (!menus || menus.length === 0) {
    return "No menus configured yet.";
  }

  return menus
    .map((menu) => {
      const foods = menu.foods
        .map((f) => `  • ${f.name} — £${f.basePrice.toFixed(2)} (foodId: ${f.id})`)
        .join("\n");
      return `**${menu.name}** (menuId: ${menu.id})\n${foods || "  (no available items)"}`;
    })
    .join("\n\n");
}
