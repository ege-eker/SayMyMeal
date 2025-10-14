import { FastifyInstance } from "fastify";
import { CreateMenuInput, UpdateMenuInput } from "./menu.types";

export const menuService = (app: FastifyInstance) => ({
  async create(data: CreateMenuInput) {
    return app.prisma.menu.create({
      data: {
        name: data.name,
        restaurantId: data.restaurantId
      }
    });
  },

  async findAll() {
    return app.prisma.menu.findMany({
      include: { foods: true }
    });
  },

  async findById(id: string) {
    return app.prisma.menu.findUnique({
      where: { id },
      include: { foods: true }
    });
  },

  async update(id: string, data: UpdateMenuInput) {
    return app.prisma.menu.update({
      where: { id },
      data: {
        name: data.name
      }
    });
  },

  async remove(id: string) {
    return app.prisma.menu.delete({ where: { id } });
  }
});