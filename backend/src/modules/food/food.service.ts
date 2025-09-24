import { FastifyInstance } from "fastify";
import { CreateFoodInput, UpdateFoodInput } from "./food.types";

export const foodService = (app: FastifyInstance) => ({
  async create(data: CreateFoodInput) {
    return app.prisma.food.create({
      data: {
        name: data.name,
        price: data.price,
        menuId: data.menuId
      }
    });
  },

  async findAll() {
    return app.prisma.food.findMany({
      include: { menu: true } // food → menu ilişkisi de döner
    });
  },

  async findById(id: string) {
    return app.prisma.food.findUnique({
      where: { id },
      include: { menu: true }
    });
  },

  async update(id: string, data: UpdateFoodInput) {
    return app.prisma.food.update({
      where: { id },
      data: {
        name: data.name,
        price: data.price
      }
    });
  },

  async remove(id: string) {
    return app.prisma.food.delete({ where: { id } });
  }
});