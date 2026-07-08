import { prisma } from '../../lib/prisma';
import type { Feedback, FeedbackUpvote } from '@prisma/client';

type FeedbackWithRelations = Feedback & {
  upvotes: Pick<FeedbackUpvote, 'userId'>[];
  usuario: { name: string } | null;
  _count: { comments: number };
};

const include = {
  upvotes: { select: { userId: true } },
  usuario: { select: { name: true } },
  _count: { select: { comments: true } },
} as const;

function fmt(f: FeedbackWithRelations) {
  const { upvotes, _count, imagens, usuario, ...rest } = f;
  return {
    ...rest,
    // Prefere o nome real do usuário (relação); cai no valor salvo se o usuário nao existir mais.
    usuarioNome: usuario?.name ?? rest.usuarioNome,
    imagens: imagens ? (JSON.parse(imagens) as string[]) : [],
    upvotes: upvotes.length,
    upvoted_by: upvotes.map((u) => u.userId),
    comment_count: _count.comments,
  };
}

export const listFeedback = () =>
  prisma.feedback.findMany({ include, orderBy: { createdAt: 'desc' } })
    .then((fs) => fs.map((f) => fmt(f as FeedbackWithRelations)));

export const createFeedback = (userId: string, userName: string, usuarioDiretoria: string | null, data: {
  tipo: string; titulo: string; descricao: string;
  severidade?: string | null; imagens?: string[];
}) =>
  prisma.feedback.create({
    data: { ...data, usuarioId: userId, usuarioNome: userName, usuarioDiretoria, imagens: JSON.stringify(data.imagens ?? []) },
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
  // Passar para "respondida" reabre o aviso ao autor (replySeen volta a false).
  prisma.feedback.update({ where: { id }, data: { status, ...(status === 'respondida' ? { replySeen: false } : {}) }, include })
    .then((f) => fmt(f as FeedbackWithRelations));

export const setResposta = (id: string, resposta: string | null) =>
  // Ao salvar uma resposta, marca como "respondida"; se a resposta for limpa, volta a "pendente".
  // replySeen volta a false para o autor ser avisado desta (nova) resposta.
  prisma.feedback.update({
    where: { id },
    data: { resposta, status: resposta && resposta.trim() ? 'respondida' : 'pendente', replySeen: false },
    include,
  }).then((f) => fmt(f as FeedbackWithRelations));

// Marca como "aviso visto" todos os feedbacks respondidos do autor — chamado quando o
// aviso de resposta é exibido, para não reaparecer (persistente, vale em qualquer dispositivo).
export const markRepliesSeen = (userId: string) =>
  prisma.feedback.updateMany({
    where: {
      usuarioId: userId,
      replySeen: false,
      OR: [{ status: 'respondida' }, { resposta: { not: null } }],
    },
    data: { replySeen: true },
  });

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
