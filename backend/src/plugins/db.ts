import fp from 'fastify-plugin';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default fp(async (fastify, _opts) => {
    fastify.decorate('prisma', prisma);

    fastify.addHook('onClose', async (app) => {
        await app.prisma.$disconnect();
    });
});

declare module "fastify" {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}