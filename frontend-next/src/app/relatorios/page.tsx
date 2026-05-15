'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import ActivityModal from '@/components/ActivityModal';
import ProjectModal from '@/components/ProjectModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import {
  fetchTasks, createTask, updateTask, deleteTask,
  fetchProjects, createProject, updateProject, deleteProject,
} from '@/lib/api';
import { statusClass } from '@/lib/utils';
import type { Task, Project } from '@/types';

export default function RelatoriosPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [projectModal, setProjectModal] = useState<{ open: boolean; project: Project | null }>({
    open: false, project: null,
  });
  const [activityModal, setActivityModal] = useState<{ open: boolean; task: Task | null; projectId: number | null }>({
    open: false, task: null, projectId: null,
  });
  const [taskDetail, setTaskDetail] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchTasks(), fetchProjects()])
      .then(([t, p]) => { setTasks(t); setProjects(p); })
      .catch((e) => setError(`Erro ao carregar dados: ${e?.message ?? e}`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Projects ────────────────────────────────────────────────────────────────

  async function handleSaveProject(data: Omit<Project, 'id'>) {
    const { project } = projectModal;
    setProjectModal({ open: false, project: null });
    try {
      if (project) {
        const updated = await updateProject(project, data);
        setProjects((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
        if (selectedProject?.id === updated.id) setSelectedProject(updated);
      } else {
        const created = await createProject(data);
        setProjects((ps) => [...ps, created]);
      }
    } catch (e: unknown) {
      setError(`Erro ao salvar projeto: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function handleDeleteProject(id: number, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!confirm('Excluir este projeto permanentemente?')) return;
    try {
      await deleteProject(id);
      setProjects((ps) => ps.filter((p) => p.id !== id));
      if (selectedProject?.id === id) setSelectedProject(null);
    } catch (err: unknown) {
      setError(`Erro ao excluir projeto: ${err instanceof Error ? err.message : err}`);
    }
  }

  // ── Activities ───────────────────────────────────────────────────────────────

  async function handleSaveActivity(data: {
    activity: string;
    description: string;
    category: string;
    project_id: number | null;
    status: string;
    responsible: string;
    date: string;
  }) {
    const { task } = activityModal;
    setActivityModal({ open: false, task: null, projectId: null });
    try {
      const payload = { ...data, project_id: data.project_id ?? undefined };
      if (task) {
        const updated = await updateTask(task, payload);
        setTasks((ts) => ts.map((t) => (t.id === task.id ? updated : t)));
      } else {
        const created = await createTask(payload);
        setTasks((ts) => [...ts, created]);
      }
    } catch (err: unknown) {
      setError(`Erro ao salvar atividade: ${err instanceof Error ? err.message : err}`);
    }
  }

  async function handleDeleteTask(id: number) {
    if (!confirm('Excluir esta atividade?')) return;
    try {
      await deleteTask(id);
      setTasks((ts) => ts.filter((t) => t.id !== id));
    } catch (err: unknown) {
      setError(`Erro ao excluir atividade: ${err instanceof Error ? err.message : err}`);
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const linkedTasks = selectedProject
    ? tasks.filter((t) => t.project_id === selectedProject.id)
    : [];

  return (
    <AppShell>
      <header className="topbar">
        <div className="topbar-left">
          <h1>Relatórios</h1>
        </div>
        <div className="topbar-right">
          <div className="user-profile">
            <span className="avatar" title="Equipe SIA">IA</span>
          </div>
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
          <button
            type="button"
            className="btn-primary"
            onClick={() => setProjectModal({ open: true, project: null })}
          >
            + Novo Projeto
          </button>
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
            {projects.map((p) => {
              const count = tasks.filter((t) => t.project_id === p.id).length;
              return (
                <article
                  key={p.id}
                  className="project-card"
                  onClick={() => setSelectedProject(p)}
                  title={`Abrir ${p.name}`}
                >
                  <div className="project-card-name">{p.name}</div>

                  <div className="project-card-meta">
                    {p.owner && (
                      <div className="project-card-meta-row">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                        {p.owner}
                      </div>
                    )}
                    {p.deadline && (
                      <div className="project-card-meta-row">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        {p.deadline}
                      </div>
                    )}
                  </div>

                  {p.executive_status && (
                    <span className="project-card-status">{p.executive_status}</span>
                  )}

                  <div className="project-card-footer">
                    <span className="project-card-task-count">{count} atividade{count !== 1 ? 's' : ''}</span>
                    <div className="project-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="evidence-btn"
                        style={{ background: '#e3f2fd', borderColor: '#0052cc', color: '#0052cc' }}
                        onClick={() => setProjectModal({ open: true, project: p })}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="evidence-btn"
                        style={{ background: '#ffebe6', borderColor: '#de350b', color: '#de350b' }}
                        onClick={(e) => handleDeleteProject(p.id, e)}
                      >
                        Excluir
                      </button>
                    </div>
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
                    {linkedTasks.map((t) => (
                      <div
                        key={t.id}
                        className="project-task-row"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setTaskDetail({ open: true, task: t })}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="project-task-name">{t.activity}</div>
                          {t.responsible && (
                            <div className="project-task-responsible">{t.responsible}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <span className={statusClass(t.status_group)}>{t.status}</span>
                          <button
                            type="button"
                            className="evidence-btn"
                            style={{ background: '#e3f2fd', borderColor: '#0052cc', color: '#0052cc' }}
                            onClick={(e) => { e.stopPropagation(); setActivityModal({ open: true, task: t, projectId: selectedProject.id }); }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="evidence-btn"
                            style={{ background: '#ffebe6', borderColor: '#de350b', color: '#de350b' }}
                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(t.id); }}
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
    </AppShell>
  );
}
