import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from './absences.service';
import { logAction } from '../../lib/logger';

const pid = (req: Request) => req.params['id'] as string;

const schema = z.object({
  reason: z.string(),
  justification: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileData: z.string().optional().nullable(),
  startDate: z.string(),
  endDate: z.string(),
});

export async function listAbsences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listAbsences(req.user.sub, req.user.role)); } catch (err) { next(err); }
}

export async function createAbsence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = schema.parse(req.body);
    const absence = await svc.createAbsence(req.user.sub, data);
    await logAction(req.user.sub, req.user.username, 'CREATE', 'absence', absence.id, 'Ausência registrada');
    res.status(201).json(absence);
  } catch (err) { next(err); }
}

export async function updateAbsence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const data = schema.parse(req.body);
    const absence = await svc.updateAbsence(id, data);
    await logAction(req.user.sub, req.user.username, 'UPDATE', 'absence', id, 'Ausência atualizada');
    res.json(absence);
  } catch (err) { next(err); }
}

export async function deleteAbsence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    await svc.deleteAbsence(id);
    await logAction(req.user.sub, req.user.username, 'DELETE', 'absence', id, 'Ausência deletada');
    res.sendStatus(204);
  } catch (err) { next(err); }
}

export async function setApproval(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const { approval_status } = z.object({ approval_status: z.enum(['aprovado', 'negado', 'pendente']) }).parse(req.body);
    const absence = await svc.setApproval(id, approval_status);
    await logAction(req.user.sub, req.user.username, 'UPDATE', 'absence', id, `Aprovação: ${approval_status}`);
    res.json(absence);
  } catch (err) { next(err); }
}
