import { FastifyInstance } from "fastify";
import { blacklistController } from "./blacklist.controller";
import { requireRole } from "../../middleware/auth";
import {
  addToBlacklistSchema,
  getBlacklistSchema,
  removeFromBlacklistSchema,
} from "./blacklist.schema";

export default async function blacklistRoutes(app: FastifyInstance) {
  const ctrl = blacklistController(app);
  const ownerAuth = requireRole("OWNER");

  app.get(
    "/restaurants/:restaurantId/blacklist",
    { schema: getBlacklistSchema, preHandler: [ownerAuth] },
    ctrl.getByRestaurant as any
  );

  app.post(
    "/restaurants/:restaurantId/blacklist",
    { schema: addToBlacklistSchema, preHandler: [ownerAuth] },
    ctrl.add as any
  );

  app.delete(
    "/blacklist/:id",
    { schema: removeFromBlacklistSchema, preHandler: [ownerAuth] },
    ctrl.remove as any
  );
}
