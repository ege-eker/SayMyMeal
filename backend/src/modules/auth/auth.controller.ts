import { FastifyReply, FastifyRequest } from 'fastify';
import { authService } from './auth.service';
import { RegisterInput, LoginInput } from './auth.types';

function safeErrorMessage(err: any, fallback: string): string {
  if (err.statusCode && err.statusCode < 500) return err.message;
  return fallback;
}

export const authController = (app: any) => {
  const service = authService(app);

  return {
    register: async (req: FastifyRequest<{ Body: RegisterInput }>, reply: FastifyReply) => {
      try {
        const result = await service.register(req.body);
        reply.code(201).send(result);
      } catch (err: any) {
        app.log.error(err);
        const status = err.statusCode || 500;
        reply.code(status).send({ error: safeErrorMessage(err, 'Registration failed') });
      }
    },

    login: async (req: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) => {
      try {
        const result = await service.login(req.body);
        reply.send(result);
      } catch (err: any) {
        app.log.error(err);
        const status = err.statusCode || 500;
        reply.code(status).send({ error: safeErrorMessage(err, 'Login failed') });
      }
    },

    me: async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = await service.me(req.user!.id);
        reply.send(user);
      } catch (err: any) {
        app.log.error(err);
        const status = err.statusCode || 500;
        reply.code(status).send({ error: safeErrorMessage(err, 'Failed to fetch user') });
      }
    },
  };
};
