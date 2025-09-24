import { FastifyInstance } from "fastify";
import { CreateOrderInput, UpdateOrderStatusInput } from "./order.types";

export const orderService = (app: FastifyInstance) => ({
  async create(data: CreateOrderInput) {
    return app.prisma.order.create({
      data: {
        customer: data.customer,
        address: data.address,
        status: "pending",
        items: {
          create: data.items.map(item => ({
            foodId: item.foodId,
            quantity: item.quantity
          }))
        }
      },
      include: { items: true }
    });
  },

  async findAll() {
    return app.prisma.order.findMany({
      include: {
        items: true
      }
    });
  },

  async findById(id: string) {
    return app.prisma.order.findUnique({
      where: { id },
      include: {
        items: true
      }
    });
  },

  async updateStatus(id: string, data: UpdateOrderStatusInput) {
    return app.prisma.order.update({
      where: { id },
      data: { status: data.status },
      include: { items: true }
    });
  }
});