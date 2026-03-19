import { FastifyInstance } from 'fastify';
import { orderController } from './order.controller';
import {
    createOrderSchema,
    getOrdersSchema,
    getOrderByIdSchema,
    updateOrderStatusSchema,
    getOrderStatusSchema,
    getMyOrdersSchema,
    acknowledgeOrderSchema,
} from "./order.schema";
import { authenticate, optionalAuth, requireRole } from '../../middleware/auth';

async function orderRoutes(app: FastifyInstance) {
    const ctrl = orderController(app);
    const ownerAuth = requireRole('OWNER');

    // optionalAuth: if token present, attach userId; otherwise voice/WhatsApp works as before
    app.post("/orders", { schema: createOrderSchema, preHandler: [optionalAuth] }, ctrl.create as any);

    // Customer: my orders
    app.get("/orders/my", { schema: getMyOrdersSchema, preHandler: [authenticate] }, ctrl.getMyOrders);

    // Public: order status lookup (voice/WhatsApp)
    app.get("/orders/status", { schema: getOrderStatusSchema }, ctrl.statusLookup);

    // Owner or pollToken: get orders (filtered by restaurantId)
    app.get("/orders", { schema: getOrdersSchema, preHandler: [optionalAuth] }, ctrl.getAll as any);
    app.get("/orders/:id", { schema: getOrderByIdSchema, preHandler: [ownerAuth] }, ctrl.getById as any);
    app.put("/orders/:id/status", { schema: updateOrderStatusSchema, preHandler: [ownerAuth] }, ctrl.updateStatus as any);
    app.post("/orders/:id/acknowledge", { schema: acknowledgeOrderSchema, preHandler: [optionalAuth] }, ctrl.acknowledge as any);
}

export default orderRoutes;
