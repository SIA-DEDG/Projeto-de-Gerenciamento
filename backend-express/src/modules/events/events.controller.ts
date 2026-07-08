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
    const { fileName, fileData, mimeType } = setMinutesSchema.parse(req.body);

    // Faz upload para Supabase Storage — a ata fica junto dos demais arquivos do evento.
    const { uploadFile, storageEnabled, sanitizeStorageName, deleteFile } = await import('../../lib/storage');
    let filePath: string;
    if (storageEnabled()) {
      // Remove a ata anterior (evita arquivo órfão ao substituir por outra extensão).
      const prev = await svc.getEventById(id);
      if (prev?.minutesFilePath) await deleteFile(prev.minutesFilePath).catch(() => null);
      const dirId = req.user.directoriaId ?? 'global';
      const safeName = sanitizeStorageName(fileName);
      filePath = await uploadFile(`diretorias/${dirId}/events/${id}/ata/${Date.now()}/${safeName}`, fileData, mimeType ?? 'application/octet-stream');
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
    const url = await getSignedUrl(event.minutesFilePath, undefined, event.minutesFileName ?? undefined);
    res.json({ url });
  } catch (err) { next(err); }
}

// ── Anexos (arquivos/links) ─────────────────────────────────────────────────────

export async function addAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const { type, name, url, fileData, mimeType, size } = req.body as {
      type: 'file' | 'link'; name: string; url?: string;
      fileData?: string; mimeType?: string; size?: number;
    };

    if (type === 'link') {
      if (!url) { res.status(400).json({ error: 'url obrigatória para link' }); return; }
      const attachments = await svc.addAttachment(id, { type: 'link', name, url });
      res.json(attachments);
      return;
    }

    if (!fileData) { res.status(400).json({ error: 'fileData obrigatório para arquivo' }); return; }
    const { uploadFile, storageEnabled, sanitizeStorageName } = await import('../../lib/storage');
    const dirId = req.user.directoriaId ?? 'global';
    let path: string;
    if (storageEnabled()) {
      const safeName = sanitizeStorageName(name);
      path = await uploadFile(`diretorias/${dirId}/events/${id}/${Date.now()}/${safeName}`, fileData, mimeType ?? 'application/octet-stream');
    } else {
      path = `__base64__:${fileData.slice(0, 50)}`;
    }
    const attachments = await svc.addAttachment(id, { type: 'file', name, path, size: size ?? 0, mimeType: mimeType ?? '' });
    res.json(attachments);
  } catch (err) { next(err); }
}

export async function removeAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const idx = parseInt(req.params['idx'] as string, 10);
    if (isNaN(idx)) { res.status(400).json({ error: 'índice inválido' }); return; }
    const attachments = await svc.removeAttachment(id, idx);
    res.json(attachments);
  } catch (err) { next(err); }
}

export async function getAttachmentUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const idx = parseInt(req.params['idx'] as string, 10);
    const url = await svc.getAttachmentSignedUrl(id, idx);
    res.json({ url });
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return; }
    next(err);
  }
}
