import { FastifyInstance } from 'fastify';
import { CreateAddressInput, UpdateAddressInput } from './address.types';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';

const UK_POSTCODE = /^[A-Z]{1,2}[0-9][0-9A-Z]? [0-9][A-Z]{2}$/;

function normalizePostcode(raw: string): string {
  const clean = raw.replace(/\s+/g, '').toUpperCase();
  const normalized = clean.slice(0, -3) + ' ' + clean.slice(-3);
  if (!UK_POSTCODE.test(normalized)) {
    throw new BadRequestError('Invalid postcode format (expected e.g. SW1A 2BC or M1 1AE).');
  }
  return normalized;
}

export const addressService = (app: FastifyInstance) => ({
  async findByUser(userId: string) {
    return app.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  },

  async create(userId: string, data: CreateAddressInput) {
    if (data.isDefault) {
      await app.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const isFirst = (await app.prisma.address.count({ where: { userId } })) === 0;

    return app.prisma.address.create({
      data: {
        userId,
        label: data.label,
        houseNumber: data.houseNumber,
        street: data.street,
        city: data.city,
        postcode: normalizePostcode(data.postcode),
        notes: data.notes ?? null,
        isDefault: data.isDefault ?? isFirst,
      },
    });
  },

  async update(userId: string, id: string, data: UpdateAddressInput) {
    const addr = await app.prisma.address.findUnique({ where: { id } });
    if (!addr) throw new NotFoundError('Address not found');
    if (addr.userId !== userId) throw new ForbiddenError('Not your address');

    if (data.isDefault) {
      await app.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return app.prisma.address.update({
      where: { id },
      data,
    });
  },

  async delete(userId: string, id: string) {
    const addr = await app.prisma.address.findUnique({ where: { id } });
    if (!addr) throw new NotFoundError('Address not found');
    if (addr.userId !== userId) throw new ForbiddenError('Not your address');
    await app.prisma.address.delete({ where: { id } });
  },
});
