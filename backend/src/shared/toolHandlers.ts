import { FastifyInstance } from "fastify";
import { menuService } from "../modules/menu/menu.service";
import { optionService } from "../modules/food-option/option.service";
import { orderService } from "../modules/order/order.service";
import { CreateOrderInput, UKAddress, ValidatedCartItem, SelectedOption } from "../modules/order/order.types";
import { BadRequestError } from "../utils/errors";
import { normalizePhone } from "./phone";
import { resolveCaller, ResolvedCaller } from "./identityResolver";

export function toolHandlers(app: FastifyInstance) {
  const menu = menuService(app);
  const option = optionService(app);
  const order = orderService(app);

  async function persistCallerAddress(
    caller: ResolvedCaller,
    phone: string,
    customerName: string,
    addr: UKAddress
  ) {
    if (!addr.houseNumber || !addr.postcode) return;

    if (caller.type === "user") {
      const exists = caller.user.addresses.some(
        (a) => a.houseNumber === addr.houseNumber && a.postcode === addr.postcode
      );
      if (!exists) {
        await app.prisma.address.create({
          data: {
            userId: caller.user.id,
            houseNumber: addr.houseNumber,
            street: addr.street,
            city: addr.city,
            postcode: addr.postcode,
            isDefault: caller.user.addresses.length === 0,
          },
        });
      }
      if (!caller.user.name) {
        await app.prisma.user.update({ where: { id: caller.user.id }, data: { name: customerName } });
      }
    } else if (caller.type === "whatsapp") {
      const exists = caller.profile.addresses.some(
        (a) => a.houseNumber === addr.houseNumber && a.postcode === addr.postcode
      );
      if (!exists) {
        await app.prisma.address.create({
          data: {
            whatsappProfileId: caller.profile.id,
            houseNumber: addr.houseNumber,
            street: addr.street,
            city: addr.city,
            postcode: addr.postcode,
            isDefault: caller.profile.addresses.length === 0,
          },
        });
      }
      if (!caller.profile.name) {
        await app.prisma.whatsAppProfile.update({
          where: { id: caller.profile.id },
          data: { name: customerName },
        });
      }
    } else {
      const wp = await app.prisma.whatsAppProfile.create({
        data: { phone, name: customerName },
      });
      await app.prisma.address.create({
        data: {
          whatsappProfileId: wp.id,
          houseNumber: addr.houseNumber,
          street: addr.street,
          city: addr.city,
          postcode: addr.postcode,
          isDefault: true,
        },
      });
    }
  }

  return {
    async get_menus({ restaurantId }: { restaurantId: string }) {
      const menus = await app.prisma.menu.findMany({
        where: { restaurantId },
        include: {
          foods: {
            where: { isAvailable: true },
            select: { id: true, name: true, basePrice: true },
          },
        },
      });
      app.log.info(`🍽️ Menus sent: ${JSON.stringify(menus)}`);
      return menus;
    },

    async get_foods({ menuId }: { menuId: string }) {
      return await menu.findByIdAvailable(menuId);
    },

    async get_food_options({ foodId }: { foodId: string }) {
      const food = await app.prisma.food.findUnique({
        where: { id: foodId },
        select: { name: true },
      });
      const options = await option.findByFoodAvailable(foodId);
      return { foodName: food?.name ?? foodId, options };
    },

    async request_item_confirmation({ items }: {
      items: Array<{ foodId: string; quantity: number; selectedOptions: Array<{ optionId: string; choiceId: string }> }>;
    }): Promise<{ summaryLines: string[]; message: string }> {
      const summaryLines: string[] = [];

      for (const item of items) {
        const food = await app.prisma.food.findFirst({
          where: { id: item.foodId, isAvailable: true },
          select: { name: true, basePrice: true },
        });
        if (!food) throw new BadRequestError(`Invalid foodId: "${item.foodId}"`);

        const foodOptions = await app.prisma.foodOption.findMany({
          where: { foodId: item.foodId, isAvailable: true },
          include: { choices: { where: { isAvailable: true } } },
        });

        for (const group of foodOptions) {
          const hasSelection = item.selectedOptions?.some((s) => s.optionId === group.id);
          if (!hasSelection) {
            const choices = group.choices.map((c) => `${c.label} [choiceId: ${c.id}]`).join(", ");
            throw new BadRequestError(
              `Missing selection for "${group.title}" on "${food.name}". Available choices: ${choices}`
            );
          }
        }

        let extraTotal = 0;
        const choiceLabels: string[] = [];

        for (const sel of item.selectedOptions ?? []) {
          const group = foodOptions.find((o) => o.id === sel.optionId);
          if (!group) throw new BadRequestError(`Invalid optionId "${sel.optionId}"`);
          const choice = group.choices.find((c) => c.id === sel.choiceId);
          if (!choice) {
            const valid = group.choices.map((c) => `${c.label} [choiceId: ${c.id}]`).join(", ");
            throw new BadRequestError(`Invalid choiceId "${sel.choiceId}" for "${group.title}". Valid choices: ${valid}`);
          }
          extraTotal += choice.extraPrice;
          choiceLabels.push(choice.label);
        }

        const total = (Number(food.basePrice) + extraTotal) * item.quantity;
        const optStr = choiceLabels.length ? ` (${choiceLabels.join(", ")})` : "";
        summaryLines.push(`${item.quantity}x ${food.name}${optStr} — £${total.toFixed(2)}`);
      }

      return {
        summaryLines,
        message: "Read these summaryLines verbatim to the customer and wait for explicit yes before calling confirm_item.",
      };
    },

    async confirm_item({ restaurantId, foodId, quantity, selectedOptions }: {
      restaurantId: string;
      foodId: string;
      quantity: number;
      selectedOptions?: SelectedOption[];
    }): Promise<{ confirmedItem: ValidatedCartItem; itemSummary: string; cartSize: number }> {
      const food = await app.prisma.food.findFirst({
        where: { id: foodId, isAvailable: true, menu: { restaurantId } },
        select: { id: true, name: true, basePrice: true },
      });

      if (!food) {
        const allFoods = await app.prisma.food.findMany({
          where: { menu: { restaurantId }, isAvailable: true },
          select: { id: true, name: true },
        });
        const foodList = allFoods.map((f) => `"${f.name}" [foodId: ${f.id}]`).join(", ");
        throw new BadRequestError(`Invalid foodId: "${foodId}". Valid foods: ${foodList}.`);
      }

      const foodOptions = await app.prisma.foodOption.findMany({
        where: { foodId, isAvailable: true },
        include: { choices: { where: { isAvailable: true } } },
      });

      for (const optionGroup of foodOptions) {
        const hasSelection = selectedOptions?.some((sel) => sel.optionId === optionGroup.id);
        if (!hasSelection) {
          const choiceList = optionGroup.choices
            .map((c) => `${c.label} [choiceId: ${c.id}, extraPrice: ${c.extraPrice}]`)
            .join(", ");
          throw new BadRequestError(
            `Missing required selection for "${optionGroup.title}" [optionId: ${optionGroup.id}] on "${food.name}". ` +
            `Available choices: ${choiceList}.`
          );
        }
      }

      if (selectedOptions) {
        for (const sel of selectedOptions) {
          const existingOption = foodOptions.find((o) => o.id === sel.optionId);
          if (!existingOption) {
            const validGroups = foodOptions.map((o) => `"${o.title}" [optionId: ${o.id}]`).join(", ");
            throw new BadRequestError(`Invalid optionId "${sel.optionId}". Valid groups: ${validGroups}.`);
          }
          if (sel.choiceId && !existingOption.choices.find((c) => c.id === sel.choiceId)) {
            const validChoices = existingOption.choices.map((c) => `${c.label} [choiceId: ${c.id}]`).join(", ");
            throw new BadRequestError(`Invalid choiceId "${sel.choiceId}". Valid choices: ${validChoices}.`);
          }
        }
      }

      const enrichedOptions = (selectedOptions ?? []).map((sel) => {
        const group = foodOptions.find((o) => o.id === sel.optionId);
        const choice = group?.choices.find((c) => c.id === sel.choiceId);
        if (!choice) return sel;
        if (sel.choiceLabel && sel.choiceLabel !== choice.label) {
          throw new BadRequestError(
            `Label mismatch for choiceId "${sel.choiceId}": ` +
            `you sent "${sel.choiceLabel}" but the actual label is "${choice.label}". ` +
            `Use exact values from get_food_options.`
          );
        }
        return { ...sel, extraPrice: choice.extraPrice, choiceLabel: choice.label };
      });

      const extraPrice = enrichedOptions.reduce((sum, sel) => sum + (sel.extraPrice ?? 0), 0);
      const itemTotal = (food.basePrice + extraPrice) * quantity;
      const optionsSummary = enrichedOptions.map((s) => s.choiceLabel ?? s.choiceId).join(", ");
      const itemSummary = `${quantity}x ${food.name}${optionsSummary ? ` (${optionsSummary})` : ""} — £${itemTotal.toFixed(2)}`;

      return {
        confirmedItem: { foodId, foodName: food.name, quantity, selectedOptions: enrichedOptions },
        itemSummary,
        cartSize: 0, // updated by the caller (WhatsApp/voice service) after adding to cart
      };
    },

    async create_order(args: CreateOrderInput) {
      const normalized = normalizePhone(args.phone ?? "");
      args.phone = normalized;

      const caller = await resolveCaller(app, normalized);
      const userId = caller.type === "user" ? caller.user.id : undefined;

      // For known callers, override the name the AI sent with the verified profile name
      if (caller.type === "user" && caller.user.name) {
        args.customer = caller.user.name;
      } else if (caller.type === "whatsapp" && caller.profile.name) {
        args.customer = caller.profile.name;
      }

      const result = await order.create(args, userId);

      await persistCallerAddress(caller, normalized, args.customer, args.address);

      return result;
    },

    async get_order_status({
      phone,
      name,
    }: {
      phone?: string;
      name?: string;
    }) {
      return await order.findByCustomerOrPhone(name, phone ? normalizePhone(phone) : phone);
    },

    async get_allergen_profile({ phone }: { phone: string }) {
      const caller = await resolveCaller(app, phone);
      if (caller.type === "user") {
        const u = caller.user;
        return { source: "user", id: u.id, allergens: u.allergens, dietaryPreferences: u.dietaryPreferences, allergenAsked: u.allergenAsked };
      }
      if (caller.type === "whatsapp") {
        const p = caller.profile;
        return { source: "whatsapp", id: p.id, allergens: p.allergens, dietaryPreferences: p.dietaryPreferences, allergenAsked: p.allergenAsked };
      }
      return { allergenAsked: false, allergens: [], dietaryPreferences: [] };
    },

    async set_allergen_profile({
      phone,
      name,
      allergens,
      dietaryPreferences,
    }: {
      phone: string;
      name?: string;
      allergens: string[];
      dietaryPreferences: string[];
    }) {
      const normalized = normalizePhone(phone);
      const user = await app.prisma.user.findUnique({ where: { phone: normalized } });
      if (user) {
        return app.prisma.user.update({
          where: { id: user.id },
          data: { allergens, dietaryPreferences, allergenAsked: true },
          select: { allergens: true, dietaryPreferences: true, allergenAsked: true },
        });
      }
      return app.prisma.whatsAppProfile.upsert({
        where: { phone: normalized },
        create: { phone: normalized, name: name || null, allergens, dietaryPreferences, allergenAsked: true },
        update: { allergens, dietaryPreferences, allergenAsked: true, ...(name ? { name } : {}) },
      });
    },

    async check_food_allergens({ foodIds, phone }: { foodIds: string[]; phone: string }) {
      const normalized = normalizePhone(phone);
      return order.checkAllergensByPhone(normalized, foodIds);
    },
  };
}

