import { FastifyInstance } from 'fastify';
import { orderController } from './order.controller';
import {
    createOrderSchema,
    getOrdersSchema,
    getOrderByIdSchema,
    updateOrderStatusSchema, getOrderStatusSchema
} from "./order.schema";

async function orderRoutes(app: FastifyInstance) {
    const ctrl = orderController(app);

    app.post("/orders", { schema: createOrderSchema }, ctrl.create);
    app.get("/orders", { schema: getOrdersSchema }, ctrl.getAll);
    app.get("/orders/:id", { schema: getOrderByIdSchema }, ctrl.getById);
    app.put("/orders/:id/status", { schema: updateOrderStatusSchema }, ctrl.updateStatus);
    app.get("/orders/status", {schema: getOrderStatusSchema}, ctrl.statusLookup);
}

export default orderRoutes;