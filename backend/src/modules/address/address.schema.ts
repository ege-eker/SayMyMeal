const addressProperties = {
  label: { type: 'string', minLength: 1 },
  houseNumber: { type: 'string', minLength: 1 },
  street: { type: 'string', minLength: 1 },
  city: { type: 'string', minLength: 1 },
  postcode: { type: 'string', minLength: 1 },
  notes: { type: 'string' },
  isDefault: { type: 'boolean' },
};

const addressResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    label: { type: 'string' },
    houseNumber: { type: 'string' },
    street: { type: 'string' },
    city: { type: 'string' },
    postcode: { type: 'string' },
    notes: { type: 'string', nullable: true },
    isDefault: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

export const listAddressesSchema = {
  tags: ['addresses'],
  description: 'Get all saved addresses for the authenticated user',
  response: {
    200: {
      type: 'array',
      items: addressResponse,
    },
  },
};

export const createAddressSchema = {
  tags: ['addresses'],
  description: 'Save a new delivery address',
  body: {
    type: 'object',
    required: ['label', 'houseNumber', 'street', 'city', 'postcode'],
    properties: addressProperties,
  },
  response: {
    201: addressResponse,
  },
};

export const updateAddressSchema = {
  tags: ['addresses'],
  description: 'Update label or set address as default',
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
  body: {
    type: 'object',
    properties: {
      label: addressProperties.label,
      isDefault: addressProperties.isDefault,
    },
  },
  response: {
    200: addressResponse,
  },
};

export const deleteAddressSchema = {
  tags: ['addresses'],
  description: 'Delete a saved address',
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
  response: {
    204: { type: 'null' },
  },
};
