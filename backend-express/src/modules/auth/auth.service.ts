import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';

const JWT_EXPIRES = '7d';

function makeToken(user: { id: string; username: string; role: string; directoriaId?: string | null }): string {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role, directoriaId: user.directoriaId ?? null },
    env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

function tempPassword(): string {
  return crypto.randomBytes(8).toString('hex');
}

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { directoria: { select: { id: true, name: true, color: true } } },
  });
  if (!user) return null;

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) return null;

  return {
    token: makeToken(user),
    user_id: user.id,
    name: user.name,
    role: user.role,
    username: user.username,
    must_change_password: user.mustChangePassword,
    directoria_id: user.directoriaId ?? null,
    directoria_name: user.directoria?.name ?? null,
    directoria_color: user.directoria?.color ?? null,
  };
}

export async function register(data: { username: string; name: string; role?: string; directoriaId?: string | null }) {
  const exists = await prisma.user.findUnique({ where: { username: data.username } });
  if (exists) throw Object.assign(new Error('Username já existe'), { status: 409 });

  const temp = tempPassword();
  const hash = await argon2.hash(temp);

  const user = await prisma.user.create({
    data: {
      username: data.username,
      name: data.name,
      passwordHash: hash,
      role: data.role ?? 'Funcionario',
      mustChangePassword: true,
      directoriaId: data.directoriaId ?? null,
    },
    include: { directoria: { select: { id: true, name: true, color: true } } },
  });

  return { ...safeUser(user), temp_password: temp };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await argon2.verify(user.passwordHash, currentPassword);
  if (!valid) throw Object.assign(new Error('Senha atual incorreta'), { status: 400 });

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await argon2.hash(newPassword), mustChangePassword: false },
  });
}

export async function setInitialPassword(userId: string, newPassword: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await argon2.hash(newPassword), mustChangePassword: false },
  });
}

export async function ensureAdminExists() {
  if (!env.ADMIN_PASSWORD) return;
  const exists = await prisma.user.findUnique({ where: { username: env.ADMIN_USERNAME } });
  if (exists) return;
  const hash = await argon2.hash(env.ADMIN_PASSWORD);
  await prisma.user.create({
    data: {
      username: env.ADMIN_USERNAME,
      name: 'Administrador',
      passwordHash: hash,
      role: 'Admin',
      mustChangePassword: false,
    },
  });
  console.log(`âœ” Admin "${env.ADMIN_USERNAME}" criado.`);
}

export function safeUser(u: {
  id: string; name: string; username: string; role: string;
  mustChangePassword: boolean; createdAt: Date;
  directoriaId?: string | null;
  directoria?: { id: string; name: string; color: string | null } | null;
}) {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    must_change_password: u.mustChangePassword,
    created_at: u.createdAt,
    directoria_id: u.directoriaId ?? null,
    directoria_name: u.directoria?.name ?? null,
    directoria_color: u.directoria?.color ?? null,
  };
}
