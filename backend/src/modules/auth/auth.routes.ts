import { FastifyInstance } from 'fastify';
import { authController } from './auth.controller';
import { registerSchema, loginSchema, meSchema, updateAllergenProfileSchema, getAllergenProfileByPhoneSchema, updateAllergenProfileByPhoneSchema } from './auth.schema';
import { authenticate } from '../../middleware/auth';

async function authRoutes(app: FastifyInstance) {
  const ctrl = authController(app);

  app.post('/auth/register', { schema: registerSchema }, ctrl.register);
  app.post('/auth/login', { schema: loginSchema }, ctrl.login);
  app.get('/auth/me', { schema: meSchema, preHandler: [authenticate] }, ctrl.me);
  app.put('/auth/allergen-profile', { schema: updateAllergenProfileSchema, preHandler: [authenticate] }, ctrl.updateAllergenProfile);
  app.get('/auth/allergen-profile-by-phone', { schema: getAllergenProfileByPhoneSchema }, ctrl.getAllergenProfileByPhone);
  app.put('/auth/allergen-profile-by-phone', { schema: updateAllergenProfileByPhoneSchema }, ctrl.updateAllergenProfileByPhone);
}

export default authRoutes;
