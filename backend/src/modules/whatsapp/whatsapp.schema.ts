// Fastify JSON Schemas for the WhatsApp (Meta Cloud API) routes.

// GET /webhook — Meta verification handshake. Keys are dotted (hub.mode, etc.).
// Not marked required: a wrong/absent verify_token must yield 403 in the
// controller, not a 400 from schema validation.
export const webhookVerifySchema = {
  tags: ["whatsapp"],
  description: "Meta webhook verification handshake",
  querystring: {
    type: "object",
    additionalProperties: true,
    properties: {
      "hub.mode": { type: "string" },
      "hub.verify_token": { type: "string" },
      "hub.challenge": { type: "string" },
    },
  },
} as const;

// POST /webhook — inbound message events. Permissive body (Meta payload shape
// varies); signature is verified from the raw body in the controller.
export const webhookReceiveSchema = {
  tags: ["whatsapp"],
  description: "Meta webhook inbound events",
  body: {
    type: "object",
    additionalProperties: true,
  },
} as const;

// POST /whatsapp/connect — owner connects a number via Embedded Signup.
export const connectWhatsappSchema = {
  tags: ["whatsapp"],
  description: "Connect a WhatsApp number to a restaurant (owner only)",
  body: {
    type: "object",
    required: ["restaurantId", "code", "wabaId", "phoneNumberId"],
    additionalProperties: false,
    properties: {
      restaurantId: { type: "string" },
      code: { type: "string" },
      wabaId: { type: "string" },
      phoneNumberId: { type: "string" },
    },
  },
} as const;

// POST /whatsapp/disconnect — owner disconnects a number.
export const disconnectWhatsappSchema = {
  tags: ["whatsapp"],
  description: "Disconnect a restaurant's WhatsApp number (owner only)",
  body: {
    type: "object",
    required: ["restaurantId"],
    additionalProperties: false,
    properties: {
      restaurantId: { type: "string" },
    },
  },
} as const;
