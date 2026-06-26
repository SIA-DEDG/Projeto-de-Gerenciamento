import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { loginSchema, registerSchema, changePasswordSchema, setInitialPasswordSchema } from './auth.schema';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const result = await authService.login(username, password);
    if (!result) { res.status(401).json({ error: 'Credenciais inválidas' }); return; }
    res.json(result);
  } catch (err) { next(err); }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = registerSchema.parse(req.body);
    // Super-Admin pode criar em qualquer diretoria; Gerente/Diretor só na sua
    const directoriaId = req.user.role === 'Admin'
      ? (data.directoriaId ?? null)
      : (req.user.directoriaId ?? null);
    const user = await authService.register({ ...data, directoriaId });
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
