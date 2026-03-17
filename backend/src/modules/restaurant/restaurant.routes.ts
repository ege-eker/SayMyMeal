import { FastifyInstance } from "fastify";
import { restaurantController } from "./restaurant.controller";
import {
    createRestaurantSchema,
    getRestaurantsSchema,
    getRestaurantByIdSchema,
    getRestaurantBySlugSchema,
    getMyRestaurantsSchema,
    updateRestaurantSchema,
    deleteRestaurantSchema,
    activateRestaurantSchema
} from "./restaurant.schema";
import { authenticate, requireRole } from "../../middleware/auth";

async function restaurantRoutes(app: FastifyInstance) {
    const ctrl = restaurantController(app);
    const ownerAuth = requireRole('OWNER');

    // Public routes
    app.get("/restaurants", { schema: getRestaurantsSchema }, ctrl.getAll);
    app.get("/restaurants/by-slug/:slug", { schema: getRestaurantBySlugSchema }, ctrl.getBySlug);
    app.get("/restaurants/:id", { schema: getRestaurantByIdSchema }, ctrl.getById);

    // Owner-only routes
    app.get("/restaurants/my", { schema: getMyRestaurantsSchema, preHandler: [ownerAuth] }, ctrl.getMyRestaurants);
    app.post("/restaurants", { schema: createRestaurantSchema, preHandler: [ownerAuth] }, ctrl.create as any);
    app.put("/restaurants/:id", { schema: updateRestaurantSchema, preHandler: [ownerAuth] }, ctrl.update as any);
    app.post("/restaurants/:id/activate", { schema: activateRestaurantSchema, preHandler: [ownerAuth] }, ctrl.activate as any);
    app.delete("/restaurants/:id", { schema: deleteRestaurantSchema, preHandler: [ownerAuth] }, ctrl.remove as any);
}

export default restaurantRoutes;
