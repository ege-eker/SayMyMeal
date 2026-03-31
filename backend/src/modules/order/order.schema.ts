export const createOrderSchema = {
  tags: ["orders"],
  description: "Create a new order (with phone number & selected food options)",
  body: {
    type: "object",
    required: ["customer", "phone", "restaurantId", "address", "items"],
    properties: {
      customer: { type: "string", minLength: 1 },
      phone: { type: "string", minLength: 5, description: "Customer phone number" },
      restaurantId: { type: "string" },
      /* UK address structure */
      address: {
        type: "object",
        required: ["houseNumber", "street", "city", "postcode"],
        properties: {
          houseNumber: { type: "string" },
          street: { type: "string" },
          city: { type: "string" },
          postcode: { type: "string" },
          country: { type: "string", default: "UK" },
        },
      },
      notes: { type: "string", nullable: true },
      /* Order items */
      items: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["foodId", "quantity"],
          properties: {
            foodId: { type: "string" },
            quantity: { type: "integer", minimum: 1 },
            /* Customer-selected options (array of JSON objects) */
            selectedOptions: {
              type: "array",
              nullable: true,
              description: "List of option-choice selections for this food.",
              items: {
                type: "object",
                required: ["optionId", "choiceId"],
                properties: {
                  optionId: { type: "string" },
                  optionTitle: { type: "string" },
                  choiceId: { type: "string" },
                  choiceLabel: { type: "string" },
                  extraPrice: { type: "number", default: 0 },
                },
              },
            },
          },
        },
      },
    },
  },
  /* Response */
  response: {
    201: {
      description: "Order created successfully",
      type: "object",
      properties: {
        id: { type: "string" },
        customer: { type: "string" },
        phone: { type: "string" },
        status: { type: "string" },
        etaMinutes: { type: "integer", nullable: true },
        notes: { type: "string", nullable: true },
        address: { type: "object" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              foodId: { type: "string" },
              quantity: { type: "integer" },
              /* selectedOptions gets stored as JSON in DB */
              selected: { type: ["array", "null", "object"] },
            },
          },
        },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
    400: {
      type: "object",
      properties: { error: { type: "string" } },
    },
  },
};

export const getOrdersSchema = {
  tags: ["orders"],
  description: "Get all orders or filter by phone number (?phone=)",
  querystring: {
    type: "object",
    properties: {
      phone: { type: "string", description: "Filter orders by customer phone" },
      restaurantId: { type: "string", description: "Filter orders by restaurant ID" },
      acknowledged: { type: "string", enum: ["true", "false"], description: "Filter by acknowledgement status" },
      pollToken: { type: "string", description: "Restaurant poll token (alternative to JWT auth)" },
    },
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          customer: { type: "string" },
          phone: { type: "string" },
          status: { type: "string" },
          etaMinutes: { type: "integer", nullable: true },
          acknowledgedAt: { type: "string", format: "date-time", nullable: true },
          notes: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          /* ---- NEW: address ---- */
          address: {
            type: "object",
            nullable: true,
            properties: {
              houseNumber: { type: "string" },
              street: { type: "string" },
              city: { type: "string" },
              postcode: { type: "string" },
              country: { type: "string" },
            },
          },
          /* ---- NEW: restaurant info ---- */
          restaurant: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string" },
              name: { type: "string" },
            },
          },
          /* ---- NEW: items array ---- */
          items: {
            type: "array",
            nullable: true,
            description: "List of order items (foods with selected options)",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                quantity: { type: "integer" },
                /* food info */
                food: {
                  type: "object",
                  nullable: true,
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    basePrice: { type: "number", nullable: true },
                  },
                },
                /* selected options & choices (stored as JSON) */
                selected: {
                  type: "array",
                  nullable: true,
                  items: {
                    type: "object",
                    properties: {
                      optionId: { type: "string" },
                      optionTitle: { type: "string" },
                      choiceId: { type: "string" },
                      choiceLabel: { type: "string" },
                      extraPrice: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const getOrderByIdSchema = {
  tags: ["orders"],
  description: "Get a single order by its ID (includes selected option data)",
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
        customer: { type: "string" },
        phone: { type: "string" },
        address: { type: "object" },
        status: { type: "string" },
        etaMinutes: { type: "integer" },
        notes: { type: "string", nullable: true },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              foodId: { type: "string" },
              quantity: { type: "integer" },
              selected: { type: ["array", "null", "object"] },
            },
          },
        },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
    404: {
      type: "object",
      properties: { message: { type: "string" } },
    },
  },
};

