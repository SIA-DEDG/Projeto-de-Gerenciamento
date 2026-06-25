import { prisma } from './prisma';

export async function logAction(
  userId: string,
  username: string,
  action: string,
  entityType: string,
  entityId: string,
  details = '',
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { userId, userName: username, action, entityType, entityId, details },
    });
  } catch {
    // Logging nunca deve derrubar a requisição
  }
}
