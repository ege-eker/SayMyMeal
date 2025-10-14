import { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { CreateRestaurantInput, UpdateRestaurantInput } from "./restaurant.types";

export const restaurantService = (app: FastifyInstance) => ({
  async create(data: CreateRestaurantInput) {
    return app.prisma.restaurant.create({
      data: {
        name: data.name,
        houseNumber: data.houseNumber,
        street: data.street,
        city: data.city,
        postcode: data.postcode,
        rating: data.rating,
        deliveryZones: data.deliveryZones as unknown as Prisma.InputJsonValue,
      },
    });
  },

  async update(id: string, data: UpdateRestaurantInput) {
    return app.prisma.restaurant.update({
      where: { id },
      data: {
        name: data.name,
        houseNumber: data.houseNumber,
        street: data.street,
        city: data.city,
        postcode: data.postcode,
        rating: data.rating,
        deliveryZones: data.deliveryZones
          ? (data.deliveryZones as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });
  },

  async findAll() {
    return app.prisma.restaurant.findMany({ include: { menus: true } });
  },

async findById(id: string) {
  return app.prisma.restaurant.findUnique({
    where: { id },
    include: {
      menus: {
      },
    }
  });
},

  async remove(id: string) {
    return app.prisma.restaurant.delete({ where: { id } });
  },
});