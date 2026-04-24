import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set");
}

const client = twilio(accountSid, authToken);

export interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
  isoCountry: string;
}

export interface PurchasedNumber {
  sid: string;
  phoneNumber: string;
}

export async function searchAvailableNumbers(
  country: string,
  areaCode?: number,
  limit = 20
): Promise<AvailableNumber[]> {
  const results = await client
    .availablePhoneNumbers(country)
    .local.list({
      voiceEnabled: true,
      ...(areaCode ? { areaCode } : {}),
      limit,
    });

  return results.map((r) => ({
    phoneNumber: r.phoneNumber,
    friendlyName: r.friendlyName,
    locality: r.locality,
    region: r.region,
    isoCountry: r.isoCountry,
  }));
}

export async function purchaseNumber(
  phoneNumber: string,
  voiceUrl: string,
  statusUrl: string,
  addressSid?: string,
  bundleSid?: string
): Promise<PurchasedNumber> {
  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber,
    voiceUrl,
    voiceMethod: "POST",
    statusCallback: statusUrl,
    statusCallbackMethod: "POST",
    ...(addressSid ? { addressSid } : {}),
    ...(bundleSid ? { bundleSid } : {}),
  });

  return { sid: purchased.sid, phoneNumber: purchased.phoneNumber };
}

export async function releaseNumber(sid: string): Promise<void> {
  await client.incomingPhoneNumbers(sid).remove();
}
