export const createRestaurantSchema = {
    tags: ["restaurants"],
    description: "create a new restaurant with UK address and delivery zones",
    body: {
      type: "object",
      required: ["name", "houseNumber", "street", "city", "postcode", "deliveryZones"],
      properties: {
        name: { type: "string", minLength: 2 },
        houseNumber: { type: "string", minLength: 1 },
        street: { type: "string", minLength: 2 },
        city: { type: "string", minLength: 2 },
        postcode: { type: "string", minLength: 4 },
        deliveryZones: {
          description: "List of delivery postcodes and their estimated delivery times (minutes)",
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
        description: "restaurant created successfully",
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          houseNumber: { type: "string" },
          street: { type: "string" },
          city: { type: "string" },
          postcode: { type: "string" },
          deliveryZones: {
            type: "array",
            items: {
              type: "object",
              properties: {
                postcode: { type: "string" },
                etaMinutes: { type: "integer" },
              },
            },
          },
          rating: { type: "number", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
};

export const getRestaurantsSchema = {
  tags: ["restaurants"],
  description: "get all restaurants",
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          houseNumber: { type: "string" },
          street: { type: "string" },
          city: { type: "string" },
          postcode: { type: "string" },
          deliveryZones: {
            type: "array",
            items: {
              type: "object",
              properties: {
                postcode: { type: "string" },
                etaMinutes: { type: "integer" },
              },
            },
          },
          rating: { type: "number", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
};

export const getRestaurantByIdSchema = {
  tags: ["restaurants"],
  description: "get restaurant by id (including menus and foods)",
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } },
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        houseNumber: { type: "string" },
        street: { type: "string" },
        city: { type: "string" },
        postcode: { type: "string" },
        deliveryZones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              postcode: { type: "string" },
              etaMinutes: { type: "integer" },
            },
          },
        },
        rating: { type: "number", nullable: true },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
        menus: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              restaurantId: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
              foods: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    price: { type: "number" },
                    menuId: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    404: {
      type: "object",
      properties: { message: { type: "string" } },
    },
  },
};

export const updateRestaurantSchema = {
  tags: ["restaurants"],
  description: "update restaurant by id",
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } },
  },
  body: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 2 },
      houseNumber: { type: "string" },
      street: { type: "string" },
      city: { type: "string" },
      postcode: { type: "string" },
      rating: { type: "number", nullable: true },
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
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        postcode: { type: "string" },
        deliveryZones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              postcode: { type: "string" },
              etaMinutes: { type: "integer" },
            },
          },
        },
        rating: { type: "number", nullable: true },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
    404: {
      type: "object",
      properties: { error: { type: "string" } },
    },
  },
};

export const deleteRestaurantSchema = {
  tags: ["restaurants"],
  description: "delete a restaurant by id",
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } },
  },
  response: {
    204: { type: "null", description: "restaurant deleted" },
    404: {
      type: "object",
      properties: { error: { type: "string" } },
    },
  },
};