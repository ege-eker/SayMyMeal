export const createRestaurantSchema = {
    tags: ["restaurants"],
    description: "Create a new restaurant with UK address, delivery zones, and unique slug",
    body: {
      type: "object",
      required: ["name", "slug", "houseNumber", "street", "city", "postcode", "deliveryZones"],
      properties: {
        name: { type: "string", minLength: 2 },
        slug: { type: "string", minLength: 2, pattern: "^[a-z0-9-]+$" },
        houseNumber: { type: "string", minLength: 1 },
        street: { type: "string", minLength: 2 },
        city: { type: "string", minLength: 2 },
        postcode: { type: "string", minLength: 4 },
        deliveryZones: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            required: ["postcode", "etaMinutes"],
            properties: {
              postcode: { type: "string", minLength: 4 },
              etaMinutes: { type: "integer", minimum: 5 },
            },
          },
        },
        rating: { type: "number", minimum: 0, maximum: 5, nullable: true },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slug: { type: "string" },
          imageUrl: { type: "string", nullable: true },
          houseNumber: { type: "string" },
          street: { type: "string" },
          city: { type: "string" },
          postcode: { type: "string" },
          deliveryZones: { type: "array", items: { type: "object" } },
          rating: { type: "number", nullable: true },
          isBusy: { type: "boolean" },
          busyExtraMinutes: { type: "integer" },
          acceptingOrders: { type: "boolean" },
          isActive: { type: "boolean" },
          ownerId: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      400: { type: "object", properties: { error: { type: "string" } } },
    },
};

const restaurantResponseProperties = {
  id: { type: "string" },
  name: { type: "string" },
  slug: { type: "string" },
  imageUrl: { type: "string", nullable: true },
  houseNumber: { type: "string" },
  street: { type: "string" },
  city: { type: "string" },
  postcode: { type: "string" },
  deliveryZones: { type: "array", items: { type: "object" } },
  rating: { type: "number", nullable: true },
  isBusy: { type: "boolean" },
  busyExtraMinutes: { type: "integer" },
  acceptingOrders: { type: "boolean" },
  isActive: { type: "boolean" },
  ownerId: { type: "string", nullable: true },
  createdAt: { type: "string", format: "date-time" },
  updatedAt: { type: "string", format: "date-time" },
};

export const getRestaurantsSchema = {
  tags: ["restaurants"],
  description: "Get all restaurants",
  response: {
    200: {
      type: "array",
      items: { type: "object", properties: restaurantResponseProperties },
    },
  },
};

export const getRestaurantByIdSchema = {
  tags: ["restaurants"],
  description: "Get restaurant by ID with its menus",
  params: {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  response: {
    200: {
      type: "object",
      properties: {
        ...restaurantResponseProperties,
        menus: {
          type: "array",
          items: {
            type: "object",
            properties: { id: { type: "string" }, name: { type: "string" } },
          },
        },
      },
    },
    404: { type: "object", properties: { message: { type: "string" } } },
  },
};

export const getRestaurantBySlugSchema = {
  tags: ["restaurants"],
  description: "Get restaurant by slug with full menu tree",
  params: {
    type: "object",
    properties: { slug: { type: "string" } },
    required: ["slug"],
  },
};

export const getMyRestaurantsSchema = {
  tags: ["restaurants"],
  description: "Get restaurants owned by the authenticated user",
};

export const updateRestaurantSchema = {
  tags: ["restaurants"],
  description: "Update restaurant by ID (owner only)",
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } },
  },
  body: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 2 },
      slug: { type: "string", minLength: 2, pattern: "^[a-z0-9-]+$" },
      houseNumber: { type: "string" },
      street: { type: "string" },
      city: { type: "string" },
      postcode: { type: "string" },
      rating: { type: "number", nullable: true },
      isBusy: { type: "boolean" },
      busyExtraMinutes: { type: "integer", minimum: 5, maximum: 120 },
      acceptingOrders: { type: "boolean" },
      deliveryZones: {
        type: "array",
        items: {
          type: "object",
          required: ["postcode", "etaMinutes"],
          properties: {
            postcode: { type: "string" },
            etaMinutes: { type: "integer" },
          },
        },
      },
    },
  },
};

export const deleteRestaurantSchema = {
  tags: ["restaurants"],
  description: "Delete a restaurant by ID (owner only)",
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } },
  },
};

export const activateRestaurantSchema = {
  tags: ["restaurants"],
  description: "Activate a restaurant and deactivate all others (owner only)",
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } },
  },
};

export const removeRestaurantImageSchema = {
  tags: ["restaurants"],
  description: "Remove image from a restaurant",
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } }
  },
  response: {
    200: {
      type: "object",
      properties: {
        imageUrl: { type: "null" }
      }
    }
  }
};

export const uploadRestaurantImageSchema = {
  tags: ["restaurants"],
  description: "Upload an image for a restaurant",
  consumes: ["multipart/form-data"],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } }
  },
  response: {
    200: {
      type: "object",
      properties: {
        imageUrl: { type: "string" }
      }
    }
  }
};
