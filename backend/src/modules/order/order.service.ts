import { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { CreateOrderInput, UpdateOrderStatusInput } from "./order.types";
import { BadRequestError } from "../../utils/errors";
import { normalizePhone } from "../blacklist/blacklist.service";

export const orderService = (app: FastifyInstance) => ({
    async create(data: CreateOrderInput, userId?: string) {
      const restaurant = await app.prisma.restaurant.findUnique({
        where: { id: data.restaurantId },
        include: { menus: { include: { foods: true } } },
      });
      if (!restaurant) throw new Error("Restaurant not found");

      if (!restaurant.acceptingOrders) {
        throw new BadRequestError("This restaurant is currently not accepting orders. Please try again later.");
      }

      // Blacklist check
      if (data.phone) {
        const blacklisted = await app.prisma.blacklist.findUnique({
          where: {
            phone_restaurantId: {
              phone: normalizePhone(data.phone),
              restaurantId: data.restaurantId,
            },
          },
        });
        if (blacklisted) {
          await app.prisma.blacklist.update({
            where: { id: blacklisted.id },
            data: { attemptCount: { increment: 1 }, lastAttemptAt: new Date() },
          });
          throw new BadRequestError("Unable to place order for this restaurant.");
        }
      }

      // --- Delivery zone validation temporarily disabled ---
      // Uncomment this block to re-enable postcode-based delivery zone checks.
      //
      // const normalizedPostcode = data.address.postcode.replace(/\s/g, "").toUpperCase();
      // const zones = (restaurant.deliveryZones as any[]) || [];
      // const matchedZone = zones.find(
      //   (z) => z.postcode.replace(/\s/g, "").toUpperCase() === normalizedPostcode
      // );
      // if (!matchedZone) throw new Error("Delivery zone error");
      //
      // let etaMinutes = matchedZone.etaMinutes;
      // if (restaurant.isBusy && restaurant.busyExtraMinutes > 0) {
      //   etaMinutes += restaurant.busyExtraMinutes;
      // }
      // --- End delivery zone validation ---

      let etaMinutes = 30;
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

    async getDashboardStats(restaurantId: string) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const todayOrders = await app.prisma.order.findMany({
        where: {
          restaurantId,
          createdAt: { gte: startOfDay },
        },
        include: { items: { include: { food: true } } },
        orderBy: { createdAt: "asc" },
      });

      const activeStatuses = ["pending", "preparing", "delivering"];
      const activeOrders = todayOrders.filter((o) => activeStatuses.includes(o.status));
      const completedOrders = todayOrders.filter((o) => o.status === "completed");

      const statusCounts = {
        pending: 0,
        preparing: 0,
        delivering: 0,
        completed: 0,
        canceled: 0,
      };
      for (const o of todayOrders) {
        if (o.status in statusCounts) {
          statusCounts[o.status as keyof typeof statusCounts]++;
        }
      }

      const calcTotal = (order: any) => {
        return (order.items || []).reduce((sum: number, item: any) => {
          const base = item.food?.basePrice ?? 0;
          const extras = item.selected
            ? (item.selected as any[]).reduce((s: number, sel: any) => s + (sel.extraPrice || 0), 0)
            : 0;
          return sum + (base + extras) * (item.quantity ?? 1);
        }, 0);
      };

      let todayRevenue = 0;
      let lastHourRevenue = 0;
      const foodSales: Record<string, { name: string; quantity: number }> = {};

      for (const order of todayOrders) {
        if (order.status === "canceled") continue;
        const total = calcTotal(order);
        todayRevenue += total;
        if (order.createdAt >= oneHourAgo) {
          lastHourRevenue += total;
        }
        for (const item of order.items) {
          const name = item.food?.name ?? "Unknown";
          if (!foodSales[name]) foodSales[name] = { name, quantity: 0 };
          foodSales[name].quantity += item.quantity;
        }
      }

      const bestSeller = Object.values(foodSales).sort((a, b) => b.quantity - a.quantity)[0] || null;

      return {
        activeOrders: activeOrders.map((o) => ({
          id: o.id,
          customer: o.customer,
          phone: o.phone,
          status: o.status,
          createdAt: o.createdAt,
          items: o.items.map((i) => ({
            id: i.id,
            quantity: i.quantity,
            food: i.food ? { id: i.food.id, name: i.food.name, basePrice: i.food.basePrice } : null,
            selected: i.selected,
          })),
          total: calcTotal(o),
        })),
        completedOrders: completedOrders.map((o) => ({
          id: o.id,
          customer: o.customer,
          phone: o.phone,
          status: o.status,
          createdAt: o.createdAt,
          items: o.items.map((i) => ({
            id: i.id,
            quantity: i.quantity,
            food: i.food ? { id: i.food.id, name: i.food.name, basePrice: i.food.basePrice } : null,
            selected: i.selected,
          })),
          total: calcTotal(o),
        })),
        statusCounts,
        todayRevenue: Math.round(todayRevenue * 100) / 100,
        todayOrderCount: todayOrders.filter((o) => o.status !== "canceled").length,
        lastHourRevenue: Math.round(lastHourRevenue * 100) / 100,
        bestSeller,
      };
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
