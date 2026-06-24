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

export const listEvents = () =>
  prisma.event.findMany({ where: { archived: false }, include, orderBy: { startDate: 'desc' } })
    .then((es) => es.map((e) => fmt(e as EventWithResponsibles)));

export const createEvent = async (data: {
  name: string; eventType: string; attendees?: string | null;
  startDate: string; endDate: string; startTime?: string | null;
  responsibleIds?: string[];
}) => {
  const { responsibleIds = [], ...rest } = data;
  const event = await prisma.event.create({
    data: {
      ...rest,
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

export const setMinutes = (id: string, minutesFileName: string, minutesFileData: string) =>
  prisma.event.update({ where: { id }, data: { minutesFileName, minutesFileData }, include })
    .then((e) => fmt(e as EventWithResponsibles));

export const removeMinutes = (id: string) =>
  prisma.event.update({ where: { id }, data: { minutesFileName: null, minutesFileData: null }, include })
    .then((e) => fmt(e as EventWithResponsibles));
