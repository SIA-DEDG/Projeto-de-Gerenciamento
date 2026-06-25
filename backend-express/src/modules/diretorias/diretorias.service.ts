import { prisma } from '../../lib/prisma';

const include = {
  _count: { select: { members: true } },
} as const;

function fmt(d: Awaited<ReturnType<typeof prisma.directoria.findMany>>[number] & { _count: { members: number } }) {
  return { ...d, member_count: d._count.members };
}

export const listDiretorias = async () => {
  const dirs = await prisma.directoria.findMany({ include, orderBy: { name: 'asc' } });
  return dirs.map(d => fmt(d as typeof d & { _count: { members: number } }));
};

export const getDirectoria = (id: string) =>
  prisma.directoria.findUniqueOrThrow({ where: { id }, include })
    .then(d => fmt(d as typeof d & { _count: { members: number } }));

export const createDirectoria = (data: {
  name: string; slug: string; description?: string | null; color?: string | null;
}) =>
  prisma.directoria.create({ data, include })
    .then(d => fmt(d as typeof d & { _count: { members: number } }));

export const updateDirectoria = (id: string, data: {
  name?: string; description?: string | null; color?: string | null; active?: boolean;
}) =>
  prisma.directoria.update({ where: { id }, data, include })
    .then(d => fmt(d as typeof d & { _count: { members: number } }));

export const toggleActive = (id: string, active: boolean) =>
  prisma.directoria.update({ where: { id }, data: { active }, include })
    .then(d => fmt(d as typeof d & { _count: { members: number } }));

// Move um usuário para outra diretoria (Super-Admin only)
export const moveMember = async (directoriaId: string, userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.role === 'Admin') throw Object.assign(new Error('Super-Admin não pode ser movido para uma diretoria'), { status: 400 });
  return prisma.user.update({ where: { id: userId }, data: { directoriaId } });
};

// Lista membros de uma diretoria específica
export const listMembers = (directoriaId: string) =>
  prisma.user.findMany({
    where: { directoriaId },
    select: { id: true, name: true, username: true, role: true, createdAt: true, mustChangePassword: true, directoriaId: true },
    orderBy: { name: 'asc' },
  });
