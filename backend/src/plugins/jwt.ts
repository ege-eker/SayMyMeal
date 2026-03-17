import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';

export default fp(async (fastify) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET env var is required');
  }
  fastify.register(fastifyJwt, {
    secret,
    sign: { expiresIn: '24h' },
  });
});
