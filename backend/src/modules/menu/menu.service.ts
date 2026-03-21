import { FastifyInstance } from "fastify";
import { CreateMenuInput, UpdateMenuInput } from "./menu.types";
import { deleteUploadedFile } from "../../utils/upload";

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

  async updateImage(id: string, imageUrl: string) {
    const existing = await app.prisma.menu.findUnique({ where: { id }, select: { imageUrl: true } });
    await deleteUploadedFile(existing?.imageUrl);
    return app.prisma.menu.update({
      where: { id },
      data: { imageUrl },
    });
  },

  async removeImage(id: string) {
    const existing = await app.prisma.menu.findUnique({ where: { id }, select: { imageUrl: true } });
    await deleteUploadedFile(existing?.imageUrl);
    return app.prisma.menu.update({
      where: { id },
      data: { imageUrl: null },
    });
  },

  async remove(id: string) {
    const existing = await app.prisma.menu.findUnique({ where: { id }, select: { imageUrl: true } });
    await deleteUploadedFile(existing?.imageUrl);
    return app.prisma.menu.delete({ where: { id } });
  }
});