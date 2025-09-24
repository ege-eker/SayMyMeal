import { FastifyReply, FastifyRequest } from "fastify";
import { foodService } from "./food.service";
import { CreateFoodInput, UpdateFoodInput } from "./food.types";

export const foodController = (app: any) => {
  const service = foodService(app);

  return {
    create: async (
      req: FastifyRequest<{ Body: CreateFoodInput }>,
      reply: FastifyReply
    ) => {
      const food = await service.create(req.body);
      return reply.code(201).send(food);
    },

    getAll: async (_req: FastifyRequest, reply: FastifyReply) => {
      const foods = await service.findAll();
      return reply.send(foods);
    },

    getById: async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const food = await service.findById(req.params.id);
      if (!food) return reply.code(404).send({ error: "Not found" });
      return reply.send(food);
    },

    update: async (
      req: FastifyRequest<{ Params: { id: string }; Body: UpdateFoodInput }>,
      reply: FastifyReply
    ) => {
      try {
        const updated = await service.update(req.params.id, req.body);
        return reply.send(updated);
      } catch (e) {
        return reply.code(404).send({ error: "Not found" });
      }
    },

    remove: async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        await service.remove(req.params.id);
        return reply.code(204).send();
      } catch (e) {
        return reply.code(404).send({ error: "Not found" });
      }
    }
  };
};