'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import ActivityModal from '@/components/ActivityModal';
import ProjectModal from '@/components/ProjectModal';
import {
  fetchTasks, createTask, updateTask, deleteTask,
  fetchProjects, createProject, updateProject, deleteProject,
  fetchCategories,
} from '@/lib/api';
import { statusClass } from '@/lib/utils';
import type { Task, Project, Category } from '@/types';

export default function RelatoriosPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [openAccordions, setOpenAccordions] = useState<Set<number>>(new Set());
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

  const [projectModal, setProjectModal] = useState<{ open: boolean; project: Project | null }>({
    open: false, project: null,
  });
  const [activityModal, setActivityModal] = useState<{ open: boolean; task: Task | null }>({
    open: false, task: null,
  });

  useEffect(() => {
    Promise.all([fetchTasks(), fetchProjects(), fetchCategories()])
      .then(([t, p, c]) => { setTasks(t); setProjects(p); setCategories(c); })
      .catch((e) => setError(`Erro: ${e?.message ?? e}`))
      .finally(() => setLoading(false));
  }, []);

  // ── Projects ────────────────────────────────────────────────────────────────

  async function handleSaveProject(data: Omit<Project, 'id'>) {
    const { project } = projectModal;
    setProjectModal({ open: false, project: null });
    if (project) {
      const updated = await updateProject(project, data);
      setProjects((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      const created = await createProject(data);
      setProjects((ps) => [...ps, created]);
    }
  }

  async function handleDeleteProject(id: number) {
    if (!confirm('Excluir este projeto permanentemente?')) return;
    await deleteProject(id);
    setProjects((ps) => ps.filter((p) => p.id !== id));
  }

  function toggleAccordion(id: number) {
    setOpenAccordions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Activities ───────────────────────────────────────────────────────────────

  async function handleSaveActivity(data: {
    activity: string;
    category: string;
    status: string;
    responsible: string;
    date: string;
  }) {
    const { task } = activityModal;
    setActivityModal({ open: false, task: null });
    if (task) {
      const updated = await updateTask(task, data);
      setTasks((ts) => ts.map((t) => (t.id === task.id ? updated : t)));
    } else {
      const created = await createTask({
        ...data,
        project_id: activeProjectId ?? undefined,
      });
      setTasks((ts) => [...ts, created]);
    }
    setActiveProjectId(null);
  }

  async function handleDeleteTask(id: number) {
    if (!confirm('Excluir esta atividade?')) return;
    await deleteTask(id);
    setTasks((ts) => ts.filter((t) => t.id !== id));
  }

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
        <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>Projetos e Atividades</h2>
            <p className="subtitle">Crie projetos e gerencie as atividades vinculadas a cada um.</p>
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
          <p style={{ color: '#de350b', padding: '12px', background: '#ffebe6', borderRadius: '4px', marginBottom: '16px' }}>
            {error}
          </p>
        )}

        <div id="reports-accordion-container">
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Carregando...</p>
          ) : projects.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Nenhum projeto cadastrado. Clique em &ldquo;+ Novo Projeto&rdquo; para adicionar.
            </p>
          ) : (
            projects.map((p) => {
              const linked = tasks.filter((t) => t.project_id === p.id);
              const isOpen = openAccordions.has(p.id);

              return (
                <article key={p.id} className="project-accordion-item">
                  <button
                    type="button"
                    className="project-accordion-trigger"
                    onClick={() => toggleAccordion(p.id)}
                  >
                    <span style={{ fontWeight: 600, color: '#172b4d', fontSize: '0.95rem' }}>{p.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {p.owner && (
                        <span style={{ fontSize: '0.78rem', color: '#6b778c' }}>{p.owner}</span>
                      )}
                      <span className="project-accordion-meta">
                        {linked.length} atividade(s) &nbsp;{isOpen ? '▲' : '▼'}
                      </span>
                      <button
                        type="button"
                        className="evidence-btn"
                        style={{ background: '#e3f2fd', borderColor: '#0052cc', color: '#0052cc' }}
                        onClick={(e) => { e.stopPropagation(); setProjectModal({ open: true, project: p }); }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="evidence-btn"
                        style={{ background: '#ffebe6', borderColor: '#de350b', color: '#de350b' }}
                        onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }}
                      >
                        Excluir
                      </button>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="project-accordion-content">
                      <div style={{ marginBottom: '14px' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                          onClick={() => {
                            setActiveProjectId(p.id);
                            setActivityModal({ open: true, task: null });
                          }}
                        >
                          + Nova Atividade
                        </button>
                      </div>

                      {linked.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '4px 0 8px' }}>
                          Nenhuma atividade vinculada. Clique em &ldquo;+ Nova Atividade&rdquo; para adicionar.
                        </p>
                      ) : (
                        linked.map((t) => (
                          <div key={t.id} className="project-accordion-row">
                            <div>
                              <strong style={{ fontSize: '0.9rem' }}>{t.activity}</strong>
                              {t.responsible && (
                                <div className="evidence-meta">{t.responsible}</div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className={statusClass(t.status_group)}>{t.status}</span>
                              <button
                                className="evidence-btn"
                                style={{ background: '#e3f2fd', borderColor: '#0052cc', color: '#0052cc' }}
                                onClick={() => setActivityModal({ open: true, task: t })}
                              >
                                Editar
                              </button>
                              <button
                                className="evidence-btn"
                                style={{ background: '#ffebe6', borderColor: '#de350b', color: '#de350b' }}
                                onClick={() => handleDeleteTask(t.id)}
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>

      <ProjectModal
        open={projectModal.open}
        project={projectModal.project}
        onClose={() => setProjectModal({ open: false, project: null })}
        onSave={handleSaveProject}
      />

      <ActivityModal
        open={activityModal.open}
        task={activityModal.task}
        categories={categories}
        onClose={() => {
          setActivityModal({ open: false, task: null });
          setActiveProjectId(null);
        }}
        onSave={handleSaveActivity}
      />
    </AppShell>
  );
}
