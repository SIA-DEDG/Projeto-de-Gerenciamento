import argon2 from 'argon2';
import { prisma } from '../../lib/prisma';
import { safeUser } from '../auth/auth.service';

const userInclude = { directoria: { select: { id: true, name: true, color: true } } } as const;

// Super-Admin (directoriaId = null) vê todos; outros veem apenas sua diretoria
export const listUsers = (directoriaId: string | null) =>
  prisma.user.findMany({
    where: directoriaId ? { directoriaId } : undefined,
    include: userInclude,
    orderBy: { name: 'asc' },
  }).then((us) => us.map((u) => safeUser(u)));

// Retorna todos os usuários de todas as diretorias (para seletores cross-diretoria)
export const listAllUsers = () =>
  prisma.user.findMany({
    include: userInclude,
    orderBy: { name: 'asc' },
  }).then((us) => us.map((u) => safeUser(u)));

export const updateName = (id: string, name: string) =>
  prisma.user.update({ where: { id }, data: { name }, include: userInclude }).then((u) => safeUser(u));

export async function deleteUser(id: string, requesterId: string, requesterDirId: string | null) {
  if (id === requesterId) throw Object.assign(new Error('Não pode deletar a si mesmo'), { status: 400 });
  // Verifica que o usuário alvo pertence à mesma diretoria (exceto Super-Admin)
  if (requesterDirId) {
    const target = await prisma.user.findUnique({ where: { id }, select: { directoriaId: true } });
    if (target?.directoriaId !== requesterDirId) {
      throw Object.assign(new Error('Sem permissão para deletar usuários de outra diretoria'), { status: 403 });
    }
  }
  await prisma.user.delete({ where: { id } });
}

export const updateRole = (id: string, role: string) =>
  prisma.user.update({ where: { id }, data: { role }, include: userInclude }).then((u) => safeUser(u));

export async function adminResetPassword(id: string, newPassword: string, requesterDirId: string | null) {
  // Gerente/Diretor só pode redefinir senha de usuários da sua diretoria
  if (requesterDirId) {
    const target = await prisma.user.findUnique({ where: { id }, select: { directoriaId: true } });
    if (target?.directoriaId !== requesterDirId) {
      throw Object.assign(new Error('Sem permissão para redefinir senha de usuários de outra diretoria'), { status: 403 });
    }
  }
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await argon2.hash(newPassword), mustChangePassword: true },
  });
}
