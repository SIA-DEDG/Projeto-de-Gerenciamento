import { prisma } from '../../lib/prisma';

// Super-Admin vê logs de todas as diretorias; outros veem só da sua
export const listLogs = (directoriaId: string | null) =>
  prisma.activityLog.findMany({
    where: directoriaId ? { directoriaId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

export const clearLogs = (directoriaId: string | null) =>
  prisma.activityLog.deleteMany({
    where: directoriaId ? { directoriaId } : undefined,
  });
