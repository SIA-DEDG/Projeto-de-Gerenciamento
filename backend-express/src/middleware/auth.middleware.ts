import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { normalizePermissions, type PermissionState } from '../lib/permissions';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  directoriaId: string | null;
  tokenVersion: number;
  exp: number;
  permissions?: PermissionState;
}

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token nao fornecido' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { role: true, directoriaId: true, tokenVersion: true, permissions: true },
    });
    if (!user || user.tokenVersion !== (payload.tokenVersion ?? 0)) {
      res.status(401).json({ error: 'Sessao expirada. Faca login novamente.' });
      return;
    }
    req.user = { ...payload, role: user.role, directoriaId: user.directoriaId, tokenVersion: user.tokenVersion, permissions: normalizePermissions(user.permissions) };
    next();
  } catch {
    res.status(401).json({ error: 'Token invalido ou expirado' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Sem permissao' });
      return;
    }
    next();
  };
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user.role === 'Admin' || req.user.permissions?.[permission] === true) {
      next();
      return;
    }
    res.status(403).json({ error: `Sem permissao para a acao: ${permission}` });
  };
}
export const requireManager = requireRole('Admin', 'Diretor', 'Gerente');
export const requireAdmin = requireRole('Admin');