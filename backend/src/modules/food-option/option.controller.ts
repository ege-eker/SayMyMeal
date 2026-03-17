import { FastifyReply, FastifyRequest } from "fastify";
import { optionService } from "./option.service";
import { CreateOptionInput, AddChoiceInput } from "./option.types";
import { verifyOwnership, getRestaurantIdFromFood, getRestaurantIdFromOption } from "../../middleware/auth";

export const optionController = (app: any) => {
  const service = optionService(app);

  return {
    createOption: async (
      req: FastifyRequest<{ Body: CreateOptionInput }>,
      reply: FastifyReply
    ) => {
      const restaurantId = await getRestaurantIdFromFood(app, req.body.foodId);
      if (!restaurantId) return reply.code(404).send({ error: "Food not found" });
      const isOwner = await verifyOwnership(app, req.user!.id, restaurantId);
      if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });
      const option = await service.createOption(req.body);
      reply.code(201).send(option);
    },

    addChoice: async (
      req: FastifyRequest<{ Body: AddChoiceInput }>,
      reply: FastifyReply
    ) => {
      const restaurantId = await getRestaurantIdFromOption(app, req.body.optionId);
      if (!restaurantId) return reply.code(404).send({ error: "Option not found" });
      const isOwner = await verifyOwnership(app, req.user!.id, restaurantId);
      if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });
      const choice = await service.addChoice(req.body);
      reply.code(201).send(choice);
    },

    getOptionsByFood: async (
      req: FastifyRequest<{ Params: { foodId: string } }>,
      reply: FastifyReply
    ) => {
      const options = await service.findByFood(req.params.foodId);
      reply.send(options);
    },

    removeOption: async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const restaurantId = await getRestaurantIdFromOption(app, req.params.id);
      if (!restaurantId) return reply.code(404).send({ error: "Option not found" });
      const isOwner = await verifyOwnership(app, req.user!.id, restaurantId);
      if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });
      await service.removeOption(req.params.id);
      reply.code(204).send();
    },

    removeChoice: async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const restaurantId = await service.getRestaurantIdFromChoice(req.params.id);
      if (!restaurantId) return reply.code(404).send({ error: "Choice not found" });
      const isOwner = await verifyOwnership(app, req.user!.id, restaurantId);
      if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });
      await service.removeChoice(req.params.id);
      reply.code(204).send();
    },
  };
};