/**
 * Context-aware follow-up instructions after each function call.
 * Used by both Voice and WhatsApp modules to guide the AI to the next step.
 */
export function getFollowUpInstruction(fnName: string): string {
  switch (fnName) {
    case "request_item_confirmation":
      return "Server has built the accurate summary from the database. Read the summaryLines verbatim to the customer — do NOT paraphrase or change any details. Wait for explicit yes before calling confirm_item.";
    case "get_menus":
      return "Menus fetched. List ONLY the menu names returned in this result — do not add, invent, or describe any items not in the result. Ask the customer which menu they'd like to order from. If the customer has already named specific foods they want, call get_food_options for those foods directly using their foodIds from the MENU REFERENCE — no need to list menus first.";
    case "get_foods":
      return "Foods fetched. List ONLY the food items and prices returned in this result — never mention any food not in this result. Ask the customer what they'd like to order. When the customer picks a food, you MUST call get_food_options with that food's ID before discussing any customisation — even if you fetched options for a different item earlier in this conversation.";
    case "get_food_options":
      return "FIRST: verify that `foodName` in this result matches the food the customer ordered. If the names differ (e.g. result says 'Pitta' but customer said 'Wrap'), you selected the wrong foodId — find the food whose name matches the customer's exact wording in the MENU REFERENCE and call get_food_options again with the correct foodId. Do NOT call confirm_item until the food name matches. If the result has zero options, the food has no required customisations — call confirm_item immediately without asking about options. Otherwise use ONLY the option groups and choices returned — never invent or assume options. If the customer already stated their selections for this food, match them to the returned choiceIds and call confirm_item immediately — do NOT ask again. For each option group: if some choices have isStandard: true, present those as the default and ask 'Is that OK?' — if yes, use those choiceIds directly; if the customer wants to change, list all available choices for that group and let them pick. If NO choices have isStandard: true, ask normally. Go through ALL groups before calling confirm_item. These options are specific to this food only — never reuse them for a different food. IMPORTANT: Only call confirm_item once ALL required option groups have a customer-provided answer — never call confirm_item with empty or guessed selectedOptions.";
    case "confirm_item":
      return "Item confirmed and added to cart. If you still have more items to confirm from the customer's initial order, do NOT ask about add-ons yet — just note this item was confirmed and immediately call confirm_item for the next item in sequence. Only show the full cart summary and ask ONCE 'Would you like to add anything else?' after ALL items from the initial request are confirmed. If yes — go back to get_menus to start fresh for the new item. If no — collect the delivery address, then call create_order (items are automatically taken from the cart — do NOT include them).";
    case "create_order":
      return "Check the tool result. If it contains an 'error' field: (1) If the error contains 'Allergen conflict', tell the customer exactly which foods contain which allergens and ask 'Would you still like to proceed with your order?' — if yes, call acknowledge_allergen_risk first, then retry create_order; if no, offer to remove the conflicting item(s). (2) For any other error, explain it naturally in your own words — never read the error verbatim, ask them to correct it. Do NOT say the order was placed if there is an error. If successful (no error field), the result contains an `etaMinutes` field — use that exact number as the delivery time. Do NOT use any other number. Do NOT read out the order items again.";
    case "get_order_status":
      return "Order status retrieved. Share the status with the customer and close politely.";
    case "get_allergen_profile":
      return "Allergen profile retrieved. If allergenAsked is false, ask the customer about their allergies. If true, continue normally.";
    case "set_allergen_profile":
      return "Allergen profile saved. Thank the customer and close the call politely.";
    case "acknowledge_allergen_risk":
      return "Customer has acknowledged the allergen risk. Now call create_order immediately.";
    case "check_food_allergens":
      return "STOP. Do NOT call create_order or any other tool in this response. If there are warnings, send only the allergen warning message and wait for the customer's reply in a new message. Never treat a prior 'yes' about placing the order as allergen acknowledgment — the customer must explicitly confirm AFTER seeing the warning. Only call acknowledge_allergen_risk after they confirm. If there are no warnings, call create_order now.";
    default:
      return `Function ${fnName} completed. Continue the conversation naturally.`;
  }
}
