import { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { CreateRestaurantInput, UpdateRestaurantInput } from "./restaurant.types";
import { deleteUploadedFile } from "../../utils/upload";
import { releaseNumber } from "../../shared/twilioClient";

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
        isBusy: data.isBusy,
        busyExtraMinutes: data.busyExtraMinutes,
        acceptingOrders: data.acceptingOrders,
        whatsappPhone: data.whatsappPhone !== undefined ? data.whatsappPhone : undefined,
        voicePhone: data.voicePhone !== undefined ? data.voicePhone : undefined,
        deliveryZones: data.deliveryZones
          ? (data.deliveryZones as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });
  },

  async findAll() {
    return app.prisma.restaurant.findMany({ include: { menus: { orderBy: { createdAt: "asc" } } } });
  },

  async findById(id: string) {
    return app.prisma.restaurant.findUnique({
      where: { id },
      include: { menus: { orderBy: { createdAt: "asc" } } },
    });
  },

  async findBySlug(slug: string) {
    return app.prisma.restaurant.findUnique({
      where: { slug },
      include: {
        menus: {
          orderBy: { createdAt: "asc" },
          include: {
            foods: {
              orderBy: { createdAt: "asc" },
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

  async findByVoicePhone(phone: string) {
    return app.prisma.restaurant.findUnique({
      where: { voicePhone: phone },
      select: { id: true, name: true, isBusy: true, busyExtraMinutes: true, acceptingOrders: true },
    });
  },

  async findByWhatsappPhone(phone: string) {
    return app.prisma.restaurant.findUnique({
      where: { whatsappPhone: phone },
      select: { id: true, name: true, isBusy: true, busyExtraMinutes: true, acceptingOrders: true },
    });
  },

  async findByOwner(ownerId: string) {
    return app.prisma.restaurant.findMany({
      where: { ownerId },
      include: { menus: { orderBy: { createdAt: "asc" } } },
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
    const existing = await app.prisma.restaurant.findUnique({
      where: { id },
      select: { imageUrl: true, twilioPhoneSid: true },
    });
    await deleteUploadedFile(existing?.imageUrl);

    if (existing?.twilioPhoneSid) {
      try {
        await releaseNumber(existing.twilioPhoneSid);
        app.log.info(`🔓 Released Twilio number ${existing.twilioPhoneSid} for restaurant ${id}`);
      } catch (err) {
        app.log.error(`❌ Failed to release Twilio number ${existing.twilioPhoneSid}: ${(err as Error).message}`);
      }
    }

    return app.prisma.restaurant.delete({ where: { id } });
  },
});
