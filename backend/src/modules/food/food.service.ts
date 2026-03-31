import { FastifyInstance } from "fastify";
import { CreateFoodInput, UpdateFoodInput } from "./food.types";
import { deleteUploadedFile } from "../../utils/upload";

export const foodService = (app: FastifyInstance) => ({
  async create(data: CreateFoodInput) {
    return app.prisma.food.create({
      data: {
        name: data.name,
        basePrice: data.basePrice,
        menuId: data.menuId,
        allergens: data.allergens ?? [],
        dietTags: data.dietTags ?? [],
      }
    });
  },

  async findAll() {
    return app.prisma.food.findMany({
      include: { menu: true }
    });
  },

  async findById(id: string) {
    return app.prisma.food.findUnique({
      where: { id },
      include: {
        menu: { select: { id: true, name: true } },
        options: true,
      }
    });
  },

  async update(id: string, data: UpdateFoodInput) {
    return app.prisma.food.update({
      where: { id },
      data: {
        name: data.name,
        basePrice: data.basePrice,
        allergens: data.allergens,
        dietTags: data.dietTags,
      }
    });
  },

  async updateImage(id: string, imageUrl: string) {
    const existing = await app.prisma.food.findUnique({ where: { id }, select: { imageUrl: true } });
    await deleteUploadedFile(existing?.imageUrl);
    return app.prisma.food.update({
      where: { id },
      data: { imageUrl },
    });
  },

  async removeImage(id: string) {
    const existing = await app.prisma.food.findUnique({ where: { id }, select: { imageUrl: true } });
    await deleteUploadedFile(existing?.imageUrl);
    return app.prisma.food.update({
      where: { id },
      data: { imageUrl: null },
    });
  },

  async remove(id: string) {
    const existing = await app.prisma.food.findUnique({ where: { id }, select: { imageUrl: true } });
    await deleteUploadedFile(existing?.imageUrl);
    return app.prisma.food.delete({ where: { id } });
  }
});