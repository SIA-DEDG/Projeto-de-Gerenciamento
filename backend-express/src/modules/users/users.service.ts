import argon2 from 'argon2';
import { prisma } from '../../lib/prisma';
import { safeUser } from '../auth/auth.service';
import { isValidRole } from '../../lib/roles';
import { canAssignAccessRole, canManageTargetRole, permissionsForRequester, type PermissionState } from '../../lib/permissions';
import { permissionsForRole } from '../permissions/permissions.service';

const userInclude = { directoria: { select: { id: true, name: true, color: true } } } as const;

type Requester = { id: string; role: string; directoriaId: string | null };

export const listUsers = (directoriaId: string | null) =>
  prisma.user.findMany({
    where: directoriaId ? { directoriaId } : undefined,
    include: userInclude,
    orderBy: { name: 'asc' },
  }).then((us) => us.map((u) => safeUser(u)));

export const listAllUsers = () =>
  prisma.user.findMany({
    include: userInclude,
    orderBy: { name: 'asc' },
  }).then((us) => us.map((u) => safeUser(u)));

export const updateName = (id: string, name: string) =>
  prisma.user.update({ where: { id }, data: { name }, include: userInclude }).then((u) => safeUser(u));

async function getTargetForManagement(id: string, requester: Requester) {
  if (id === requester.id) throw Object.assign(new Error('Nao pode alterar a propria autorizacao'), { status: 400 });
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, directoriaId: true } });
  if (!target) throw Object.assign(new Error('Usuario nao encontrado'), { status: 404 });
  if (!canManageTargetRole(requester, target)) {
    throw Object.assign(new Error('Sem permissao para gerenciar esse usuario'), { status: 403 });
  }
  return target;
}

export async function deleteUser(id: string, requester: Requester) {
  await getTargetForManagement(id, requester);
  await prisma.user.delete({ where: { id } });
}

export async function updateRole(id: string, role: string, requester: Requester) {
  if (!isValidRole(role)) throw Object.assign(new Error('Role invalida'), { status: 400 });
  await getTargetForManagement(id, requester);
  if (!canAssignAccessRole(requester, role)) {
    throw Object.assign(new Error('Sem permissao para atribuir esse perfil'), { status: 403 });
  }
  const permissions = await permissionsForRole(role);
  return prisma.user.update({
    where: { id },
    data: { role, permissions, tokenVersion: { increment: 1 } },
    include: userInclude,
  }).then((u) => safeUser(u));
}

export async function updateAccess(
  id: string,
  data: { name?: string; email?: string | null; jobTitle?: string | null; directoriaId?: string | null; role: string; permissions: PermissionState },
  requester: Requester,
) {
  if (!isValidRole(data.role)) throw Object.assign(new Error('Role invalida'), { status: 400 });
  const target = await getTargetForManagement(id, requester);
  const requesterIsSuperAdmin = requester.role === 'Admin' && requester.directoriaId === null;
  const nextDirectoriaId = requesterIsSuperAdmin && data.directoriaId !== undefined
    ? data.directoriaId
    : target.directoriaId;
  if (data.role !== 'Admin' && !nextDirectoriaId) {
    throw Object.assign(new Error('Selecione uma diretoria para esse perfil'), { status: 400 });
  }
  if (!canAssignAccessRole(requester, data.role)) {
    throw Object.assign(new Error('Sem permissao para atribuir esse perfil'), { status: 403 });
  }
  const roleBaseline = await permissionsForRole(data.role);
  const permissions = permissionsForRequester(requester.role, data.permissions, roleBaseline);

  return prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      email: data.email?.trim() || null,
      jobTitle: data.jobTitle?.trim() || null,
      directoriaId: nextDirectoriaId,
      role: data.role,
      permissions,
      tokenVersion: { increment: 1 },
    },
    include: userInclude,
  }).then((u) => safeUser(u));
}

export async function adminResetPassword(id: string, newPassword: string, requester: Requester) {
  await getTargetForManagement(id, requester);
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: await argon2.hash(newPassword),
      mustChangePassword: true,
      tokenVersion: { increment: 1 },
    },
  });
}