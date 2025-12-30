import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import twilio from "twilio";
import { whatsappService } from "./whatsapp.service";

export async function whatsappController(app: FastifyInstance) {
  const service = whatsappService(app);

  app.post(
    "/webhook",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { Body: body, From: from } = req.body as any;
      app.log.info(`📩 WhatsApp ${from}: ${body}`);

      try {
        const responseText = await service.handleMessage(from, body);

        const MessagingResponse = twilio.twiml.MessagingResponse;
        const twiml = new MessagingResponse();
        twiml.message(responseText);

        reply.type("text/xml").send(twiml.toString());
      } catch (err: any) {
        app.log.error(err);
        reply.code(500).send("Internal error");
      }
    }
  );
}