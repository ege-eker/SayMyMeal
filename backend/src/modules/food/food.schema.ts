export const createFoodSchema = {
  tags: ["foods"],
  description: "Create a new food item for a menu",
  body: {
    type: "object",
    required: ["name", "basePrice", "menuId"],
    properties: {
      name: { type: "string", minLength: 2 },
      basePrice: { type: "number", minimum: 0 },
      menuId: { type: "string" },
      allergens: { type: "array", items: { type: "string" }, default: [] },
      dietTags: { type: "array", items: { type: "string" }, default: [] }
    }
  },
  response: {
    201: {
      description: "Food item created",
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        imageUrl: { type: "string", nullable: true },
        basePrice: { type: "number" },
        allergens: { type: "array", items: { type: "string" } },
        dietTags: { type: "array", items: { type: "string" } },
        menuId: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" }
      }
    }
  }
};

export const getFoodsSchema = {
  tags: ["foods"],
  description: "Get all food items",
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          imageUrl: { type: "string", nullable: true },
          basePrice: { type: "number" },
          allergens: { type: "array", items: { type: "string" } },
          dietTags: { type: "array", items: { type: "string" } },
          menuId: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      }
    }
  }
};

export const getFoodByIdSchema = {
  tags: ["foods"],
  description: "Get food item by id",
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" }
    }
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        imageUrl: { type: "string", nullable: true },
        basePrice: { type: "number" },
        allergens: { type: "array", items: { type: "string" } },
        dietTags: { type: "array", items: { type: "string" } },
        menuId: { type: "string" },
        options: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    multiple: { type: "boolean" },
                },
            },
        },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" }
      }
    },
    404: {
      type: "object",
      properties: { error: { type: "string" } }
    }
  }
};

export const updateFoodSchema = {
  tags: ["foods"],
  description: "Update a food item",
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } }
  },
  body: {
    type: "object",
    properties: {
      name: { type: "string" },
      basePrice: { type: "number", minimum: 0 },
      allergens: { type: "array", items: { type: "string" } },
      dietTags: { type: "array", items: { type: "string" } }
    }
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        imageUrl: { type: "string", nullable: true },
        basePrice: { type: "number" },
        allergens: { type: "array", items: { type: "string" } },
        dietTags: { type: "array", items: { type: "string" } },
        menuId: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" }
      }
    },
    404: {
      type: "object",
      properties: { error: { type: "string" } }
    }
  }
};

export const uploadFoodImageSchema = {
  tags: ["foods"],
  description: "Upload an image for a food item",
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

export const removeFoodImageSchema = {
  tags: ["foods"],
  description: "Remove image from a food item",
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

export const deleteFoodSchema = {
  tags: ["foods"],
  description: "Delete food by id",
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } }
  },
  response: {
    204: {
      description: "Food deleted successfully",
      type: "null"
    },
    404: {
      type: "object",
      properties: { error: { type: "string" } }
    }
  }
};