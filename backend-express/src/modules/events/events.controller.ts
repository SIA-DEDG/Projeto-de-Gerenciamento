import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from './events.service';
import { logAction } from '../../lib/logger';

const pid = (req: Request) => req.params['id'] as string;

const schema = z.object({
  name: z.string(),
  eventType: z.string(),
  attendees: z.string().optional().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  startTime: z.string().optional().nullable(),
  responsibleIds: z.array(z.string().uuid()).optional(),
});

export async function listEvents(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listEvents()); } catch (err) { next(err); }
}

export async function createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = schema.parse(req.body);
    const event = await svc.createEvent(data);
    await logAction(req.user.sub, req.user.username, 'CREATE', 'event', event.id, `Evento "${event.name}" criado`);
    res.status(201).json(event);
  } catch (err) { next(err); }
}

export async function updateEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const data = schema.parse(req.body);
    const event = await svc.updateEvent(id, data);
    await logAction(req.user.sub, req.user.username, 'UPDATE', 'event', id, `Evento "${event.name}" atualizado`);
    res.json(event);
  } catch (err) { next(err); }
}

export async function deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    await svc.deleteEvent(id);
    await logAction(req.user.sub, req.user.username, 'DELETE', 'event', id, 'Evento deletado');
    res.sendStatus(204);
  } catch (err) { next(err); }
}

export async function setMinutes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const { minutes_file_name, minutes_file_data } = z.object({
      minutes_file_name: z.string(), minutes_file_data: z.string(),
    }).parse(req.body);
    const event = await svc.setMinutes(id, minutes_file_name, minutes_file_data);
    await logAction(req.user.sub, req.user.username, 'UPDATE', 'event', id, 'Ata anexada');
    res.json(event);
  } catch (err) { next(err); }
}

export async function removeMinutes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const event = await svc.removeMinutes(id);
    await logAction(req.user.sub, req.user.username, 'UPDATE', 'event', id, 'Ata removida');
    res.json(event);
  } catch (err) { next(err); }
}
