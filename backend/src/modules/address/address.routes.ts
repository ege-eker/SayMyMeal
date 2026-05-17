import { FastifyInstance } from 'fastify';
import { addressController } from './address.controller';
import { listAddressesSchema, createAddressSchema, updateAddressSchema, deleteAddressSchema } from './address.schema';
import { authenticate } from '../../middleware/auth';

async function addressRoutes(app: FastifyInstance) {
  const ctrl = addressController(app);

  app.get('/addresses', { schema: listAddressesSchema, preHandler: [authenticate] }, ctrl.list);
  app.post('/addresses', { schema: createAddressSchema, preHandler: [authenticate] }, ctrl.create);
  app.patch('/addresses/:id', { schema: updateAddressSchema, preHandler: [authenticate] }, ctrl.update);
  app.delete('/addresses/:id', { schema: deleteAddressSchema, preHandler: [authenticate] }, ctrl.delete);
}

export default addressRoutes;
