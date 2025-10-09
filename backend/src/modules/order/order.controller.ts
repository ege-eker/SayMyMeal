import { FastifyReply, FastifyRequest } from "fastify";
import { CreateOrderInput, UpdateOrderStatusInput } from "./order.types";
import { orderService } from "./order.service";

export const orderController = (app: any) => {
  const service = orderService(app);

  return {
    create: async (req: FastifyRequest<{ Body: CreateOrderInput }>, reply: FastifyReply) => {
      try {
        const order = await service.create(req.body);
        return reply.code(201).send(order);
      } catch (err: any) {
        if (err.code === "DELIVERY_ZONE_ERROR")
          return reply.code(400).send({ error: err.message });
        if (err.message.includes("Restaurant not found"))
          return reply.code(404).send({ error: err.message });
        console.error("❌ Order create error:", err);
        return reply.code(500).send({ error: "Internal Server Error" });
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