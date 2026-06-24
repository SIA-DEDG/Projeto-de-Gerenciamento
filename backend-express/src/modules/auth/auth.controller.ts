import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';

const loginSchema = z.object({ username: z.string(), password: z.string() });
const changePasswordSchema = z.object({ current_password: z.string(), new_password: z.string().min(6) });
const setInitialSchema = z.object({ new_password: z.string().min(6) });

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
    const data = z.object({ username: z.string(), name: z.string(), role: z.string().optional() }).parse(req.body);
    const user = await authService.register(data);
    res.status(201).json(user);
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return; }
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { current_password, new_password } = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user.sub, current_password, new_password);
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return; }
    next(err);
  }
}

export async function setInitialPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { new_password } = setInitialSchema.parse(req.body);
    await authService.setInitialPassword(req.user.sub, new_password);
    res.json({ message: 'Senha definida com sucesso' });
  } catch (err) { next(err); }
}
