import { FastifyInstance } from "fastify";
import type { User, WhatsAppProfile, Address, Order } from "@prisma/client";
import { normalizePhone } from "./phone";

export type ResolvedCaller =
  | { type: "user"; user: User & { addresses: Address[] }; recentOrders: Order[] }
  | { type: "whatsapp"; profile: WhatsAppProfile & { addresses: Address[] }; recentOrders: Order[] }
  | { type: "new"; phone: string; addresses: never[]; recentOrders: never[] };

export async function resolveCaller(app: FastifyInstance, phone: string): Promise<ResolvedCaller> {
  const normalized = normalizePhone(phone);

  const user = await app.prisma.user.findUnique({
    where: { phone: normalized },
    include: { addresses: true },
  });
  if (user) {
    const recentOrders = await app.prisma.order.findMany({
      where: { userId: user.id },
      take: 5,
      orderBy: { createdAt: "desc" },
    });
    return { type: "user", user, recentOrders };
  }

  const profile = await app.prisma.whatsAppProfile.findUnique({
    where: { phone: normalized },
    include: { addresses: true },
  });
  if (profile) {
    const recentOrders = await app.prisma.order.findMany({
      where: { phone: normalized },
      take: 5,
      orderBy: { createdAt: "desc" },
    });
    return { type: "whatsapp", profile, recentOrders };
  }

  return { type: "new", phone: normalized, addresses: [], recentOrders: [] };
}
