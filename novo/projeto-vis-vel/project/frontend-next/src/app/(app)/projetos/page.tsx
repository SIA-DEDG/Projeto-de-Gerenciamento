'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Download, Search, FileText, User, Calendar, Check, Trash2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import ActivityModal from '@/components/ActivityModal';
import ProjectModal from '@/components/ProjectModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import {
  fetchTasks, createTask, updateTask, deleteTask,
  fetchProjects, createProject, updateProject, deleteProject,
  fetchUsers,
} from '@/lib/api';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import type { UserPublic } from '@/lib/api';
import { statusClass } from '@/lib/utils';
import type { Task, Project } from '@/types';

const DOWNLOAD_URL = 'STORAGE_URL_AQUI';
const PAGE_SIZE = 9;

const PROJECT_COLORS = ['#034ea2','#15803d','#9333ea','#b91c1c','#b45309','#0f766e','#be185d','#0369a1'];
function projectColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return PROJECT_COLORS[Math.abs(h) % PROJECT_COLORS.length];
}

// Página de projetos e atividades vinculadas, com CRUD completo para ambos.
export default function RelatoriosPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [dlHover, setDlHover] = useState(false);
  const { toasts, addToast, dismissToast } = useToast();

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectionMode, setSelectionMode]     = useState(false);
  const [selectedIds, setSelectedIds]         = useState<Set<string>>(new Set());
  const [search, setSearch]                   = useState('');
  const [currentPage, setCurrentPage]         = useState(1);

  const filteredProjects = useMemo(() =>
    projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
    [projects, search]
  );
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const pagedProjects = filteredProjects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const [projectModal, setProjectModal] = useState<{ open: boolean; project: Project | null }>({
    open: false, project: null,
  });
  const [activityModal, setActivityModal] = useState<{ open: boolean; task: Task | null; projectId: string | null }>({
    open: false, task: null, projectId: null,
  });
  const [taskDetail, setTaskDetail] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message?: string; onConfirm: () => void } | null>(null);

  // Carrega tarefas, projetos e usuários em paralelo.
  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchTasks(), fetchProjects(), fetchUsers()])
      .then(([fetchedTasks, fetchedProjects, allUsers]) => { setTasks(fetchedTasks); setProjects(fetchedProjects); setUsers(allUsers.filter((user) => user.role !== 'Admin')); })
      .catch((error) => setError(`Erro ao carregar dados: ${error?.message ?? error}`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefetchOnFocus(load);

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(DOWNLOAD_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modelo-importacao.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'Sucesso', 'Download realizado com sucesso!');
    } catch {
      addToast('error', 'Erro', 'Arquivo indisponível. Tente novamente.');
    } finally {
      setDownloading(false);
    }
  }

  // Cria ou atualiza um projeto e sincroniza o estado local.
  async function handleSaveProject(data: Omit<Project, 'id'>) {
    const { project } = projectModal;
    setProjectModal({ open: false, project: null });
    try {
      if (project) {
        const updated = await updateProject(project, data);
        setProjects((currentProjects) => currentProjects.map((project) => (project.id === updated.id ? updated : project)));
        if (selectedProject?.id === updated.id) setSelectedProject(updated);
      } else {
        const created = await createProject(data);
        setProjects((currentProjects) => [...currentProjects, created]);
        addToast('success', 'Projeto criado', `"${created.name}" foi criado com sucesso.`);
      }
    } catch (error: unknown) {
      setError(`Erro ao salvar projeto: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Exibe confirmação e exclui o projeto junto com suas atividades.
  function handleDeleteProject(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    setConfirmDialog({
      title: 'Excluir projeto',
      message: 'Todas as atividades vinculadas também serão excluídas. Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteProject(id);
          setProjects((currentProjects) => currentProjects.filter((project) => project.id !== id));
          setTasks((currentTasks) => currentTasks.filter((task) => task.project_id !== id));
          if (selectedProject?.id === id) setSelectedProject(null);
        } catch (err: unknown) {
          setError(`Erro ao excluir projeto: ${err instanceof Error ? err.message : err}`);
        }
      },
    });
  }

  // Alterna a seleção de um card de projeto no modo de seleção múltipla.
  function toggleCardSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Seleciona todos os projetos ou limpa a seleção.
  function toggleSelectAll() {
    if (selectedIds.size === filteredProjects.length && filteredProjects.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProjects.map((project) => project.id)));
    }
  }

  // Sai do modo de seleção e limpa os itens selecionados.
  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  // Exclui todos os projetos selecionados em lote.
  function handleDeleteSelected() {
    const count = selectedIds.size;
    if (count === 0) return;
    setConfirmDialog({
      title: `Excluir ${count} projeto${count > 1 ? 's' : ''}`,
      message: 'Todas as atividades vinculadas também serão excluídas. Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        const ids = [...selectedIds];
        const failed: string[] = [];
        for (const id of ids) {
          try { await deleteProject(id); } catch { failed.push(id); }
        }
        const deleted = new Set(ids.filter((id) => !failed.includes(id)));
        setProjects((currentProjects) => currentProjects.filter((project) => !deleted.has(project.id)));
        setTasks((currentTasks) => currentTasks.filter((task) => !task.project_id || !deleted.has(task.project_id)));
        if (selectedProject && deleted.has(selectedProject.id)) setSelectedProject(null);
        if (failed.length > 0) setError(`Falha ao excluir ${failed.length} projeto(s).`);
        exitSelectionMode();
      },
    });
  }

  // Cria ou atualiza uma atividade vinculada a um projeto.
  async function handleSaveActivity(data: {
    activity: string;
    description: string;
    category: string;
    project_id: string | null;
    status: string;
    responsible: string;
    date: string;
    priority: string;
    co_responsibles: string | null;
    external_collaborators: string | null;
    deadline: string | null;
  }) {
    const { task } = activityModal;
    setActivityModal({ open: false, task: null, projectId: null });
    try {
      const responsible_id = users.find((user) => user.name === data.responsible)?.id ?? null;
      let co_responsible_ids: string[] | null = null;
      if (data.co_responsibles) {
        try {
          const names: string[] = JSON.parse(data.co_responsibles);
          const ids = names.map((name) => users.find((user) => user.name === name)?.id).filter((id): id is string => id !== undefined);
          co_responsible_ids = ids.length > 0 ? ids : null;
        } catch { co_responsible_ids = null; }
      }

      const payload = { ...data, project_id: data.project_id ?? undefined, responsible_id, co_responsible_ids };
      if (task) {
        const updated = await updateTask(task, payload);
        setTasks((currentTasks) => currentTasks.map((existingTask) => (existingTask.id === task.id ? updated : existingTask)));
      } else {
        const created = await createTask(payload);
        setTasks((currentTasks) => [...currentTasks, created]);
      }
    } catch (err: unknown) {
      setError(`Erro ao salvar atividade: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Exibe confirmação e exclui a atividade pelo id.
  function handleDeleteTask(id: string) {
    setConfirmDialog({
      title: 'Excluir atividade',
      message: 'Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteTask(id);
          setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
        } catch (err: unknown) {
          setError(`Erro ao excluir atividade: ${err instanceof Error ? err.message : err}`);
        }
      },
    });
  }

  const linkedTasks = selectedProject
    ? tasks.filter((task) => task.project_id === selectedProject.id)
    : [];

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <h1>Projetos</h1>
        </div>
        <div className="topbar-right">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            onMouseEnter={() => setDlHover(true)}
            onMouseLeave={() => setDlHover(false)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 7, fontSize: '0.82rem', fontWeight: 600,
              cursor: downloading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              border: dlHover && !downloading ? '1px solid #16a34a' : '1px solid var(--border-light)',
              background: dlHover && !downloading ? '#f0fdf4' : '#fff',
              color: dlHover && !downloading ? '#16a34a' : 'var(--text-secondary)',
              opacity: downloading ? 0.65 : 1,
            }}
          >
            {downloading ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Baixando…
              </>
            ) : (
              <>
                <Download size={14} />
                Baixar modelo padrão
              </>
            )}
          </button>
        </div>
      </header>

      <div className="page-content">
        <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>Gerenciar projetos</h2>
            <p className="subtitle">Clique em um projeto para ver detalhes e atividades.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {selectedIds.size > 0 && (
              <>
                <button type="button" className="btn-secondary" onClick={() => setSelectedIds(new Set())}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleDeleteSelected}
                  style={{ background: '#de350b' }}
                >
                  Excluir {selectedIds.size} projeto{selectedIds.size !== 1 ? 's' : ''}
                </button>
              </>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={toggleSelectAll}
              style={{ minWidth: 140 }}
            >
              {selectedIds.size === filteredProjects.length && filteredProjects.length > 0 ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
          </div>
        </div>

        {/* Busca */}
        <div style={{ padding: '0 32px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, maxWidth: 360, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid var(--border-light)', borderRadius: 10, padding: '8px 14px', boxShadow: '0 1px 4px rgba(3,78,162,0.05)' }}>
            <Search size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar projeto..."
              style={{ border: 'none', outline: 'none', background: 'none', fontSize: '0.88rem', color: 'var(--text-primary)', width: '100%', fontFamily: 'inherit' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1, padding: 0, fontSize: '1rem' }}>×</button>
            )}
          </div>
          {search && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{filteredProjects.length} resultado{filteredProjects.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {error && (
          <div style={{ margin: '0 32px 16px', padding: '12px 16px', borderRadius: 8, fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffebe6', color: '#de350b' }}>
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', color: '#de350b' }}>×</button>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Carregando projetos...</p>
          </div>
        ) : projects.length === 0 ? (
          <div style={{ padding: '64px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={26} color="var(--primary)" strokeWidth={1.5} />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>Nenhum projeto cadastrado ainda.</p>
            <button type="button" className="btn-primary" onClick={() => setProjectModal({ open: true, project: null })}>+ Criar primeiro projeto</button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Nenhum projeto encontrado para &ldquo;{search}&rdquo;.
          </div>
        ) : (
          <>
            <div className="project-cards-grid">
              {pagedProjects.map((project) => {
                const count = tasks.filter((task) => task.project_id === project.id).length;
                const isSelected = selectedIds.has(project.id);
                const color = projectColor(project.id);
                const initials = project.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
                return (
                  <article
                    key={project.id}
                    className="project-card"
                    onClick={() => !isSelected && setSelectedProject(project)}
                    title={`Abrir ${project.name}`}
                  >
                    {/* Color accent top bar */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: color, borderRadius: '8px 8px 0 0' }} />

                    <div
                      style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}
                      onClick={(e) => { e.stopPropagation(); toggleCardSelection(project.id); }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 4,
                        border: `2px solid ${isSelected ? color : '#c1c7d0'}`,
                        background: isSelected ? color : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                      }}>
                        {isSelected && <Check size={11} color="#fff" strokeWidth={3} />}
                      </div>
                    </div>

                    {/* Avatar + name */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingRight: 24, marginTop: 4 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.82rem', flexShrink: 0, letterSpacing: '-0.5px' }}>
                        {initials}
                      </div>
                      <div className="project-card-name" style={{ paddingRight: 0, marginTop: 4 }}>{project.name}</div>
                    </div>

                    <div className="project-card-meta">
                      {project.owner && (
                        <div className="project-card-meta-row">
                          <User size={12} />
                          {project.owner}
                        </div>
                      )}
                      {project.deadline && (
                        <div className="project-card-meta-row">
                          <Calendar size={12} />
                          {project.deadline}
                        </div>
                      )}
                    </div>

                    {project.executive_status && (
                      <span className="project-card-status" style={{ background: `${color}14`, color }}>{project.executive_status}</span>
                    )}

                    <div className="project-card-footer">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${color}12`, color, borderRadius: 20, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                        <Check size={10} strokeWidth={2.5} />
                        {count} atividade{count !== 1 ? 's' : ''}
                      </span>
                      <div className="project-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="evidence-btn"
                          style={{ background: 'var(--primary-light)', borderColor: 'transparent', color: 'var(--primary)' }}
                          onClick={() => setProjectModal({ open: true, project })} title="Editar projeto">
                          Editar
                        </button>
                        <button type="button" className="evidence-btn"
                          style={{ background: '#fff5f5', borderColor: 'transparent', color: '#dc2626', padding: '4px 8px' }}
                          onClick={(e) => handleDeleteProject(project.id, e)} title="Excluir projeto">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Paginação */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '20px 32px 32px' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-light)', background: currentPage === 1 ? 'var(--bg-app)' : '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPage === 1 ? 0.5 : 1 }}>
                <ChevronLeft size={13} strokeWidth={2.5} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setCurrentPage(p)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: p === currentPage ? 'none' : '1px solid var(--border-light)', background: p === currentPage ? 'var(--primary)' : '#fff', color: p === currentPage ? '#fff' : 'var(--text-secondary)', fontWeight: p === currentPage ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-light)', background: currentPage === totalPages ? 'var(--bg-app)' : '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPage === totalPages ? 0.5 : 1 }}>
                <ChevronRight size={13} strokeWidth={2.5} />
              </button>
            </div>
          </>
        )}
      </div>

      {selectedProject && (() => {
        const detailColor = projectColor(selectedProject.id);
        const detailInitials = selectedProject.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
        return (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedProject(null); }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(3,78,162,0.22)', backdropFilter: 'blur(2px)', zIndex: 200, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', animation: 'overlayFadeIn 0.2s ease' }}
          >
            <div style={{ width: 'min(720px, 100%)', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'panelSlideIn 0.25s ease', boxShadow: '-8px 0 40px rgba(3,78,162,0.12)' }}>
              {/* Piauí flag stripe */}
              <div style={{ height: 5, flexShrink: 0, background: 'linear-gradient(to right, #034ea2 40%, #fdb913 40% 55%, #ef4123 55% 75%, #007932 75%)' }} />

              {/* Header */}
              <div style={{ background: '#fff', borderBottom: '1px solid var(--border-light)', padding: '20px 28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${detailColor}18`, color: detailColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                    {detailInitials}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 4 }}>Projeto</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{selectedProject.name}</div>
                    {selectedProject.category && (
                      <div style={{ fontSize: '0.75rem', marginTop: 3, color: detailColor, fontWeight: 600 }}>{selectedProject.category}</div>
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedProject(null)} aria-label="Fechar"
                  style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-subtle)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
                  ✕
                </button>
              </div>

              {/* Meta */}
              {(selectedProject.owner || selectedProject.deadline || selectedProject.executive_status) && (
                <div style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)', padding: '14px 28px', display: 'flex', flexWrap: 'wrap', gap: 20, flexShrink: 0 }}>
                  {selectedProject.owner && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                        <User size={10} style={{ marginRight: 4 }} />
                        Responsável
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{selectedProject.owner}</span>
                    </div>
                  )}
                  {selectedProject.deadline && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                        <Calendar size={10} style={{ marginRight: 4 }} />
                        Prazo
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{selectedProject.deadline}</span>
                    </div>
                  )}
                  {selectedProject.executive_status && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>Status Executivo</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: detailColor, background: `${detailColor}14`, borderRadius: 20, padding: '2px 10px', display: 'inline-block', marginTop: 2 }}>{selectedProject.executive_status}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg-app)' }}>
                {selectedProject.objective && (
                  <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border-light)', padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Objetivo</div>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>{selectedProject.objective}</p>
                  </div>
                )}
                {selectedProject.scope && (
                  <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border-light)', padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Escopo</div>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>{selectedProject.scope}</p>
                  </div>
                )}
                {selectedProject.summary && (
                  <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border-light)', padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Resumo</div>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>{selectedProject.summary}</p>
                  </div>
                )}

                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: linkedTasks.length > 0 ? '1px solid var(--border-light)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Atividades</span>
                      <span style={{ background: `${detailColor}14`, color: detailColor, borderRadius: 20, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{linkedTasks.length}</span>
                    </div>
                    <button type="button" className="btn-primary" style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                      onClick={() => setActivityModal({ open: true, task: null, projectId: selectedProject.id })}>
                      + Nova Atividade
                    </button>
                  </div>

                  {linkedTasks.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Check size={28} strokeWidth={1.5} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Nenhuma atividade vinculada.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {linkedTasks.map((task, idx) => (
                        <div key={task.id} className="project-task-row"
                          style={{ cursor: 'pointer', borderRadius: 0, borderBottom: idx < linkedTasks.length - 1 ? '1px solid var(--border-light)' : 'none', border: 'none' }}
                          onClick={() => setTaskDetail({ open: true, task })}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="project-task-name">{task.activity}</div>
                            {task.responsible && <div className="project-task-responsible">{task.responsible}</div>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span className={statusClass(task.status_group)}>{task.status}</span>
                            <button type="button" style={{ background: 'var(--primary-light)', border: 'none', borderRadius: 7, color: 'var(--primary)', padding: '5px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                              onClick={(e) => { e.stopPropagation(); setActivityModal({ open: true, task, projectId: selectedProject.id }); }}>
                              Editar
                            </button>
                            <button type="button" style={{ background: '#fff5f5', border: 'none', borderRadius: 7, color: '#dc2626', padding: '5px', cursor: 'pointer', display: 'flex' }}
                              onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <ProjectModal
        open={projectModal.open}
        project={projectModal.project}
        onClose={() => setProjectModal({ open: false, project: null })}
        onSave={handleSaveProject}
        users={users}
      />

      <ActivityModal
        open={activityModal.open}
        task={activityModal.task}
        projects={projects}
        users={users}
        fixedProjectId={activityModal.projectId}
        onClose={() => setActivityModal({ open: false, task: null, projectId: null })}
        onSave={handleSaveActivity}
      />

      <TaskDetailModal
        open={taskDetail.open}
        task={taskDetail.task}
        projectName={selectedProject?.name}
        onClose={() => setTaskDetail({ open: false, task: null })}
        onEdit={(task) => {
          setTaskDetail({ open: false, task: null });
          setActivityModal({ open: true, task, projectId: selectedProject?.id ?? null });
        }}
        onDelete={(id) => {
          setTaskDetail({ open: false, task: null });
          handleDeleteTask(id);
        }}
      />

      <ConfirmModal
        open={!!confirmDialog}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message}
        confirmLabel="Excluir"
        danger
        onConfirm={() => confirmDialog?.onConfirm()}
        onClose={() => setConfirmDialog(null)}
      />

      {!selectedProject && !projectModal.open && !activityModal.open && !taskDetail.open && (
        <button
          className="kanban-fab"
          onClick={() => setProjectModal({ open: true, project: null })}
          title="Novo projeto"
          style={{
            position: 'fixed', bottom: 32, right: 32, zIndex: 900,
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--primary)', color: '#fff', border: 'none',
            boxShadow: '0 4px 16px rgba(3,78,162,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Plus width={20} height={20} />
        </button>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
