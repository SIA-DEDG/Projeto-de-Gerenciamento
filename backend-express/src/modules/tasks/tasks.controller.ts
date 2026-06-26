import { Request, Response, NextFunction } from 'express';
import * as svc from './tasks.service';
import { taskSchema, taskBatchSchema } from './tasks.schema';
import { logAction } from '../../lib/logger';

// Helper: Express v5 types params como string | string[]; em rotas com :id é sempre string
const pid = (req: Request) => req.params['id'] as string;

export async function listTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listTasks(req.user.directoriaId)); } catch (err) { next(err); }
}

export async function listArchived(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listArchivedTasks(req.user.directoriaId)); } catch (err) { next(err); }
}

export async function getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.getTask(pid(req))); } catch (err) { next(err); }
}

export async function createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = taskSchema.parse(req.body);
    const task = await svc.createTask({ ...data, directoriaId: req.user.directoriaId! });
    void logAction(req.user.sub, req.user.username, 'CREATE', 'task', task.id, `Tarefa "${task.activity}" criada`, req.user.directoriaId ?? undefined);
    res.status(201).json(task);
  } catch (err) { next(err); }
}

export async function createBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = taskBatchSchema.parse(req.body);
    const tasks = await svc.createBatch(items, req.user.directoriaId!);
    void logAction(req.user.sub, req.user.username, 'CREATE', 'task', 'batch', `${tasks.length} tarefas criadas`, req.user.directoriaId ?? undefined);
    res.status(201).json(tasks);
  } catch (err) { next(err); }
}

export async function updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const data = taskSchema.partial().parse(req.body);
    const task = await svc.updateTask(id, data);
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'task', id, `Tarefa "${task.activity}" atualizada`);
    res.json(task);
  } catch (err) { next(err); }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    await svc.deleteTask(id);
    void logAction(req.user.sub, req.user.username, 'DELETE', 'task', id, 'Tarefa deletada');
    res.sendStatus(204);
  } catch (err) { next(err); }
}

export async function archiveTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const task = await svc.setArchived(id, true);
    void logAction(req.user.sub, req.user.username, 'ARCHIVE', 'task', id, 'Tarefa arquivada');
    res.json(task);
  } catch (err) { next(err); }
}

export async function unarchiveTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const task = await svc.setArchived(id, false);
    void logAction(req.user.sub, req.user.username, 'UNARCHIVE', 'task', id, 'Tarefa desarquivada');
    res.json(task);
  } catch (err) { next(err); }
}

// ── Anexos ────────────────────────────────────────────────────────────────────

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

    // Arquivo: upload para Supabase
    if (!fileData) { res.status(400).json({ error: 'fileData obrigatório para arquivo' }); return; }
    const { uploadFile, storageEnabled } = await import('../../lib/storage');
    const dirId = req.user.directoriaId ?? 'global';
    let path: string;
    if (storageEnabled()) {
      const ext = name.split('.').pop() ?? 'bin';
      path = await uploadFile(`diretorias/${dirId}/tasks/${id}/${Date.now()}.${ext}`, fileData, mimeType ?? 'application/octet-stream');
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
