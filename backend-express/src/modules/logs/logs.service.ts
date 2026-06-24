import { prisma } from '../../lib/prisma';

export const listLogs = () =>
  prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' } });

export const clearLogs = () => prisma.activityLog.deleteMany();
