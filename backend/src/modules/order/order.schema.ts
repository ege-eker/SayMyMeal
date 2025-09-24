export const createOrderSchema = {
    tags: ['orders'],
    description: "Create a new order",
    body: {
        type: 'object',
        required: ['customer', 'address', 'items'],
        properties: {
            customer: { type: 'string', minLength: 1 },
            address: { type: 'string', minLength: 1 },
            items: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'object',
                    required: ['foodId', 'quantity'],
                    properties: {
                        foodId: { type: 'string', minLength: 1 },
                        quantity: { type: 'integer', minimum: 1 }
                    }
                }
            }
        }
    },
    response: {
        201: {
            description: "Order created successfully",
            type: 'object',
            properties: {
                id: { type: 'string' },
                customer: { type: 'string' },
                address: { type: 'string' },
                status: { type: 'string', enum: ['pending', 'preparing', 'delivering', 'completed', 'canceled'] },
                items: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            foodId: { type: 'string' },
                            quantity: { type: 'integer' }
                        }
                    }
                },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
            }
        }
    }
};

export const getOrdersSchema = {
    tags: ['orders'],
    description: "Get all orders",
    response: {
        200: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    customer: { type: 'string' },
                    address: { type: 'string' },
                    status: { type: 'string'},
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                foodId: { type: 'string' },
                                quantity: { type: 'integer' }
                            }
                        }
                    },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            }
        }
    }
};

export const getOrderByIdSchema = {
    tags: ['orders'],
    description: "Get an order by ID",
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', minLength: 1 }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                customer: { type: 'string' },
                address: { type: 'string' },
                status: { type: 'string'},
                items: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            foodId: { type: 'string' },
                            quantity: { type: 'integer' }
                        }
                    }
                },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
            }
        },
        404: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        }
    }
};

export const updateOrderStatusSchema = {
    tags: ['orders'],
    description: "Update the status of an order",
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', minLength: 1 }
        }
    },
    body: {
        type: 'object',
        required: ['status'],
        properties: {
            status: { type: 'string', enum: ['pending', 'preparing', 'delivering', 'completed', 'canceled'] }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                customer: { type: 'string' },
                address: { type: 'string' },
                status: { type: 'string'},
                items: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            foodId: { type: 'string' },
                            quantity: { type: 'integer' }
                        }
                    }
                },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
            }
        }
    }
};