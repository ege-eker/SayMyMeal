import "fastify";

// Raw request body captured by the whatsapp-scope content-type parser, used for
// HMAC signature verification of Meta webhooks.
declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
  }
}

// ---- Meta Cloud API webhook payload (inbound) ----

export interface MetaTextMessage {
  body: string;
}

export interface MetaAudioMessage {
  id: string;
  mime_type?: string;
  voice?: boolean;
}

export interface MetaMessage {
  from: string; // wa_id (E.164 digits, no leading +)
  id: string; // wamid... — used for dedupe
  timestamp?: string;
  type: "text" | "audio" | string;
  text?: MetaTextMessage;
  audio?: MetaAudioMessage;
}

export interface MetaContact {
  wa_id: string;
  profile?: { name?: string };
}

export interface MetaMessageStatus {
  id: string;
  status: string;
  recipient_id?: string;
}

export interface MetaValueMetadata {
  display_phone_number?: string;
  phone_number_id: string;
}

export interface MetaChangeValue {
  messaging_product?: string;
  metadata?: MetaValueMetadata;
  contacts?: MetaContact[];
  messages?: MetaMessage[];
  statuses?: MetaMessageStatus[];
}

export interface MetaChange {
  field: string; // "messages" for inbound messages
  value: MetaChangeValue;
}

export interface MetaEntry {
  id: string; // WABA id
  changes?: MetaChange[];
}

export interface MetaWebhookPayload {
  object?: string;
  entry?: MetaEntry[];
}

// ---- Webhook verification (GET /webhook) ----

export interface WebhookVerifyQuery {
  "hub.mode"?: string;
  "hub.verify_token"?: string;
  "hub.challenge"?: string;
}

// ---- Connect / Disconnect (owner endpoints) ----

export interface ConnectWhatsappInput {
  code: string;
  wabaId: string;
  phoneNumberId: string;
}

export interface ConnectWhatsappBody extends ConnectWhatsappInput {
  restaurantId: string;
}

export interface DisconnectWhatsappBody {
  restaurantId: string;
}
