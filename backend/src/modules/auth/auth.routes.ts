import { FastifyInstance } from 'fastify';
import { authController } from './auth.controller';
import { registerSchema, loginSchema, meSchema } from './auth.schema';
import { authenticate } from '../../middleware/auth';

async function authRoutes(app: FastifyInstance) {
  const ctrl = authController(app);

  app.post('/auth/register', { schema: registerSchema }, ctrl.register);
  app.post('/auth/login', { schema: loginSchema }, ctrl.login);
  app.get('/auth/me', { schema: meSchema, preHandler: [authenticate] }, ctrl.me);
}

export default authRoutes;
