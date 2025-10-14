export const tools = [
  // {
  //   type: "function",
  //   name: "search_restaurants",
  //   description: "Search for available restaurants based on location, name, or cuisine type."
  // },
  {
    type: "function",
    name: "get_menus",
    description: "Retrieve all available menus for a specific restaurant.",
    parameters: {
      type: "object",
      properties: {
        restaurantId: {
          type: "string",
          description: "UUID of the restaurant whose menus should be fetched."
        }
      },
      required: ["restaurantId"]
    }
  },
  {
    type: "function",
    name: "get_foods",
    description: "Get all food items listed under a specific menu.",
    parameters: {
      type: "object",
      properties: {
        menuId: {
          type: "string",
          description: "Unique identifier of the menu from which to retrieve foods."
        }
      },
      required: ["menuId"]
    }
  },
  {
    type: "function",
    name: "get_food_options",
    description: "Retrieve available customization options (e.g., size, extra toppings) for a given food item.",
    parameters: {
      type: "object",
      properties: {
        foodId: {
          type: "string",
          description: "Unique identifier of the food item for which to get option details."
        }
      },
      required: ["foodId"]
    },
  },
  {
  type: "function",
  name: "create_order",
  description: "Create a new customer order for a restaurant, including selected food items and their chosen options.",
  parameters: {
    type: "object",
    required: ["customer", "phone", "restaurantId", "address", "items"],
    properties: {
      customer: {
        type: "string",
        minLength: 1,
        description: "Full name of the customer placing the order."
      },
      phone: {
        type: "string",
        minLength: 5,
        description: "Customer phone number for contact and order tracking."
      },
      restaurantId: {
        type: "string",
        description: "Unique identifier of the restaurant where the order is placed."
      },
      address: {
        type: "object",
        description: "UK delivery address for the order.",
        required: ["houseNumber", "street", "city", "postcode"],
        properties: {
          houseNumber: { type: "string", description: "House or building number." },
          street: { type: "string", description: "Street name." },
          city: { type: "string", description: "City name." },
          postcode: { type: "string", description: "Postal code (postcode) for UK addresses." },
          country: { type: "string", default: "UK", description: "Country name, defaults to UK." }
        }
      },
      items: {
        type: "array",
        minItems: 1,
        description: "List of ordered food items, each with quantity and optional selected options.",
        items: {
          type: "object",
          required: ["foodId", "quantity"],
          properties: {
            foodId: {
              type: "string",
              description: "Unique identifier of the ordered food item."
            },
            quantity: {
              type: "integer",
              minimum: 1,
              description: "Quantity of the food item being ordered."
            },
            selectedOptions: {
              type: "array",
              description: "List of selected options for this item (e.g., size or extras).",
              items: {
                type: "object",
                required: ["optionId", "choiceId"],
                properties: {
                  optionId: { type: "string", description: "Unique ID of the option group (e.g. 'size')." },
                  optionTitle: { type: "string", description: "Display title of the option group." },
                  choiceId: { type: "string", description: "Unique ID of the chosen option value." },
                  choiceLabel: { type: "string", description: "Display label of the chosen option value." },
                  extraPrice: { type: "number", default: 0, description: "Any additional cost for this selection." }
                }
              }
            }
          }
        }
      }
    }
  }
  },
  {
    type: "function",
    name: "get_order_status",
    description: "Retrieve the current status of a customer's order using their name or phone number.",
    parameters: {
      type: "object",
      properties: {
        phone: {
          type: "string",
          description: "Customer's phone number used for order lookup."
        },
        name:  {
          type: "string",
          description: "Customer's full name used for order lookup."
        }
      }
    }
  }
];