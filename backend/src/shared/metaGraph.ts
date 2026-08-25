import { Buffer } from "node:buffer";

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION ?? "v25.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// WhatsApp text messages are capped at 4096 characters per message.
const WA_TEXT_LIMIT = 4096;

// Bound every outbound call so a hung connection can't tie up a worker
// indefinitely. Media downloads pull real bytes, so they get a longer budget.
const GRAPH_TIMEOUT_MS = 15_000;
const MEDIA_TIMEOUT_MS = 60_000;

export class GraphApiError extends Error {
  code?: number;
  subcode?: number;
  constructor(message: string, code?: number, subcode?: number) {
    super(message);
    this.name = "GraphApiError";
    this.code = code;
    this.subcode = subcode;
  }
}

function requireAppCredentials(): { appId: string; appSecret: string } {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new GraphApiError("META_APP_ID and META_APP_SECRET must be set");
  }
  return { appId, appSecret };
}

interface GraphFetchOptions {
  method?: string;
  token?: string;
  body?: unknown;
  query?: Record<string, string>;
}

async function graphFetch<T = any>(path: string, opts: GraphFetchOptions = {}): Promise<T> {
  const { method = "GET", token, body, query } = opts;

  const url = new URL(`${GRAPH_BASE}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  }

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: string | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: payload,
      signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS),
    });
  } catch (err) {
    // Timeouts and network failures surface as GraphApiError so callers that
    // already branch on it (controller -> 502) keep working unchanged.
    throw new GraphApiError(`Graph API request failed: ${(err as Error).message}`);
  }
  const text = await res.text();

  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok || json?.error) {
    const err = json?.error ?? {};
    throw new GraphApiError(
      err.message ?? `Graph API request failed: ${res.status} ${res.statusText}`,
      err.code,
      err.error_subcode
    );
  }

  return json as T;
}

/**
 * Embedded Signup: exchange the short-lived `code` from the popup for a
 * business-integration access token scoped to that owner's WhatsApp assets.
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const { appId, appSecret } = requireAppCredentials();
  const json = await graphFetch<{ access_token?: string }>("/oauth/access_token", {
    query: { client_id: appId, client_secret: appSecret, code },
  });
  if (!json.access_token) {
    throw new GraphApiError("No access_token returned from code exchange");
  }
  return json.access_token;
}

/** Subscribe this app to the WABA so its numbers' messages reach our webhook. */
export async function subscribeAppToWaba(wabaId: string, token: string): Promise<void> {
  await graphFetch(`/${wabaId}/subscribed_apps`, { method: "POST", token });
}

/**
 * Register a phone number on Cloud API with a 6-digit two-step PIN.
 * Only needed for the "migration" onboarding model — coexistence numbers are
 * linked via the QR step inside the signup popup and skip this call.
 */
export async function registerPhoneNumber(
  phoneNumberId: string,
  token: string,
  pin: string
): Promise<void> {
  await graphFetch(`/${phoneNumberId}/register`, {
    method: "POST",
    token,
    body: { messaging_product: "whatsapp", pin },
  });
}

/** Best-effort deregister (used on disconnect). */
export async function deregisterPhoneNumber(phoneNumberId: string, token: string): Promise<void> {
  await graphFetch(`/${phoneNumberId}/deregister`, { method: "POST", token });
}

export interface PhoneNumberInfo {
  display_phone_number: string;
  verified_name?: string;
}

export async function getPhoneNumberInfo(
  phoneNumberId: string,
  token: string
): Promise<PhoneNumberInfo> {
  return graphFetch<PhoneNumberInfo>(`/${phoneNumberId}`, {
    token,
    query: { fields: "display_phone_number,verified_name" },
  });
}

function chunkText(text: string, size: number): string[] {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks;
}

/**
 * Send a text reply. `to` is the raw `wa_id` (E.164 digits, no `+`).
 * Bodies over 4096 chars are split into multiple sequential messages.
 */
export async function sendTextMessage(
  phoneNumberId: string,
  token: string,
  to: string,
  body: string
): Promise<void> {
  for (const chunk of chunkText(body, WA_TEXT_LIMIT)) {
    await graphFetch(`/${phoneNumberId}/messages`, {
      method: "POST",
      token,
      body: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: chunk },
      },
    });
  }
}

/** Mark an inbound message as read (best-effort; errors swallowed). */
export async function markMessageRead(
  phoneNumberId: string,
  token: string,
  messageId: string
): Promise<void> {
  try {
    await graphFetch(`/${phoneNumberId}/messages`, {
      method: "POST",
      token,
      body: { messaging_product: "whatsapp", status: "read", message_id: messageId },
    });
  } catch {
    // best-effort — read receipts are non-critical
  }
}

/**
 * Download media (e.g. a voice note) by media id. Two-step: resolve the media
 * URL, then GET the bytes with the Bearer token (the Graph CDN requires it).
 */
export async function downloadMedia(mediaId: string, token: string): Promise<Buffer> {
  const meta = await graphFetch<{ url?: string; mime_type?: string }>(`/${mediaId}`, { token });
  if (!meta.url) throw new GraphApiError(`No media URL returned for media ${mediaId}`);

  let res: Response;
  try {
    res = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(MEDIA_TIMEOUT_MS),
    });
  } catch (err) {
    throw new GraphApiError(`Failed to download media ${mediaId}: ${(err as Error).message}`);
  }
  if (!res.ok) {
    throw new GraphApiError(`Failed to download media ${mediaId}: ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
