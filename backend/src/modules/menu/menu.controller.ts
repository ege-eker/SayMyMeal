import { FastifyReply, FastifyRequest } from "fastify";
import { menuService } from "./menu.service";
import { CreateMenuInput, UpdateMenuInput } from "./menu.types";

export const menuController = (app: any) => {
  const service = menuService(app);

  return {
    create: async (
      req: FastifyRequest<{ Body: CreateMenuInput }>,
      reply: FastifyReply
    ) => {
      const menu = await service.create(req.body);
      return reply.code(201).send(menu);
    },

    getAll: async (_req: FastifyRequest, reply: FastifyReply) => {
      const menus = await service.findAll();
      return reply.send(menus);
    },

    getById: async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const menu = await service.findById(req.params.id);
      if (!menu) return reply.code(404).send({ error: "Not found" });
      return reply.send(menu);
    },

    update: async (
      req: FastifyRequest<{ Params: { id: string }; Body: UpdateMenuInput }>,
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