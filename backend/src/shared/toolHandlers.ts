import { FastifyInstance } from "fastify";
import { menuService } from "../modules/menu/menu.service";
import { optionService } from "../modules/food-option/option.service";
import { orderService } from "../modules/order/order.service";
import { CreateOrderInput } from "../modules/order/order.types";

function cleanPhone(phone: string): string {
  return phone.replace(/^whatsapp:/, "");
}

export function toolHandlers(app: FastifyInstance) {
  const menu = menuService(app);
  const option = optionService(app);
  const order = orderService(app);

  async function findAllergenProfile(phone: string) {
    const clean = cleanPhone(phone);
    const user = await app.prisma.user.findFirst({ where: { phone: clean } });
    if (user) {
      return { source: "user", id: user.id, allergens: user.allergens, dietaryPreferences: user.dietaryPreferences, allergenAsked: user.allergenAsked };
    }
    const wp = await app.prisma.whatsAppProfile.findUnique({ where: { phone: clean } });
    if (wp) {
      return { source: "whatsapp", id: wp.id, allergens: wp.allergens, dietaryPreferences: wp.dietaryPreferences, allergenAsked: wp.allergenAsked };
    }
    return null;
  }

  return {
    async get_menus({ restaurantId }: { restaurantId: string }) {
      const menus = await app.prisma.menu.findMany({
        where: { restaurantId },
        include: {
          foods: {
            select: { id: true, name: true, basePrice: true },
          },
        },
      });
      app.log.info(`🍽️ Menus sent: ${JSON.stringify(menus)}`);
      return menus;
    },

    async get_foods({ menuId }: { menuId: string }) {
      return await menu.findById(menuId);
    },

    async get_food_options({ foodId }: { foodId: string }) {
      return await option.findByFood(foodId);
    },

    async create_order(args: CreateOrderInput) {
      if (args.phone) {
        args.phone = cleanPhone(args.phone);
      }
      return await order.create(args);
    },

    async get_order_status({
      phone,
      name,
    }: {
      phone?: string;
      name?: string;
    }) {
      return await order.findByCustomerOrPhone(name, phone ? cleanPhone(phone) : phone);
    },

    async get_allergen_profile({ phone }: { phone: string }) {
      const profile = await findAllergenProfile(phone);
      if (!profile) return { allergenAsked: false, allergens: [], dietaryPreferences: [] };
      return profile;
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
      const clean = cleanPhone(phone);
      const user = await app.prisma.user.findFirst({ where: { phone: clean } });
      if (user) {
        return app.prisma.user.update({
          where: { id: user.id },
          data: { allergens, dietaryPreferences, allergenAsked: true },
          select: { allergens: true, dietaryPreferences: true, allergenAsked: true },
        });
      }
      return app.prisma.whatsAppProfile.upsert({
        where: { phone: clean },
        create: { phone: clean, name: name || null, allergens, dietaryPreferences, allergenAsked: true },
        update: { allergens, dietaryPreferences, allergenAsked: true, ...(name ? { name } : {}) },
      });
    },

    async check_food_allergens({ foodIds, phone }: { foodIds: string[]; phone: string }) {
      const clean = cleanPhone(phone);
      return order.checkAllergensByPhone(clean, foodIds);
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
      return "Menus fetched. List the menu names with brief descriptions and ask the customer which one they'd like to order from.";
    case "get_foods":
      return "Foods fetched. List the food items with their prices and ask the customer what they'd like to order.";
    case "get_food_options":
      return "Options fetched. Present the available options clearly (required choices first) and ask for their preferences.";
    case "create_order":
      return "Order has been placed. Confirm the order to the customer with estimated delivery time. Then check their allergen profile.";
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
