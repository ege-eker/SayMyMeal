export const createMenuSchema = {
  tags: ["menus"],
  description: "Create a new menu for a restaurant",
  body: {
    type: "object",
    required: ["name", "restaurantId"],
    properties: {
      name: { type: "string", minLength: 2 },
      restaurantId: { type: "string" }
    }
  },
  response: {
    201: {
      description: "Menu created",
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        restaurantId: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" }
      }
    }
  }
};

export const getMenusSchema = {
  tags: ["menus"],
  description: "Get all menus",
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          restaurantId: { type: "string" },
          foods: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                basePrice: { type: "number" }
              }
            }
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      }
    }
  }
};


export const getMenuByIdSchema = {
  tags: ["menus"],
  description: "Get menu by id",
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
        restaurantId: { type: "string" },
        foods: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    basePrice: { type: "number" },
                }
            }
        },
      },
    },
    404: {
      type: "object",
      properties: {
        error: { type: "string" }
      }
    }
  }
};

export const updateMenuSchema = {
  tags: ["menus"],
  description: "Update a menu",
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" }
    }
  },
  body: {
    type: "object",
    properties: {
      name: { type: "string" }
    }
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        restaurantId: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" }
      }
    },
    404: {
      type: "object",
      properties: {
        error: { type: "string" }
      }
    }
  }
};

export const deleteMenuSchema = {
  tags: ["menus"],
  description: "Delete menu by id",
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" }
    }
  },
  response: {
    204: {
      description: "Menu deleted successfully",
      type: "null"
    },
    404: {
      type: "object",
      properties: {
        error: { type: "string" }
      }
    }
  }
};