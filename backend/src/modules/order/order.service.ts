import { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { CreateOrderInput, UpdateOrderStatusInput } from "./order.types";
import { BadRequestError } from "../../utils/errors";

export const orderService = (app: FastifyInstance) => ({
    async create(data: CreateOrderInput, userId?: string) {
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

      let etaMinutes = matchedZone.etaMinutes;
      if (restaurant.isBusy && restaurant.busyExtraMinutes > 0) {
        etaMinutes += restaurant.busyExtraMinutes;
      }

      const allFoods = restaurant.menus.flatMap((m) => m.foods);
      const validFoodIds = allFoods.map((f) => f.id);

      for (const item of data.items) {
        if (!validFoodIds.includes(item.foodId)) {
          throw new BadRequestError(`Invalid foodId: ${item.foodId}, please check the menu and try again.`);
        }

        if (item.selectedOptions && item.selectedOptions.length > 0) {
          for (const opt of item.selectedOptions) {
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
          etaMinutes,
          notes: data.notes || null,
          restaurantId: data.restaurantId,
          userId: userId || null,
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

    async findAll(restaurantId?: string, restaurantIds?: string[], acknowledged?: boolean) {
        const where: any = {};
        if (restaurantId) {
          where.restaurantId = restaurantId;
        } else if (restaurantIds && restaurantIds.length > 0) {
          where.restaurantId = { in: restaurantIds };
        }
        if (acknowledged === true) {
          where.acknowledgedAt = { not: null };
        } else if (acknowledged === false) {
          where.acknowledgedAt = null;
        }
        return app.prisma.order.findMany({
            where,
            include: { items: { include: { food: true } }, restaurant: true },
            orderBy: { createdAt: "desc" },
        });
    },

    async findById(id: string) {
        return app.prisma.order.findUnique({
            where: { id },
            include: { items: true, restaurant: true },
        });
    },

    async updateStatus(id: string, data: UpdateOrderStatusInput) {
        return app.prisma.order.update({
            where: { id },
            data: { status: data.status },
            include: { items: true },
        });
    },

    async acknowledge(id: string) {
        return app.prisma.order.update({
            where: { id },
            data: { acknowledgedAt: new Date() },
            include: { items: { include: { food: true } }, restaurant: true },
        });
    },

    async findByUser(userId: string) {
        return app.prisma.order.findMany({
            where: { userId },
            include: {
              items: { include: { food: true } },
              restaurant: { select: { id: true, name: true, slug: true, imageUrl: true } },
              user: { select: { allergens: true, dietaryPreferences: true } },
            },
            orderBy: { createdAt: "desc" },
        });
    },

    async checkAllergens(foodIds: string[], userAllergens: string[]) {
      if (!userAllergens.length || !foodIds.length) return { warnings: [] };
      const foods = await app.prisma.food.findMany({
        where: { id: { in: foodIds } },
        select: { id: true, name: true, allergens: true },
      });
      const warnings = foods
        .filter(f => f.allergens.some(a => userAllergens.includes(a)))
        .map(f => ({
          foodId: f.id,
          foodName: f.name,
          matchedAllergens: f.allergens.filter(a => userAllergens.includes(a)),
        }));
      return { warnings };
    },

    async checkAllergensByPhone(phone: string, foodIds: string[]) {
      // Try User first, then WhatsAppProfile
      const user = await app.prisma.user.findFirst({ where: { phone } });
      if (user && user.allergens.length > 0) {
        return this.checkAllergens(foodIds, user.allergens);
      }
      const wp = await app.prisma.whatsAppProfile.findUnique({ where: { phone } });
      if (wp && wp.allergens.length > 0) {
        return this.checkAllergens(foodIds, wp.allergens);
      }
      return { warnings: [] };
    },

    async findByCustomerOrPhone(name?: string, phone?: string) {
      const limitedSelect = {
        id: true,
        status: true,
        etaMinutes: true,
        createdAt: true,
      };

      let orders: any[] = [];
      const normalize = (v: string) => v.replace(/\D/g, "");

      if (phone) {
        const normalized = normalize(phone);
        const allOrders = await app.prisma.order.findMany({
          select: { ...limitedSelect, phone: true },
          orderBy: { createdAt: "desc" },
        });
        orders = allOrders
          .filter((o: any) => {
            const dbPhone = normalize(o.phone ?? "");
            return dbPhone === normalized || dbPhone.endsWith(normalized) || normalized.endsWith(dbPhone);
          })
          .map(({ phone: _phone, ...rest }: any) => rest);
      } else if (name) {
        orders = await app.prisma.order.findMany({
          where: { customer: { contains: name, mode: "insensitive" } },
          select: limitedSelect,
          orderBy: { createdAt: "desc" },
        });
      }
      return orders;
    }
});
