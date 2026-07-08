import { prisma } from '../../lib/prisma';
import type { Event, EventResponsible, User } from '@prisma/client';

type EventWithResponsibles = Event & {
  responsibles: (EventResponsible & { user: Pick<User, 'name'> })[];
};

// Mesmo formato de anexo usado em tarefas/projetos (arquivo no Storage ou link).
export type EventAttachment =
  | { type: 'file'; name: string; path: string; size: number; mimeType: string }
  | { type: 'link'; name: string; url: string };

const include = {
  responsibles: { include: { user: { select: { name: true } } } },
} as const;

function fmt(e: EventWithResponsibles) {
  const { responsibles, attachments, ...rest } = e;
  return {
    ...rest,
    responsibles: responsibles.map((r) => r.user.name),
    attachments: attachments ? (JSON.parse(attachments) as EventAttachment[]) : [],
  };
}

export const listEvents = (directoriaId: string | null) =>
  prisma.event.findMany({ where: { archived: false, ...(directoriaId ? { directoriaId } : {}) }, include, orderBy: { startDate: 'desc' } })
    .then((es) => es.map((e) => fmt(e as EventWithResponsibles)));

export const createEvent = async (directoriaId: string, data: {
  name: string; eventType: string; attendees?: string | null;
  startDate: string; endDate: string; startTime?: string | null;
  responsibleIds?: string[];
}) => {
  const { responsibleIds = [], ...rest } = data;
  const event = await prisma.event.create({
    data: {
      ...rest,
      directoriaId,
      startDate: new Date(rest.startDate),
      endDate: new Date(rest.endDate),
      responsibles: { create: responsibleIds.map((uid) => ({ userId: uid })) },
    },
    include,
  });
  return fmt(event as EventWithResponsibles);
};

export const updateEvent = async (id: string, data: {
  name: string; eventType: string; attendees?: string | null;
  startDate: string; endDate: string; startTime?: string | null;
  responsibleIds?: string[];
}) => {
  const { responsibleIds, ...rest } = data;
  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id },
      data: { ...rest, startDate: new Date(rest.startDate), endDate: new Date(rest.endDate) },
    });
    if (responsibleIds !== undefined) {
      await tx.eventResponsible.deleteMany({ where: { eventId: id } });
      await tx.eventResponsible.createMany({
        data: responsibleIds.map((uid) => ({ eventId: id, userId: uid })),
      });
    }
  });
  return prisma.event.findUniqueOrThrow({ where: { id }, include })
    .then((e) => fmt(e as EventWithResponsibles));
};

export const deleteEvent = async (id: string) => {
  const event = await prisma.event.findUnique({ where: { id }, select: { directoriaId: true, minutesFilePath: true } });
  const result = await prisma.event.delete({ where: { id } });
  const { deleteFolder, deleteFile } = await import('../../lib/storage');
  if (event) {
    await deleteFolder(`diretorias/${event.directoriaId}/events/${id}`);
    // Cobre atas antigas salvas fora da pasta do evento (diretorias/{dir}/atas/{id}.ext).
    if (event.minutesFilePath && !event.minutesFilePath.startsWith('__base64__')) {
      await deleteFile(event.minutesFilePath).catch(() => null);
    }
  }
  return result;
};

export const getEventById = (id: string) =>
  prisma.event.findUnique({ where: { id }, select: { minutesFilePath: true, minutesFileName: true } });

export const setMinutes = (id: string, minutesFileName: string, minutesFilePath: string) =>
  prisma.event.update({ where: { id }, data: { minutesFileName, minutesFilePath }, include })
    .then((e) => fmt(e as EventWithResponsibles));

export const removeMinutes = async (id: string) => {
  const event = await prisma.event.findUnique({ where: { id }, select: { minutesFilePath: true } });
  // Deleta do Storage se houver path salvo
  if (event?.minutesFilePath) {
    const { deleteFile } = await import('../../lib/storage');
    await deleteFile(event.minutesFilePath);
  }
  return prisma.event.update({ where: { id }, data: { minutesFileName: null, minutesFilePath: null }, include })
    .then((e) => fmt(e as EventWithResponsibles));
};

// ── Anexos (arquivos/links) — mesmo padrão de tasks/projects ────────────────────

export const getEventAttachments = async (id: string): Promise<EventAttachment[]> => {
  const ev = await prisma.event.findUniqueOrThrow({ where: { id }, select: { attachments: true } });
  return ev.attachments ? (JSON.parse(ev.attachments) as EventAttachment[]) : [];
};

export const addAttachment = async (id: string, attachment: EventAttachment): Promise<EventAttachment[]> => {
  const current = await getEventAttachments(id);
  const updated = [...current, attachment];
  await prisma.event.update({ where: { id }, data: { attachments: JSON.stringify(updated) } });
  return updated;
};

export const removeAttachment = async (id: string, index: number): Promise<EventAttachment[]> => {
  const current = await getEventAttachments(id);
  const removing = current[index];
  if (removing?.type === 'file' && removing.path) {
    const { deleteFile } = await import('../../lib/storage');
    await deleteFile(removing.path).catch(() => null);
  }
  const updated = current.filter((_, i) => i !== index);
  await prisma.event.update({ where: { id }, data: { attachments: JSON.stringify(updated) } });
  return updated;
};

export const getAttachmentSignedUrl = async (id: string, index: number): Promise<string> => {
  const attachments = await getEventAttachments(id);
  const att = attachments[index];
  if (!att || att.type !== 'file') throw Object.assign(new Error('Anexo não encontrado'), { status: 404 });
  const { getSignedUrl, storageEnabled } = await import('../../lib/storage');
  if (!storageEnabled()) throw Object.assign(new Error('Storage não configurado'), { status: 503 });
  return getSignedUrl(att.path, undefined, att.name);
};
