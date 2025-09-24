import { FastifyInstance } from "fastify";
import { menuController } from "./menu.controller";
import {
  createMenuSchema,
  getMenusSchema,
  getMenuByIdSchema,
  updateMenuSchema,
  deleteMenuSchema
} from "./menu.schema";

async function menuRoutes(app: FastifyInstance) {
  const ctrl = menuController(app);

  app.post("/menus", { schema: createMenuSchema }, ctrl.create);

  app.get("/menus", { schema: getMenusSchema }, ctrl.getAll);

  app.get("/menus/:id", { schema: getMenuByIdSchema }, ctrl.getById);

  app.put("/menus/:id", { schema: updateMenuSchema }, ctrl.update);

  app.delete("/menus/:id", { schema: deleteMenuSchema }, ctrl.remove);
}

export default menuRoutes;