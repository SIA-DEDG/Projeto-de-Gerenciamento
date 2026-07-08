'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Plus, Pencil, Trash2, X, ChevronLeft,
  ChevronRight, FileText, User, Calendar, Check,
  Paperclip, Link as LinkIcon, Download,
} from 'lucide-react';
import ActivityModal from '@/components/ActivityModal';
import ProjectModal from '@/components/ProjectModal';
import DrawerDetalhe from '@/components/DrawerDetalhe';
import ConfirmModal from '@/components/ConfirmModal';
import CollapsibleGroup from '@/components/CollapsibleGroup';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import {
  fetchTasks, fetchArchivedTasks, createTask, updateTask, deleteTask,
  fetchProjects, createProject, updateProject, deleteProject,
  fetchUsers, addTaskFile, addTaskLink, removeTaskAttachment, invalidateTasksCache,
  addProjectFile, addProjectLink, removeProjectAttachment, getProjectAttachmentUrl, getTaskAttachmentUrl,
} from '@/lib/api';
import type { ActivityAttachment, ActivityLink } from '@/components/ActivityModal';
import {
  avatarColor, initials, statusGroupLabel, resolveCoResponsibleIds,
  canUseProjectClient, canEditProjectClient, canManageProjectClient,
} from '@/lib/utils';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import { onTasksChanged } from '@/lib/taskEvents';
import type { UserPublic } from '@/lib/api';
import type { Task, Project, TaskAttachment } from '@/types';
import PageHeader from '@/components/PageHeader';
import { getUser, canManageProjects } from '@/lib/auth';

const PAGE_SIZE = 12;

const PROJECT_COLORS = ['var(--blue)','#1b8a4b','#e0a92e','#b42318','#9333ea','#0f766e','#be185d','#0369a1'];
function projectColor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return PROJECT_COLORS[Math.abs(h) % PROJECT_COLORS.length];
}

function statusDot(s: string) {
  if (s === 'concluido') return 'var(--s-done)';
  if (s === 'execucao') return 'var(--s-progress)';
  if (s === 'validacao') return 'var(--s-review)';
  return 'var(--s-pending)';
}

// Projeta localmente o resultado das mudanças de anexo (para atualização otimista da UI):
// remove os índices marcados e acrescenta os novos links/arquivos.
function applyAttachmentChanges(
  existing: TaskAttachment[],
  data: { attachments?: ActivityAttachment[]; links?: ActivityLink[]; removedAttachmentIndices?: number[] },
): TaskAttachment[] {
  const removed = new Set(data.removedAttachmentIndices ?? []);
  const kept = existing.filter((_, i) => !removed.has(i));
  const links: TaskAttachment[] = (data.links ?? []).map((l) => ({ type: 'link', name: l.name, url: l.url }));
  const files: TaskAttachment[] = (data.attachments ?? []).map((f) => ({ type: 'file', name: f.name, path: '', size: f.size, mimeType: f.type }));
  return [...kept, ...links, ...files];
}

