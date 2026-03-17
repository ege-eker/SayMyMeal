import { FastifyInstance } from 'fastify';
import { RegisterInput, LoginInput } from './auth.types';

export const authService = (app: FastifyInstance) => ({
  async register(data: RegisterInput) {
    const existing = await app.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw { statusCode: 400, message: 'Email already registered' };
    }

    const passwordHash = await Bun.password.hash(data.password);
    const user = await app.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        phone: data.phone,
        role: data.role || 'CUSTOMER',
      },
    });

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
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
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  },

  async me(userId: string) {
    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    });
    if (!user) throw { statusCode: 401, message: 'User not found' };
    return user;
  },
});
