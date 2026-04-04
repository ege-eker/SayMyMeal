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
    allergenCheckSchema,
    allergenCheckByPhoneSchema,
    getDashboardStatsSchema,
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

    // Allergen check: authenticated user
    app.get("/orders/allergen-check", { schema: allergenCheckSchema, preHandler: [authenticate] }, ctrl.allergenCheck);

    // Allergen check: by phone (WhatsApp/Realtime, no auth)
    app.get("/orders/allergen-check-by-phone", { schema: allergenCheckByPhoneSchema }, ctrl.allergenCheckByPhone);

    // Owner: dashboard stats
    app.get("/orders/dashboard-stats", { schema: getDashboardStatsSchema, preHandler: [ownerAuth] }, ctrl.dashboardStats as any);

    // Owner or pollToken: get orders (filtered by restaurantId)
    app.get("/orders", { schema: getOrdersSchema, preHandler: [optionalAuth] }, ctrl.getAll as any);
    app.get("/orders/:id", { schema: getOrderByIdSchema, preHandler: [ownerAuth] }, ctrl.getById as any);
    app.put("/orders/:id/status", { schema: updateOrderStatusSchema, preHandler: [ownerAuth] }, ctrl.updateStatus as any);
    app.post("/orders/:id/acknowledge", { schema: acknowledgeOrderSchema, preHandler: [optionalAuth] }, ctrl.acknowledge as any);
}

export default orderRoutes;
