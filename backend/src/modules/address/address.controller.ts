import { FastifyRequest, FastifyReply } from 'fastify';
import { addressService } from './address.service';
import { CreateAddressInput, UpdateAddressInput } from './address.types';

function safeErrorMessage(err: any, fallback: string): string {
  if (err.statusCode && err.statusCode < 500) return err.message;
  return fallback;
}

export const addressController = (app: any) => {
  const service = addressService(app);

  return {
    list: async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const addresses = await service.findByUser(req.user!.id);
        reply.send(addresses);
      } catch (err: any) {
        app.log.error(err);
        reply.code(err.statusCode || 500).send({ error: safeErrorMessage(err, 'Failed to fetch addresses') });
      }
    },

    create: async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const address = await service.create(req.user!.id, req.body as CreateAddressInput);
        reply.code(201).send(address);
      } catch (err: any) {
        app.log.error(err);
        reply.code(err.statusCode || 500).send({ error: safeErrorMessage(err, 'Failed to save address') });
      }
    },

    update: async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = req.params as { id: string };
        const address = await service.update(req.user!.id, id, req.body as UpdateAddressInput);
        reply.send(address);
      } catch (err: any) {
        app.log.error(err);
        reply.code(err.statusCode || 500).send({ error: safeErrorMessage(err, 'Failed to update address') });
      }
    },

    delete: async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = req.params as { id: string };
        await service.delete(req.user!.id, id);
        reply.code(204).send();
      } catch (err: any) {
        app.log.error(err);
        reply.code(err.statusCode || 500).send({ error: safeErrorMessage(err, 'Failed to delete address') });
      }
    },
  };
};
