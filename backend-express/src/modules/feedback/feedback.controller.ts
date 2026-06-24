import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from './feedback.service';
import { logAction } from '../../lib/logger';

const pid = (req: Request) => req.params['id'] as string;

const schema = z.object({
  tipo: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  severidade: z.string().optional().nullable(),
  imagens: z.array(z.string()).optional(),
});

export async function listFeedback(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listFeedback()); } catch (err) { next(err); }
}

export async function createFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = schema.parse(req.body);
    const fb = await svc.createFeedback(req.user.sub, req.user.username, data);
    await logAction(req.user.sub, req.user.username, 'CREATE', 'feedback', fb.id, `Feedback "${fb.titulo}" criado`);
    res.status(201).json(fb);
  } catch (err) { next(err); }
}

export async function updateFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const data = schema.partial().parse(req.body);
    const fb = await svc.updateFeedback(id, data);
    await logAction(req.user.sub, req.user.username, 'UPDATE', 'feedback', id, 'Feedback atualizado');
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
    await logAction(req.user.sub, req.user.username, 'DELETE', 'feedback', id, 'Feedback deletado');
    res.sendStatus(204);
  } catch (err) { next(err); }
}

export async function toggleUpvote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.toggleUpvote(pid(req), req.user.sub)); } catch (err) { next(err); }
}

export async function setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user.role !== 'Admin') { res.status(403).json({ error: 'Sem permissão' }); return; }
    const { status } = z.object({ status: z.string() }).parse(req.body);
    res.json(await svc.setStatus(pid(req), status));
  } catch (err) { next(err); }
}

export async function setResposta(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user.role !== 'Admin') { res.status(403).json({ error: 'Sem permissão' }); return; }
    const { resposta } = z.object({ resposta: z.string() }).parse(req.body);
    res.json(await svc.setResposta(pid(req), resposta));
  } catch (err) { next(err); }
}

export async function listComments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listComments(pid(req))); } catch (err) { next(err); }
}

export async function createComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { conteudo, parent_id } = z.object({
      conteudo: z.string(),
      parent_id: z.string().uuid().optional(),
    }).parse(req.body);
    const comment = await svc.createComment(pid(req), req.user.sub, req.user.username, conteudo, parent_id);
    await logAction(req.user.sub, req.user.username, 'CREATE', 'feedback_comment', comment.id, 'Comentário adicionado');
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
    await logAction(req.user.sub, req.user.username, 'DELETE', 'feedback_comment', comment.id, 'Comentário deletado');
    res.sendStatus(204);
  } catch (err) { next(err); }
}
