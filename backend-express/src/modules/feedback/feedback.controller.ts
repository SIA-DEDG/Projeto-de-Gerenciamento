import { Request, Response, NextFunction } from 'express';
import * as svc from './feedback.service';
import { feedbackSchema, setStatusSchema, setRespostaSchema, commentSchema } from './feedback.schema';
import { logAction } from '../../lib/logger';

const pid = (req: Request) => req.params['id'] as string;

export async function listFeedback(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listFeedback()); } catch (err) { next(err); }
}

export async function createFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = feedbackSchema.parse(req.body);
    const { prisma } = await import('../../lib/prisma');
    const [author, dirName] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user.sub }, select: { name: true } }),
      req.user.directoriaId
        ? prisma.directoria.findUnique({ where: { id: req.user.directoriaId }, select: { name: true } }).then(d => d?.name ?? null)
        : Promise.resolve(null),
    ]);
    const fb = await svc.createFeedback(req.user.sub, author?.name ?? req.user.username, dirName, data);
    void logAction(req.user.sub, req.user.username, 'CREATE', 'feedback', fb.id, `Feedback "${fb.titulo}" criado`);
    res.status(201).json(fb);
  } catch (err) { next(err); }
}

export async function updateFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const data = feedbackSchema.partial().parse(req.body);
    const fb = await svc.updateFeedback(id, data);
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'feedback', id, 'Feedback atualizado');
    res.json(fb);
  } catch (err) { next(err); }
}

export async function deleteFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const fb = await svc.getFeedbackById(id);
    if (!fb) { res.status(404).json({ error: 'Feedback não encontrado' }); return; }
    if (fb.usuarioId !== req.user.sub && req.user.role !== 'Admin') {
      res.status(403).json({ error: 'Sem permissão' }); return;
    }
    await svc.deleteFeedback(id);
    void logAction(req.user.sub, req.user.username, 'DELETE', 'feedback', id, 'Feedback deletado');
    res.sendStatus(204);
  } catch (err) { next(err); }
}

export async function toggleUpvote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.toggleUpvote(pid(req), req.user.sub)); } catch (err) { next(err); }
}

export async function setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user.role !== 'Admin') { res.status(403).json({ error: 'Sem permissão' }); return; }
    const { status } = setStatusSchema.parse(req.body);
    res.json(await svc.setStatus(pid(req), status));
  } catch (err) { next(err); }
}

// Marca os avisos de "feedback respondido" do usuário logado como já vistos (persistente).
export async function markRepliesSeen(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.markRepliesSeen(req.user.sub);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

export async function setResposta(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user.role !== 'Admin') { res.status(403).json({ error: 'Sem permissão' }); return; }
    const { resposta } = setRespostaSchema.parse(req.body);
    res.json(await svc.setResposta(pid(req), resposta));
  } catch (err) { next(err); }
}

export async function listComments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listComments(pid(req))); } catch (err) { next(err); }
}

export async function createComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { conteudo, parent_id } = commentSchema.parse(req.body);
    const comment = await svc.createComment(pid(req), req.user.sub, req.user.username, conteudo, parent_id);
    void logAction(req.user.sub, req.user.username, 'CREATE', 'feedback_comment', comment.id, 'Comentário adicionado');
    res.status(201).json(comment);
  } catch (err) { next(err); }
}

export async function deleteComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const commentId = req.params['commentId'] as string;
    const comment = await svc.getComment(commentId);
    if (!comment) { res.status(404).json({ error: 'Comentário não encontrado' }); return; }
    if (comment.usuarioId !== req.user.sub && req.user.role !== 'Admin') {
      res.status(403).json({ error: 'Sem permissão' }); return;
    }
    await svc.deleteComment(comment.id);
    void logAction(req.user.sub, req.user.username, 'DELETE', 'feedback_comment', comment.id, 'Comentário deletado');
    res.sendStatus(204);
  } catch (err) { next(err); }
}
