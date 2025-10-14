import { z } from "zod";

export const createOrderSchema = z.object({
  customer: z
    .string()
    .min(1, "Customer name is required"),

  phone: z
    .string()
    .min(5, "Phone number must be at least 5 characters long"),

  restaurantId: z
    .string()
    .uuid("Restaurant ID must be a valid UUID"),

  address: z.object({
    houseNumber: z.string().min(1, "House number is required"),
    street: z.string().min(1, "Street is required"),
    city: z.string().min(1, "City is required"),
    postcode: z.string().min(1, "Postcode is required"),
    country: z.string().default("UK"),
  }),

  items: z
    .array(
      z.object({
        foodId: z.string().uuid("Food ID must be a valid UUID"),
        quantity: z
          .number()
          .int()
          .min(1, "Quantity must be at least 1"),
        selectedOptions: z
          .array(
            z.object({
              optionId: z
                .string()
                .uuid("Option ID must be a valid UUID"),
              choiceId: z
                .string()
                .uuid("Choice ID must be a valid UUID"),
              optionTitle: z.string().optional(),
              choiceLabel: z.string().optional(),
              extraPrice: z.number().default(0),
            })
          )
          .optional(),
      })
    )
    .min(1, "At least one order item is required"),
});