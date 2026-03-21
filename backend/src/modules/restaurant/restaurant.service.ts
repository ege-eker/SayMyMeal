import { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { CreateRestaurantInput, UpdateRestaurantInput } from "./restaurant.types";
import { deleteUploadedFile } from "../../utils/upload";

export const restaurantService = (app: FastifyInstance) => ({
  async create(data: CreateRestaurantInput, ownerId?: string) {
    return app.prisma.restaurant.create({
      data: {
        name: data.name,
        slug: data.slug,
        houseNumber: data.houseNumber,
        street: data.street,
        city: data.city,
        postcode: data.postcode,
        rating: data.rating,
        deliveryZones: data.deliveryZones as unknown as Prisma.InputJsonValue,
        ownerId: ownerId || null,
      },
    });
  },

  async update(id: string, data: UpdateRestaurantInput) {
    return app.prisma.restaurant.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
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
      include: { menus: {} },
    });
  },

  async findBySlug(slug: string) {
    return app.prisma.restaurant.findUnique({
      where: { slug },
      include: {
        menus: {
          include: {
            foods: {
              include: {
                options: {
                  include: { choices: true },
                },
              },
            },
          },
        },
      },
    });
  },

  async findByOwner(ownerId: string) {
    return app.prisma.restaurant.findMany({
      where: { ownerId },
      include: { menus: true },
    });
  },

  async activate(id: string) {
    await app.prisma.restaurant.updateMany({
      data: { isActive: false },
    });

    const updated = await app.prisma.restaurant.update({
      where: { id },
      data: { isActive: true },
    });

    app.log.info("Resetting WhatsApp sessions (active restaurant changed)");
    app.whatsappService.clearSessions();

    return updated;
  },

  async updateImage(id: string, imageUrl: string) {
    const existing = await app.prisma.restaurant.findUnique({ where: { id }, select: { imageUrl: true } });
    await deleteUploadedFile(existing?.imageUrl);
    return app.prisma.restaurant.update({
      where: { id },
      data: { imageUrl },
    });
  },

  async removeImage(id: string) {
    const existing = await app.prisma.restaurant.findUnique({ where: { id }, select: { imageUrl: true } });
    await deleteUploadedFile(existing?.imageUrl);
    return app.prisma.restaurant.update({
      where: { id },
      data: { imageUrl: null },
    });
  },

  async remove(id: string) {
    const existing = await app.prisma.restaurant.findUnique({ where: { id }, select: { imageUrl: true } });
    await deleteUploadedFile(existing?.imageUrl);
    return app.prisma.restaurant.delete({ where: { id } });
  },
});
