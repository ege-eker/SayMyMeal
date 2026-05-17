import { FastifyInstance } from 'fastify';
import { RegisterInput, LoginInput, UpdateAllergenProfileInput } from './auth.types';
import { normalizePhone } from '../../shared/phone';

export const authService = (app: FastifyInstance) => ({
  async register(data: RegisterInput) {
    const existing = await app.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw { statusCode: 400, message: 'Email already registered' };
    }

    const normalizedPhone = data.phone ? normalizePhone(data.phone) : undefined;

    if (normalizedPhone) {
      const phoneConflict = await app.prisma.user.findUnique({ where: { phone: normalizedPhone } });
      if (phoneConflict) {
        throw { statusCode: 400, message: 'Phone number already registered' };
      }
    }

    const wpProfile = normalizedPhone
      ? await app.prisma.whatsAppProfile.findUnique({
          where: { phone: normalizedPhone },
          include: { addresses: true },
        })
      : null;

    const passwordHash = await Bun.password.hash(data.password);

    const user = await app.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          phone: normalizedPhone,
          role: data.role || 'CUSTOMER',
          allergens: wpProfile?.allergens ?? [],
          dietaryPreferences: wpProfile?.dietaryPreferences ?? [],
          allergenAsked: wpProfile?.allergenAsked ?? false,
        },
      });

      if (wpProfile) {
        await tx.address.updateMany({
          where: { whatsappProfileId: wpProfile.id },
          data: { whatsappProfileId: null, userId: created.id },
        });
        await tx.whatsAppProfile.delete({ where: { id: wpProfile.id } });
      }

      return created;
    });

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, allergenAsked: user.allergenAsked },
    };
  },

  async login(data: LoginInput) {
    const user = await app.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw { statusCode: 401, message: 'Invalid email or password' };
    }

    const valid = await Bun.password.verify(data.password, user.passwordHash);
    if (!valid) {
      throw { statusCode: 401, message: 'Invalid email or password' };
    }

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, allergenAsked: user.allergenAsked },
    };
  },

  async me(userId: string) {
    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, phone: true, role: true, createdAt: true,
        allergens: true, dietaryPreferences: true, allergenAsked: true,
      },
    });
    if (!user) throw { statusCode: 401, message: 'User not found' };
    return user;
  },

  async getAllergenProfileByPhone(phone: string) {
    const normalized = normalizePhone(phone);
    const user = await app.prisma.user.findUnique({ where: { phone: normalized } });
    if (user) {
      return { allergens: user.allergens, dietaryPreferences: user.dietaryPreferences, allergenAsked: user.allergenAsked };
    }
    const wp = await app.prisma.whatsAppProfile.findUnique({ where: { phone: normalized } });
    if (wp) {
      return { allergens: wp.allergens, dietaryPreferences: wp.dietaryPreferences, allergenAsked: wp.allergenAsked };
    }
    return { allergens: [], dietaryPreferences: [], allergenAsked: false };
  },

  async updateAllergenProfileByPhone(phone: string, data: UpdateAllergenProfileInput) {
    const normalized = normalizePhone(phone);
    const user = await app.prisma.user.findUnique({ where: { phone: normalized } });
    if (user) {
      return app.prisma.user.update({
        where: { id: user.id },
        data: { allergens: data.allergens, dietaryPreferences: data.dietaryPreferences, allergenAsked: true },
        select: { allergens: true, dietaryPreferences: true, allergenAsked: true },
      });
    }
    return app.prisma.whatsAppProfile.upsert({
      where: { phone: normalized },
      create: { phone: normalized, allergens: data.allergens, dietaryPreferences: data.dietaryPreferences, allergenAsked: true },
      update: { allergens: data.allergens, dietaryPreferences: data.dietaryPreferences, allergenAsked: true },
    });
  },

  async updateAllergenProfile(userId: string, data: UpdateAllergenProfileInput) {
    return app.prisma.user.update({
      where: { id: userId },
      data: {
        allergens: data.allergens,
        dietaryPreferences: data.dietaryPreferences,
        allergenAsked: true,
      },
      select: { allergens: true, dietaryPreferences: true, allergenAsked: true },
    });
  },
});
