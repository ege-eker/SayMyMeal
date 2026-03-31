import { FastifyInstance } from 'fastify';
import { RegisterInput, LoginInput, UpdateAllergenProfileInput } from './auth.types';

export const authService = (app: FastifyInstance) => ({
  async register(data: RegisterInput) {
    const existing = await app.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw { statusCode: 400, message: 'Email already registered' };
    }

    // Check for WhatsAppProfile merge: if phone matches, migrate allergen data
    let migratedAllergens: string[] = [];
    let migratedDietaryPreferences: string[] = [];
    let migratedAllergenAsked = false;

    if (data.phone) {
      const wpProfile = await app.prisma.whatsAppProfile.findUnique({ where: { phone: data.phone } });
      if (wpProfile) {
        migratedAllergens = wpProfile.allergens;
        migratedDietaryPreferences = wpProfile.dietaryPreferences;
        migratedAllergenAsked = wpProfile.allergenAsked;
        await app.prisma.whatsAppProfile.delete({ where: { id: wpProfile.id } });
      }
    }

    const passwordHash = await Bun.password.hash(data.password);
    const user = await app.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        phone: data.phone,
        role: data.role || 'CUSTOMER',
        allergens: migratedAllergens,
        dietaryPreferences: migratedDietaryPreferences,
        allergenAsked: migratedAllergenAsked,
      },
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
    const user = await app.prisma.user.findFirst({ where: { phone } });
    if (user) {
      return { allergens: user.allergens, dietaryPreferences: user.dietaryPreferences, allergenAsked: user.allergenAsked };
    }
    const wp = await app.prisma.whatsAppProfile.findUnique({ where: { phone } });
    if (wp) {
      return { allergens: wp.allergens, dietaryPreferences: wp.dietaryPreferences, allergenAsked: wp.allergenAsked };
    }
    return { allergens: [], dietaryPreferences: [], allergenAsked: false };
  },

  async updateAllergenProfileByPhone(phone: string, data: UpdateAllergenProfileInput) {
    const user = await app.prisma.user.findFirst({ where: { phone } });
    if (user) {
      return app.prisma.user.update({
        where: { id: user.id },
        data: { allergens: data.allergens, dietaryPreferences: data.dietaryPreferences, allergenAsked: true },
        select: { allergens: true, dietaryPreferences: true, allergenAsked: true },
      });
    }
    return app.prisma.whatsAppProfile.upsert({
      where: { phone },
      create: { phone, allergens: data.allergens, dietaryPreferences: data.dietaryPreferences, allergenAsked: true },
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
