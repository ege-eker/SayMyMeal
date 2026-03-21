import Fastify from 'fastify';
import path from 'path';
import db from './plugins/db';
import cors from './plugins/cors';
import swagger from './plugins/swagger';
import jwt from './plugins/jwt';
import registerRoutes from "./modules";
import formbody from "@fastify/formbody";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import whatsapp from './plugins/whatsapp';

const buildApp = () => {
    const app = Fastify({ logger: true });
    app.register(formbody);
    app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });
    app.register(fastifyStatic, {
        root: path.join(__dirname, '..', 'uploads'),
        prefix: '/uploads/',
        decorateReply: false,
    });
    app.register(db);
    app.register(cors);
    app.register(jwt);
    app.register(swagger);
    app.register(whatsapp);
    app.register(registerRoutes);
    return app;
};

export default buildApp;