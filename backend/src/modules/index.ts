import { FastifyInstance } from "fastify";
import restaurantRoutes from "./restaurant/restaurant.routes";
import menuRoutes from "./menu/menu.routes";
import foodRoutes from "./food/food.routes";
import orderRoutes from "./order/order.routes";
import optionRoutes from "./food-option/option.routes";
import openaiRoutes from "./openai/openai.routes";
import whatsappRoutes from "./whatsapp/whatsapp.routes";

async function registerRoutes(app: FastifyInstance) {
  app.register(restaurantRoutes);
  app.register(menuRoutes);
  app.register(foodRoutes);
  app.register(orderRoutes);
  app.register(optionRoutes);
  app.register(openaiRoutes);
  app.register(whatsappRoutes);
}

export default registerRoutes;