import { prisma } from '../../lib/prisma';
import type { Event, EventResponsible, User } from '@prisma/client';

type EventWithResponsibles = Event & {
  responsibles: (EventResponsible & { user: Pick<User, 'name'> })[];
};

const include = {
  responsibles: { include: { user: { select: { name: true } } } },
} as const;

function fmt(e: EventWithResponsibles) {
  const { responsibles, ...rest } = e;
  return { ...rest, responsibles: responsibles.map((r) => r.user.name) };
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

export const deleteEvent = (id: string) => prisma.event.delete({ where: { id } });

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
