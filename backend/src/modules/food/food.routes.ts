import { FastifyInstance } from "fastify";
import { foodController } from "./food.controller";
import {
  createFoodSchema,
  getFoodsSchema,
  getFoodByIdSchema,
  updateFoodSchema,
  deleteFoodSchema
} from "./food.schema";

async function foodRoutes(app: FastifyInstance) {
  const ctrl = foodController(app);

  app.post("/foods", { schema: createFoodSchema }, ctrl.create);

  app.get("/foods", { schema: getFoodsSchema }, ctrl.getAll);

  app.get("/foods/:id", { schema: getFoodByIdSchema }, ctrl.getById);

  app.put("/foods/:id", { schema: updateFoodSchema }, ctrl.update);

  app.delete("/foods/:id", { schema: deleteFoodSchema }, ctrl.remove);
}

export default foodRoutes;