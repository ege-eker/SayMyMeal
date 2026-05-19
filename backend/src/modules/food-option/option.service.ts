import { FastifyInstance } from "fastify";
import { CreateOptionInput, OptionChoice, AddChoiceInput, UpdateOptionInput, UpdateChoiceInput } from "./option.types";

export const optionService = (app: FastifyInstance) => ({
  async createOption(data: CreateOptionInput) {
    return app.prisma.foodOption.create({
      data: {
          title: data.title,
            multiple: data.multiple ?? false,
            foodId: data.foodId,
      },
      include: { choices: true },
    });
  },

  async addChoice(data: AddChoiceInput) {
    return app.prisma.optionChoice.create({
      data: {
        label: data.label,
        extraPrice: data.extraPrice ?? 0,
        optionId: data.optionId,
      },
    });
  },

  async findByFood(foodId: string) {
    return app.prisma.foodOption.findMany({
      where: { foodId },
      include: { choices: true },
    });
  },

  async findByFoodAvailable(foodId: string) {
    return app.prisma.foodOption.findMany({
      where: { foodId, isAvailable: true },
      include: { choices: { where: { isAvailable: true } } },
    });
  },

  async updateOption(optionId: string, data: UpdateOptionInput) {
    return app.prisma.foodOption.update({
      where: { id: optionId },
      data: { isAvailable: data.isAvailable },
      include: { choices: true },
    });
  },

  async updateChoice(choiceId: string, data: UpdateChoiceInput) {
    return app.prisma.optionChoice.update({
      where: { id: choiceId },
      data: { isAvailable: data.isAvailable },
    });
  },

  async removeOption(optionId: string) {
    return app.prisma.foodOption.delete({ where: { id: optionId } });
  },

  async removeChoice(choiceId: string) {
    return app.prisma.optionChoice.delete({ where: { id: choiceId } });
  },

  async getRestaurantIdFromChoice(choiceId: string): Promise<string | null> {
    const choice = await app.prisma.optionChoice.findUnique({
      where: { id: choiceId },
      select: { option: { select: { food: { select: { menu: { select: { restaurantId: true } } } } } } },
    });
    return choice?.option?.food?.menu?.restaurantId ?? null;
  },
});
