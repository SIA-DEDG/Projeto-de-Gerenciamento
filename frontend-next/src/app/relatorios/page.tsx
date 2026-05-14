'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import EvidenceModal from '@/components/EvidenceModal';
import ActivityModal from '@/components/ActivityModal';
import CategoryModal from '@/components/CategoryModal';
import ProjectModal from '@/components/ProjectModal';
import {
  fetchTasks, createTask, updateTask, deleteTask,
  fetchProjects, createProject, updateProject, deleteProject,
} from '@/lib/api';
import { getCategories, saveCategories, getEvidence, saveEvidence } from '@/lib/localStorage';
import { avatarColor, initials, statusClass } from '@/lib/utils';
import type { Task, Project, Category, EvidenceMap, Evidence } from '@/types';

export default function RelatoriosPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [evidenceMap, setEvidenceMap] = useState<EvidenceMap>({});
  const [loading, setLoading] = useState(true);

  const [openAccordions, setOpenAccordions] = useState<Set<number>>(new Set());

  const [projectModal, setProjectModal] = useState<{ open: boolean; project: Project | null }>({
    open: false, project: null,
  });
  const [activityModal, setActivityModal] = useState<{ open: boolean; task: Task | null }>({
    open: false, task: null,
  });
  const [categoryModal, setCategoryModal] = useState(false);
  const [evidenceModal, setEvidenceModal] = useState<{
    open: boolean; taskId: string; taskTitle: string; evidence: Evidence[];
  }>({ open: false, taskId: '', taskTitle: '', evidence: [] });

  useEffect(() => {
    setCategories(getCategories());
    setEvidenceMap(getEvidence());
    Promise.all([fetchTasks(), fetchProjects()])
      .then(([t, p]) => { setTasks(t); setProjects(p); })
      .finally(() => setLoading(false));
  }, []);

  // ── Projects CRUD ──────────────────────────────────────────────────────────
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

  // ── Accordion ──────────────────────────────────────────────────────────────
  function toggleAccordion(id: number) {
    setOpenAccordions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Activities CRUD ────────────────────────────────────────────────────────
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
      const created = await createTask(data);
      setTasks((ts) => [...ts, created]);
    }
  }

  async function handleDeleteTask(id: number) {
    if (!confirm('Excluir esta atividade permanentemente?')) return;
    await deleteTask(id);
    setTasks((ts) => ts.filter((t) => t.id !== id));
  }

  // ── Evidence ───────────────────────────────────────────────────────────────
  function openEvidence(task: Task) {
    const key = `task-${task.id}`;
    setEvidenceModal({ open: true, taskId: key, taskTitle: task.activity, evidence: evidenceMap[key] ?? [] });
  }

  function handleEvidenceChange(taskId: string, evidence: Evidence[]) {
    const next = { ...evidenceMap, [taskId]: evidence };
    setEvidenceMap(next);
    saveEvidence(next);
    setEvidenceModal((p) => ({ ...p, evidence }));
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  function handleCategoryChange(cats: Category[]) {
    setCategories(cats);
    saveCategories(cats);
  }

  return (
    <AppShell>
      <header className="topbar">
        <div className="topbar-left">
          <h1>Relatórios</h1>
        </div>
        <div className="topbar-right">
          <div className="topbar-search">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Pesquisar atividades..." readOnly />
          </div>
          <div className="user-profile">
            <span className="avatar" title="Equipe SIA">IA</span>
          </div>
        </div>
      </header>

      <div className="page-content">
        <div className="dashboard-header">
          <h2>Relatório Completo de Atividades</h2>
          <p className="subtitle">Gerencie a descrição do projeto e valide as entregas com evidências por atividade.</p>
        </div>

        {/* ── Projetos e Entregas ───────────────────────────────────────────── */}
        <section className="project-panel" aria-labelledby="project-expand-title">
          <div className="project-panel-head">
            <h3 id="project-expand-title">Projetos e Entregas</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="project-panel-hint">Clique em um projeto para expandir as atividades vinculadas.</span>
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: '0.8rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
                onClick={() => setProjectModal({ open: true, project: null })}
              >
                + Novo Projeto
              </button>
            </div>
          </div>

          <div id="reports-accordion-container">
            {loading ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Carregando...</p>
            ) : projects.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Nenhum projeto cadastrado. Clique em &ldquo;+ Novo Projeto&rdquo; para adicionar.
              </p>
            ) : (
              projects.map((p) => {
                const linked = tasks.filter((t) => t.category === p.name);
                const isOpen = openAccordions.has(p.id);
                const color = linked[0]?.badge_color ?? 'blue';
                return (
                  <article key={p.id} className="project-accordion-item">
                    <button
                      type="button"
                      className="project-accordion-trigger"
                      onClick={() => toggleAccordion(p.id)}
                    >
                      <span className={`jira-badge jira-badge-${color}`}>{p.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                      <div className="project-accordion-content" style={{ display: 'grid' }}>
                        {linked.length === 0 ? (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '8px 0' }}>
                            Nenhuma atividade vinculada. Crie uma atividade com categoria igual ao nome deste projeto.
                          </p>
                        ) : (
                          linked.map((t) => (
                            <div key={t.id} className="project-accordion-row">
                              <div>
                                <strong>{t.activity}</strong>
                                <div className="evidence-meta">{t.responsible}</div>
                              </div>
                              <span className={statusClass(t.status_group)}>{t.status}</span>
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
        </section>

        {/* ── Activities Table ─────────────────────────────────────────────── */}
        <div className="table-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#172b4d' }}>Todas as Atividades</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-primary"
                onClick={() => setActivityModal({ open: true, task: null })}
                style={{ fontSize: '0.8rem', padding: '8px 14px' }}
              >
                + Nova Atividade
              </button>
              <button
                className="btn-primary"
                onClick={() => setCategoryModal(true)}
                style={{ fontSize: '0.8rem', padding: '8px 14px', background: '#6554c0' }}
              >
                Categorias
              </button>
            </div>
          </div>

          <table className="modern-table">
            <thead>
              <tr>
                <th>Projeto / Categoria</th>
                <th>Atividade</th>
                <th>Responsável</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                    Carregando...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                    Nenhuma atividade cadastrada.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const eKey = `task-${task.id}`;
                  const evCount = (evidenceMap[eKey] ?? []).length;
                  return (
                    <tr key={task.id}>
                      <td>
                        <span className={`jira-badge jira-badge-${task.badge_color}`}>
                          {task.category}
                        </span>
                      </td>
                      <td className="task-activity">{task.activity}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            className="jira-avatar"
                            style={{ background: avatarColor(task.responsible), width: 26, height: 26, fontSize: '0.62rem', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                          >
                            {initials(task.responsible)}
                          </div>
                          <span className="task-responsible">{task.responsible}</span>
                        </div>
                      </td>
                      <td>
                        <span className={statusClass(task.status_group)}>{task.status}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                          <button className="evidence-btn" onClick={() => openEvidence(task)}>
                            Evidências
                          </button>
                          <button
                            className="evidence-btn"
                            style={{ background: '#e3f2fd', borderColor: '#0052cc', color: '#0052cc' }}
                            onClick={() => setActivityModal({ open: true, task })}
                          >
                            Editar
                          </button>
                          <button
                            className="evidence-btn"
                            style={{ background: '#ffebe6', borderColor: '#de350b', color: '#de350b' }}
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            Excluir
                          </button>
                          <span style={{ fontSize: '0.72rem', color: '#6b778c' }}>
                            {evCount} {evCount === 1 ? 'evidência' : 'evidências'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
        onClose={() => setActivityModal({ open: false, task: null })}
        onSave={handleSaveActivity}
      />

      <CategoryModal
        open={categoryModal}
        categories={categories}
        onClose={() => setCategoryModal(false)}
        onChange={handleCategoryChange}
      />

      <EvidenceModal
        open={evidenceModal.open}
        taskId={evidenceModal.taskId}
        taskTitle={evidenceModal.taskTitle}
        evidence={evidenceModal.evidence}
        onClose={() => setEvidenceModal((p) => ({ ...p, open: false }))}
        onChange={handleEvidenceChange}
      />
    </AppShell>
  );
}
