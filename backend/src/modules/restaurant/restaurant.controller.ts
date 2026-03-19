import { FastifyReply, FastifyRequest } from 'fastify';
import { restaurantService } from "./restaurant.service";
import { CreateRestaurantInput, UpdateRestaurantInput } from "./restaurant.types";
import { verifyOwnership } from "../../middleware/auth";

export const restaurantController = (app: any) => {
  const service = restaurantService(app);

  return {
    create: async (req: FastifyRequest<{ Body: CreateRestaurantInput }>, reply: FastifyReply) => {
      try {
        const restaurant = await service.create(req.body, req.user?.id);
        reply.code(201).send(restaurant);
      } catch (err: any) {
        if (err.code === 'P2002') {
          return reply.code(400).send({ error: 'Slug already taken' });
        }
        reply.code(500).send({ error: err.message });
      }
    },

    getAll: async (_req: FastifyRequest, reply: FastifyReply) => {
      return reply.send(await service.findAll());
    },

    getById: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const restaurant = await service.findById(req.params.id);
      if (!restaurant) return reply.code(404).send({ message: "Restaurant not found" });
      return reply.send(restaurant);
    },

    getBySlug: async (req: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const restaurant = await service.findBySlug(req.params.slug);
      if (!restaurant) return reply.code(404).send({ message: "Restaurant not found" });
      return reply.send(restaurant);
    },

    getMyRestaurants: async (req: FastifyRequest, reply: FastifyReply) => {
      const restaurants = await service.findByOwner(req.user!.id);
      return reply.send(restaurants);
    },

    update: async (req: FastifyRequest<{ Params: { id: string }; Body: UpdateRestaurantInput }>, reply: FastifyReply) => {
      try {
        const isOwner = await verifyOwnership(app, req.user!.id, req.params.id);
        if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });
        const updated = await service.update(req.params.id, req.body);
        return reply.send(updated);
      } catch (err: any) {
        if (err.code === 'P2002') {
          return reply.code(400).send({ error: 'Slug already taken' });
        }
        return reply.code(404).send({ message: "Restaurant not found, cannot update" });
      }
    },

    activate: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const isOwner = await verifyOwnership(app, req.user!.id, req.params.id);
      if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });
      const restaurant = await service.activate(req.params.id);
      reply.send({ message: `${restaurant.name} is now active`, restaurant });
    },

    remove: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const isOwner = await verifyOwnership(app, req.user!.id, req.params.id);
      if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });
      await service.remove(req.params.id);
      return reply.code(204).send();
    },

    regeneratePollToken: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const isOwner = await verifyOwnership(app, req.user!.id, req.params.id);
      if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });
      const token = crypto.randomUUID();
      const restaurant = await app.prisma.restaurant.update({
        where: { id: req.params.id },
        data: { pollToken: token },
        select: { id: true, pollToken: true },
      });
      return reply.send(restaurant);
    },
  };
};
