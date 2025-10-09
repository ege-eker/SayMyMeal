export const tools = [
  {
    type: "function",
    name: "search_restaurants",
    description: "Search Restaurant by name. If not given, return all."
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
    description: "Create food order with user's address (UK format) and menu selections.",
    parameters: {
      type: "object",
      properties: {
        customer: { type: "string", description: "Customer name" },
        phone: { type: "string", description: "Customer phone number" },
        restaurantId: { type: "string", description: "Restaurant ID of chosen restaurant" },
        address: {
          type: "object",
          description: "UK address details",
          required: ["houseNumber", "street", "city", "postcode"],
          properties: {
            houseNumber: { type: "string" },
            street: { type: "string" },
            city: { type: "string" },
            postcode: { type: "string" },
            country: { type: "string", description: "Defaults to 'UK'" }
          }
        },
        items: {
          type: "array",
          description: "List of foods chosen",
          items: {
            type: "object",
            required: ["foodId", "quantity"],
            properties: {
              foodId: { type: "string" },
              quantity: { type: "integer", minimum: 1 }
            }
          }
        }
      },
      required: ["customer", "phone", "restaurantId", "address", "items"]
    }
  },
  {
    type: "function",
    name: "get_order_status",
    description: "Get the current status of an order using phone number or customer name.",
    parameters: {
      type: "object",
      properties: {
        phone: { type: "string", description: "Customer phone number" },
        name:  { type: "string", description: "Customer full name" }
      }
    }
  }
];