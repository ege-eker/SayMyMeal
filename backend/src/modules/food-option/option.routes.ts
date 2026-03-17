import { FastifyInstance } from "fastify";
import { optionController } from "./option.controller";
import { createOptionSchema, addChoiceSchema, getOptionsByFoodSchema, deleteOptionSchema, deleteChoiceSchema } from "./option.schema";
import { requireRole } from "../../middleware/auth";

async function optionRoutes(app: FastifyInstance) {
  const ctrl = optionController(app);
  const ownerAuth = requireRole('OWNER');

  // Public read
  app.get("/foods/:foodId/options", { schema: getOptionsByFoodSchema }, ctrl.getOptionsByFood);

  // Owner-only writes
  app.post("/foods/options", { schema: createOptionSchema, preHandler: [ownerAuth] }, ctrl.createOption as any);
  app.post("/foods/options/choice", { schema: addChoiceSchema, preHandler: [ownerAuth] }, ctrl.addChoice as any);
  app.delete("/foods/options/:id", { schema: deleteOptionSchema, preHandler: [ownerAuth] }, ctrl.removeOption as any);
  app.delete("/foods/options/choice/:id", { schema: deleteChoiceSchema, preHandler: [ownerAuth] }, ctrl.removeChoice as any);
}

export default optionRoutes;
