export const voiceIncomingSchema = {
  tags: ["voice"],
  description: "Twilio Voice incoming call webhook",
  consumes: ["application/x-www-form-urlencoded"],
};

export const voiceStatusSchema = {
  tags: ["voice"],
  description: "Twilio Voice call status callback",
  consumes: ["application/x-www-form-urlencoded"],
};

export const availableNumbersSchema = {
  tags: ["voice"],
  description: "Search available Twilio phone numbers (owner only)",
  querystring: {
    type: "object",
    required: ["country"],
    properties: {
      country: { type: "string", minLength: 2, maxLength: 2 },
      areaCode: { type: "integer" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        numbers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              phoneNumber: { type: "string" },
              friendlyName: { type: "string" },
              locality: { type: "string", nullable: true },
              region: { type: "string", nullable: true },
              isoCountry: { type: "string" },
            },
          },
        },
      },
    },
  },
};

export const provisionNumberSchema = {
  tags: ["voice"],
  description: "Provision a dedicated Twilio voice number for a restaurant (owner only, one-shot)",
  body: {
    type: "object",
    required: ["restaurantId", "phoneNumber"],
    properties: {
      restaurantId: { type: "string" },
      phoneNumber: { type: "string", pattern: "^\\+[1-9]\\d{1,14}$" },
    },
  },
  response: {
    201: {
      type: "object",
      properties: {
        id: { type: "string" },
        voicePhone: { type: "string", nullable: true },
        twilioPhoneSid: { type: "string", nullable: true },
      },
    },
    409: {
      type: "object",
      properties: { error: { type: "string" } },
    },
  },
};