export const updateOrderStatusSchema = {
  tags: ["orders"],
  description: "Update the status of an existing order (e.g. pending → delivering)",
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } },
  },
  body: {
    type: "object",
    required: ["status"],
    properties: {
      status: {
        type: "string",
        enum: ["pending", "preparing", "delivering", "completed", "canceled"],
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        customer: { type: "string" },
        status: { type: "string" },
        items: { type: "array" },
      },
    },
  },
};

export const getMyOrdersSchema = {
  tags: ["orders"],
  description: "Get orders for the authenticated customer",
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          customer: { type: "string" },
          phone: { type: "string" },
          status: { type: "string" },
          etaMinutes: { type: "integer", nullable: true },
          notes: { type: "string", nullable: true },
          address: { type: "object", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          items: {
            type: "array",
            nullable: true,
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                quantity: { type: "integer" },
                food: {
                  type: "object",
                  nullable: true,
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    basePrice: { type: "number", nullable: true },
                    imageUrl: { type: "string", nullable: true },
                  },
                },
                selected: { type: "array", nullable: true },
              },
            },
          },
          restaurant: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              slug: { type: "string" },
              imageUrl: { type: "string", nullable: true },
            },
          },
          user: {
            type: "object",
            nullable: true,
            properties: {
              allergens: { type: "array", items: { type: "string" } },
              dietaryPreferences: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
  },
};

export const acknowledgeOrderSchema = {
  tags: ["orders"],
  description: "Acknowledge an order (mark as printed/seen by tablet)",
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } },
  },
  querystring: {
    type: "object",
    properties: {
      pollToken: { type: "string", description: "Restaurant poll token (alternative to JWT auth)" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        customer: { type: "string" },
        phone: { type: "string" },
        status: { type: "string" },
        etaMinutes: { type: "integer", nullable: true },
        acknowledgedAt: { type: "string", format: "date-time", nullable: true },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
        items: { type: "array" },
        restaurant: { type: "object" },
      },
    },
    404: {
      type: "object",
      properties: { message: { type: "string" } },
    },
    403: {
      type: "object",
      properties: { error: { type: "string" } },
    },
  },
};

export const allergenCheckSchema = {
  tags: ["orders"],
  description: "Check allergen conflicts for the authenticated user against given food items",
  querystring: {
    type: "object",
    required: ["foodIds"],
    properties: {
      foodIds: { type: "string", description: "Comma-separated food IDs" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        warnings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              foodId: { type: "string" },
              foodName: { type: "string" },
              matchedAllergens: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
  },
};

export const allergenCheckByPhoneSchema = {
  tags: ["orders"],
  description: "Check allergen conflicts by phone number (for WhatsApp/Realtime)",
  querystring: {
    type: "object",
    required: ["phone", "foodIds"],
    properties: {
      phone: { type: "string" },
      foodIds: { type: "string", description: "Comma-separated food IDs" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        warnings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              foodId: { type: "string" },
              foodName: { type: "string" },
              matchedAllergens: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
  },
};

export const getOrderStatusSchema = {
  tags: ["orders"],
  description: "Check order status by phone number or customer name",
  querystring: {
    type: "object",
    properties: {
      phone: { type: "string" },
      name: { type: "string" },
    },
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          customer: { type: "string" },
          phone: { type: "string" },
          status: { type: "string" },
          etaMinutes: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
    400: {
      type: "object",
      properties: { error: { type: "string" } },
    },
    404: {
      type: "object",
      properties: { message: { type: "string" } },
    },
  },
};