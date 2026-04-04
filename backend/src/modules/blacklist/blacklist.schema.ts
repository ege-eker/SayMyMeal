export const addToBlacklistSchema = {
  tags: ["Blacklist"],
  description: "Add a phone number to restaurant blacklist",
  params: {
    type: "object" as const,
    properties: {
      restaurantId: { type: "string" },
    },
    required: ["restaurantId"],
  },
  body: {
    type: "object" as const,
    properties: {
      phone: { type: "string" },
      reason: { type: "string" },
    },
    required: ["phone"],
  },
  response: {
    201: {
      type: "object" as const,
      properties: {
        id: { type: "string" },
        phone: { type: "string" },
        reason: { type: "string", nullable: true },
        restaurantId: { type: "string" },
        attemptCount: { type: "number" },
        lastAttemptAt: { type: "string", nullable: true },
        createdAt: { type: "string" },
      },
    },
  },
};

export const getBlacklistSchema = {
  tags: ["Blacklist"],
  description: "Get all blacklisted phone numbers for a restaurant",
  params: {
    type: "object" as const,
    properties: {
      restaurantId: { type: "string" },
    },
    required: ["restaurantId"],
  },
  response: {
    200: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" },
          phone: { type: "string" },
          reason: { type: "string", nullable: true },
          restaurantId: { type: "string" },
          attemptCount: { type: "number" },
          lastAttemptAt: { type: "string", nullable: true },
          createdAt: { type: "string" },
        },
      },
    },
  },
};

export const removeFromBlacklistSchema = {
  tags: ["Blacklist"],
  description: "Remove a phone number from blacklist",
  params: {
    type: "object" as const,
    properties: {
      id: { type: "string" },
    },
    required: ["id"],
  },
};
