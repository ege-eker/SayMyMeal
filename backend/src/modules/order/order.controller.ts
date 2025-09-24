import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateOrderInput, UpdateOrderStatusInput } from './order.types';
import { orderService } from './order.service';

export const orderController = (app: any) => {
  const service = orderService(app);

    return {
        create: async (req:FastifyRequest<{ Body: CreateOrderInput }>, reply:FastifyReply) => {
            const order = await service.create(req.body);
            return reply.code(201).send(order);
        },

        getAll: async (_req: FastifyRequest, reply: FastifyReply) => {
            const orders = await service.findAll();
            return reply.send(orders);
        },

        getById: async (req: FastifyRequest<{Params: {id:string}}>, reply: FastifyReply) => {
            const order = await service.findById(req.params.id);
            if (!order) return reply.code(404).send({ message: 'Order not found' });
            return reply.send(order);
        },

        updateStatus: async(req: FastifyRequest<{Params: {id:string}, Body: UpdateOrderStatusInput}>, reply: FastifyReply) => {
            const order = await service.updateStatus(req.params.id, req.body);
            if (!order) return reply.code(404).send({ message: 'Order not found' });
            return reply.send(order);
        },
    };
};