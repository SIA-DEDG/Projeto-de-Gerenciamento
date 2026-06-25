import { Request, Response, NextFunction } from 'express';
import * as svc from './logs.service';
import { logAction } from '../../lib/logger';

export async function listLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listLogs()); } catch (err) { next(err); }
}

export async function clearLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user.role !== 'Admin') { res.status(403).json({ error: 'Apenas Admin pode limpar os logs' }); return; }
    await svc.clearLogs();
    void logAction(req.user.sub, req.user.username, 'DELETE', 'log', 'all', 'Logs apagados');
    res.sendStatus(204);
  } catch (err) { next(err); }
}
