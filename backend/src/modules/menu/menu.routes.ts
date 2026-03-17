import { FastifyInstance } from "fastify";
import { menuController } from "./menu.controller";
import {
  createMenuSchema,
  getMenusSchema,
  getMenuByIdSchema,
  updateMenuSchema,
  deleteMenuSchema
} from "./menu.schema";
import { requireRole } from "../../middleware/auth";

async function menuRoutes(app: FastifyInstance) {
  const ctrl = menuController(app);
  const ownerAuth = requireRole('OWNER');

  // Public reads
  app.get("/menus", { schema: getMenusSchema }, ctrl.getAll);
  app.get("/menus/:id", { schema: getMenuByIdSchema }, ctrl.getById);

  // Owner-only writes
  app.post("/menus", { schema: createMenuSchema, preHandler: [ownerAuth] }, ctrl.create as any);
  app.put("/menus/:id", { schema: updateMenuSchema, preHandler: [ownerAuth] }, ctrl.update as any);
  app.delete("/menus/:id", { schema: deleteMenuSchema, preHandler: [ownerAuth] }, ctrl.remove as any);
}

export default menuRoutes;
