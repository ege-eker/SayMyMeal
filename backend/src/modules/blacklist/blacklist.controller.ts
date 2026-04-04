import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { blacklistService } from "./blacklist.service";
import { verifyOwnership } from "../../middleware/auth";
import { CreateBlacklistInput } from "./blacklist.types";

export const blacklistController = (app: FastifyInstance) => {
  const service = blacklistService(app);

  return {
    getByRestaurant: async (
      req: FastifyRequest<{ Params: { restaurantId: string } }>,
      reply: FastifyReply
    ) => {
      const { restaurantId } = req.params;
      const isOwner = await verifyOwnership(app, req.user!.id, restaurantId);
      if (!isOwner) return reply.code(403).send({ error: "Not your restaurant" });

      const entries = await service.getByRestaurant(restaurantId);
      return reply.send(entries);
    },

    add: async (
      req: FastifyRequest<{ Params: { restaurantId: string }; Body: CreateBlacklistInput }>,
      reply: FastifyReply
    ) => {
      const { restaurantId } = req.params;
      const isOwner = await verifyOwnership(app, req.user!.id, restaurantId);
      if (!isOwner) return reply.code(403).send({ error: "Not your restaurant" });

      try {
        const entry = await service.addToBlacklist(restaurantId, req.body);
        return reply.code(201).send(entry);
      } catch (err: any) {
        if (err.code === "P2002") {
          return reply.code(409).send({ error: "Phone number already blacklisted for this restaurant" });
        }
        throw err;
      }
    },

    remove: async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const entry = await service.findById(req.params.id);
      if (!entry) return reply.code(404).send({ error: "Blacklist entry not found" });

      const isOwner = await verifyOwnership(app, req.user!.id, entry.restaurantId);
      if (!isOwner) return reply.code(403).send({ error: "Not your restaurant" });

      await service.removeFromBlacklist(entry.id);
      return reply.code(204).send();
    },
  };
};
