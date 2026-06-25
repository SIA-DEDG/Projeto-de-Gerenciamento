import { prisma } from '../../lib/prisma';
import type { Task, TaskCoResponsible, Project } from '@prisma/client';

type UserWithDir = { name: string; directoriaId: string | null; directoria: { name: string } | null };
type TaskWithRelations = Task & {
  responsible: UserWithDir | null;
  project: Pick<Project, 'name'> | null;
  coResponsibles: (TaskCoResponsible & { user: UserWithDir })[];
};

const include = {
  responsible: { select: { name: true, directoriaId: true, directoria: { select: { name: true } } } },
  project: { select: { name: true } },
  coResponsibles: { include: { user: { select: { name: true, directoriaId: true, directoria: { select: { name: true } } } } } },
} as const;

function fmt(t: TaskWithRelations) {
  const { coResponsibles, project, responsible, ...rest } = t;
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
  };
}

export const listTasks = (directoriaId: string) =>
  prisma.task.findMany({ where: { archived: false, directoriaId }, include, orderBy: { createdAt: 'desc' } })
    .then((ts) => ts.map((t) => fmt(t as TaskWithRelations)));

export const listArchivedTasks = (directoriaId: string) =>
  prisma.task.findMany({ where: { archived: true, directoriaId }, include, orderBy: { createdAt: 'desc' } })
    .then((ts) => ts.map((t) => fmt(t as TaskWithRelations)));

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
