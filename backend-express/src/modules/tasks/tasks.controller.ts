import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from './tasks.service';
import { logAction } from '../../lib/logger';

// Helper: Express v5 types params como string | string[]; em rotas com :id é sempre string
const pid = (req: Request) => req.params['id'] as string;

const taskSchema = z.object({
  category: z.string(),
  activity: z.string(),
  status: z.string(),
  priority: z.string().optional(),
  responsibleId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  externalCollaborators: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  coResponsibleIds: z.array(z.string().uuid()).optional(),
});

export async function listTasks(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listTasks()); } catch (err) { next(err); }
}

export async function listArchived(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listArchivedTasks()); } catch (err) { next(err); }
}

export async function getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.getTask(pid(req))); } catch (err) { next(err); }
}

export async function createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = taskSchema.parse(req.body);
    const task = await svc.createTask(data);
    await logAction(req.user.sub, req.user.username, 'CREATE', 'task', task.id, `Tarefa "${task.activity}" criada`);
    res.status(201).json(task);
  } catch (err) { next(err); }
}

export async function createBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = z.array(taskSchema).parse(req.body);
    const tasks = await svc.createBatch(items);
    await logAction(req.user.sub, req.user.username, 'CREATE', 'task', 'batch', `${tasks.length} tarefas criadas`);
    res.status(201).json(tasks);
  } catch (err) { next(err); }
}

export async function updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const data = taskSchema.partial().parse(req.body);
    const task = await svc.updateTask(id, data);
    await logAction(req.user.sub, req.user.username, 'UPDATE', 'task', id, `Tarefa "${task.activity}" atualizada`);
    res.json(task);
  } catch (err) { next(err); }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    await svc.deleteTask(id);
    await logAction(req.user.sub, req.user.username, 'DELETE', 'task', id, 'Tarefa deletada');
    res.sendStatus(204);
  } catch (err) { next(err); }
}

export async function archiveTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const task = await svc.setArchived(id, true);
    await logAction(req.user.sub, req.user.username, 'ARCHIVE', 'task', id, 'Tarefa arquivada');
    res.json(task);
  } catch (err) { next(err); }
}

export async function unarchiveTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const task = await svc.setArchived(id, false);
    await logAction(req.user.sub, req.user.username, 'UNARCHIVE', 'task', id, 'Tarefa desarquivada');
    res.json(task);
  } catch (err) { next(err); }
}
