import { FastifyInstance } from "fastify";
import { menuService } from "../menu/menu.service";
import { foodService } from "../food/food.service";
import { optionService } from "../food-option/option.service";
import { orderService } from "../order/order.service";
import { CreateOrderInput } from "../order/order.types";

export function toolHandlers(app: FastifyInstance) {
  const menu = menuService(app);
  const food = foodService(app);
  const option = optionService(app);
  const order = orderService(app);

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
      return await order.findByCustomerOrPhone(name, phone);
    },
  };
}