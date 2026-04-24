import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import twilio from "twilio";
import { restaurantService } from "../restaurant/restaurant.service";
import { voiceService, AlreadyProvisionedError } from "./voice.service";
import { blacklistService, normalizePhone } from "../blacklist/blacklist.service";
import { verifyOwnership } from "../../middleware/auth";
import {
  TwilioVoiceWebhookBody,
  SearchNumbersQuery,
  ProvisionNumberBody,
} from "./voice.types";

export function voiceController(app: FastifyInstance) {
  const restaurant = restaurantService(app);
  const voice = voiceService(app);
  const blacklist = blacklistService(app);

  return {
    async incoming(req: FastifyRequest, reply: FastifyReply) {
      const { To, From } = req.body as TwilioVoiceWebhookBody;
      const VoiceResponse = twilio.twiml.VoiceResponse;
      const twiml = new VoiceResponse();

      const cleanedTo = To.replace(/^sip:/, "").replace(/@.*$/, "");
      app.log.info(`📞 Incoming call from ${From} to ${cleanedTo}`);

      const rest = await restaurant.findByVoicePhone(cleanedTo);

      if (!rest) {
        app.log.warn(`❌ No restaurant found for To=${cleanedTo}`);
        twiml.say(
          { voice: "alice", language: "en-GB" },
          "Sorry, this number is not currently active. Please try again later. Goodbye."
        );
        twiml.hangup();
        return reply.type("text/xml").send(twiml.toString());
      }

      const normalizedFrom = normalizePhone(From);
      if (await blacklist.isBlacklisted(normalizedFrom, rest.id)) {
        app.log.warn(`🚫 Blacklisted caller ${normalizedFrom} rejected for restaurant ${rest.id}`);
        await blacklist.incrementAttempt(normalizedFrom, rest.id);
        twiml.reject({ reason: "busy" });
        return reply.type("text/xml").send(twiml.toString());
      }

      app.log.info(`✅ Routing call to restaurant: ${rest.name} (${rest.id}) — matched via To=${cleanedTo}`);

      const proto = req.headers["x-forwarded-proto"] || "wss";
      const host = req.headers["x-forwarded-host"] || req.headers.host || req.hostname;
      const wsUrl = `${proto === "https" ? "wss" : "wss"}://${host}/voice/ws`;

      const connect = twiml.connect();
      const stream = connect.stream({ url: wsUrl });
      stream.parameter({ name: "restaurantId", value: rest.id });
      stream.parameter({ name: "restaurantName", value: rest.name });
      stream.parameter({ name: "callerPhone", value: From });
      stream.parameter({ name: "acceptingOrders", value: String(rest.acceptingOrders) });
      stream.parameter({ name: "isBusy", value: String(rest.isBusy) });
      stream.parameter({ name: "busyExtraMinutes", value: String(rest.busyExtraMinutes) });

      reply.type("text/xml").send(twiml.toString());
    },

    async status(req: FastifyRequest, reply: FastifyReply) {
      app.log.info(`📋 Status callback body: ${JSON.stringify(req.body)}`);
      reply.send({ ok: true });
    },

    async availableNumbers(req: FastifyRequest, reply: FastifyReply) {
      const { country, areaCode } = req.query as SearchNumbersQuery;
      try {
        const numbers = await voice.searchNumbers(country, areaCode ? Number(areaCode) : undefined);
        return reply.send({ numbers });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to search available numbers";
        app.log.error(`❌ Search numbers failed: ${message}`);
        return reply.code(502).send({ error: message });
      }
    },

    async provision(req: FastifyRequest, reply: FastifyReply) {
      const { restaurantId, phoneNumber } = req.body as ProvisionNumberBody;
      const userId = req.user!.id;

      const isOwner = await verifyOwnership(app, userId, restaurantId);
      if (!isOwner) {
        return reply.code(403).send({ error: "Forbidden" });
      }

      try {
        const result = await voice.provisionForRestaurant(restaurantId, phoneNumber);
        return reply.code(201).send(result);
      } catch (err) {
        if (err instanceof AlreadyProvisionedError) {
          return reply.code(409).send({ error: err.message });
        }
        const message = err instanceof Error ? err.message : "Failed to provision number";
        app.log.error(`❌ Provision failed: ${message}`);
        return reply.code(502).send({ error: message });
      }
    },
  };
}
