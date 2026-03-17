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
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    401: {
      type: 'object',
      properties: { error: { type: 'string' } },
    },
  },
};
