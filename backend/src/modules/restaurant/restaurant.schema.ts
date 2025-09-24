export const createRestaurantSchema = {
    tags: ["restaurants"],
    description: "create a new restaurant",
    body: {
        type: "object",
        required: ["name", "address"],
        properties: {
            name: {type: "string", minLength: 2},
            address: {type: "string", minLength: 5},
            rating: {type: "number", minimum: 0, maximum: 5, nullable: true}
        }
    },
    response: {
        201: {
            description: "restaurant created successfully",
            type: "object",
            properties: {
                id: {type: "string"},
                name: {type: "string"},
                address: {type: "string"},
                rating: {type: "number", nullable: true},
                createdAt: {type: "string", format: "date-time"},
                updatedAt: {type: "string", format: "date-time"}
            }
        }
    }
};

export const getRestaurantsSchema = {
    tags: ["restaurants"],
    description: "get all restaurants",
    response: {
        200: {
            description: "list of restaurants",
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: {type: "string"},
                    name: {type: "string"},
                    address: {type: "string"},
                    rating: {type: "number", nullable: true},
                    createdAt: {type: "string", format: "date-time"},
                    updatedAt: {type: "string", format: "date-time"},
                }
            }
        }
    }
};

export const getRestaurantByIdSchema = {
  tags: ["restaurants"],
  description: "get a restaurant by id",
  params: {
    type: "object",
    properties: {
      id: {type: "string"}
    },
    required: ["id"],
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: {type: "string"},
        name: {type: "string"},
        address: {type: "string"},
        rating: {type: "number", nullable: true},
        createdAt: {type: "string", format: "date-time"},
        updatedAt: {type: "string", format: "date-time"},
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
                    updatedAt: { type: "string", format: "date-time" }
                  }
                }
              }
            }
          }
        }
      }
    },
    404: {
      description: "restaurant not found",
      type: "object",
      properties: {
        message: {type: "string"}
      }
    }
  }
};

export const updateRestaurantSchema = {
    tags: ["restaurants"],
    description: "update a restaurant by id",
    params: {
        type: "object",
        properties: {
            id: {type: "string"}
        },
        required: ["id"],
    },
    body: {
        type: "object",
        properties: {
            name: {type: "string", minLength: 2},
            address: {type: "string", minLength: 5},
            rating: {type: "number", minimum: 0, maximum: 5, nullable: true}
        }
    },
    response: {
        200: {
            type: "object",
            properties: {
                id: {type: "string"},
                name: {type: "string"},
                address: {type: "string"},
                rating: {type: "number", nullable: true},
                createdAt: {type: "string", format: "date-time"},
                updatedAt: {type: "string", format: "date-time"},
            }
        },
        404: {
            type: "object",
            properties: {
                error: {type: "string"}
            }
        }
    }
};

export const deleteRestaurantSchema = {
    tags: ["restaurants"],
    description: "delete a restaurant by id",
    params: {
        type: "object",
        properties: {
            id: {type: "string"}
        },
        required: ["id"],
    },
    response: {
        204: {
            description: "restaurant deleted successfully",
            type: "null"
        },
        404: {
            description: "restaurant not found",
            type: "object",
            properties: {
                error: {type: "string"}
            }
        }
    }
};