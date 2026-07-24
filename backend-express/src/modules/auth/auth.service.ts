import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { defaultPermissionsForRole, normalizePermissions, type PermissionState } from '../../lib/permissions';

const JWT_EXPIRES = '7d';

function makeToken(user: { id: string; username: string; role: string; directoriaId?: string | null; tokenVersion: number }): string {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role, directoriaId: user.directoriaId ?? null, tokenVersion: user.tokenVersion },
    env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

function tempPassword(): string {
  const uid = crypto.randomUUID().replace(/-/g, '');
  return `Sia${uid.slice(0, 8)}!`;
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
    username: user.username,
    email: user.email ?? null,
    job_title: user.jobTitle ?? null,
    role: user.role,
    permissions: normalizePermissions(user.permissions),
    must_change_password: user.mustChangePassword,
    directoria_id: user.directoriaId ?? null,
    directoria_name: user.directoria?.name ?? null,
    directoria_color: user.directoria?.color ?? null,
  };
}

export async function register(data: {
  username: string;
  name: string;
  email?: string | null;
  jobTitle?: string | null;
  role?: string;
  directoriaId?: string | null;
  permissions?: PermissionState;
}) {
  const exists = await prisma.user.findUnique({ where: { username: data.username } });
  if (exists) throw Object.assign(new Error('Username ja existe'), { status: 409 });

  const temp = tempPassword();
  const hash = await argon2.hash(temp);
  const role = data.role ?? 'Funcionario';

  const user = await prisma.user.create({
    data: {
      username: data.username,
      name: data.name,
      email: data.email?.trim() || null,
      jobTitle: data.jobTitle?.trim() || null,
      passwordHash: hash,
      role,
      permissions: data.permissions ?? defaultPermissionsForRole(role),
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
      permissions: defaultPermissionsForRole('Admin'),
      mustChangePassword: false,
    },
  });
  console.log(`Admin "${env.ADMIN_USERNAME}" criado.`);
}

export function safeUser(u: {
  id: string; name: string; username: string; role: string;
  email?: string | null; jobTitle?: string | null; permissions?: unknown;
  mustChangePassword: boolean; createdAt: Date;
  directoriaId?: string | null;
  directoria?: { id: string; name: string; color: string | null } | null;
}) {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email ?? null,
    job_title: u.jobTitle ?? null,
    role: u.role,
    permissions: normalizePermissions(u.permissions),
    must_change_password: u.mustChangePassword,
    created_at: u.createdAt,
    directoria_id: u.directoriaId ?? null,
    directoria_name: u.directoria?.name ?? null,
    directoria_color: u.directoria?.color ?? null,
  };
}