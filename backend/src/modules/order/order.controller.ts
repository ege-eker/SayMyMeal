import { FastifyReply, FastifyRequest } from "fastify";
import { CreateOrderInput, UpdateOrderStatusInput } from "./order.types";
import { orderService } from "./order.service";

export const orderController = (app: any) => {
  const service = orderService(app);

  return {
    create: async (req: FastifyRequest<{ Body: CreateOrderInput }>, reply: FastifyReply) => {
      try {
        const order = await service.create(req.body);
        reply.code(201).send(order);
      } catch (err: any) {
          const status = err.statusCode || 500;
          console.error("Order create error", err);
          reply.code(status).send({ error: err.message });
        }
    },

    getAll: async (_req: FastifyRequest, reply: FastifyReply) => {
      const orders = await service.findAll();
      return reply.send(orders);
    },

    getById: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const order = await service.findById(req.params.id);
      if (!order) return reply.code(404).send({ message: "Order not found" });
      return reply.send(order);
    },

    updateStatus: async (req: FastifyRequest<{ Params: { id: string }; Body: UpdateOrderStatusInput; }>, reply: FastifyReply) => {
      const order = await service.updateStatus(req.params.id, req.body);
      if (!order) return reply.code(404).send({ message: "Order not found" });
      return reply.send(order);
    },
    statusLookup: async (req: FastifyRequest<{ Querystring: { phone?: string; name?: string } }>, reply: FastifyReply) => {
      const { phone, name } = req.query;
      if (!phone && !name) return reply.code(400).send({ error: "Please provide phone or name" });
      const orders = await service.findByCustomerOrPhone(name, phone);
      if (orders.length === 0) return reply.code(404).send({ message: "No matching orders found" });
      return reply.send(orders);
    },
  };
};