import { FastifyRequest, FastifyReply } from 'fastify';

export interface JwtUser {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'OWNER';
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtUser;
    user: JwtUser;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await request.jwtVerify<JwtUser>();
    request.user = decoded;
  } catch {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

export async function optionalAuth(request: FastifyRequest) {
  try {
    const decoded = await request.jwtVerify<JwtUser>();
    request.user = decoded;
  } catch {
    // No token or invalid token — continue without user
  }
}

export function requireRole(role: 'CUSTOMER' | 'OWNER') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    if (reply.sent) return;
    if (request.user?.role !== role) {
      reply.code(403).send({ error: 'Forbidden' });
    }
  };
}

export async function verifyOwnership(app: any, userId: string, restaurantId: string): Promise<boolean> {
  const restaurant = await app.prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { ownerId: true },
  });
  return restaurant?.ownerId === userId;
}

export async function getRestaurantIdFromMenu(app: any, menuId: string): Promise<string | null> {
  const menu = await app.prisma.menu.findUnique({
    where: { id: menuId },
    select: { restaurantId: true },
  });
  return menu?.restaurantId ?? null;
}

export async function getRestaurantIdFromFood(app: any, foodId: string): Promise<string | null> {
  const food = await app.prisma.food.findUnique({
    where: { id: foodId },
    select: { menu: { select: { restaurantId: true } } },
  });
  return food?.menu?.restaurantId ?? null;
}

export async function getRestaurantIdFromOption(app: any, optionId: string): Promise<string | null> {
  const option = await app.prisma.foodOption.findUnique({
    where: { id: optionId },
    select: { food: { select: { menu: { select: { restaurantId: true } } } } },
  });
  return option?.food?.menu?.restaurantId ?? null;
}
