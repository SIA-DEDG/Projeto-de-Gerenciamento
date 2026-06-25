import { prisma } from '../../lib/prisma';
import type { Absence, User } from '@prisma/client';

type AbsenceWithUser = Absence & { user: Pick<User, 'name'> | null };

const include = { user: { select: { name: true } } } as const;

function fmt(a: AbsenceWithUser) {
  const { user, ...rest } = a;
  return { ...rest, employee_name: user?.name ?? null };
}

export const listAbsences = (userId: string, role: string) => {
  const where = ['Admin', 'Diretor', 'Gerente'].includes(role) ? {} : { userId };
  return prisma.absence.findMany({ where, include, orderBy: { startDate: 'desc' } })
    .then((as) => as.map((a) => fmt(a as AbsenceWithUser)));
};

export const createAbsence = (userId: string, data: {
  reason: string; justification?: string | null; fileName?: string | null;
  filePath?: string | null; startDate: string; endDate: string;
}) =>
  prisma.absence.create({
    data: { ...data, userId, startDate: new Date(data.startDate), endDate: new Date(data.endDate) },
    include,
  }).then((a) => fmt(a as AbsenceWithUser));

export const updateAbsence = (id: string, data: {
  reason: string; justification?: string | null; fileName?: string | null;
  filePath?: string | null; startDate: string; endDate: string;
}) =>
  prisma.absence.update({
    where: { id },
    data: { ...data, startDate: new Date(data.startDate), endDate: new Date(data.endDate) },
    include,
  }).then((a) => fmt(a as AbsenceWithUser));

export const setApproval = (id: string, approvalStatus: string) =>
  prisma.absence.update({ where: { id }, data: { approvalStatus }, include })
    .then((a) => fmt(a as AbsenceWithUser));

export const deleteAbsence = (id: string) => prisma.absence.delete({ where: { id } });
