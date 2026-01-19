import { FastifyInstance } from "fastify";
import { restaurantController } from "./restaurant.controller";
import {
    createRestaurantSchema,
    getRestaurantsSchema,
    getRestaurantByIdSchema,
    updateRestaurantSchema,
    deleteRestaurantSchema,
    activateRestaurantSchema
} from "./restaurant.schema";
async function restaurantRoutes(app: FastifyInstance) {
    const ctrl = restaurantController(app);

    app.post(
      "/restaurants",
      { schema: createRestaurantSchema },
      ctrl.create
    );

    app.get(
      "/restaurants",
      { schema: getRestaurantsSchema },
      ctrl.getAll
    );

    app.get(
      "/restaurants/:id",
      { schema: getRestaurantByIdSchema },
      ctrl.getById
    );

    app.put(
      "/restaurants/:id",
      { schema: updateRestaurantSchema },
      ctrl.update
    );

    app.post(
        "/restaurants/:id/activate",
        { schema: activateRestaurantSchema },
        ctrl.activate
    );

    app.delete(
      "/restaurants/:id",
      { schema: deleteRestaurantSchema },
      ctrl.remove
    );
}

export default restaurantRoutes;