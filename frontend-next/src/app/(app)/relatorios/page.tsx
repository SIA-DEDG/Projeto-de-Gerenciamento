'use client';

import { useState, useEffect, useCallback } from 'react';
import ActivityModal from '@/components/ActivityModal';
import ProjectModal from '@/components/ProjectModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import ConfirmModal from '@/components/ConfirmModal';
import {
  fetchTasks, createTask, updateTask, deleteTask,
  fetchProjects, createProject, updateProject, deleteProject,
  fetchUsers,
} from '@/lib/api';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import type { UserPublic } from '@/lib/api';
import { statusClass } from '@/lib/utils';
import type { Task, Project } from '@/types';

export default function RelatoriosPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectionMode, setSelectionMode]     = useState(false);
  const [selectedIds, setSelectedIds]         = useState<Set<string>>(new Set());

  const [projectModal, setProjectModal] = useState<{ open: boolean; project: Project | null }>({
    open: false, project: null,
  });
  const [activityModal, setActivityModal] = useState<{ open: boolean; task: Task | null; projectId: string | null }>({
    open: false, task: null, projectId: null,
  });
  const [taskDetail, setTaskDetail] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message?: string; onConfirm: () => void } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchTasks(), fetchProjects(), fetchUsers()])
      .then(([fetchedTasks, fetchedProjects, allUsers]) => { setTasks(fetchedTasks); setProjects(fetchedProjects); setUsers(allUsers.filter((user) => user.role !== 'Admin')); })
      .catch((error) => setError(`Erro ao carregar dados: ${error?.message ?? error}`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefetchOnFocus(load);

  // ── Projects ────────────────────────────────────────────────────────────────

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
      }
    } catch (error: unknown) {
      setError(`Erro ao salvar projeto: ${error instanceof Error ? error.message : error}`);
    }
  }

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

  function toggleCardSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === projects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(projects.map((project) => project.id)));
    }
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

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

  // ── Activities ───────────────────────────────────────────────────────────────

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

  // ── Derived ──────────────────────────────────────────────────────────────────

  const linkedTasks = selectedProject
    ? tasks.filter((task) => task.project_id === selectedProject.id)
    : [];

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <h1>Relatórios</h1>
        </div>
        <div className="topbar-right">
        </div>
      </header>

      <div className="page-content">
        {/* Page header */}
        <div
          className="dashboard-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
        >
          <div>
            <h2>Projetos</h2>
            <p className="subtitle">Clique em um projeto para ver detalhes e atividades.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {selectionMode ? (
              <>
                <button type="button" className="btn-secondary" onClick={exitSelectionMode}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={toggleSelectAll}
                  style={{ minWidth: 140 }}
                >
                  {selectedIds.size === projects.length && projects.length > 0 ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={selectedIds.size === 0}
                  onClick={handleDeleteSelected}
                  style={{ background: selectedIds.size > 0 ? '#de350b' : undefined, opacity: selectedIds.size === 0 ? 0.5 : 1 }}
                >
                  Excluir{selectedIds.size > 0 ? ` ${selectedIds.size}` : ''} projeto{selectedIds.size !== 1 ? 's' : ''}
                </button>
              </>
            ) : (
              <>
                {projects.length > 0 && (
                  <button type="button" className="btn-secondary" onClick={() => setSelectionMode(true)}>
                    Selecionar
                  </button>
                )}
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setProjectModal({ open: true, project: null })}
                >
                  + Novo Projeto
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div style={{ margin: '0 32px 16px', padding: '12px 16px', background: '#ffebe6', borderRadius: '4px', color: '#de350b', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#de350b', fontWeight: 700, fontSize: '1rem' }}>×</button>
          </div>
        )}

        {/* Cards grid */}
        {loading ? (
          <div className="loading-state">
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Carregando projetos...</p>
          </div>
        ) : projects.length === 0 ? (
          <div style={{ padding: '48px 32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '16px' }}>
              Nenhum projeto cadastrado ainda.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setProjectModal({ open: true, project: null })}
            >
              + Criar primeiro projeto
            </button>
          </div>
        ) : (
          <div className="project-cards-grid">
            {projects.map((project) => {
              const count = tasks.filter((task) => task.project_id === project.id).length;
              const isSelected = selectedIds.has(project.id);
              return (
                <article
                  key={project.id}
                  className="project-card"
                  onClick={() => selectionMode ? toggleCardSelection(project.id) : setSelectedProject(project)}
                  title={selectionMode ? (isSelected ? 'Desmarcar' : 'Selecionar') : `Abrir ${project.name}`}
                  style={isSelected ? { outline: '2px solid #0052cc', background: '#e8f0fe' } : undefined}
                >
                  {/* Checkbox overlay in selection mode */}
                  {selectionMode && (
                    <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCardSelection(project.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0052cc' }}
                      />
                    </div>
                  )}

                  <div className="project-card-name" style={selectionMode ? { paddingRight: 28 } : undefined}>{project.name}</div>

                  <div className="project-card-meta">
                    {project.owner && (
                      <div className="project-card-meta-row">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                        {project.owner}
                      </div>
                    )}
                    {project.deadline && (
                      <div className="project-card-meta-row">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        {project.deadline}
                      </div>
                    )}
                  </div>

                  {project.executive_status && (
                    <span className="project-card-status">{project.executive_status}</span>
                  )}

                  <div className="project-card-footer">
                    <span className="project-card-task-count">{count} atividade{count !== 1 ? 's' : ''}</span>
                    {!selectionMode && (
                      <div className="project-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="evidence-btn"
                          style={{ background: '#e3f2fd', borderColor: '#0052cc', color: '#0052cc' }}
                          onClick={() => setProjectModal({ open: true, project })}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="evidence-btn"
                          style={{ background: '#ffebe6', borderColor: '#de350b', color: '#de350b' }}
                          onClick={(e) => handleDeleteProject(project.id, e)}
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Project detail overlay ─────────────────────────────────── */}
      {selectedProject && (
        <div
          className="project-detail-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedProject(null); }}
        >
          <div className="project-detail-panel">
            {/* Header */}
            <div className="project-detail-header">
              <div>
                <div className="project-detail-title">{selectedProject.name}</div>
                {selectedProject.category && (
                  <div style={{ fontSize: '0.78rem', color: '#6b778c', marginTop: '4px' }}>{selectedProject.category}</div>
                )}
              </div>
              <button
                type="button"
                className="project-detail-close"
                onClick={() => setSelectedProject(null)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            {/* Meta */}
            {(selectedProject.owner || selectedProject.deadline || selectedProject.executive_status) && (
              <div className="project-detail-meta">
                {selectedProject.owner && (
                  <div className="project-detail-meta-item">
                    <span className="project-detail-meta-label">Responsável</span>
                    <span className="project-detail-meta-value">{selectedProject.owner}</span>
                  </div>
                )}
                {selectedProject.deadline && (
                  <div className="project-detail-meta-item">
                    <span className="project-detail-meta-label">Prazo</span>
                    <span className="project-detail-meta-value">{selectedProject.deadline}</span>
                  </div>
                )}
                {selectedProject.executive_status && (
                  <div className="project-detail-meta-item">
                    <span className="project-detail-meta-label">Status Executivo</span>
                    <span className="project-detail-meta-value">{selectedProject.executive_status}</span>
                  </div>
                )}
              </div>
            )}

            {/* Body */}
            <div className="project-detail-body">
              {/* Narrative fields */}
              {selectedProject.objective && (
                <div>
                  <div className="project-detail-section-title">Objetivo</div>
                  <p style={{ fontSize: '0.875rem', color: '#344563', lineHeight: 1.6 }}>{selectedProject.objective}</p>
                </div>
              )}
              {selectedProject.scope && (
                <div>
                  <div className="project-detail-section-title">Escopo</div>
                  <p style={{ fontSize: '0.875rem', color: '#344563', lineHeight: 1.6 }}>{selectedProject.scope}</p>
                </div>
              )}
              {selectedProject.summary && (
                <div>
                  <div className="project-detail-section-title">Resumo</div>
                  <p style={{ fontSize: '0.875rem', color: '#344563', lineHeight: 1.6 }}>{selectedProject.summary}</p>
                </div>
              )}

              {/* Activities section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div className="project-detail-section-title" style={{ marginBottom: 0 }}>
                    Atividades ({linkedTasks.length})
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                    onClick={() => setActivityModal({ open: true, task: null, projectId: selectedProject.id })}
                  >
                    + Nova Atividade
                  </button>
                </div>

                {linkedTasks.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
                    Nenhuma atividade vinculada. Clique em &ldquo;+ Nova Atividade&rdquo; para adicionar.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {linkedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="project-task-row"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setTaskDetail({ open: true, task })}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="project-task-name">{task.activity}</div>
                          {task.responsible && (
                            <div className="project-task-responsible">{task.responsible}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <span className={statusClass(task.status_group)}>{task.status}</span>
                          <button
                            type="button"
                            className="evidence-btn"
                            style={{ background: '#e3f2fd', borderColor: '#0052cc', color: '#0052cc' }}
                            onClick={(e) => { e.stopPropagation(); setActivityModal({ open: true, task, projectId: selectedProject.id }); }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="evidence-btn"
                            style={{ background: '#ffebe6', borderColor: '#de350b', color: '#de350b' }}
                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                          >
                            Excluir
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
      )}

      <ProjectModal
        open={projectModal.open}
        project={projectModal.project}
        onClose={() => setProjectModal({ open: false, project: null })}
        onSave={handleSaveProject}
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
    </>
  );
}
