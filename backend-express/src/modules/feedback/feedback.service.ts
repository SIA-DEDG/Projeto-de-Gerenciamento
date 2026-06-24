import { prisma } from '../../lib/prisma';
import type { Feedback, FeedbackUpvote, FeedbackComment } from '@prisma/client';

type FeedbackWithRelations = Feedback & {
  upvotes: Pick<FeedbackUpvote, 'userId'>[];
  comments: FeedbackComment[];
};

const include = {
  upvotes: { select: { userId: true } },
  comments: true,
} as const;

function fmt(f: FeedbackWithRelations) {
  const { upvotes, comments, imagens, ...rest } = f;
  return {
    ...rest,
    imagens: imagens ? (JSON.parse(imagens) as string[]) : [],
    upvotes: upvotes.length,
    upvoted_by: upvotes.map((u) => u.userId),
    comment_count: comments.length,
  };
}

export const listFeedback = () =>
  prisma.feedback.findMany({ include, orderBy: { createdAt: 'desc' } })
    .then((fs) => fs.map((f) => fmt(f as FeedbackWithRelations)));

export const createFeedback = (userId: string, userName: string, data: {
  tipo: string; titulo: string; descricao: string;
  severidade?: string | null; imagens?: string[];
}) =>
  prisma.feedback.create({
    data: { ...data, usuarioId: userId, usuarioNome: userName, imagens: JSON.stringify(data.imagens ?? []) },
    include,
  }).then((f) => fmt(f as FeedbackWithRelations));

export const updateFeedback = (id: string, data: {
  tipo?: string; titulo?: string; descricao?: string;
  severidade?: string | null; imagens?: string[];
}) =>
  prisma.feedback.update({
    where: { id },
    data: { ...data, imagens: data.imagens !== undefined ? JSON.stringify(data.imagens) : undefined },
    include,
  }).then((f) => fmt(f as FeedbackWithRelations));

export const deleteFeedback = (id: string) => prisma.feedback.delete({ where: { id } });

export const getFeedbackById = (id: string) => prisma.feedback.findUnique({ where: { id } });

export async function toggleUpvote(feedbackId: string, userId: string) {
  const key = { feedbackId, userId };
  const existing = await prisma.feedbackUpvote.findUnique({ where: { feedbackId_userId: key } });
  if (existing) {
    await prisma.feedbackUpvote.delete({ where: { feedbackId_userId: key } });
  } else {
    await prisma.feedbackUpvote.create({ data: key });
  }
  return prisma.feedback.findUniqueOrThrow({ where: { id: feedbackId }, include })
    .then((f) => fmt(f as FeedbackWithRelations));
}

export const setStatus = (id: string, status: string) =>
  prisma.feedback.update({ where: { id }, data: { status }, include })
    .then((f) => fmt(f as FeedbackWithRelations));

export const setResposta = (id: string, resposta: string) =>
  prisma.feedback.update({ where: { id }, data: { resposta }, include })
    .then((f) => fmt(f as FeedbackWithRelations));

export const listComments = (feedbackId: string) =>
  prisma.feedbackComment.findMany({ where: { feedbackId }, orderBy: { createdAt: 'asc' } });

export const createComment = (
  feedbackId: string, userId: string, userName: string, conteudo: string, parentId?: string,
) =>
  prisma.feedbackComment.create({
    data: { feedbackId, usuarioId: userId, usuarioNome: userName, conteudo, parentId },
  });

export const deleteComment = (id: string) => prisma.feedbackComment.delete({ where: { id } });

export const getComment = (id: string) => prisma.feedbackComment.findUnique({ where: { id } });
