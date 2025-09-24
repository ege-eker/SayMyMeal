import { FastifyInstance } from "fastify";
import restaurantRoutes from "./restaurant/restaurant.routes";
import menuRoutes from "./menu/menu.routes";
import foodRoutes from "./food/food.routes";
import orderRoutes from "./order/order.routes";

async function registerRoutes(app: FastifyInstance) {
  app.register(restaurantRoutes);
  app.register(menuRoutes);
  app.register(foodRoutes);
  app.register(orderRoutes);
}

export default registerRoutes;