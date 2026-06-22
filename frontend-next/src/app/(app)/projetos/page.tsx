'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Plus, Pencil, Trash2, X, ChevronLeft,
  ChevronRight, FileText, User, Calendar, Check,
} from 'lucide-react';
import ActivityModal from '@/components/ActivityModal';
import ProjectModal from '@/components/ProjectModal';
import DrawerDetalhe from '@/components/DrawerDetalhe';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import {
  fetchTasks, createTask, updateTask, deleteTask,
  fetchProjects, createProject, updateProject, deleteProject,
  fetchUsers,
} from '@/lib/api';
import { avatarColor, initials, statusGroupLabel } from '@/lib/utils';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import type { UserPublic } from '@/lib/api';
import type { Task, Project } from '@/types';

const PAGE_SIZE = 12;

const PROJECT_COLORS = ['#034ea2','#1b8a4b','#e0a92e','#b42318','#9333ea','#0f766e','#be185d','#0369a1'];
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

export default function ProjetosPage() {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers]       = useState<UserPublic[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const { toasts, addToast, dismissToast } = useToast();

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectModal, setProjectModal] = useState<{ open: boolean; project: Project | null }>({ open: false, project: null });
  const [activityModal, setActivityModal] = useState<{ open: boolean; task: Task | null; projectId: string | null }>({ open: false, task: null, projectId: null });
  const [taskDrawer, setTaskDrawer] = useState<Task | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message?: string; onConfirm: () => void } | null>(null);

  const load = useCallback(() => {
    Promise.all([fetchTasks(), fetchProjects(), fetchUsers()])
      .then(([t, p, u]) => { setTasks(t); setProjects(p); setUsers(u.filter((x) => x.role !== 'Admin')); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefetchOnFocus(load);

  const filteredProjects = useMemo(() => projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())), [projects, search]);
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const pagedProjects = filteredProjects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search]);

  async function handleSaveProject(data: Omit<Project, 'id'>) {
    const { project } = projectModal;
    setProjectModal({ open: false, project: null });
    if (project) {
      const updated = await updateProject(project, data);
      setProjects((curr) => curr.map((p) => (p.id === updated.id ? updated : p)));
      if (selectedProject?.id === updated.id) setSelectedProject(updated);
    } else {
      const created = await createProject(data);
      setProjects((curr) => [...curr, created]);
      addToast('success', 'Projeto criado', `"${created.name}" criado.`);
    }
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
  }) {
    const { task } = activityModal;
    setActivityModal({ open: false, task: null, projectId: null });
    const responsible_id = users.find((u) => u.name === data.responsible)?.id ?? null;
    let coIds: string[] | null = null;
    if (data.co_responsibles) { try { const names = JSON.parse(data.co_responsibles) as string[]; coIds = names.map((n) => users.find((u) => u.name === n)?.id).filter((id): id is string => !!id); } catch { coIds = null; } }
    const payload = { ...data, project_id: data.project_id ?? undefined, responsible_id, co_responsible_ids: coIds };
    if (task) {
      const updated = await updateTask(task, payload);
      setTasks((curr) => curr.map((t) => (t.id === task.id ? updated : t)));
      if (taskDrawer?.id === task.id) setTaskDrawer(updated);
    } else {
      const created = await createTask(payload);
      setTasks((curr) => [...curr, created]);
    }
  }

  function handleDeleteTask(id: string) {
    setConfirm({ title: 'Excluir atividade', message: 'Esta ação não pode ser desfeita.', onConfirm: async () => {
      await deleteTask(id); setTasks((curr) => curr.filter((t) => t.id !== id)); setTaskDrawer(null);
    }});
  }

  const linkedTasks = selectedProject ? tasks.filter((t) => t.project_id === selectedProject.id) : [];
  const doneCount = linkedTasks.filter((t) => t.status_group === 'done').length;
  const progressPct = linkedTasks.length > 0 ? Math.round((doneCount / linkedTasks.length) * 100) : 0;

  return (
    <>
      {/* ── Header ── */}
      <div style={{ padding: '26px 32px 16px', flexShrink: 0, background: 'var(--surface)', borderBottom: '1px solid var(--line-1)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div className="mono" style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-3)', letterSpacing: '1.4px', textTransform: 'uppercase' }}>Portfólio da DEDG</div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 600, letterSpacing: '-0.7px', color: 'var(--text)', marginTop: 6 }}>Projetos</h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 10px', background: 'var(--surface)' }}>
              <Search size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              <input type="text" placeholder="Buscar projeto..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'none', fontSize: '0.82rem', color: 'var(--text)', width: 180, fontFamily: 'inherit' }} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setProjectModal({ open: true, project: null })}>
              <Plus size={13} />Novo projeto
            </button>
          </div>
        </div>
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
                return (
                  <div
                    key={project.id}
                    className="project-row"
                    onClick={() => setSelectedProject(isSelected ? null : project)}
                    style={{ background: isSelected ? 'var(--surface-2)' : undefined }}
                  >
                    <div className="project-row-dot" style={{ background: statusDot(project.executive_status ?? '') }} />
                    <span className="project-row-name">{project.name}</span>
                    {project.executive_status && (
                      <span className="project-row-status">{project.executive_status}</span>
                    )}
                    <div className="project-row-progress">
                      <div className="project-row-progress-fill" style={{ width: `${pPct}%`, background: color }} />
                    </div>
                    <span className="project-row-count mono">{pTasks.length} ativ.</span>
                    {project.owner && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        <div className="task-avatar" style={{ background: avatarColor(project.owner) }}>{initials(project.owner)}</div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, opacity: 0 }} className="project-row-actions"
                      onClick={(e) => e.stopPropagation()}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
                    >
                      <button className="btn btn-ghost btn-xs" onClick={() => setProjectModal({ open: true, project })}><Pencil size={12} /></button>
                      <button className="btn btn-danger btn-xs" onClick={(e) => handleDeleteProject(project.id, e)}><Trash2 size={12} /></button>
                    </div>
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

          {/* Painel lateral do projeto selecionado */}
          {selectedProject && (
            <div style={{ width: 420, borderLeft: '1px solid var(--line-1)', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--line-1)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusDot(selectedProject.executive_status ?? ''), flexShrink: 0 }} />
                    <h2 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{selectedProject.name}</h2>
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {selectedProject.owner && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text-3)' }}><User size={11} />{selectedProject.owner}</span>
                    )}
                    {selectedProject.deadline && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text-3)' }} className="mono"><Calendar size={11} />{selectedProject.deadline}</span>
                    )}
                  </div>
                </div>
                <button className="btn btn-ghost btn-xs" onClick={() => setSelectedProject(null)}><X size={14} /></button>
              </div>

              {/* Progresso */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line-1)', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'var(--mono)' }}>Progresso</span>
                  <span className="mono" style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--blue)' }}>{progressPct}%</span>
                </div>
                <div style={{ height: 3, background: 'var(--line-1)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--blue)', borderRadius: 2, transition: 'width 0.3s ease' }} />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>{doneCount}/{linkedTasks.length} concluídas</span>
                </div>
              </div>

              {/* Objetivo / Escopo / Resumo */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-1)', display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
                {selectedProject.objective && (
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 4 }}>Objetivo</div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{selectedProject.objective}</p>
                  </div>
                )}
                {selectedProject.scope && (
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 4 }}>Escopo</div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{selectedProject.scope}</p>
                  </div>
                )}
              </div>

              {/* Atividades vinculadas */}
              <div style={{ padding: '12px 20px 0', flex: 1, overflow: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)' }}>Atividades ({linkedTasks.length})</span>
                  <button className="btn btn-primary btn-xs" onClick={() => setActivityModal({ open: true, task: null, projectId: selectedProject.id })}><Plus size={11} />Adicionar</button>
                </div>
                {linkedTasks.length === 0
                  ? <div className="empty-state" style={{ padding: '20px 0' }}><p>Nenhuma atividade vinculada.</p></div>
                  : linkedTasks.map((t) => (
                    <div key={t.id} onClick={() => setTaskDrawer(t)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--line-2)', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLElement).style.margin = '0 -20px'; (e.currentTarget as HTMLElement).style.padding = '9px 20px'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.margin = ''; (e.currentTarget as HTMLElement).style.padding = '9px 0'; }}>
                      <div style={{ width: 2, height: 28, background: t.status_group === 'done' ? 'var(--s-done)' : t.status_group === 'review' ? 'var(--s-review)' : t.status_group === 'in_progress' ? 'var(--s-progress)' : 'var(--s-pending)', borderRadius: 1, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.activity}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', display: 'flex', gap: 6, marginTop: 2 }}>
                          <span className="mono">{statusGroupLabel(t.status_group)}</span>
                          {t.responsible && <span>· {t.responsible}</span>}
                        </div>
                      </div>
                      {t.status_group === 'done' && <Check size={12} style={{ color: 'var(--s-done)', flexShrink: 0 }} />}
                    </div>
                  ))
                }
              </div>

              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line-1)', display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setProjectModal({ open: true, project: selectedProject })}><Pencil size={12} />Editar</button>
                <button className="btn btn-danger btn-sm" onClick={(e) => handleDeleteProject(selectedProject.id, e)}><Trash2 size={12} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drawer de atividade */}
      {taskDrawer && (
        <DrawerDetalhe
          task={taskDrawer}
          onClose={() => setTaskDrawer(null)}
          onEdit={(t) => { setTaskDrawer(null); setActivityModal({ open: true, task: t, projectId: t.project_id ?? null }); }}
          onDelete={(id) => { setTaskDrawer(null); handleDeleteTask(id); }}
        />
      )}

      <ProjectModal open={projectModal.open} project={projectModal.project} onClose={() => setProjectModal({ open: false, project: null })} onSave={handleSaveProject} users={users} />
      <ActivityModal open={activityModal.open} task={activityModal.task} projects={projects} users={users} fixedProjectId={activityModal.projectId} onClose={() => setActivityModal({ open: false, task: null, projectId: null })} onSave={handleSaveActivity} />
      <ConfirmModal open={!!confirm} title={confirm?.title ?? ''} message={confirm?.message} confirmLabel="Excluir" danger onConfirm={() => confirm?.onConfirm()} onClose={() => setConfirm(null)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
