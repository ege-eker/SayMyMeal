import { FastifyInstance } from "fastify";
import { CreateOrderInput, UpdateOrderStatusInput } from "./order.types";

export const orderService = (app: FastifyInstance) => ({
    async create(data: CreateOrderInput) {
        const restaurant = await app.prisma.restaurant.findUnique({
            where: { id: data.restaurantId },
        });
        if (!restaurant) throw new Error("Restaurant not found");

        const incomingPostcode = data.address.postcode.replace(/\s/g, "").toUpperCase();
        const zones = (restaurant.deliveryZones as any[]) || [];
        const matchedZone = zones.find((z) => z.postcode.replace(/\s/g, "").toUpperCase() === incomingPostcode);
        if (!matchedZone) {
            const err: any = new Error("Invalid delivery zone");
            err.code = "DELIVERY_ZONE_ERROR";
            throw err;
        }

        return app.prisma.order.create({
            data: {
            customer: data.customer,
            phone: data.phone.replace(/\D/g, ""),
            restaurantId: data.restaurantId,
            address: data.address as any,
            status: "pending",
            etaMinutes: matchedZone.etaMinutes,
            items: {
                create: data.items.map((item) => ({
                foodId: item.foodId,
                quantity: item.quantity,
              })),
            },
          },
          include: { items: true, restaurant: true, },
        });
    },

    async findAll(phone?: string) {
        return app.prisma.order.findMany({
            where: phone ? { phone } : {},
            include: { items: true, restaurant: true, },
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