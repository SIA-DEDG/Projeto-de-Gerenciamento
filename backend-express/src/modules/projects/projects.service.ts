import { prisma } from '../../lib/prisma';
import type { Project, User, ProjectResponsible } from '@prisma/client';

type ProjectWithRelations = Project & {
  owner: Pick<User, 'name' | 'directoriaId'> | null;
  responsibles: (ProjectResponsible & { user: Pick<User, 'name' | 'directoriaId'> })[];
};

// Mesmo formato de anexo usado nas tarefas (arquivo no Supabase Storage ou link).
export type ProjectAttachment =
  | { type: 'file'; name: string; path: string; size: number; mimeType: string }
  | { type: 'link'; name: string; url: string };

const include = {
  owner: { select: { name: true, directoriaId: true } },
  responsibles: { include: { user: { select: { name: true, directoriaId: true } } } },
} as const;

function fmt(p: ProjectWithRelations) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    owner_id: p.ownerId,
    owner: p.owner?.name ?? null,
    deadline: p.deadline ? p.deadline.toISOString().slice(0, 10) : null,
    executive_status: p.executiveStatus,
    objective: p.objective,
    scope: p.scope,
    summary: p.summary,
    responsible_ids: p.responsibles.map((r) => r.userId),
    responsibles: p.responsibles.map((r) => r.user.name),
    // Diretoria (id) do dono e de cada colaborador — o front usa para pré-selecionar, ao
    // reabrir a edição, as diretorias externas já envolvidas no seletor.
    owner_diretoria_id: p.owner?.directoriaId ?? null,
    responsible_diretoria_ids: p.responsibles.map((r) => r.user.directoriaId ?? null),
    attachments: p.attachments ? (JSON.parse(p.attachments) as ProjectAttachment[]) : [],
  };
}

type ProjectData = {
  name: string; category?: string | null;
  deadline?: string | null; executiveStatus?: string | null;
  objective?: string | null; scope?: string | null; summary?: string | null;
};

// Lista os projetos da diretoria do usuário MAIS os compartilhados com ele em outras
// diretorias (onde é responsável/owner ou colaborador). Super-admin (sem diretoria) vê todos.
export const listProjects = (directoriaId: string | null, userId: string) => {
  const where = directoriaId
    ? { OR: [{ directoriaId }, { ownerId: userId }, { responsibles: { some: { userId } } }] }
    : {};
  return prisma.project.findMany({ where, include, orderBy: { createdAt: 'desc' } })
    .then((ps) => ps.map((p) => fmt(p as ProjectWithRelations)));
};

export const getProject = (id: string) =>
  prisma.project.findUniqueOrThrow({ where: { id }, include })
    .then((p) => fmt(p as ProjectWithRelations));

// Membros (owner + responsáveis) e diretoria — usado para checagem de permissão.
export const getProjectMembership = (id: string) =>
  prisma.project.findUniqueOrThrow({
    where: { id },
    select: { ownerId: true, directoriaId: true, responsibles: { select: { userId: true } } },
  }).then((p) => ({
    ownerId: p.ownerId,
    directoriaId: p.directoriaId,
    responsibleIds: p.responsibles.map((r) => r.userId),
  }));

export async function createProject(
  directoriaId: string,
  ownerId: string,
  data: ProjectData,
  responsibleIds?: string[] | null,
) {
  // Por padrão, todos os membros da diretoria entram como responsáveis (o criador
  // remove quem não deve participar). O criador é sempre o dono.
  let ids = responsibleIds ?? undefined;
  if (ids === undefined) {
    const members = await prisma.user.findMany({ where: { directoriaId }, select: { id: true } });
    ids = members.map((m) => m.id);
  }
  const project = await prisma.project.create({
    data: {
      ...data,
      directoriaId,
      ownerId,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      responsibles: { create: ids.map((uid) => ({ userId: uid })) },
    },
    include,
  });
  return fmt(project as ProjectWithRelations);
}

// Atualiza os campos do projeto. Se `responsibleIds` for passado (somente o dono pode),
// substitui a lista de responsáveis.
export async function updateProject(
  id: string,
  data: ProjectData,
  responsibleIds?: string[] | null,
  ownerId?: string | null,
) {
  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id },
      data: {
        ...data,
        // Reatribuição do responsável (owner). Só é tocado quando informado.
        ...(ownerId !== undefined ? { ownerId } : {}),
        deadline: data.deadline !== undefined
          ? (data.deadline ? new Date(data.deadline) : null)
          : undefined,
      },
    });
    if (responsibleIds !== undefined && responsibleIds !== null) {
      await tx.projectResponsible.deleteMany({ where: { projectId: id } });
      if (responsibleIds.length > 0) {
        await tx.projectResponsible.createMany({
          data: responsibleIds.map((uid) => ({ projectId: id, userId: uid })),
        });
      }
    }
  });
  return prisma.project.findUniqueOrThrow({ where: { id }, include })
    .then((p) => fmt(p as ProjectWithRelations));
}

export const deleteProject = async (id: string) => {
  const project = await prisma.project.findUnique({ where: { id }, select: { directoriaId: true } });
  // Tarefas do projeto são apagadas em cascata — capturamos seus ids p/ limpar o storage delas.
  const tasks = await prisma.task.findMany({ where: { projectId: id }, select: { id: true, directoriaId: true } });
  const result = await prisma.project.delete({ where: { id } });
  const { deleteFolder } = await import('../../lib/storage');
  if (project) await deleteFolder(`diretorias/${project.directoriaId}/projects/${id}`);
  for (const t of tasks) await deleteFolder(`diretorias/${t.directoriaId}/tasks/${t.id}`);
  return result;
};

// ── Anexos (mesmo padrão de tasks.service) ──────────────────────────────────────

export const getProjectAttachments = async (id: string): Promise<ProjectAttachment[]> => {
  const project = await prisma.project.findUniqueOrThrow({ where: { id }, select: { attachments: true } });
  return project.attachments ? (JSON.parse(project.attachments) as ProjectAttachment[]) : [];
};

export const addAttachment = async (id: string, attachment: ProjectAttachment): Promise<ProjectAttachment[]> => {
  const current = await getProjectAttachments(id);
  const updated = [...current, attachment];
  await prisma.project.update({ where: { id }, data: { attachments: JSON.stringify(updated) } });
  return updated;
};

export const removeAttachment = async (id: string, index: number): Promise<ProjectAttachment[]> => {
  const current = await getProjectAttachments(id);
  const removing = current[index];
  const updated = current.filter((_, i) => i !== index);
  // Remove a referência no banco PRIMEIRO; só então apaga o arquivo do storage
  // (ver justificativa em tasks.service.removeAttachment).
  await prisma.project.update({ where: { id }, data: { attachments: JSON.stringify(updated) } });
  if (removing?.type === 'file' && removing.path) {
    const { deleteFile } = await import('../../lib/storage');
    await deleteFile(removing.path).catch(() => null);
  }
  return updated;
};

export const getAttachmentSignedUrl = async (id: string, index: number): Promise<string> => {
  const attachments = await getProjectAttachments(id);
  const att = attachments[index];
  if (!att || att.type !== 'file') throw Object.assign(new Error('Anexo não encontrado'), { status: 404 });
  const { getSignedUrl, storageEnabled } = await import('../../lib/storage');
  if (!storageEnabled()) throw Object.assign(new Error('Storage não configurado'), { status: 503 });
  return getSignedUrl(att.path, undefined, att.name);
};
