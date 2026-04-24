import Fastify from 'fastify';
import path from 'path';
import { WebSocketServer } from 'ws';
import db from './plugins/db';
import cors from './plugins/cors';
import swagger from './plugins/swagger';
import jwt from './plugins/jwt';
import registerRoutes from "./modules";
import formbody from "@fastify/formbody";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import whatsapp from './plugins/whatsapp';
import { voiceService } from './modules/voice/voice.service';

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
    app.register(rateLimit, { global: false });
    app.register(whatsapp);
    app.register(registerRoutes);

    // Set up WebSocket server for Twilio Voice media streams
    app.addHook('onReady', async () => {
        const voice = voiceService(app);
        const wss = new WebSocketServer({
            server: app.server,
            path: '/voice/ws',
        });

        wss.on('connection', (ws) => {
            app.log.info('📞 New Twilio media stream WebSocket connection');
            voice.handleMediaStream(ws);
        });

        app.log.info('🎙️ Voice WebSocket server listening on /voice/ws');
    });

    return app;
};

export default buildApp;