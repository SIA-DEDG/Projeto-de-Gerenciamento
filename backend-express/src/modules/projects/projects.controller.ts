import { Request, Response, NextFunction } from 'express';
import * as svc from './projects.service';
import { projectSchema as schema, projectBatchSchema } from './projects.schema';
import { canEditProject, canManageProject, canUseProject } from './projects.perms';
import { logAction } from '../../lib/logger';

const pid = (req: Request) => req.params['id'] as string;

export async function listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await svc.listProjects(req.user.directoriaId, req.user.sub)); } catch (err) { next(err); }
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
    const { responsibleIds, ownerId, ...data } = schema.parse(req.body);
    // Responsável padrão é quem cria; pode ser atribuído a outro usuário no formulário.
    const project = await svc.createProject(req.user.directoriaId, ownerId ?? req.user.sub, data, responsibleIds ?? undefined);
    void logAction(req.user.sub, req.user.username, 'CREATE', 'project', project.id, `Projeto "${project.name}" criado`, req.user.directoriaId ?? undefined);
    res.status(201).json(project);
  } catch (err) { next(err); }
}

// Importação em lote de projetos (espelha tasks.createBatch).
export async function createBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = projectBatchSchema.parse(req.body);
    if (!req.user.directoriaId) {
      res.status(400).json({ error: 'Sua conta não está vinculada a uma diretoria, então não é possível importar projetos. Entre com uma conta de diretoria.' });
      return;
    }
    const projects = await svc.createBatch(items, req.user.directoriaId, req.user.sub);
    void logAction(req.user.sub, req.user.username, 'CREATE', 'project', 'batch', `${projects.length} projetos criados`, req.user.directoriaId ?? undefined);
    res.status(201).json(projects);
  } catch (err) { next(err); }
}

// Modelo padrão (.xlsx) para importar projetos em lote — guardado no bucket de storage.
export async function getImportTemplateUrl(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { getSignedUrl, storageEnabled } = await import('../../lib/storage');
    if (!storageEnabled()) { res.status(503).json({ error: 'Storage não configurado' }); return; }
    const url = await getSignedUrl('templates/modelo-padrao-projetos.xlsx', undefined, 'Modelo Padrão Projetos.xlsx');
    res.json({ url });
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return; }
    next(err);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const { responsibleIds, ownerId, ...data } = schema.parse(req.body);
    const membership = await svc.getProjectMembership(id);

    if (!canEditProject(membership, req.user)) {
      res.status(403).json({ error: 'Você não tem permissão para editar este projeto.' });
      return;
    }
    // Reatribuir o responsável ou alterar colaboradores é exclusivo do responsável atual (ou Admin/Diretor).
    if (responsibleIds !== undefined && responsibleIds !== null && !canManageProject(membership, req.user)) {
      res.status(403).json({ error: 'Apenas o responsável do projeto pode alterar os colaboradores.' });
      return;
    }
    if (ownerId !== undefined && !canManageProject(membership, req.user)) {
      res.status(403).json({ error: 'Apenas o responsável do projeto (ou Admin/Diretor) pode reatribuir o responsável.' });
      return;
    }

    const project = await svc.updateProject(id, data, responsibleIds ?? undefined, ownerId ?? undefined);
    void logAction(req.user.sub, req.user.username, 'UPDATE', 'project', id, `Projeto "${project.name}" atualizado`);
    res.json(project);
  } catch (err) { next(err); }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const membership = await svc.getProjectMembership(id);
    if (!canManageProject(membership, req.user)) {
      res.status(403).json({ error: 'Apenas o dono do projeto pode excluí-lo.' });
      return;
    }
    await svc.deleteProject(id);
    void logAction(req.user.sub, req.user.username, 'DELETE', 'project', id, 'Projeto deletado');
    res.sendStatus(204);
  } catch (err) { next(err); }
}

// ── Anexos (mesmo padrão de tasks.controller) ───────────────────────────────────

export async function addAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const membership = await svc.getProjectMembership(id);
    if (!canUseProject(membership, req.user)) {
      res.status(403).json({ error: 'Você não faz parte deste projeto.' });
      return;
    }

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
      path = await uploadFile(`diretorias/${dirId}/projects/${id}/${Date.now()}/${safeName}`, fileData, mimeType ?? 'application/octet-stream');
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
    const membership = await svc.getProjectMembership(id);
    if (!canUseProject(membership, req.user)) {
      res.status(403).json({ error: 'Você não faz parte deste projeto.' });
      return;
    }
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
