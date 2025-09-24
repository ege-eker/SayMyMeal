import { FastifyInstance } from "fastify";
import { CreateRestaurantInput, UpdateRestaurantInput } from "./restaurant.types";

export const restaurantService = (app: FastifyInstance) => ({
    async create(data: CreateRestaurantInput) {
        return app.prisma.restaurant.create({ data });
    },

    async findAll() {
        return app.prisma.restaurant.findMany({include: { menus: true }});
    },

    async findById(id: string) {
  return app.prisma.restaurant.findUnique({
    where: { id },
    include: {
      menus: {
        include: {
          foods: true
        }
      }
    }
  });
},

    async update(id:string, data: UpdateRestaurantInput) {
        return app.prisma.restaurant.update({ where: { id }, data });
    },

    async remove(id: string) {
        return app.prisma.restaurant.delete({ where: { id } });
    },
});