export const registerSchema = {
  tags: ['auth'],
  description: 'Register a new user',
  body: {
    type: 'object',
    required: ['email', 'password', 'name'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
      name: { type: 'string', minLength: 2 },
      phone: { type: 'string', nullable: true },
      role: { type: 'string', enum: ['CUSTOMER', 'OWNER'], default: 'CUSTOMER' },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            allergenAsked: { type: 'boolean' },
          },
        },
      },
    },
    400: {
      type: 'object',
      properties: { error: { type: 'string' } },
    },
  },
};

export const loginSchema = {
  tags: ['auth'],
  description: 'Login with email and password',
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            allergenAsked: { type: 'boolean' },
          },
        },
      },
    },
    401: {
      type: 'object',
      properties: { error: { type: 'string' } },
    },
  },
};

export const meSchema = {
  tags: ['auth'],
  description: 'Get current user info',
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        name: { type: 'string' },
        phone: { type: 'string', nullable: true },
        role: { type: 'string' },
        allergens: { type: 'array', items: { type: 'string' } },
        dietaryPreferences: { type: 'array', items: { type: 'string' } },
        allergenAsked: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    401: {
      type: 'object',
      properties: { error: { type: 'string' } },
    },
  },
};

export const getAllergenProfileByPhoneSchema = {
  tags: ['auth'],
  description: 'Get allergen profile by phone number (for WhatsApp/Realtime)',
  querystring: {
    type: 'object',
    required: ['phone'],
    properties: {
      phone: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        allergens: { type: 'array', items: { type: 'string' } },
        dietaryPreferences: { type: 'array', items: { type: 'string' } },
        allergenAsked: { type: 'boolean' },
      },
    },
  },
};

export const updateAllergenProfileByPhoneSchema = {
  tags: ['auth'],
  description: 'Update allergen profile by phone number (for WhatsApp/Realtime)',
  body: {
    type: 'object',
    required: ['phone', 'allergens', 'dietaryPreferences'],
    properties: {
      phone: { type: 'string' },
      allergens: { type: 'array', items: { type: 'string' } },
      dietaryPreferences: { type: 'array', items: { type: 'string' } },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        allergens: { type: 'array', items: { type: 'string' } },
        dietaryPreferences: { type: 'array', items: { type: 'string' } },
        allergenAsked: { type: 'boolean' },
      },
    },
  },
};

export const updateAllergenProfileSchema = {
  tags: ['auth'],
  description: 'Update allergen and dietary preferences for the authenticated user',
  body: {
    type: 'object',
    required: ['allergens', 'dietaryPreferences'],
    properties: {
      allergens: { type: 'array', items: { type: 'string' } },
      dietaryPreferences: { type: 'array', items: { type: 'string' } },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        allergens: { type: 'array', items: { type: 'string' } },
        dietaryPreferences: { type: 'array', items: { type: 'string' } },
        allergenAsked: { type: 'boolean' },
      },
    },
  },
};
