import { FastifyInstance } from "fastify";
import { menuService } from "../modules/menu/menu.service";
import { optionService } from "../modules/food-option/option.service";
import { orderService } from "../modules/order/order.service";
import { CreateOrderInput, UKAddress } from "../modules/order/order.types";
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
      return await option.findByFoodAvailable(foodId);
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
    case "get_menus":
      return "Menus fetched. List ONLY the menu names returned in this result — do not add, invent, or describe any items not in the result. Ask the customer which menu they'd like to order from.";
    case "get_foods":
      return "Foods fetched. List ONLY the food items and prices returned in this result — never mention any food not in this result. Ask the customer what they'd like to order.";
    case "get_food_options":
      return "Options fetched. Use ONLY the option groups and choices returned in this result — never invent or assume options. Ask about each option group one at a time: ask the first group, wait for the customer's answer, then ask the next group, and so on until ALL groups have been answered. Do not skip any group. Do not list all groups at once. Only after every group is answered, confirm the item and ask about quantity.";
    case "create_order":
      return "Check the tool result. If it contains an 'error' field, understand what went wrong and explain it to the customer naturally in your own words — never read the error message verbatim. Ask them to correct it. Do NOT say the order was placed if there is an error. If successful (no error field), simply say the order has been placed and give the estimated delivery time. Do NOT read out the order items again.";
    case "get_order_status":
      return "Order status retrieved. Share the status with the customer and close politely.";
    case "get_allergen_profile":
      return "Allergen profile retrieved. If allergenAsked is false, ask the customer about their allergies. If true, continue normally.";
    case "set_allergen_profile":
      return "Allergen profile saved. Thank the customer and close the call politely.";
    case "check_food_allergens":
      return "Allergen check done. If there are warnings, inform the customer and ask if they want to proceed. If no warnings, continue with creating the order.";
    default:
      return `Function ${fnName} completed. Continue the conversation naturally.`;
  }
}
