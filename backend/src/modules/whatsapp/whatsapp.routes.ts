import { FastifyInstance } from "fastify";
import { whatsappController } from "./whatsapp.controller";

export default async function whatsappRoutes(app: FastifyInstance) {
  await whatsappController(app);
}