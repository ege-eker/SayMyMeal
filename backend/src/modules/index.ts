import { FastifyInstance } from "fastify";
import authRoutes from "./auth/auth.routes";
import restaurantRoutes from "./restaurant/restaurant.routes";
import menuRoutes from "./menu/menu.routes";
import foodRoutes from "./food/food.routes";
import orderRoutes from "./order/order.routes";
import optionRoutes from "./food-option/option.routes";

import whatsappRoutes from "./whatsapp/whatsapp.routes";
import blacklistRoutes from "./blacklist/blacklist.routes";
import voiceRoutes from "./voice/voice.routes";

async function registerRoutes(app: FastifyInstance) {
  app.register(authRoutes);
  app.register(restaurantRoutes);
  app.register(menuRoutes);
  app.register(foodRoutes);
  app.register(orderRoutes);
  app.register(optionRoutes);

  app.register(whatsappRoutes);
  app.register(blacklistRoutes);
  app.register(voiceRoutes);
}

export default registerRoutes;