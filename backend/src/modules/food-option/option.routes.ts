import { FastifyInstance } from "fastify";
import { optionController } from "./option.controller";
import { createOptionSchema, addChoiceSchema, getOptionsByFoodSchema, deleteOptionSchema } from "./option.schema";

async function optionRoutes(app: FastifyInstance) {
  const ctrl = optionController(app);

  app.post("/foods/options", { schema: createOptionSchema }, ctrl.createOption);
  app.post("/foods/options/choice", { schema: addChoiceSchema }, ctrl.addChoice);
  app.get("/foods/:foodId/options", { schema: getOptionsByFoodSchema }, ctrl.getOptionsByFood);
  app.delete("/foods/options/:id", { schema: deleteOptionSchema }, ctrl.removeOption);
}

export default optionRoutes;