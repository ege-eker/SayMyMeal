import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import twilio from "twilio";
import { restaurantService } from "../restaurant/restaurant.service";

interface TwilioWhatsAppBody {
  Body?: string;
  From: string;
  To?: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
}

export async function whatsappController(app: FastifyInstance) {
  const service = app.whatsappService;
  const restService = restaurantService(app);

  app.post(
    "/webhook",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const {
        Body: body,
        From: from,
        To: to,
        NumMedia: numMedia,
        MediaUrl0: mediaUrl,
        MediaContentType0: mediaContentType,
      } = req.body as TwilioWhatsAppBody;

      const MessagingResponse = twilio.twiml.MessagingResponse;
      const twiml = new MessagingResponse();

      try {
        // Resolve restaurant from To number, fallback to isActive
        let restaurantId: string | undefined;
        if (to) {
          const cleanedTo = to.replace(/^whatsapp:/, "");
          const rest = await restService.findByWhatsappPhone(cleanedTo);
          if (rest) restaurantId = rest.id;
        }
        if (!restaurantId) {
          // Legacy fallback: use first active restaurant
          const active = await app.prisma.restaurant.findFirst({
            where: { isActive: true },
            select: { id: true },
          });
          if (active) restaurantId = active.id;
        }
        if (!restaurantId) {
          twiml.message("Sorry, this number is not currently configured. Please try again later.");
          return reply.type("text/xml").send(twiml.toString());
        }

        // Check if this is a voice message (audio media)
        const hasMedia = numMedia && parseInt(numMedia) > 0;
        const isAudio = mediaContentType?.startsWith("audio/");

        if (hasMedia && isAudio && mediaUrl) {
          app.log.info(`🎤 WhatsApp Voice Message from ${from}: ${mediaUrl}`);
          const responseText = await service.handleVoiceMessage(from, mediaUrl, restaurantId);
          twiml.message(responseText);
        } else {
          app.log.info(`📩 WhatsApp ${from}: ${body}`);
          const responseText = await service.handleMessage(from, body ?? "", restaurantId);
          twiml.message(responseText);
        }

        reply.type("text/xml").send(twiml.toString());
      } catch (err: any) {
        app.log.error(err);
        twiml.message("I'm sorry, something went wrong. Please try again.");
        reply.type("text/xml").send(twiml.toString());
      }
    }
  );
}