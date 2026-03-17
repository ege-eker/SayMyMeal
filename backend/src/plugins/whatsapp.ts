import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { whatsappService } from "../modules/whatsapp/whatsapp.service";

declare module "fastify" {
  interface FastifyInstance {
    whatsappService: ReturnType<typeof whatsappService>;
  }
}

export default fp(async function whatsappPlugin(app: FastifyInstance) {
  const service = whatsappService(app);
  app.decorate("whatsappService", service);
});