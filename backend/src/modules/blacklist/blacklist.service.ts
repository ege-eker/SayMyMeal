import { FastifyInstance } from "fastify";
import { CreateBlacklistInput } from "./blacklist.types";

export function normalizePhone(phone: string): string {
  return phone.replace(/^whatsapp:/i, "").replace(/[\s\-\(\)]/g, "");
}

export const blacklistService = (app: FastifyInstance) => ({
  async getByRestaurant(restaurantId: string) {
    return app.prisma.blacklist.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
    });
  },

  async addToBlacklist(restaurantId: string, data: CreateBlacklistInput) {
    return app.prisma.blacklist.create({
      data: {
        phone: normalizePhone(data.phone),
        reason: data.reason || null,
        restaurantId,
      },
    });
  },

  async removeFromBlacklist(id: string) {
    return app.prisma.blacklist.delete({ where: { id } });
  },

  async findById(id: string) {
    return app.prisma.blacklist.findUnique({ where: { id } });
  },

  async isBlacklisted(phone: string, restaurantId: string): Promise<boolean> {
    const entry = await app.prisma.blacklist.findUnique({
      where: { phone_restaurantId: { phone: normalizePhone(phone), restaurantId } },
    });
    return !!entry;
  },

  async incrementAttempt(phone: string, restaurantId: string) {
    await app.prisma.blacklist.update({
      where: { phone_restaurantId: { phone: normalizePhone(phone), restaurantId } },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });
  },
});
