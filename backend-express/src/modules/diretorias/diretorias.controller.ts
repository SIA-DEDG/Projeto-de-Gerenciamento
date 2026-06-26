import { Request, Response, NextFunction } from 'express';
import * as svc from './diretorias.service';
import { directoriaSchema, moveMemberSchema } from './diretorias.schema';
import { logAction } from '../../lib/logger';

const pid = (req: Request) => req.params['id'] as string;

export async function listDiretorias(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listDiretorias()); } catch (err) { next(err); }
}

export async function getDirectoria(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.getDirectoria(pid(req))); } catch (err) { next(err); }
}

export async function listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listMembers(pid(req))); } catch (err) { next(err); }
}

export async function createDirectoria(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = directoriaSchema.parse(req.body);
    const dir = await svc.createDirectoria(data);
    void logAction(req.user.sub, req.user.username, 'CREATE', 'directoria', dir.id, `Diretoria "${dir.name}" criada`);
    res.status(201).json(dir);
  } catch (err) { next(err); }
}

export async function updateDirectoria(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const data = directoriaSchema.partial().parse(req.body);
    const dir = await svc.updateDirectoria(id, data);
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'directoria', id, `Diretoria "${dir.name}" atualizada`);
    res.json(dir);
  } catch (err) { next(err); }
}

export async function toggleActive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const { active } = req.body as { active: boolean };
    const dir = await svc.toggleActive(id, active);
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'directoria', id, `Diretoria ${active ? 'ativada' : 'desativada'}`);
    res.json(dir);
  } catch (err) { next(err); }
}

export async function moveMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const directoriaId = pid(req);
    const { userId } = moveMemberSchema.parse(req.body);
    await svc.moveMember(directoriaId, userId);
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'user', userId, `Usuário movido para diretoria ${directoriaId}`);
    res.json({ message: 'Usuário movido com sucesso' });
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return; }
    next(err);
  }
}

export async function deleteDirectoria(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    await svc.deleteDirectoria(id);
    void logAction(req.user.sub, req.user.username, 'DELETE', 'directoria', id, 'Diretoria excluída');
    res.sendStatus(204);
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return; }
    next(err);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.params['userId'] as string;
    await svc.removeMember(userId);
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'user', userId, 'Usuário desvinculado da diretoria');
    res.json({ message: 'Vínculo removido com sucesso' });
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return; }
    next(err);
  }
}
