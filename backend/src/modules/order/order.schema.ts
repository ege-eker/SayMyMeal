export const createOrderSchema = {
  tags: ["orders"],
  description: "Create a new order (with phone number and UK address)",
  body: {
    type: "object",
    required: ["customer", "phone", "restaurantId", "address", "items"],
    properties: {
      customer: { type: "string", minLength: 1 },
      phone: {
        type: "string",
        pattern: "^[0-9+()\\s-]{5,20}$",
        description: "Customer phone number",
      },
      restaurantId: { type: "string" },
      address: {
        type: "object",
        required: ["houseNumber", "street", "city", "postcode"],
        properties: {
          houseNumber: { type: "string", minLength: 1 },
          street: { type: "string", minLength: 2 },
          city: { type: "string", minLength: 2 },
          postcode: { type: "string", minLength: 4 },
          country: { type: "string", minLength: 2 },
        },
      },
      items: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["foodId", "quantity"],
          properties: {
            foodId: { type: "string", minLength: 1 },
            quantity: { type: "integer", minimum: 1 },
          },
        },
      },
    },
  },
  response: {
    201: {
      description: "Order created successfully",
      type: "object",
      properties: {
        id: { type: "string" },
        customer: { type: "string" },
        phone: { type: "string" },
        address: {
          type: "object",
          properties: {
            houseNumber: { type: "string" },
            street: { type: "string" },
            city: { type: "string" },
            postcode: { type: "string" },
            country: { type: "string" },
          },
        },
        status: {
          type: "string",
          enum: ["pending", "preparing", "delivering", "completed", "canceled"],
        },
        etaMinutes: { type: "integer", nullable: true },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              foodId: { type: "string" },
              quantity: { type: "integer" },
            },
          },
        },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
  },
};

export const getOrdersSchema = {
  tags: ["orders"],
  description: "Get all orders or filter by phone number (?phone=)",
  querystring: {
    type: "object",
    properties: {
      phone: { type: "string", description: "Filter by customer phone" },
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
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },

          // 👇 yeni alanlar
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
          restaurant: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              city: { type: "string" },
              postcode: { type: "string" },
            },
          },
          items: {
            type: "array",
            nullable: true,
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                foodId: { type: "string" },
                quantity: { type: "integer" },
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
  description: "Get an order by order ID",
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
        address: {
          type: "object",
          properties: {
            houseNumber: { type: "string" },
            street: { type: "string" },
            city: { type: "string" },
            postcode: { type: "string" },
            country: { type: "string" },
          },
        },
        status: {
          type: "string",
          enum: ["pending", "preparing", "delivering", "completed", "canceled"],
        },
        etaMinutes: { type: "integer", nullable: true },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              foodId: { type: "string" },
              quantity: { type: "integer" },
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
  description: "Update the status of an order",
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
        phone: { type: "string" },
        status: { type: "string" },
        etaMinutes: { type: "integer", nullable: true },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
  },
};

export const getOrderStatusSchema = {
  tags: ["orders"],
  description: "Get current order(s) by phone number or customer name",
  querystring: {
    type: "object",
    properties: {
      phone: { type: "string" },
      name: { type: "string" }
    },
    anyOf: [
      { required: ["phone"] },
      { required: ["name"] }
    ]
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
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      }
    },
    404: {
      type: "object",
      properties: {
        message: { type: "string" }
      }
    },
    400: {
      type: "object",
      properties: {
        error: { type: "string" }
      }
    }
  }
};