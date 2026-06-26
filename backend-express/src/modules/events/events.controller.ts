import { Request, Response, NextFunction } from 'express';
import * as svc from './events.service';
import { eventSchema as schema, setMinutesSchema } from './events.schema';
import { logAction } from '../../lib/logger';

const pid = (req: Request) => req.params['id'] as string;

export async function listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listEvents(req.user.directoriaId)); } catch (err) { next(err); }
}

export async function createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = schema.parse(req.body);
    const event = await svc.createEvent(req.user.directoriaId!, data);
    void logAction(req.user.sub, req.user.username, 'CREATE', 'event', event.id, `Evento "${event.name}" criado`, req.user.directoriaId ?? undefined);
    res.status(201).json(event);
  } catch (err) { next(err); }
}

export async function updateEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const data = schema.parse(req.body);
    const event = await svc.updateEvent(id, data);
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'event', id, `Evento "${event.name}" atualizado`);
    res.json(event);
  } catch (err) { next(err); }
}

export async function deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    await svc.deleteEvent(id);
    void logAction(req.user.sub, req.user.username, 'DELETE', 'event', id, 'Evento deletado');
    res.sendStatus(204);
  } catch (err) { next(err); }
}

export async function setMinutes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const { fileName, fileData } = setMinutesSchema.parse(req.body);

    // Faz upload para Supabase Storage
    const { uploadFile, storageEnabled } = await import('../../lib/storage');
    let filePath: string;
    if (storageEnabled()) {
      const ext = fileName.split('.').pop() ?? 'pdf';
      const dirId = req.user.directoriaId ?? 'global';
      filePath = await uploadFile(`diretorias/${dirId}/atas/${id}.${ext}`, fileData, 'application/pdf');
    } else {
      // Fallback: salva o base64 no path field como indicador (não recomendado para produção)
      filePath = `__base64__:${fileData.slice(0, 50)}`;
    }

    const event = await svc.setMinutes(id, fileName, filePath);
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'event', id, 'Ata anexada');
    res.json(event);
  } catch (err) { next(err); }
}

export async function removeMinutes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const event = await svc.removeMinutes(id);
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'event', id, 'Ata removida');
    res.json(event);
  } catch (err) { next(err); }
}

export async function getMinutesUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const event = await svc.getEventById(id);
    if (!event?.minutesFilePath) { res.status(404).json({ error: 'Ata não encontrada' }); return; }
    const { getSignedUrl, storageEnabled } = await import('../../lib/storage');
    if (!storageEnabled()) { res.status(503).json({ error: 'Storage não configurado' }); return; }
    const url = await getSignedUrl(event.minutesFilePath);
    res.json({ url });
  } catch (err) { next(err); }
}
