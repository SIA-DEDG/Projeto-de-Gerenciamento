import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { loginSchema, registerSchema, changePasswordSchema, setInitialPasswordSchema } from './auth.schema';
import { logAction } from '../../lib/logger';
import { isValidRole } from '../../lib/roles';
import { canAssignAccessRole, normalizePermissions, permissionsForRequester } from '../../lib/permissions';
import { permissionsForRole } from '../permissions/permissions.service';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const result = await authService.login(username, password);
    if (!result) { res.status(401).json({ error: 'Credenciais invalidas' }); return; }
    res.json(result);
  } catch (err) { next(err); }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = registerSchema.parse(req.body);
    const role = data.role ?? 'Funcionario';
    const requester = { role: req.user.role, directoriaId: req.user.directoriaId };
    if (!isValidRole(role)) { res.status(400).json({ error: 'Role invalida' }); return; }
    if (!canAssignAccessRole(requester, role)) {
      res.status(403).json({ error: 'Sem permissao para cadastrar usuario com esse perfil' });
      return;
    }
    const requesterIsSuperAdmin = req.user.role === 'Admin' && req.user.directoriaId === null;
    const directoriaId = requesterIsSuperAdmin
      ? (data.directoriaId ?? null)
      : (req.user.directoriaId ?? null);
    if (role !== 'Admin' && !directoriaId) {
      res.status(400).json({ error: 'Selecione uma diretoria para esse perfil.' });
      return;
    }
    const roleBaseline = await permissionsForRole(role);
    const requestedPermissions = data.permissions ? normalizePermissions(data.permissions) : roleBaseline;
    const permissions = permissionsForRequester(req.user.role, requestedPermissions, roleBaseline);
    const user = await authService.register({ ...data, role, directoriaId, permissions });
    void logAction(req.user.sub, req.user.username, 'CREATE', 'user', user.id, `Usuario "${user.username}" criado com role ${user.role}`, directoriaId ?? undefined);
    res.status(201).json(user);
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return; }
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user.sub, currentPassword, newPassword);
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return; }
    next(err);
  }
}

export async function setInitialPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { newPassword } = setInitialPasswordSchema.parse(req.body);
    await authService.setInitialPassword(req.user.sub, newPassword);
    res.json({ message: 'Senha definida com sucesso' });
  } catch (err) { next(err); }
}