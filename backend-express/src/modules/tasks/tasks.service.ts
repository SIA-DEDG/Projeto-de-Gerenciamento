import { prisma } from '../../lib/prisma';
import type { Task, TaskCoResponsible, Project } from '@prisma/client';

type UserWithDir = { name: string; directoriaId: string | null; directoria: { name: string } | null };
type TaskWithRelations = Task & {
  responsible: UserWithDir | null;
  project: Pick<Project, 'name'> | null;
  coResponsibles: (TaskCoResponsible & { user: UserWithDir })[];
  pins?: { userId: string }[];
};

export type TaskAttachment =
  | { type: 'file'; name: string; path: string; size: number; mimeType: string }
  | { type: 'link'; name: string; url: string };

// Inclui as relações da tarefa. Quando `userId` é passado, traz os pins DAQUELE usuário
// (pin é por usuário), permitindo marcar `pinned` no resultado.
function includeFor(userId?: string) {
  return {
    responsible: { select: { name: true, directoriaId: true, directoria: { select: { name: true } } } },
    project: { select: { name: true } },
    coResponsibles: { include: { user: { select: { name: true, directoriaId: true, directoria: { select: { name: true } } } } } },
    ...(userId ? { pins: { where: { userId }, select: { userId: true } } } : {}),
  } as const;
}

const include = includeFor();

function fmt(t: TaskWithRelations) {
  const { coResponsibles, project, responsible, attachments, pins, ...rest } = t;
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
    pinned: (pins?.length ?? 0) > 0,
  };
}

// Auto-arquivamento: tarefas "Concluído" há mais de N dias, onde N é configurável
// por diretoria (diretorias.auto_archive_days, padrão 2).
async function autoArchiveDoneTasks(directoriaId: string) {
  const dir = await prisma.directoria.findUnique({ where: { id: directoriaId }, select: { autoArchiveDays: true } });
  const days = dir?.autoArchiveDays ?? 2;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  await prisma.task.updateMany({
    where: { archived: false, status: 'Concluído', updatedAt: { lt: cutoff }, directoriaId },
    data: { archived: true },
  });
}

// Ordena mantendo as fixadas (pin do usuário) no topo, preservando a ordem por data.
function pinnedFirst<T extends { pinned: boolean }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => Number(b.pinned) - Number(a.pinned));
}

// Além das tarefas da própria diretoria, inclui as COMPARTILHADAS com o usuário em
// outras diretorias (onde ele é responsável ou co-responsável).
const sharedWith = (directoriaId: string, userId: string) => ({
  OR: [
    { directoriaId },
    { responsibleId: userId },
    { coResponsibles: { some: { userId } } },
    // Atividades de projetos compartilhados comigo (sou responsável/owner ou colaborador
    // do projeto) — mesmo que o projeto seja de outra diretoria.
    { project: { OR: [{ ownerId: userId }, { responsibles: { some: { userId } } }] } },
  ],
});

export const listTasks = async (directoriaId: string | null, userId: string) => {
  if (!directoriaId) return [];
  await autoArchiveDoneTasks(directoriaId);
  return prisma.task.findMany({ where: { archived: false, ...sharedWith(directoriaId, userId) }, include: includeFor(userId), orderBy: { createdAt: 'desc' } })
    .then((ts) => pinnedFirst(ts.map((t) => fmt(t as TaskWithRelations))));
};

export const listArchivedTasks = async (directoriaId: string | null, userId: string) => {
  if (!directoriaId) return [];
  return prisma.task.findMany({ where: { archived: true, ...sharedWith(directoriaId, userId) }, include: includeFor(userId), orderBy: { createdAt: 'desc' } })
    .then((ts) => ts.map((t) => fmt(t as TaskWithRelations)));
};

export const getTask = (id: string, userId?: string) =>
  prisma.task.findUniqueOrThrow({ where: { id }, include: includeFor(userId) })
    .then((t) => fmt(t as TaskWithRelations));

// ── Pin por usuário ─────────────────────────────────────────────────────────
export const pinTask = (taskId: string, userId: string) =>
  prisma.taskPin.upsert({ where: { taskId_userId: { taskId, userId } }, create: { taskId, userId }, update: {} })
    .then(() => getTask(taskId, userId));

export const unpinTask = (taskId: string, userId: string) =>
  prisma.taskPin.deleteMany({ where: { taskId, userId } }).then(() => getTask(taskId, userId));

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
}, userId?: string) {
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
  // Reinclui os pins DAQUELE usuário para não zerar o `pinned` no retorno do update.
  return prisma.task.findUniqueOrThrow({ where: { id }, include: includeFor(userId) })
    .then((t) => fmt(t as TaskWithRelations));
}

export const deleteTask = async (id: string) => {
  const task = await prisma.task.findUnique({ where: { id }, select: { directoriaId: true } });
  const result = await prisma.task.delete({ where: { id } });
  // Limpa os anexos do storage (evita órfãos).
  const { deleteFolder } = await import('../../lib/storage');
  if (task) await deleteFolder(`diretorias/${task.directoriaId}/tasks/${id}`);
  return result;
};

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
  // Passa o nome original (salvo no banco) para o download vir com o nome certo,
  // e não com o timestamp usado como chave no storage.
  return getSignedUrl(att.path, undefined, att.name);
};
