// JSON schema definitions for Fastify Swagger validation

export const createOptionSchema = {
  tags: ["foods", "options"],
  description: "Create a new option group for a food (e.g. Choose your Side)",
  body: {
    type: "object",
    required: ["foodId", "title"],
    properties: {
      foodId: { type: "string" },
      title: { type: "string", minLength: 2 },
      multiple: { type: "boolean" },
    },
  },
  response: {
    201: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        multiple: { type: "boolean" },
        foodId: { type: "string" },
        choices: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              extraPrice: { type: "number" },
              optionId: { type: "string" },
            },
          },
        },
      },
    },
  },
};

export const addChoiceSchema = {
  tags: ["foods", "options"],
  description: "Add a choice under a specific option group",
  body: {
    type: "object",
    required: ["optionId", "label"],
    properties: {
      optionId: { type: "string" },
      label: { type: "string", minLength: 1 },
      extraPrice: { type: "number", default: 0 },
    },
  },
  response: {
    201: {
      type: "object",
      properties: {
        id: { type: "string" },
        label: { type: "string" },
        extraPrice: { type: "number" },
        optionId: { type: "string" },
      },
    },
  },
};

export const getOptionsByFoodSchema = {
  tags: ["foods", "options"],
  description: "List all options and choices for a specific food",
  params: {
    type: "object",
    required: ["foodId"],
    properties: {
      foodId: { type: "string" },
    },
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          multiple: { type: "boolean" },
          choices: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                label: { type: "string" },
                extraPrice: { type: "number" },
              },
            },
          },
        },
      },
    },
  },
};

export const deleteOptionSchema = {
  tags: ["foods", "options"],
  description: "Delete a food option by ID",
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } },
  },
  response: {
    204: { type: "null", description: "Option deleted" },
  },
};