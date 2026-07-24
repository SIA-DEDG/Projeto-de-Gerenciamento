import { Request, Response, NextFunction } from 'express';
import * as svc from './users.service';
import { updateNameSchema, updateRoleSchema, resetPasswordSchema, updateAccessSchema } from './users.schema';
import { logAction } from '../../lib/logger';
import { normalizePermissions } from '../../lib/permissions';

function requester(req: Request) {
  return { id: req.user.sub, role: req.user.role, directoriaId: req.user.directoriaId };
}

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listUsers(req.user.directoriaId)); } catch (err) { next(err); }
}

export async function listAllUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listAllUsers()); } catch (err) { next(err); }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = updateNameSchema.parse(req.body);
    const user = await svc.updateName(req.user.sub, name);
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'user', req.user.sub, 'Nome atualizado');
    res.json(user);
  } catch (err) { next(err); }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await svc.deleteUser(id, requester(req));
    void logAction(req.user.sub, req.user.username, 'DELETE', 'user', id, `Usuario ${id} deletado`, req.user.directoriaId ?? undefined);
    res.sendStatus(204);
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return; }
    next(err);
  }
}

export async function updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const { role } = updateRoleSchema.parse(req.body);
    const user = await svc.updateRole(id, role, requester(req));
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'user', id, `Role alterada para ${role}`, req.user.directoriaId ?? undefined);
    res.json(user);
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return; }
    next(err);
  }
}

export async function updateAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const parsed = updateAccessSchema.parse(req.body);
    const user = await svc.updateAccess(id, { ...parsed, permissions: normalizePermissions(parsed.permissions) }, requester(req));
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'user_access', id, `Acesso atualizado para ${user.username}`, req.user.directoriaId ?? undefined);
    res.json(user);
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return; }
    next(err);
  }
}

export async function adminResetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const { newPassword: new_password } = resetPasswordSchema.parse(req.body);
    await svc.adminResetPassword(id, new_password, requester(req));
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'user', id, 'Senha redefinida', req.user.directoriaId ?? undefined);
    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return; }
    next(err);
  }
}