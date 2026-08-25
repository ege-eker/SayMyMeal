export function normalizePhone(phone: string): string {
  return phone.replace(/^whatsapp:/i, "").replace(/[\s\-\(\)]/g, "");
}

/**
 * Converts a Meta `wa_id` (E.164 digits without a leading `+`, e.g. "447911123456")
 * into `+`-prefixed E.164 (e.g. "+447911123456").
 *
 * Meta delivers contact/message phone numbers as bare digits. The rest of the
 * platform (User.phone, WhatsAppProfile.phone, Blacklist.phone, session keys)
 * stores `+`-prefixed E.164, so we normalise once at the WhatsApp transport
 * boundary. Outbound `to` should keep using the raw `wa_id`.
 */
export function waIdToE164(waId: string): string {
  const cleaned = waId.trim();
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}
