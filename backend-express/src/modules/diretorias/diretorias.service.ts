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

// Exclui uma diretoria permanentemente (incluindo todos os arquivos do bucket)
export const deleteDirectoria = async (id: string) => {
  const memberCount = await prisma.user.count({ where: { directoriaId: id } });
  if (memberCount > 0) {
    throw Object.assign(
      new Error(`Não é possível excluir: a diretoria possui ${memberCount} membro(s). Remova-os antes.`),
      { status: 400 },
    );
  }

  // Remove todos os arquivos do bucket na pasta da diretoria
  const { storageEnabled } = await import('../../lib/storage');
  if (storageEnabled()) {
    await deleteBucketFolder(`diretorias/${id}`);
  }

  return prisma.directoria.delete({ where: { id } });
};

// Apaga recursivamente todos os arquivos de uma pasta no bucket
async function deleteBucketFolder(folderPath: string) {
  const { createClient } = await import('@supabase/supabase-js');
  const { env } = await import('../../config/env');

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return;
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  const BUCKET = 'sia-files';

  // Lista todos os arquivos na pasta (recursivo via prefix)
  const { data: files, error } = await supabase.storage
    .from(BUCKET)
    .list(folderPath, { limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } });

  if (error || !files || files.length === 0) return;

  // Separa arquivos e subpastas
  const fileNames = files.filter(f => f.id).map(f => `${folderPath}/${f.name}`);
  const folders   = files.filter(f => !f.id).map(f => `${folderPath}/${f.name}`);

  // Remove arquivos desta pasta
  if (fileNames.length > 0) {
    await supabase.storage.from(BUCKET).remove(fileNames);
  }

  // Recursão nas subpastas
  for (const sub of folders) {
    await deleteBucketFolder(sub);
  }
}

// Remove o vínculo de diretoria de um usuário (Super-Admin only)
export const removeMember = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.role === 'Admin') throw Object.assign(new Error('Super-Admin não tem diretoria para remover'), { status: 400 });
  return prisma.user.update({ where: { id: userId }, data: { directoriaId: null } });
};

// Lista membros de uma diretoria específica
export const listMembers = (directoriaId: string) =>
  prisma.user.findMany({
    where: { directoriaId },
    select: { id: true, name: true, username: true, role: true, createdAt: true, mustChangePassword: true, directoriaId: true },
    orderBy: { name: 'asc' },
  });
