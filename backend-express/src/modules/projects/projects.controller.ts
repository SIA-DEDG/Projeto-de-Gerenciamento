import { Request, Response, NextFunction } from 'express';
import * as svc from './projects.service';
import { projectSchema as schema } from './projects.schema';
import { logAction } from '../../lib/logger';

const pid = (req: Request) => req.params['id'] as string;

export async function listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listProjects(req.user.directoriaId)); } catch (err) { next(err); }
}

export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.getProject(pid(req))); } catch (err) { next(err); }
}

export async function createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user.directoriaId) {
      res.status(400).json({ error: 'Seu usuário não está vinculado a uma diretoria, então não é possível criar projetos.' });
      return;
    }
    const data = schema.parse(req.body);
    const project = await svc.createProject(req.user.directoriaId, data);
    void logAction(req.user.sub, req.user.username, 'CREATE', 'project', project.id, `Projeto "${project.name}" criado`, req.user.directoriaId ?? undefined);
    res.status(201).json(project);
  } catch (err) { next(err); }
}

export async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const data = schema.parse(req.body);
    const project = await svc.updateProject(id, data);
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'project', id, `Projeto "${project.name}" atualizado`);
    res.json(project);
  } catch (err) { next(err); }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    await svc.deleteProject(id);
    void logAction(req.user.sub, req.user.username, 'DELETE', 'project', id, 'Projeto deletado');
    res.sendStatus(204);
  } catch (err) { next(err); }
}
