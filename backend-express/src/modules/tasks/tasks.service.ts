import { prisma } from '../../lib/prisma';
import type { Task, TaskCoResponsible, Project } from '@prisma/client';

type UserWithDir = { name: string; directoriaId: string | null; directoria: { name: string } | null };
type TaskWithRelations = Task & {
  responsible: UserWithDir | null;
  project: Pick<Project, 'name'> | null;
  coResponsibles: (TaskCoResponsible & { user: UserWithDir })[];
};

export type TaskAttachment =
  | { type: 'file'; name: string; path: string; size: number; mimeType: string }
  | { type: 'link'; name: string; url: string };

const include = {
  responsible: { select: { name: true, directoriaId: true, directoria: { select: { name: true } } } },
  project: { select: { name: true } },
  coResponsibles: { include: { user: { select: { name: true, directoriaId: true, directoria: { select: { name: true } } } } } },
} as const;

function fmt(t: TaskWithRelations) {
  const { coResponsibles, project, responsible, attachments, ...rest } = t;
  const coNames = coResponsibles.map((c) => c.user.name);
  const coIds   = coResponsibles.map((c) => c.userId);
  const coDiretorias = coResponsibles.map((c) => c.user.directoria?.name ?? null);
  return {
    ...rest,
    responsible: responsible?.name ?? null,
    project_name: project?.name ?? null,
    co_responsibles:    coNames.length > 0 ? JSON.stringify(coNames) : null,
    co_responsible_ids: coIds.length  > 0 ? JSON.stringify(coIds)  : null,
    co_responsible_diretorias: coDiretorias.length > 0 ? JSON.stringify(coDiretorias) : null,
    attachments: attachments ? (JSON.parse(attachments) as TaskAttachment[]) : [],
  };
}

async function isGabineteDir(directoriaId: string): Promise<boolean> {
  const dir = await prisma.directoria.findUnique({ where: { id: directoriaId }, select: { slug: true, name: true } });
  return dir?.slug === 'gabinete' || dir?.name?.toLowerCase() === 'gabinete';
}

// Auto-arquivamento: tarefas "Concluído" há mais de 2 dias
async function autoArchiveDoneTasks(directoriaId: string | null, globalViewer = false) {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  await prisma.task.updateMany({
    where: {
      archived: false,
      status: 'Concluído',
      updatedAt: { lt: twoDaysAgo },
      ...(!globalViewer && directoriaId ? { directoriaId } : {}),
    },
    data: { archived: true },
  });
}

export const listTasks = async (directoriaId: string | null) => {
  const globalViewer = !directoriaId;
  await autoArchiveDoneTasks(directoriaId, globalViewer);
  const where = { archived: false, ...(!globalViewer && directoriaId ? { directoriaId } : {}) };
  return prisma.task.findMany({ where, include, orderBy: { createdAt: 'desc' } })
    .then((ts) => ts.map((t) => fmt(t as TaskWithRelations)));
};

export const listArchivedTasks = async (directoriaId: string | null) => {
  const globalViewer = !directoriaId;
  const where = { archived: true, ...(!globalViewer && directoriaId ? { directoriaId } : {}) };
  return prisma.task.findMany({ where, include, orderBy: { createdAt: 'desc' } })
    .then((ts) => ts.map((t) => fmt(t as TaskWithRelations)));
};

export const getTask = (id: string) =>
  prisma.task.findUniqueOrThrow({ where: { id }, include })
    .then((t) => fmt(t as TaskWithRelations));

export async function createTask(data: {
  category: string; activity: string; status: string; priority?: string;
  responsibleId?: string | null; projectId?: string | null; description?: string | null;
  externalCollaborators?: string | null; deadline?: string | null; coResponsibleIds?: string[] | null;
  directoriaId: string;
}) {
  const { coResponsibleIds, ...rest } = data;
  const ids = coResponsibleIds ?? [];
  const task = await prisma.task.create({
    data: {
      ...rest,
      deadline: rest.deadline ? new Date(rest.deadline) : undefined,
      coResponsibles: { create: ids.map((uid) => ({ userId: uid })) },
    },
    include,
  });
  return fmt(task as TaskWithRelations);
}

export async function updateTask(id: string, data: {
  category?: string; activity?: string; status?: string; priority?: string;
  responsibleId?: string | null; projectId?: string | null; description?: string | null;
  externalCollaborators?: string | null; deadline?: string | null; coResponsibleIds?: string[] | null;
}) {
  const { coResponsibleIds, ...rest } = data;
  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id },
      data: {
        ...rest,
        deadline: rest.deadline !== undefined
          ? (rest.deadline ? new Date(rest.deadline) : null)
          : undefined,
      },
    });
    if (coResponsibleIds !== undefined) {
      await tx.taskCoResponsible.deleteMany({ where: { taskId: id } });
      if (coResponsibleIds && coResponsibleIds.length > 0) {
        await tx.taskCoResponsible.createMany({
          data: coResponsibleIds.map((uid) => ({ taskId: id, userId: uid })),
        });
      }
    }
  });
  return prisma.task.findUniqueOrThrow({ where: { id }, include })
    .then((t) => fmt(t as TaskWithRelations));
}

export const deleteTask = (id: string) => prisma.task.delete({ where: { id } });

export const setArchived = (id: string, archived: boolean) =>
  prisma.task.update({ where: { id }, data: { archived }, include })
    .then((t) => fmt(t as TaskWithRelations));

export async function createBatch(items: Omit<Parameters<typeof createTask>[0], 'directoriaId'>[], directoriaId: string) {
  return Promise.all(items.map(item => createTask({ ...item, directoriaId })));
}

// Anexos
export const getTaskAttachments = async (id: string): Promise<TaskAttachment[]> => {
  const task = await prisma.task.findUniqueOrThrow({ where: { id }, select: { attachments: true } });
  return task.attachments ? (JSON.parse(task.attachments) as TaskAttachment[]) : [];
};

export const addAttachment = async (id: string, attachment: TaskAttachment): Promise<TaskAttachment[]> => {
  const current = await getTaskAttachments(id);
  const updated = [...current, attachment];
  await prisma.task.update({ where: { id }, data: { attachments: JSON.stringify(updated) } });
  return updated;
};

export const removeAttachment = async (id: string, index: number): Promise<TaskAttachment[]> => {
  const current = await getTaskAttachments(id);
  // Se for arquivo no Supabase, deletar do storage
  const removing = current[index];
  if (removing?.type === 'file' && removing.path) {
    const { deleteFile } = await import('../../lib/storage');
    await deleteFile(removing.path).catch(() => null);
  }
  const updated = current.filter((_, i) => i !== index);
  await prisma.task.update({ where: { id }, data: { attachments: JSON.stringify(updated) } });
  return updated;
};

export const getAttachmentSignedUrl = async (id: string, index: number): Promise<string> => {
  const attachments = await getTaskAttachments(id);
  const att = attachments[index];
  if (!att || att.type !== 'file') throw Object.assign(new Error('Anexo não encontrado'), { status: 404 });
  const { getSignedUrl, storageEnabled } = await import('../../lib/storage');
  if (!storageEnabled()) throw Object.assign(new Error('Storage não configurado'), { status: 503 });
  return getSignedUrl(att.path);
};
