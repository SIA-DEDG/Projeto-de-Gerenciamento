import { Request, Response, NextFunction } from 'express';
import * as svc from './permissions.service';
import { updatePermissionPresetSchema } from './permissions.schema';
import { logAction } from '../../lib/logger';

export async function getConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.getConfig()); } catch (err) { next(err); }
}

export async function updatePreset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user.role !== 'Admin' || req.user.directoriaId !== null) {
      res.status(403).json({ error: 'Apenas o super-admin pode alterar os modelos globais de permissao.' });
      return;
    }

    const { role, permissions } = updatePermissionPresetSchema.parse(req.body);
    if (role === 'Admin') {
      res.status(400).json({ error: 'O perfil Admin sempre possui acesso total.' });
      return;
    }

    const result = await svc.updatePreset(role, permissions);
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'permission_preset', role, `Preset de permissoes atualizado para ${role}`, req.user.directoriaId ?? undefined);
    res.json(result);
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return; }
    next(err);
  }
}