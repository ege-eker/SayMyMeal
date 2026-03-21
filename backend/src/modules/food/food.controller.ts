import { FastifyReply, FastifyRequest } from "fastify";
import { foodService } from "./food.service";
import { CreateFoodInput, UpdateFoodInput } from "./food.types";
import { verifyOwnership, getRestaurantIdFromMenu, getRestaurantIdFromFood } from "../../middleware/auth";
import { saveUploadedFile } from "../../utils/upload";

export const foodController = (app: any) => {
  const service = foodService(app);

  return {
    create: async (
      req: FastifyRequest<{ Body: CreateFoodInput }>,
      reply: FastifyReply
    ) => {
      const restaurantId = await getRestaurantIdFromMenu(app, req.body.menuId);
      if (!restaurantId) return reply.code(404).send({ error: "Menu not found" });
      const isOwner = await verifyOwnership(app, req.user!.id, restaurantId);
      if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });
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
      const restaurantId = await getRestaurantIdFromFood(app, req.params.id);
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
      const restaurantId = await getRestaurantIdFromFood(app, req.params.id);
      if (!restaurantId) return reply.code(404).send({ error: "Not found" });
      const isOwner = await verifyOwnership(app, req.user!.id, restaurantId);
      if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });

      const file = await req.file();
      if (!file) return reply.code(400).send({ error: "No file uploaded" });

      try {
        const imageUrl = await saveUploadedFile(file, "foods");
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
      const restaurantId = await getRestaurantIdFromFood(app, req.params.id);
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
      const restaurantId = await getRestaurantIdFromFood(app, req.params.id);
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
