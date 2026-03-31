import { FastifyInstance } from "fastify";
import { menuService } from "../menu/menu.service";
import { foodService } from "../food/food.service";
import { optionService } from "../food-option/option.service";
import { orderService } from "../order/order.service";
import { CreateOrderInput } from "../order/order.types";

function cleanPhone(phone: string): string {
  return phone.replace(/^whatsapp:/, "");
}

export function toolHandlers(app: FastifyInstance) {
  const menu = menuService(app);
  const food = foodService(app);
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
    /** Return a menu */
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

    /** Get all foods under a specific menu */
    async get_foods({ menuId }: { menuId: string }) {
      return await menu.findById(menuId);
    },

    /** (FoodOption + OptionChoice) of specific food */
    async get_food_options({ foodId }: { foodId: string }) {
      return await option.findByFood(foodId);
    },

    /** Place order */
    async create_order(args: CreateOrderInput) {
      // Clean whatsapp: prefix from phone so orders are searchable from web too
      if (args.phone) {
        args.phone = cleanPhone(args.phone);
      }
      return await order.create(args);
    },

    /** Order details */
    async get_order_status({
      phone,
      name,
    }: {
      phone?: string;
      name?: string;
    }) {
      return await order.findByCustomerOrPhone(name, phone ? cleanPhone(phone) : phone);
    },

    /** Get allergen profile by phone */
    async get_allergen_profile({ phone }: { phone: string }) {
      const profile = await findAllergenProfile(phone);
      if (!profile) return { allergenAsked: false, allergens: [], dietaryPreferences: [] };
      return profile;
    },

    /** Save/update allergen profile */
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
      // Check if User exists with this phone
      const user = await app.prisma.user.findFirst({ where: { phone: clean } });
      if (user) {
        return app.prisma.user.update({
          where: { id: user.id },
          data: { allergens, dietaryPreferences, allergenAsked: true },
          select: { allergens: true, dietaryPreferences: true, allergenAsked: true },
        });
      }
      // Upsert WhatsAppProfile
      return app.prisma.whatsAppProfile.upsert({
        where: { phone: clean },
        create: { phone: clean, name: name || null, allergens, dietaryPreferences, allergenAsked: true },
        update: { allergens, dietaryPreferences, allergenAsked: true, ...(name ? { name } : {}) },
      });
    },

    /** Check food allergens against customer profile */
    async check_food_allergens({ foodIds, phone }: { foodIds: string[]; phone: string }) {
      const clean = cleanPhone(phone);
      return order.checkAllergensByPhone(clean, foodIds);
    },
  };
}