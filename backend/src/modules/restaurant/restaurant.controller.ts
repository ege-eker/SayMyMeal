import { FastifyReply, FastifyRequest } from 'fastify';
import { restaurantService} from "./restaurant.service";
import { CreateRestaurantInput, UpdateRestaurantInput } from "./restaurant.types";

export const restaurantController = (app: any) => {
    const service = restaurantService(app);

    return {
        create: async (req: FastifyRequest<{Body: CreateRestaurantInput}>, reply: FastifyReply) => {
            const restaurant = await service.create(req.body);
            reply.code(201).send(restaurant);
        },

        getAll: async (_req: FastifyRequest, reply: FastifyReply) => {
            return reply.send(await service.findAll());
        },

        getById: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const restaurant = await service.findById(req.params.id);
            if (!restaurant) return reply.code(404).send({ message: 'Restaurant not found' });
            return reply.send(restaurant);
        },

        update: async (req: FastifyRequest<{ Params: { id: string }; Body:UpdateRestaurantInput }>, reply: FastifyReply) => {
            const updated = await service.update(req.params.id, req.body);
            if (!updated) return reply.code(404).send({ message: 'Restaurant not found, cant update'});
            return reply.send(updated);
        },

        remove: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            await service.remove(req.params.id);
            return reply.code(204).send();
        }
    };
};