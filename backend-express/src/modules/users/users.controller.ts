import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from './users.service';
import { logAction } from '../../lib/logger';

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listUsers()); } catch (err) { next(err); }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = z.object({ name: z.string() }).parse(req.body);
    const user = await svc.updateName(req.user.sub, name);
    await logAction(req.user.sub, req.user.username, 'UPDATE', 'user', req.user.sub, 'Nome atualizado');
    res.json(user);
  } catch (err) { next(err); }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await svc.deleteUser(id, req.user.sub);
    await logAction(req.user.sub, req.user.username, 'DELETE', 'user', id, `Usuário ${id} deletado`);
    res.sendStatus(204);
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return; }
    next(err);
  }
}

export async function updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const { role } = z.object({ role: z.string() }).parse(req.body);
    const user = await svc.updateRole(id, role);
    await logAction(req.user.sub, req.user.username, 'UPDATE', 'user', id, `Role → ${role}`);
    res.json(user);
  } catch (err) { next(err); }
}

export async function adminResetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const { new_password } = z.object({ new_password: z.string().min(6) }).parse(req.body);
    await svc.adminResetPassword(id, new_password);
    await logAction(req.user.sub, req.user.username, 'UPDATE', 'user', id, 'Senha redefinida pelo admin');
    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (err) { next(err); }
}
