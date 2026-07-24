import { prisma } from '../../lib/prisma';
import type { Absence, User, Directoria } from '@prisma/client';

type AbsenceWithRelations = Absence & {
  user: Pick<User, 'name'> | null;
  directoria: Pick<Directoria, 'name'> | null;
};

const include = {
  user: { select: { name: true } },
  directoria: { select: { name: true } },
} as const;

function fmt(a: AbsenceWithRelations) {
  const { user, directoria, ...rest } = a;
  return {
    ...rest,
    employee_name: user?.name ?? null,
    directoria_name: directoria?.name ?? null,
  };
}

export const listAbsences = async (userId: string, directoriaId: string | null, canSeeAll: boolean) => {

  // Super-Admin (directoriaId = null) ou Gabinete: visão global de todas as diretorias
  let isGlobalViewer = !directoriaId;
  if (directoriaId) {
    // Qualquer membro do Gabinete (independente do role) vê todas as faltas
    const dir = await prisma.directoria.findUnique({ where: { id: directoriaId }, select: { slug: true, name: true } });
    if (canSeeAll && (dir?.slug === 'gabinete' || dir?.name?.toLowerCase() === 'gabinete')) isGlobalViewer = true;
  }

  const where = isGlobalViewer
    ? {}
    : canSeeAll
    ? { directoriaId: directoriaId ?? undefined }
    : { userId, directoriaId: directoriaId! };

  return prisma.absence.findMany({ where, include, orderBy: { startDate: 'desc' } })
    .then((as) => as.map((a) => fmt(a as AbsenceWithRelations)));
};

export const createAbsence = (userId: string, directoriaId: string, data: {
  reason: string; justification?: string | null; fileName?: string | null;
  filePath?: string | null; startDate: string; endDate: string;
}) =>
  prisma.absence.create({
    data: { ...data, userId, directoriaId, startDate: new Date(data.startDate), endDate: new Date(data.endDate) },
    include,
  }).then((a) => fmt(a as AbsenceWithRelations));

export const updateAbsence = (id: string, data: {
  reason: string; justification?: string | null; fileName?: string | null;
  filePath?: string | null; startDate: string; endDate: string;
}) =>
  prisma.absence.update({
    where: { id },
    data: { ...data, startDate: new Date(data.startDate), endDate: new Date(data.endDate) },
    include,
  }).then((a) => fmt(a as AbsenceWithRelations));

export const setApproval = (id: string, approvalStatus: string) =>
  prisma.absence.update({ where: { id }, data: { approvalStatus }, include })
    .then((a) => fmt(a as AbsenceWithRelations));

export const deleteAbsence = (id: string) => prisma.absence.delete({ where: { id } });
