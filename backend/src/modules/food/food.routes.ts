import { FastifyInstance } from "fastify";
import { foodController } from "./food.controller";
import {
  createFoodSchema,
  getFoodsSchema,
  getFoodByIdSchema,
  updateFoodSchema,
  deleteFoodSchema
} from "./food.schema";
import { requireRole } from "../../middleware/auth";

async function foodRoutes(app: FastifyInstance) {
  const ctrl = foodController(app);
  const ownerAuth = requireRole('OWNER');

  // Public reads
  app.get("/foods", { schema: getFoodsSchema }, ctrl.getAll);
  app.get("/foods/:id", { schema: getFoodByIdSchema }, ctrl.getById);

  // Owner-only writes
  app.post("/foods", { schema: createFoodSchema, preHandler: [ownerAuth] }, ctrl.create as any);
  app.put("/foods/:id", { schema: updateFoodSchema, preHandler: [ownerAuth] }, ctrl.update as any);
  app.delete("/foods/:id", { schema: deleteFoodSchema, preHandler: [ownerAuth] }, ctrl.remove as any);
}

export default foodRoutes;
