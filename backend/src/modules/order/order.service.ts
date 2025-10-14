import { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { CreateOrderInput, UpdateOrderStatusInput } from "./order.types";
import {BadRequestError} from "../../utils/errors";

export const orderService = (app: FastifyInstance) => ({
    async create(data: CreateOrderInput) {
      const restaurant = await app.prisma.restaurant.findUnique({
        where: { id: data.restaurantId },
        include: { menus: { include: { foods: true } } },
      });
      if (!restaurant) throw new Error("Restaurant not found");

      const normalizedPostcode = data.address.postcode.replace(/\s/g, "").toUpperCase();
      const zones = (restaurant.deliveryZones as any[]) || [];
      const matchedZone = zones.find(
        (z) => z.postcode.replace(/\s/g, "").toUpperCase() === normalizedPostcode
      );
      if (!matchedZone) throw new Error("Delivery zone error");

      // Validate foodIds and selectedOptions
        // get all valid foodIds from the restaurant's menus
        const allFoods = restaurant.menus.flatMap((m) => m.foods);
        const validFoodIds = allFoods.map((f) => f.id);

        // check each foodId in the order items
        for (const item of data.items) {
          if (!validFoodIds.includes(item.foodId)) {
            throw new BadRequestError(`Invalid foodId: ${item.foodId}, please check the menu and try again.`);
          }

          // Check selectedOptions if they exist
          if (item.selectedOptions && item.selectedOptions.length > 0) {
            for (const opt of item.selectedOptions) {
              // Option/Choice DB'de var mı kontrol et
              const existingOption = await app.prisma.foodOption.findUnique({
                where: { id: opt.optionId },
                include: { choices: true }
              });

              if (!existingOption) {
                throw new BadRequestError(`Invalid optionId: ${opt.optionId}. Please check the menu and try again.`);
                }

              const validChoiceIds = existingOption.choices.map((c) => c.id);
              if (opt.choiceId && !validChoiceIds.includes(opt.choiceId)) {
                throw new BadRequestError(`Invalid choiceId: ${opt.choiceId}. Please check the menu and try again.`);
              }
            }
          }
        }

      return app.prisma.order.create({
        data: {
          customer: data.customer,
          phone: data.phone,
          address: data.address as unknown as Prisma.InputJsonValue,
          status: "pending",
          etaMinutes: matchedZone.etaMinutes,
          restaurantId: data.restaurantId,
          items: {
            create: data.items.map((item) => ({
              foodId: item.foodId,
              quantity: item.quantity,
              selected: item.selectedOptions
                ? (item.selectedOptions as unknown as Prisma.InputJsonValue)
                : undefined,
            })),
          },
        },
        include: {
          items: true,
          restaurant: true,
        },
      });
    },

    async findAll(phone?: string) {
        return app.prisma.order.findMany({
            where: phone ? { phone } : {},
            include: { items: {
                include: { food: true},
                }, restaurant: true, },
            orderBy: {createdAt: "desc"},
        });
    },

    async findById(id: string) {
        return app.prisma.order.findUnique({
            where: { id },
            include: { items: true, restaurant: true, },
        });
    },

    async updateStatus(id: string, data: UpdateOrderStatusInput) {
        return app.prisma.order.update({
            where: { id },
            data: { status: data.status },
            include: { items: true },
        });
    },
    async findByCustomerOrPhone(name?: string, phone?: string) {
  let orders: any[] = [];

  // just numbers
  const normalize = (v: string) => v.replace(/\D/g, "");

  if (phone) {
    const normalized = normalize(phone);

    // fetch all orders, suitable for low data count
    const allOrders = await app.prisma.order.findMany({
      include: { restaurant: true, items: true },
      orderBy: { createdAt: "desc" },
    });

    // spaces "dashes" and "+44"s
    orders = allOrders.filter((o) => {
      const dbPhone = normalize(o.phone ?? "");
      return dbPhone === normalized || dbPhone.endsWith(normalized) || normalized.endsWith(dbPhone);
    });
  } else if (name) {
    orders = await app.prisma.order.findMany({
      where: { customer: { contains: name, mode: "insensitive" } },
      include: { restaurant: true, items: true },
      orderBy: { createdAt: "desc" },
    });
  }
  return orders;
}
});