import { FastifyInstance } from "fastify";
import { whatsappController } from "./whatsapp.controller";
import {
  webhookVerifySchema,
  webhookReceiveSchema,
  connectWhatsappSchema,
  disconnectWhatsappSchema,
} from "./whatsapp.schema";
import { requireRole } from "../../middleware/auth";

export default async function whatsappRoutes(app: FastifyInstance) {
  const ctrl = whatsappController(app);
  const ownerAuth = requireRole("OWNER");

  // Capture the raw JSON body for webhook HMAC verification. Content-type
  // parsers are encapsulated to this register scope, so only WhatsApp routes
  // are affected — app.ts, @fastify/formbody (voice), and other modules are untouched.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    (req as any).rawBody = body as string;
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Meta webhook (public — Meta calls these)
  app.get("/webhook", { schema: webhookVerifySchema }, ctrl.verifyWebhook);
  app.post("/webhook", { schema: webhookReceiveSchema }, ctrl.receiveWebhook);

  // Owner-only connect / disconnect
  app.post(
    "/whatsapp/connect",
    {
      schema: connectWhatsappSchema,
      preHandler: [ownerAuth],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 day",
          keyGenerator: (req) => req.user?.id ?? req.ip,
        },
      },
    },
    ctrl.connect
  );

  app.post(
    "/whatsapp/disconnect",
    { schema: disconnectWhatsappSchema, preHandler: [ownerAuth] },
    ctrl.disconnect
  );
}
