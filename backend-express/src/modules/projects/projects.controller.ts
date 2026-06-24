import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from './projects.service';
import { logAction } from '../../lib/logger';

const pid = (req: Request) => req.params['id'] as string;

const schema = z.object({
  name: z.string(),
  category: z.string().optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  deadline: z.string().optional().nullable(),
  executiveStatus: z.string().optional().nullable(),
  objective: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
});

export async function listProjects(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listProjects()); } catch (err) { next(err); }
}

export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.getProject(pid(req))); } catch (err) { next(err); }
}

export async function createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = schema.parse(req.body);
    const project = await svc.createProject(data);
    await logAction(req.user.sub, req.user.username, 'CREATE', 'project', project.id, `Projeto "${project.name}" criado`);
    res.status(201).json(project);
  } catch (err) { next(err); }
}

export async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const data = schema.parse(req.body);
    const project = await svc.updateProject(id, data);
    await logAction(req.user.sub, req.user.username, 'UPDATE', 'project', id, `Projeto "${project.name}" atualizado`);
    res.json(project);
  } catch (err) { next(err); }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    await svc.deleteProject(id);
    await logAction(req.user.sub, req.user.username, 'DELETE', 'project', id, 'Projeto deletado');
    res.sendStatus(204);
  } catch (err) { next(err); }
}
