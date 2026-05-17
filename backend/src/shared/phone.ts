export function normalizePhone(phone: string): string {
  return phone.replace(/^whatsapp:/i, "").replace(/[\s\-\(\)]/g, "");
}
