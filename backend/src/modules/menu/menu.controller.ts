import { FastifyReply, FastifyRequest } from "fastify";
import { menuService } from "./menu.service";
import { CreateMenuInput, UpdateMenuInput } from "./menu.types";
import { verifyOwnership, getRestaurantIdFromMenu } from "../../middleware/auth";
import { saveUploadedFile } from "../../utils/upload";

export const menuController = (app: any) => {
  const service = menuService(app);

  return {
    create: async (
      req: FastifyRequest<{ Body: CreateMenuInput }>,
      reply: FastifyReply
    ) => {
      const isOwner = await verifyOwnership(app, req.user!.id, req.body.restaurantId);
      if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });
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
      const restaurantId = await getRestaurantIdFromMenu(app, req.params.id);
      if (!restaurantId) return reply.code(404).send({ error: "Not found" });
      const isOwner = await verifyOwnership(app, req.user!.id, restaurantId);
      if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });
      try {
        const updated = await service.update(req.params.id, req.body);
        return reply.send(updated);
      } catch (e) {
        return reply.code(404).send({ error: "Not found" });
      }
    },

    uploadImage: async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const restaurantId = await getRestaurantIdFromMenu(app, req.params.id);
      if (!restaurantId) return reply.code(404).send({ error: "Not found" });
      const isOwner = await verifyOwnership(app, req.user!.id, restaurantId);
      if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });

      const file = await req.file();
      if (!file) return reply.code(400).send({ error: "No file uploaded" });

      try {
        const imageUrl = await saveUploadedFile(file, "menus");
        await service.updateImage(req.params.id, imageUrl);
        return reply.send({ imageUrl });
      } catch (e: any) {
        return reply.code(400).send({ error: e.message });
      }
    },

    removeImage: async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const restaurantId = await getRestaurantIdFromMenu(app, req.params.id);
      if (!restaurantId) return reply.code(404).send({ error: "Not found" });
      const isOwner = await verifyOwnership(app, req.user!.id, restaurantId);
      if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });
      await service.removeImage(req.params.id);
      return reply.send({ imageUrl: null });
    },

    remove: async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const restaurantId = await getRestaurantIdFromMenu(app, req.params.id);
      if (!restaurantId) return reply.code(404).send({ error: "Not found" });
      const isOwner = await verifyOwnership(app, req.user!.id, restaurantId);
      if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });
      try {
        await service.remove(req.params.id);
        return reply.code(204).send();
      } catch (e) {
        return reply.code(404).send({ error: "Not found" });
      }
    }
  };
};