export default function ProjetosPage() {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers]       = useState<UserPublic[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [onlyMine, setOnlyMine] = useState(true);
  const [page, setPage]         = useState(1);
  const { toasts, addToast, dismissToast } = useToast();

  const myName = getUser()?.name ?? '';
  const myId = getUser()?.user_id ?? null;
  const myRole = getUser()?.role;

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectModal, setProjectModal] = useState<{ open: boolean; project: Project | null }>({ open: false, project: null });
  const [activityModal, setActivityModal] = useState<{ open: boolean; task: Task | null; projectId: string | null }>({ open: false, task: null, projectId: null });
  const [taskDrawer, setTaskDrawer] = useState<Task | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message?: string; onConfirm: () => void } | null>(null);

  const load = useCallback(() => {
    // Inclui as arquivadas: o progresso e a contagem de atividades de um projeto
    // consideram TODAS as tarefas vinculadas — uma tarefa concluída continua contando
    // mesmo depois de arquivada (não é preciso desarquivar para ela contar).
    Promise.all([fetchTasks(), fetchArchivedTasks(), fetchProjects(), fetchUsers()])
      .then(([active, archived, p, u]) => { setTasks([...active, ...archived]); setProjects(p); setUsers(u.filter((x) => x.role !== 'Admin')); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefetchOnFocus(load);
  // Reage a qualquer criação/edição/exclusão de atividade (mesmo feita em outra tela)
  // para atualizar membros e progresso dos projetos sem precisar recarregar a página.
  useEffect(() => onTasksChanged(load), [load]);

  // Nomes envolvidos num projeto: responsáveis e co-responsáveis das atividades vinculadas.
  const projectMemberNames = useCallback((projectId: string): Set<string> => {
    const names = tasks
      .filter((t) => t.project_id === projectId)
      .flatMap((t) => [t.responsible, ...(t.co_responsibles ? (() => { try { return JSON.parse(t.co_responsibles!) as string[]; } catch { return []; } })() : [])])
      .filter(Boolean) as string[];
    return new Set(names);
  }, [tasks]);

  // Sou "membro" de um projeto se for o responsável (owner) ou participar de alguma atividade dele.
  const isMyProject = useCallback((p: Project): boolean =>
    (!!myId && p.owner_id === myId) || (!!myName && p.owner === myName) || projectMemberNames(p.id).has(myName),
  [myId, myName, projectMemberNames]);

  const filteredProjects = useMemo(
    () => projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) && (!onlyMine || isMyProject(p))),
    [projects, search, onlyMine, isMyProject],
  );
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const pagedProjects = filteredProjects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, onlyMine]);

  async function handleSaveProject(data: Omit<Project, 'id'> & {
    attachmentsToAdd?: ActivityAttachment[]; linksToAdd?: ActivityLink[]; removedAttachmentIndices?: number[];
  }) {
    const { project } = projectModal;
    setProjectModal({ open: false, project: null });
    // Só envia responsibleIds quando o usuário pode gerenciar (dono/Admin/Diretor) ou ao criar
    // (onde ele vira o dono). Caso contrário o backend rejeitaria a alteração de responsáveis.
    const canManageResp = project ? canManageProjectClient(project, myId, myRole) : true;
    const payload = {
      name: data.name,
      category: data.category?.trim() || null,
      deadline: data.deadline?.trim() || null,
      executiveStatus: data.executive_status || null,
      objective: data.objective?.trim() || null,
      scope: data.scope?.trim() || null,
      summary: data.summary?.trim() || null,
      // O responsável (owner) não entra na lista de colaboradores — já é membro por ser o responsável.
      ...(canManageResp ? { ownerId: data.owner_id ?? null, responsibleIds: (data.responsible_ids ?? []).filter(id => id !== data.owner_id) } : {}),
    };
    try {
      if (project) {
        const updated = await updateProject(project, payload);
        const finalAtts = await persistProjectAttachmentsFromModal(updated.id, data);
        const next = finalAtts ? { ...updated, attachments: finalAtts } : updated;
        setProjects((curr) => curr.map((p) => (p.id === next.id ? next : p)));
        if (selectedProject?.id === next.id) setSelectedProject(next);
        addToast('success', 'Projeto atualizado', `"${next.name}" salvo.`);
      } else {
        const created = await createProject(payload);
        const finalAtts = await persistProjectAttachmentsFromModal(created.id, data);
        const next = finalAtts ? { ...created, attachments: finalAtts } : created;
        setProjects((curr) => [...curr, next]);
        addToast('success', 'Projeto criado', `"${next.name}" criado.`);
      }
    } catch (err) {
      addToast('error', 'Não foi possível salvar', err instanceof Error ? err.message : 'Tente novamente.');
    }
  }

  // Aplica remoções (índices em ordem decrescente) e uploads de arquivos/links do modal
  // de projeto, em sequência, e retorna a lista final de anexos.
  async function persistProjectAttachmentsFromModal(
    projectId: string,
    data: { attachmentsToAdd?: ActivityAttachment[]; linksToAdd?: ActivityLink[]; removedAttachmentIndices?: number[] },
  ): Promise<TaskAttachment[] | null> {
    let latest: TaskAttachment[] | null = null;
    for (const idx of [...(data.removedAttachmentIndices ?? [])].sort((a, b) => b - a)) {
      latest = await removeProjectAttachment(projectId, idx);
    }
    for (const f of data.attachmentsToAdd ?? []) {
      latest = await addProjectFile(projectId, { name: f.name, data: f.data, mimeType: f.type, size: f.size });
    }
    for (const l of data.linksToAdd ?? []) {
      latest = await addProjectLink(projectId, l.name, l.url);
    }
    return latest;
  }

  function handleDeleteProject(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    setConfirm({
      title: 'Excluir projeto',
      message: 'Todas as atividades vinculadas também serão excluídas.',
      onConfirm: async () => {
        await deleteProject(id);
        setProjects((curr) => curr.filter((p) => p.id !== id));
        setTasks((curr) => curr.filter((t) => t.project_id !== id));
        if (selectedProject?.id === id) setSelectedProject(null);
      },
    });
  }

  async function handleSaveActivity(data: {
    activity: string; description: string; category: string; project_id: string | null;
    status: string; responsible: string; date: string; priority: string;
    co_responsibles: string | null; external_collaborators: string | null; deadline: string | null;
    attachments?: ActivityAttachment[]; links?: ActivityLink[]; removedAttachmentIndices?: number[];
  }) {
    const { task } = activityModal;
    setActivityModal({ open: false, task: null, projectId: null });
    const responsible_id = users.find((u) => u.name === data.responsible)?.id ?? null;
    const coIds = resolveCoResponsibleIds(data.co_responsibles, users);
    const payload = { ...data, project_id: data.project_id ?? undefined, responsible_id, co_responsible_ids: coIds };
    if (task) {
      // UI otimista: reflete a mudança de anexos na hora; a rede roda em 2º plano.
      const optimistic = { ...task, attachments: applyAttachmentChanges(task.attachments ?? [], data) };
      setTasks((curr) => curr.map((t) => (t.id === task.id ? optimistic : t)));
      if (taskDrawer?.id === task.id) setTaskDrawer(optimistic);
      try {
        // Salva os anexos ANTES do updateTask: o refetch que ele dispara já vem com eles.
        await persistAttachments(task.id, data);
        const updated = await updateTask(task, payload); // retorna a task já com os anexos finais
        setTasks((curr) => curr.map((t) => (t.id === task.id ? updated : t)));
        if (taskDrawer?.id === task.id) setTaskDrawer(updated);
        invalidateTasksCache(); // reconcilia outras telas em segundo plano
      } catch {
        setTasks((curr) => curr.map((t) => (t.id === task.id ? task : t))); // reverte
        if (taskDrawer?.id === task.id) setTaskDrawer(task);
        addToast('error', 'Não foi possível salvar', 'As alterações foram desfeitas.');
      }
    } else {
      try {
        const created = await createTask(payload);
        const finalAtts = await persistAttachments(created.id, data);
        const next = finalAtts ? { ...created, attachments: finalAtts } : created;
        setTasks((curr) => [...curr.filter((t) => t.id !== created.id), next]);
        invalidateTasksCache();
      } catch (err) {
        addToast('error', 'Não foi possível criar a atividade', err instanceof Error ? err.message : 'Tente novamente.');
      }
    }
  }

  // Aplica remoções (índices originais, ordem decrescente) e uploads de arquivos/links,
  // em sequência (evita perda de escrita na coluna JSON) e retorna a lista final de anexos
  // devolvida pelo servidor. Propaga erro para o chamador reverter a UI otimista.
  async function persistAttachments(
    taskId: string,
    data: { attachments?: ActivityAttachment[]; links?: ActivityLink[]; removedAttachmentIndices?: number[] },
  ): Promise<TaskAttachment[] | null> {
    let latest: TaskAttachment[] | null = null;
    for (const idx of [...(data.removedAttachmentIndices ?? [])].sort((a, b) => b - a)) {
      latest = await removeTaskAttachment(taskId, idx);
    }
    for (const f of data.attachments ?? []) {
      latest = await addTaskFile(taskId, { name: f.name, data: f.data, mimeType: f.type, size: f.size });
    }
    for (const l of data.links ?? []) {
      latest = await addTaskLink(taskId, l.name, l.url);
    }
    return latest;
  }

  function handleDeleteTask(id: string) {
    setConfirm({ title: 'Excluir atividade', message: 'Esta ação não pode ser desfeita.', onConfirm: async () => {
      await deleteTask(id); setTasks((curr) => curr.filter((t) => t.id !== id)); setTaskDrawer(null);
    }});
  }

  // Abre um anexo (link direto ou arquivo via URL assinada).
  async function openAttachment(kind: 'project' | 'task', id: string, index: number, att: TaskAttachment) {
    if (att.type === 'link') { window.open(att.url, '_blank', 'noopener'); return; }
    try {
      const url = kind === 'project' ? await getProjectAttachmentUrl(id, index) : await getTaskAttachmentUrl(id, index);
      window.open(url, '_blank', 'noopener');
    } catch {
      addToast('error', 'Não foi possível abrir o anexo', 'Tente novamente.');
    }
  }

  const linkedTasks = selectedProject ? tasks.filter((t) => t.project_id === selectedProject.id) : [];
  const doneCount = linkedTasks.filter((t) => t.status_group === 'done').length;
  const progressPct = linkedTasks.length > 0 ? Math.round((doneCount / linkedTasks.length) * 100) : 0;

  return (
    <>
      {/* ── Header ── */}
      <PageHeader
        eyebrow="Portfólio da Diretoria"
        title="Projetos"
        tabBarRight={
          canManageProjects(getUser()?.role) ? (
            <button
              onClick={() => setProjectModal({ open: true, project: null })}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 40, border: 'none', borderBottom: '2px solid transparent', background: 'transparent', color: 'var(--blue)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Plus size={14} />Novo projeto
            </button>
          ) : undefined
        }
      />

      {/* ── Search bar ── */}
      <div style={{ padding: '14px 32px 0', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 10px', background: 'var(--surface)', maxWidth: 320, flex: '1 1 220px' }}>
          <Search size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input type="text" placeholder="Buscar projeto..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'none', fontSize: '0.82rem', color: 'var(--text)', width: '100%', fontFamily: 'inherit' }} />
        </div>

        {/* Toggle: Meus projetos */}
        <button
          type="button"
          onClick={() => setOnlyMine((v) => !v)}
          aria-pressed={onlyMine}
          title={myName ? 'Mostrar apenas projetos em que você é responsável ou participa de alguma atividade' : 'Faça login para filtrar seus projetos'}
          disabled={!myName}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: onlyMine ? 'var(--blue)' : 'var(--surface)', color: onlyMine ? '#fff' : 'var(--text-2)', fontSize: '0.78rem', fontWeight: 600, cursor: myName ? 'pointer' : 'not-allowed', opacity: myName ? 1 : 0.5, fontFamily: 'inherit', flexShrink: 0, transition: 'background 0.12s, color 0.12s' }}
        >
          <User size={13} />
          Meus projetos
          <span style={{ position: 'relative', width: 26, height: 15, borderRadius: 8, background: onlyMine ? 'rgba(255,255,255,0.4)' : 'var(--line-2)', transition: 'background 0.12s', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: 2, left: onlyMine ? 13 : 2, width: 11, height: 11, borderRadius: '50%', background: '#fff', transition: 'left 0.14s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
          </span>
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Carregando projetos…</div>
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Lista editorial */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px 0 0' }}>
            <div className="projects-list">
              {pagedProjects.map((project) => {
                const pTasks = tasks.filter((t) => t.project_id === project.id);
                const pDone  = pTasks.filter((t) => t.status_group === 'done').length;
                const pPct   = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
                const color  = projectColor(project.id);
                const isSelected = selectedProject?.id === project.id;
                // Build member list from users linked to this project's tasks
                const memberNames = Array.from(new Set(
                  pTasks.flatMap(t => [t.responsible, ...(t.co_responsibles ? (() => { try { return JSON.parse(t.co_responsibles!) as string[]; } catch { return []; } })() : [])]).filter(Boolean)
                )) as string[];
                return (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProject(isSelected ? null : project)}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 200px 130px 100px', gap: 24, padding: '18px 32px', alignItems: 'center', borderBottom: '1px solid var(--line-2)', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                  >
                    {/* Col 1: dot + name + status chip + desc */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 2, background: color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, fontSize: '0.96rem', color: 'var(--text)', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
                        {project.executive_status && (
                          <span className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: color, background: color + '14', padding: '2px 8px', borderRadius: 3, flexShrink: 0 }}>{project.executive_status}</span>
                        )}
                      </div>
                      {project.objective && (
                        <p style={{ fontSize: '0.79rem', color: 'var(--text-2)', lineHeight: 1.5, marginTop: 5, paddingLeft: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '52ch' }}>{project.objective}</p>
                      )}
                    </div>

                    {/* Col 2: member avatars (26px, #072f63, overlap -6px) */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {(memberNames.length > 0 ? memberNames : project.owner ? [project.owner] : []).slice(0, 5).map((name, i) => {
                        const inits = name.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                        return (
                          <div key={name} className="mono" title={name} style={{ width: 26, height: 26, borderRadius: '50%', background: '#072f63', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: `${26 * 0.36}px`, marginLeft: i > 0 ? -6 : 0, border: '1.5px solid var(--surface)', flexShrink: 0, zIndex: 5 - i, letterSpacing: '0.5px' }}>
                            {inits}
                          </div>
                        );
                      })}
                    </div>

                    {/* Col 3: Progresso + barra */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                        <span className="mono" style={{ fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)' }}>Progresso</span>
                        <span className="mono" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)' }}>{pPct}%</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--line-2)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${pPct}%`, background: 'var(--blue)', borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                    </div>

                    {/* Col 4: task count */}
                    <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-3)', textAlign: 'right', letterSpacing: '0.3px' }}>{pTasks.length} atividades</div>
                  </div>
                );
              })}

              <div className="project-add-row" onClick={() => setProjectModal({ open: true, project: null })}>
                <Plus size={14} />Novo projeto
              </div>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="pagination">
                <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={12} /></button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i + 1} className={`page-btn${page === i + 1 ? ' active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
                ))}
                <button className="page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={12} /></button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Drawer do projeto — overlay fixo conforme design */}
      {selectedProject && (() => {
        const pTasks2 = tasks.filter(t => t.project_id === selectedProject.id);
        const pDone2  = pTasks2.filter(t => t.status_group === 'done').length;
        const pPct2   = pTasks2.length > 0 ? Math.round((pDone2 / pTasks2.length) * 100) : 0;
        const dotColor = projectColor(selectedProject.id);
        const memberNames2 = Array.from(new Set(
          pTasks2.flatMap(t => [t.responsible, ...(t.co_responsibles ? (() => { try { return JSON.parse(t.co_responsibles!) as string[]; } catch { return []; } })() : [])]).filter(Boolean)
        )) as string[];
        const nameInitials = selectedProject.name.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
        const statusColors2: Record<string, string> = { pending: '#9aa1ac', in_progress: '#034ea2', review: '#E0A92E', done: '#1B8A4B' };
        const canUse = canUseProjectClient(selectedProject, myId, myRole);
        const canEdit = canEditProjectClient(selectedProject, myId, myRole);
        const canManage = canManageProjectClient(selectedProject, myId, myRole);
        // Anexos: os próprios do projeto + os de todas as atividades vinculadas.
        const projectAtts = (selectedProject.attachments ?? []).map((att, i) => ({ att, kind: 'project' as const, id: selectedProject.id, index: i, source: 'Projeto' }));
        const taskAtts = pTasks2.flatMap((t) => (t.attachments ?? []).map((att, i) => ({ att, kind: 'task' as const, id: t.id, index: i, source: t.activity })));
        const taskFiles = taskAtts.filter((a) => a.att.type === 'file');
        const taskLinks = taskAtts.filter((a) => a.att.type === 'link');
        const projFiles = projectAtts.filter((a) => a.att.type === 'file');
        const projLinks = projectAtts.filter((a) => a.att.type === 'link');

        type AttRow = { att: TaskAttachment; kind: 'project' | 'task'; id: string; index: number; source: string };
        const emptyMini = <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', padding: '2px 0' }}>—</div>;

        // Uma linha de anexo. `showSource` mostra de qual atividade veio.
        const renderAtt = (a: AttRow, showSource: boolean) => (
          <div key={`${a.kind}-${a.id}-${a.index}`} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', border: '1px solid var(--line-1)', borderRadius: 3, background: 'var(--surface-2)' }}>
            {a.att.type === 'link'
              ? <LinkIcon size={13} color="var(--blue)" style={{ flexShrink: 0 }} />
              : <Paperclip size={13} color="var(--text-3)" style={{ flexShrink: 0 }} />}
            <button type="button" onClick={() => void openAttachment(a.kind, a.id, a.index, a.att)}
              style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', overflow: 'hidden' }}>
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.att.name}</span>
              {showSource && (
                <span className="mono" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.6rem', color: 'var(--text-3)', letterSpacing: '0.5px', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <FileText size={9} style={{ flexShrink: 0 }} />{a.source}
                </span>
              )}
            </button>
            {a.att.type === 'file' && <Download size={12} color="var(--text-3)" style={{ flexShrink: 0 }} />}
          </div>
        );
        return (
          <>
            {/* Backdrop */}
            <div onClick={() => setSelectedProject(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(7,22,45,0.28)', zIndex: 50 }} />
            {/* Drawer */}
            <div className="ssel" onClick={e => e.stopPropagation()}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 560, maxWidth: '96%', background: 'var(--surface)', overflowY: 'auto', zIndex: 51, borderLeft: '1px solid var(--line-1)', animation: 'drawin .26s cubic-bezier(.4,0,.2,1) both' }}>

              {/* 4px stripe — 4 cores Gov-PI */}
              {/* Faixa Gov-PI comentada a pedido: <div style={{ height: 4, background: 'linear-gradient(90deg,var(--blue-fixed) 0 40%,#E0A92E 40% 55%,#b42318 55% 75%,#1B8A4B 75%)', flexShrink: 0 }} /> */}

              {/* Header: icon box + name + status + close */}
              <div style={{ padding: '22px 28px', borderBottom: '1px solid var(--line-1)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <div className="mono" style={{ width: 44, height: 44, borderRadius: 4, background: dotColor + '14', color: dotColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.88rem', flexShrink: 0 }}>
                    {nameInitials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase' }}>Projeto</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.4px', marginTop: 3 }}>{selectedProject.name}</div>
                    {selectedProject.executive_status && (
                      <div className="mono" style={{ fontSize: '0.66rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: dotColor, marginTop: 3 }}>{selectedProject.executive_status}</div>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedProject(null)}
                  style={{ width: 30, height: 30, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
                  <X size={15} />
                </button>
              </div>

              {/* 3-column stat strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderBottom: '1px solid var(--line-1)' }}>
                {/* Progresso */}
                <div style={{ padding: '14px 20px', borderRight: '1px solid var(--line-1)' }}>
                  <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase' }}>Progresso</div>
                  <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text)', marginTop: 5 }}>{pPct2}%</div>
                  <div style={{ height: 4, background: 'var(--line-2)', borderRadius: 2, marginTop: 8 }}>
                    <div style={{ height: '100%', width: `${pPct2}%`, background: 'var(--blue)', borderRadius: 2 }} />
                  </div>
                </div>
                {/* Atividades */}
                <div style={{ padding: '14px 20px', borderRight: '1px solid var(--line-1)' }}>
                  <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase' }}>Atividades</div>
                  <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text)', marginTop: 5 }}>{pTasks2.length}</div>
                </div>
                {/* Equipe */}
                <div style={{ padding: '14px 20px' }}>
                  <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase' }}>Equipe</div>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                    {memberNames2.slice(0, 5).map((name, i) => {
                      const inits = name.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                      return (
                        <div key={name} className="mono" title={name} style={{ width: 26, height: 26, borderRadius: '50%', background: '#072f63', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: `${26 * 0.36}px`, marginLeft: i > 0 ? -6 : 0, border: '1.5px solid var(--surface)', flexShrink: 0, letterSpacing: '0.5px' }}>
                          {inits}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Content sections */}
              <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                {selectedProject.objective && (
                  <div>
                    <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Objetivo</div>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-2)', lineHeight: 1.65 }}>{selectedProject.objective}</p>
                  </div>
                )}

                {selectedProject.objective && selectedProject.scope && <div style={{ height: 1, background: 'var(--line-2)' }} />}

                {selectedProject.scope && (
                  <div>
                    <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Escopo</div>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-2)', lineHeight: 1.65 }}>{selectedProject.scope}</p>
                  </div>
                )}

                {selectedProject.scope && selectedProject.summary && <div style={{ height: 1, background: 'var(--line-2)' }} />}

                {selectedProject.summary && (
                  <div>
                    <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Resumo atual</div>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-2)', lineHeight: 1.65 }}>{selectedProject.summary}</p>
                  </div>
                )}

                <div style={{ height: 1, background: 'var(--line-2)' }} />

                {/* Atividades vinculadas */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)' }}>Atividades vinculadas</div>
                    {canUse && (
                      <button onClick={() => setActivityModal({ open: true, task: null, projectId: selectedProject.id })}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', border: 'none', borderRadius: 3, background: 'var(--blue)', color: '#fff', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-h)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--blue)')}>
                        <Plus size={12} />Nova atividade
                      </button>
                    )}
                  </div>
                  {pTasks2.length === 0
                    ? <div className="empty-state" style={{ padding: '20px 0' }}><p>Nenhuma atividade vinculada.</p></div>
                    : pTasks2.map(t => (
                      <div key={t.id} onClick={() => setTaskDrawer(t)}
                        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 0', borderBottom: '1px solid var(--line-2)', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                        <span style={{ width: 3, height: 26, borderRadius: 2, background: statusColors2[t.status_group] ?? '#9aa1ac', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.activity}</div>
                          <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: 2 }}>{t.category}</div>
                        </div>
                        <span className="mono" style={{ fontSize: '0.66rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: statusColors2[t.status_group] ?? '#9aa1ac', flexShrink: 0 }}>{statusGroupLabel(t.status_group)}</span>
                      </div>
                    ))
                  }
                </div>

                <div style={{ height: 1, background: 'var(--line-2)' }} />

                {/* ── Atividades — arquivos e links de TODAS as atividades do projeto (grupos colapsáveis) ── */}
                <CollapsibleGroup label="Atividades" count={taskAtts.length} defaultOpen={false}>
                  <div style={{ marginLeft: 8, paddingLeft: 10, borderLeft: '2px solid var(--line-2)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <CollapsibleGroup variant="sub" label="Arquivos" count={taskFiles.length} defaultOpen={false}>
                      {taskFiles.length === 0 ? emptyMini : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{taskFiles.map(a => renderAtt(a, true))}</div>}
                    </CollapsibleGroup>
                    <CollapsibleGroup variant="sub" label="Links" count={taskLinks.length} defaultOpen={false}>
                      {taskLinks.length === 0 ? emptyMini : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{taskLinks.map(a => renderAtt(a, true))}</div>}
                    </CollapsibleGroup>
                  </div>
                </CollapsibleGroup>

                <div style={{ height: 1, background: 'var(--line-2)' }} />

                {/* ── Projeto — arquivos e links do próprio projeto (grupos colapsáveis) ── */}
                <CollapsibleGroup label="Projeto" count={projectAtts.length} defaultOpen={false}>
                  <div style={{ marginLeft: 8, paddingLeft: 10, borderLeft: '2px solid var(--line-2)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <CollapsibleGroup variant="sub" label="Arquivos" count={projFiles.length} defaultOpen={false}>
                      {projFiles.length === 0 ? emptyMini : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{projFiles.map(a => renderAtt(a, false))}</div>}
                    </CollapsibleGroup>
                    <CollapsibleGroup variant="sub" label="Links" count={projLinks.length} defaultOpen={false}>
                      {projLinks.length === 0 ? emptyMini : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{projLinks.map(a => renderAtt(a, false))}</div>}
                    </CollapsibleGroup>
                  </div>
                </CollapsibleGroup>

                {/* Edit/Delete actions — mesmo estilo dos botões do detalhe de atividade */}
                {(canEdit || canManage) && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {canEdit && (
                      <button
                        onClick={() => setProjectModal({ open: true, project: selectedProject })}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.82rem', fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                      >
                        <Pencil size={13} />Editar
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={(e) => handleDeleteProject(selectedProject.id, e)}
                        title="Excluir"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderRadius: 3, border: '1px solid rgba(180,35,24,0.2)', background: 'rgba(180,35,24,0.05)', color: '#b42318', fontSize: '0.82rem', fontFamily: 'inherit', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.10)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.05)')}
                      >
                        <Trash2 size={13} />Excluir
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* Drawer de atividade */}
      {taskDrawer && (
        <DrawerDetalhe
          task={taskDrawer}
          onClose={() => setTaskDrawer(null)}
          onEdit={(t) => { setTaskDrawer(null); setActivityModal({ open: true, task: t, projectId: t.project_id ?? null }); }}
          onDelete={(id) => { setTaskDrawer(null); handleDeleteTask(id); }}
        />
      )}

      <ProjectModal open={projectModal.open} project={projectModal.project} onClose={() => setProjectModal({ open: false, project: null })} onSave={handleSaveProject} users={users} canManageResponsibles={projectModal.project ? canManageProjectClient(projectModal.project, myId, myRole) : true} />
      <ActivityModal open={activityModal.open} task={activityModal.task} projects={projects} tasks={tasks} users={users} fixedProjectId={activityModal.projectId} onClose={() => setActivityModal({ open: false, task: null, projectId: null })} onSave={handleSaveActivity} />
      <ConfirmModal open={!!confirm} title={confirm?.title ?? ''} message={confirm?.message} confirmLabel="Excluir" danger onConfirm={() => confirm?.onConfirm()} onClose={() => setConfirm(null)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
