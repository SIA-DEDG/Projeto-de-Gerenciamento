import { Request, Response, NextFunction } from 'express';
import * as svc from './tasks.service';
import { taskSchema, taskBatchSchema } from './tasks.schema';
import { logAction } from '../../lib/logger';

// Helper: Express v5 types params como string | string[]; em rotas com :id é sempre string
const pid = (req: Request) => req.params['id'] as string;

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
    void logAction(req.user.sub, req.user.username, 'CREATE', 'task', task.id, `Tarefa "${task.activity}" criada`);
    res.status(201).json(task);
  } catch (err) { next(err); }
}

export async function createBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = taskBatchSchema.parse(req.body);
    const tasks = await svc.createBatch(items);
    void logAction(req.user.sub, req.user.username, 'CREATE', 'task', 'batch', `${tasks.length} tarefas criadas`);
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
