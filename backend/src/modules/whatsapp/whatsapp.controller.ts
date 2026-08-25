import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";
import { verifyOwnership } from "../../middleware/auth";
import { GraphApiError } from "../../shared/metaGraph";
import { WhatsappAlreadyConnectedError, WhatsappNumberTakenError } from "./whatsapp.service";
import {
  WebhookVerifyQuery,
  ConnectWhatsappBody,
  DisconnectWhatsappBody,
  MetaWebhookPayload,
} from "./whatsapp.types";

export function whatsappController(app: FastifyInstance) {
  const service = app.whatsappService;

  /** Verify Meta's X-Hub-Signature-256 over the raw request body. */
  function verifySignature(req: FastifyRequest): boolean {
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      app.log.error("META_APP_SECRET not set — rejecting webhook");
      return false;
    }
    const signature = req.headers["x-hub-signature-256"];
    if (typeof signature !== "string" || !req.rawBody) return false;

    const expected =
      "sha256=" + crypto.createHmac("sha256", appSecret).update(req.rawBody).digest("hex");
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  return {
    // GET /webhook — Meta verification handshake
    verifyWebhook(req: FastifyRequest, reply: FastifyReply) {
      const q = req.query as WebhookVerifyQuery;
      const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
      if (q["hub.mode"] === "subscribe" && verifyToken && q["hub.verify_token"] === verifyToken) {
        return reply.type("text/plain").send(q["hub.challenge"] ?? "");
      }
      app.log.warn("🚫 WhatsApp webhook verification failed");
      return reply.code(403).send({ error: "Forbidden" });
    },

    // POST /webhook — inbound events. Reply 200 immediately, process async.
    receiveWebhook(req: FastifyRequest, reply: FastifyReply) {
      if (!verifySignature(req)) {
        app.log.warn("🚫 WhatsApp webhook signature verification failed");
        return reply.code(401).send({ error: "Invalid signature" });
      }

      reply.send({ ok: true });

      const body = req.body as MetaWebhookPayload;
      void service
        .processIncomingWebhook(body)
        .catch((err) => app.log.error({ err }, "processIncomingWebhook failed"));
    },

    // POST /whatsapp/connect — owner connects a number via Embedded Signup
    async connect(req: FastifyRequest, reply: FastifyReply) {
      const { restaurantId, code, wabaId, phoneNumberId } = req.body as ConnectWhatsappBody;

      const isOwner = await verifyOwnership(app, req.user!.id, restaurantId);
      if (!isOwner) return reply.code(403).send({ error: "Forbidden" });

      try {
        const result = await service.connectRestaurant(restaurantId, { code, wabaId, phoneNumberId });
        return reply.send(result);
      } catch (err) {
        if (err instanceof WhatsappAlreadyConnectedError || err instanceof WhatsappNumberTakenError) {
          return reply.code(409).send({ error: err.message });
        }
        if (err instanceof GraphApiError) {
          app.log.error({ err }, "WhatsApp connect Graph API error");
          return reply.code(502).send({ error: err.message });
        }
        throw err;
      }
    },

    // POST /whatsapp/disconnect — owner disconnects a number
    async disconnect(req: FastifyRequest, reply: FastifyReply) {
      const { restaurantId } = req.body as DisconnectWhatsappBody;

      const isOwner = await verifyOwnership(app, req.user!.id, restaurantId);
      if (!isOwner) return reply.code(403).send({ error: "Forbidden" });

      await service.disconnectRestaurant(restaurantId);
      return reply.send({ ok: true });
    },
  };
}
