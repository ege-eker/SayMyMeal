import { FastifyInstance } from "fastify";
import { voiceController } from "./voice.controller";
import {
  voiceIncomingSchema,
  voiceStatusSchema,
  availableNumbersSchema,
  provisionNumberSchema,
} from "./voice.schema";
import { requireRole } from "../../middleware/auth";

async function voiceRoutes(app: FastifyInstance) {
  const controller = voiceController(app);
  const ownerAuth = requireRole("OWNER");

  // Twilio webhooks (public — Twilio calls these)
  app.post("/voice/incoming", { schema: voiceIncomingSchema }, controller.incoming);
  app.post("/voice/status", { schema: voiceStatusSchema }, controller.status);

  // Owner-only provisioning endpoints
  app.get(
    "/voice/available-numbers",
    { schema: availableNumbersSchema, preHandler: [ownerAuth] },
    controller.availableNumbers
  );

  app.post(
    "/voice/provision",
    {
      schema: provisionNumberSchema,
      preHandler: [ownerAuth],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 day",
          keyGenerator: (req) => req.user?.id ?? req.ip,
        },
      },
    },
    controller.provision
  );
}

export default voiceRoutes;
