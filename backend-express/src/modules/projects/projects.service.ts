import { prisma } from '../../lib/prisma';
import type { Project, User } from '@prisma/client';

type ProjectWithOwner = Project & { owner: Pick<User, 'name'> | null };

const include = { owner: { select: { name: true } } } as const;

function fmt(p: ProjectWithOwner) {
  const { owner, ...rest } = p;
  return { ...rest, owner: owner?.name ?? null };
}

export const listProjects = (directoriaId: string | null) =>
  prisma.project.findMany({ where: directoriaId ? { directoriaId } : {}, include, orderBy: { createdAt: 'desc' } })
    .then((ps) => ps.map((p) => fmt(p as ProjectWithOwner)));

export const getProject = (id: string) =>
  prisma.project.findUniqueOrThrow({ where: { id }, include })
    .then((p) => fmt(p as ProjectWithOwner));

export const createProject = (directoriaId: string, data: {
  name: string; category?: string | null; ownerId?: string | null;
  deadline?: string | null; executiveStatus?: string | null;
  objective?: string | null; scope?: string | null; summary?: string | null;
}) =>
  prisma.project.create({
    data: { ...data, directoriaId, deadline: data.deadline ? new Date(data.deadline) : undefined },
    include,
  }).then((p) => fmt(p as ProjectWithOwner));

export const updateProject = (id: string, data: {
  name: string; category?: string | null; ownerId?: string | null;
  deadline?: string | null; executiveStatus?: string | null;
  objective?: string | null; scope?: string | null; summary?: string | null;
}) =>
  prisma.project.update({
    where: { id },
    data: {
      ...data,
      deadline: data.deadline !== undefined
        ? (data.deadline ? new Date(data.deadline) : null)
        : undefined,
    },
    include,
  }).then((p) => fmt(p as ProjectWithOwner));

export const deleteProject = (id: string) => prisma.project.delete({ where: { id } });
