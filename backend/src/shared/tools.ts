import { ChatCompletionTool } from "openai/resources/chat/completions";

export const tools: ChatCompletionTool[] = [
  // {
  //   type: "function",
  //   function: {
  //     name: "search_restaurants",
  //     description: "Search for available restaurants based on location, name, or cuisine type.",
  //     parameters: {
  //       type: "object",
  //       properties: {
  //         name: { type: "string", description: "Restaurant name or query" },
  //       },
  //     },
  //   },
  // },
  {
    type: "function",
    function: {
      name: "get_menus",
      description: "Retrieve all available menus for a specific restaurant.",
      parameters: {
        type: "object",
        properties: {
          restaurantId: {
            type: "string",
            description: "UUID of the restaurant whose menus should be fetched.",
          },
        },
        required: ["restaurantId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_foods",
      description: "Get all food items listed under a specific menu.",
      parameters: {
        type: "object",
        properties: {
          menuId: {
            type: "string",
            description:
              "Unique identifier of the menu from which to retrieve foods.",
          },
        },
        required: ["menuId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_food_options",
      description:
        "Retrieve available customization options (e.g., size, extra toppings) for a given food item.",
      parameters: {
        type: "object",
        properties: {
          foodId: {
            type: "string",
            description:
              "Unique identifier of the food item for which to get option details.",
          },
        },
        required: ["foodId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "confirm_item",
      description:
        "Confirm and add a food item with its selected options to the order cart. Call this after the customer has answered ALL option groups for a food item and confirmed the selection. Do NOT call create_order until all desired items have been confirmed with this tool.",
      parameters: {
        type: "object",
        required: ["restaurantId", "foodId", "quantity"],
        properties: {
          restaurantId: {
            type: "string",
            description: "Unique identifier of the restaurant.",
          },
          foodId: {
            type: "string",
            description: "Unique identifier of the food item being added.",
          },
          quantity: {
            type: "integer",
            minimum: 1,
            description: "Quantity of this food item.",
          },
          selectedOptions: {
            type: "array",
            description: "All selected options for this item.",
            items: {
              type: "object",
              required: ["optionId", "choiceId", "choiceLabel", "extraPrice"],
              properties: {
                optionId: { type: "string", description: "Unique ID of the option group." },
                optionTitle: { type: "string", description: "Display title of the option group." },
                choiceId: { type: "string", description: "Unique ID of the chosen option value." },
                choiceLabel: { type: "string", description: "Display label of the chosen option." },
                extraPrice: { type: "number", default: 0, description: "Extra cost for this selection." },
              },
            },
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_order",
      description:
        "Place the final order using all items previously confirmed with confirm_item. Do NOT include items — they are automatically taken from the cart. Only provide customer details and delivery address.",
      parameters: {
        type: "object",
        required: ["customer", "phone", "restaurantId", "address"],
        properties: {
          customer: {
            type: "string",
            minLength: 1,
            description: "Full name of the customer placing the order.",
          },
          phone: {
            type: "string",
            minLength: 5,
            description: "Customer phone number for contact and order tracking.",
          },
          restaurantId: {
            type: "string",
            description: "Unique identifier of the restaurant where the order is placed.",
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
              country: { type: "string", default: "UK", description: "Country name, defaults to UK." },
            },
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_allergen_profile",
      description: "Get a customer's allergen and dietary profile by phone number. Returns allergens, dietary preferences, and whether they have been asked before.",
      parameters: {
        type: "object",
        required: ["phone"],
        properties: {
          phone: {
            type: "string",
            description: "Customer phone number to look up allergen profile.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_allergen_profile",
      description: "Save or update a customer's allergen and dietary preferences by phone number.",
      parameters: {
        type: "object",
        required: ["phone", "allergens", "dietaryPreferences"],
        properties: {
          phone: {
            type: "string",
            description: "Customer phone number.",
          },
          name: {
            type: "string",
            description: "Customer name (optional).",
          },
          allergens: {
            type: "array",
            items: {
              type: "string",
              enum: ["celery","gluten","crustaceans","eggs","fish","lupin","milk","molluscs","mustard","nuts","peanuts","sesame","soybeans","sulphites"],
            },
            description: "List of allergens the customer has. Use empty array if none.",
          },
          dietaryPreferences: {
            type: "array",
            items: {
              type: "string",
              enum: ["halal","kosher","vegetarian","vegan","diet"],
            },
            description: "List of dietary preferences. Use empty array if none.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_food_allergens",
      description: "Check if any foods in an order conflict with the customer's allergen profile.",
      parameters: {
        type: "object",
        required: ["foodIds", "phone"],
        properties: {
          foodIds: {
            type: "array",
            items: { type: "string" },
            description: "List of food item IDs to check.",
          },
          phone: {
            type: "string",
            description: "Customer phone number to look up allergen profile.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_status",
      description:
        "Retrieve the current status of a customer's order using their name or phone number.",
      parameters: {
        type: "object",
        properties: {
          phone: {
            type: "string",
            description:
              "Customer's phone number used for order lookup.",
          },
          name: {
            type: "string",
            description: "Customer's full name used for order lookup.",
          },
        },
      },
    },
  },
];
