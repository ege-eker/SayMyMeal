import type { ResolvedCaller } from "./identityResolver";

export function renderCallerProfileBlock(caller?: ResolvedCaller): string {
  if (!caller || caller.type === "new") {
    return "- New caller. No saved info.";
  }

  const callerName =
    caller.type === "user" ? caller.user.name :
    caller.profile.name ?? null;

  const callerAllergens =
    caller.type === "user" ? caller.user.allergens : caller.profile.allergens;

  const callerAddresses =
    caller.type === "user" ? caller.user.addresses : caller.profile.addresses;

  const recentOrderCount = caller.recentOrders?.length ?? 0;

  return [
    callerName ? `- Name: ${callerName}` : null,
    `- Allergens: ${callerAllergens.join(", ") || "none"}`,
    `- Previous orders: ${recentOrderCount}`,
    callerAddresses.length
      ? `- Saved addresses: ${callerAddresses.map((a) => `${a.label ?? "address"}: ${a.houseNumber} ${a.street}, ${a.postcode}`).join(" | ")}`
      : null,
    callerAddresses.length
      ? "When asking for delivery address, FIRST offer the first saved address listed above — read its exact details from this CALLER PROFILE, do not invent one. Only ask for a new one if they decline."
      : null,
    callerName ? "Greet the customer by name." : null,
  ]
    .filter(Boolean)
    .join("\n");
}
