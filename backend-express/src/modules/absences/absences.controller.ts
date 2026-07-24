import { Request, Response, NextFunction } from 'express';
import * as svc from './absences.service';
import { absenceSchema as schema, approvalSchema } from './absences.schema';
import { logAction } from '../../lib/logger';

const pid = (req: Request) => req.params['id'] as string;

export async function listAbsences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const canSeeAll = req.user.role === 'Admin' || req.user.permissions?.['absences.view_all'] === true;
    res.json(await svc.listAbsences(req.user.sub, req.user.directoriaId, canSeeAll));
  } catch (err) { next(err); }
}

export async function createAbsence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = schema.parse(req.body);
    const absence = await svc.createAbsence(req.user.sub, req.user.directoriaId!, data);
    void logAction(req.user.sub, req.user.username, 'CREATE', 'absence', absence.id, 'Ausência registrada', req.user.directoriaId ?? undefined);
    res.status(201).json(absence);
  } catch (err) { next(err); }
}

export async function updateAbsence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const data = schema.parse(req.body);
    const absence = await svc.updateAbsence(id, data);
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'absence', id, 'Ausência atualizada');
    res.json(absence);
  } catch (err) { next(err); }
}

export async function deleteAbsence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    await svc.deleteAbsence(id);
    void logAction(req.user.sub, req.user.username, 'DELETE', 'absence', id, 'Ausência deletada');
    res.sendStatus(204);
  } catch (err) { next(err); }
}

export async function setApproval(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const { approvalStatus } = approvalSchema.parse(req.body);
    const absence = await svc.setApproval(id, approvalStatus);
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'absence', id, `Aprovação: ${approvalStatus}`);
    res.json(absence);
  } catch (err) { next(err); }
}
