import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import twilio from "twilio";
import { whatsappService } from "./whatsapp.service";

interface TwilioWhatsAppBody {
  Body?: string;
  From: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
}

export async function whatsappController(app: FastifyInstance) {
  const service = whatsappService(app);

  app.post(
    "/webhook",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const {
        Body: body,
        From: from,
        NumMedia: numMedia,
        MediaUrl0: mediaUrl,
        MediaContentType0: mediaContentType,
      } = req.body as TwilioWhatsAppBody;

      const MessagingResponse = twilio.twiml.MessagingResponse;
      const twiml = new MessagingResponse();

      try {
        // Check if this is a voice message (audio media)
        const hasMedia = numMedia && parseInt(numMedia) > 0;
        const isAudio = mediaContentType?.startsWith("audio/");

        if (hasMedia && isAudio && mediaUrl) {
          app.log.info(`🎤 WhatsApp Voice Message from ${from}: ${mediaUrl}`);

          // Transcribe the voice message and process it
          const responseText = await service.handleVoiceMessage(from, mediaUrl);
          twiml.message(responseText);
        } else {
          // Regular text message
          app.log.info(`📩 WhatsApp ${from}: ${body}`);
          const responseText = await service.handleMessage(from, body ?? "");
          twiml.message(responseText);
        }

        reply.type("text/xml").send(twiml.toString());
      } catch (err: any) {
        app.log.error(err);
        // Always respond to the user even on error
        twiml.message("I'm sorry, something went wrong. Please try again.");
        reply.type("text/xml").send(twiml.toString());
      }
    }
  );
}