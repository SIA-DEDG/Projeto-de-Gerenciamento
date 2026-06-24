import argon2 from 'argon2';
import { prisma } from '../../lib/prisma';
import type { User } from '@prisma/client';
import { safeUser } from '../auth/auth.service';

export const listUsers = () =>
  prisma.user.findMany({ orderBy: { name: 'asc' } }).then((us) => us.map((u: User) => safeUser(u)));

export const updateName = (id: string, name: string) =>
  prisma.user.update({ where: { id }, data: { name } }).then((u: User) => safeUser(u));

export async function deleteUser(id: string, requesterId: string) {
  if (id === requesterId) throw Object.assign(new Error('NÃ£o pode deletar a si mesmo'), { status: 400 });
  await prisma.user.delete({ where: { id } });
}

export const updateRole = (id: string, role: string) =>
  prisma.user.update({ where: { id }, data: { role } }).then((u: User) => safeUser(u));

export async function adminResetPassword(id: string, newPassword: string) {
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await argon2.hash(newPassword), mustChangePassword: true },
  });
}
