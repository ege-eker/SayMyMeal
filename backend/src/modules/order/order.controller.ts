import { FastifyReply, FastifyRequest } from "fastify";
import { CreateOrderInput, UpdateOrderStatusInput } from "./order.types";
import { orderService } from "./order.service";
import { verifyOwnership } from "../../middleware/auth";

export const orderController = (app: any) => {
  const service = orderService(app);

  return {
    create: async (req: FastifyRequest<{ Body: CreateOrderInput }>, reply: FastifyReply) => {
      try {
        const order = await service.create(req.body, req.user?.id);
        reply.code(201).send(order);
      } catch (err: any) {
          const status = err.statusCode || 500;
          app.log.error(err);
          const message = status < 500 ? err.message : 'Failed to create order';
          reply.code(status).send({ error: message });
        }
    },

    getAll: async (req: FastifyRequest<{ Querystring: { restaurantId?: string; acknowledged?: string } }>, reply: FastifyReply) => {
      const { restaurantId } = req.query;
      const acknowledged = req.query.acknowledged === 'true' ? true
                         : req.query.acknowledged === 'false' ? false
                         : undefined;
      if (restaurantId) {
        const isOwner = await verifyOwnership(app, req.user!.id, restaurantId);
        if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });
        const orders = await service.findAll(restaurantId, undefined, acknowledged);
        return reply.send(orders);
      }
      // No restaurantId: return only orders for owner's restaurants
      const myRestaurants = await app.prisma.restaurant.findMany({
        where: { ownerId: req.user!.id },
        select: { id: true },
      });
      const ids = myRestaurants.map((r: { id: string }) => r.id);
      const orders = await service.findAll(undefined, ids, acknowledged);
      return reply.send(orders);
    },

    getById: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const order = await service.findById(req.params.id);
      if (!order) return reply.code(404).send({ message: "Order not found" });
      // Verify ownership of the restaurant
      const isOwner = await verifyOwnership(app, req.user!.id, order.restaurantId);
      if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });
      return reply.send(order);
    },

    updateStatus: async (req: FastifyRequest<{ Params: { id: string }; Body: UpdateOrderStatusInput; }>, reply: FastifyReply) => {
      const order = await service.findById(req.params.id);
      if (!order) return reply.code(404).send({ message: "Order not found" });
      const isOwner = await verifyOwnership(app, req.user!.id, order.restaurantId);
      if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });
      const updated = await service.updateStatus(req.params.id, req.body);
      return reply.send(updated);
    },

    acknowledge: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const order = await service.findById(req.params.id);
      if (!order) return reply.code(404).send({ message: "Order not found" });
      const isOwner = await verifyOwnership(app, req.user!.id, order.restaurantId);
      if (!isOwner) return reply.code(403).send({ error: 'Not your restaurant' });
      const updated = await service.acknowledge(req.params.id);
      return reply.send(updated);
    },

    statusLookup: async (req: FastifyRequest<{ Querystring: { phone?: string; name?: string } }>, reply: FastifyReply) => {
      const { phone, name } = req.query;
      if (!phone && !name) return reply.code(400).send({ error: "Please provide phone or name" });
      const orders = await service.findByCustomerOrPhone(name, phone);
      if (orders.length === 0) return reply.code(404).send({ message: "No matching orders found" });
      return reply.send(orders);
    },

    getMyOrders: async (req: FastifyRequest, reply: FastifyReply) => {
      const orders = await service.findByUser(req.user!.id);
      return reply.send(orders);
    },
  };
};
