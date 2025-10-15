// TODO
import { FastifyInstance } from 'fastify';
import { createRealtimeSession } from "./openai.controller";

async function openaiRoutes(app: FastifyInstance) {
    app.post("/openai/realtime-session", createRealtimeSession);
}

export default openaiRoutes;