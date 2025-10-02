export const tools = [
  {
    type: "function",
    name: "search_restaurants",
    description: "Search Restaurant By name, if name not given return all restaurants.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" }
      }
    }
  },
  {
    type: "function",
    name: "get_menu",
    description: "Return menu of given restaurant id.",
    parameters: {
      type: "object",
      properties: {
        restaurantId: { type: "string" }
      },
      required: ["restaurantId"]
    }
  },
  {
    type: "function",
    name: "create_order",
    description: "Create order with users requests.",
    parameters: {
      type: "object",
      properties: {
        customer: { type: "string" },
        address: { type: "string" },
        restaurantId: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              foodId: { type: "string" },
              quantity: { type: "integer" }
            },
            required: ["foodId", "quantity"]
          }
        }
      },
      required: ["customer", "address", "restaurantId", "items"]
    }
  }
];