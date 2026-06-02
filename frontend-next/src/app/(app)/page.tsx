'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  useDroppable,
  closestCenter,
  PointerSensor,
  useSensors,
  useSensor,
} from '@dnd-kit/core';
import ActivityModal from '@/components/ActivityModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import ImportModal from '@/components/ImportModal';
import KanbanCard from '@/components/KanbanCard';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import TaskCalendarView from '@/components/TaskCalendarView';
import {
  fetchTasks, createTask, updateTask, deleteTask,
  fetchProjects,
  fetchUsers,
} from '@/lib/api';
import type { UserPublic } from '@/lib/api';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import type { Task, StatusGroup, Project } from '@/types';

const COLUMNS: { id: StatusGroup; title: string; dotClass: string }[] = [
  { id: 'pending',    title: 'Pendentes',   dotClass: 'dot-todo'     },
  { id: 'in_progress',title: 'Em Andamento',dotClass: 'dot-progress' },
  { id: 'done',       title: 'Concluídos',  dotClass: 'dot-done'     },
];

const STATUS_MAP: Record<StatusGroup, string> = {
  pending:     'Pendente',
  in_progress: 'Em Andamento',
  done:        'Concluído',
};

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({
  col, tasks, onAddCard, onViewCard, onDeleteCard,
}: {
  col: (typeof COLUMNS)[0];
  tasks: Task[];
  onAddCard: (statusGroup: StatusGroup) => void;
  onViewCard: (task: Task) => void;
  onDeleteCard: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div ref={setNodeRef} className={`kanban-column${isOver ? ' drag-over' : ''}`}>
      <div className="column-header">
        <div className="column-header-left">
          <span className={`column-status-dot ${col.dotClass}`} />
          <span className="column-title">{col.title}</span>
          <span className="column-count">{tasks.length}</span>
        </div>
        <div className="column-actions">
          <button className="column-action-btn" title="Mais opções">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        </div>
      </div>

      <div className="kanban-cards">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onView={onViewCard} onDelete={onDeleteCard} />
        ))}
      </div>

      <button className="add-card-btn" onClick={() => onAddCard(col.id)}>
        <svg viewBox="0 0 24 24">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Criar atividade
      </button>
    </div>
  );
}

// ── Board Page ────────────────────────────────────────────────────────────────
export default function BoardPage() {
  const { toasts, addToast, dismissToast } = useToast();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserPublic[]>([]);

  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'calendar'>('kanban');

  const [activityModal, setActivityModal] = useState<{
    open: boolean;
    task: Task | null;
    defaultStatus?: string;
  }>({ open: false, task: null });
  const [taskDetail, setTaskDetail] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [projectsModal, setProjectsModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message?: string; onConfirm: () => void } | null>(null);

  const load = useCallback(() => {
    Promise.all([fetchTasks(), fetchProjects(), fetchUsers()])
      .then(([tasks, fetchedProjects, allUsers]) => {
        setTasks(tasks);
        setProjects(fetchedProjects);
        setUsers(allUsers.filter((user) => user.role !== 'Admin'));
      })
      .catch((error) => setError(`Erro: ${error?.message ?? error}`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefetchOnFocus(load);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const newGroup = over.id as StatusGroup;
    const draggedTask = tasks.find((task) => task.id === taskId);
    if (!draggedTask || draggedTask.status_group === newGroup) return;

    const prev = tasks;
    setTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? { ...task, status_group: newGroup } : task)));
    updateTask(draggedTask, { status_group: newGroup })
      .then((updated) => setTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? updated : task))))
      .catch(() => setTasks(prev));
  }

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
    setActivityModal({ open: false, task: null });

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
      addToast('success', 'Atividade criada', `"${created.activity}" foi adicionada ao quadro.`);
    }
  }

  function handleDeleteCard(id: string) {
    setConfirmDialog({
      title: 'Excluir atividade',
      message: 'Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
        try { await deleteTask(id); } catch { load(); }
      },
    });
  }

  const filteredTasks = useMemo(
    () => tasks.filter((task) => {
      if (filterUser && task.responsible !== filterUser) return false;
      if (filterPriority && task.priority?.toLowerCase() !== filterPriority.toLowerCase()) return false;
      if (filterProject && task.project_id !== filterProject) return false;
      if (filterDateFrom && task.date < filterDateFrom) return false;
      if (filterDateTo && task.date > filterDateTo) return false;
      if (search) {
        const searchQuery = search.toLowerCase();
        if (!task.activity.toLowerCase().includes(searchQuery) && !task.responsible.toLowerCase().includes(searchQuery))
          return false;
      }
      return true;
    }),
    [tasks, filterUser, filterPriority, filterProject, filterDateFrom, filterDateTo, search],
  );

  function exportCSV() {
    const header = ['Atividade', 'Categoria', 'Responsável', 'Status', 'Prioridade', 'Prazo', 'Criado em', 'Projeto', 'Co-responsáveis', 'Colaboradores externos'];
    const rows = filteredTasks.map(t => {
      const projectName = projects.find(p => p.id === t.project_id)?.name ?? '';
      const coResp = t.co_responsibles ? (() => { try { return (JSON.parse(t.co_responsibles!) as string[]).join('; '); } catch { return ''; } })() : '';
      return [t.activity, t.category, t.responsible, t.status, t.priority, t.deadline ?? '', t.date, projectName, coResp, t.external_collaborators ?? ''];
    });
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `atividades_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  const tasksByGroup = useCallback(
    (statusGroup: StatusGroup) => filteredTasks.filter((task) => task.status_group === statusGroup),
    [filteredTasks],
  );

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Atividades</h1>
          <div style={{ display: 'flex', background: 'var(--bg-subtle)', borderRadius: 8, padding: 3, gap: 2, marginLeft: 16 }}>
            <button
              onClick={() => setViewMode('kanban')}
              title="Quadro Kanban"
              style={{
                background: viewMode === 'kanban' ? '#fff' : 'transparent',
                border: viewMode === 'kanban' ? '1px solid var(--border-light)' : '1px solid transparent',
                borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                color: viewMode === 'kanban' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 600, fontSize: '0.8rem', fontFamily: 'inherit',
                boxShadow: viewMode === 'kanban' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="11" rx="1"/>
              </svg>
              Quadro
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              title="Visualização Calendário"
              style={{
                background: viewMode === 'calendar' ? '#fff' : 'transparent',
                border: viewMode === 'calendar' ? '1px solid var(--border-light)' : '1px solid transparent',
                borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                color: viewMode === 'calendar' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 600, fontSize: '0.8rem', fontFamily: 'inherit',
                boxShadow: viewMode === 'calendar' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Calendário
            </button>
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-search">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Pesquisar atividades..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={exportCSV}
            disabled={filteredTasks.length === 0}
            title="Exportar atividades visíveis como CSV"
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:7, border:'1px solid var(--border-light)', background:'#fff', color:'var(--text-secondary)', fontSize:'0.82rem', fontWeight:600, cursor: filteredTasks.length === 0 ? 'not-allowed' : 'pointer', opacity: filteredTasks.length === 0 ? 0.5 : 1, fontFamily:'inherit' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            CSV
          </button>
        </div>
      </div>

      <div className={`board-toolbar${filtersOpen ? '' : ' board-toolbar-collapsed'}`}>
        {/* Toggle button — always visible */}
        <button
          className={`filters-toggle-btn${filtersOpen ? ' active' : ''}`}
          onClick={() => setFiltersOpen((isOpen) => !isOpen)}
          title={filtersOpen ? 'Ocultar filtros' : 'Exibir filtros'}
        >
          <svg viewBox="0 0 24 24">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filtros
          <svg viewBox="0 0 24 24" style={{ width: 10, height: 10, transition: 'transform 0.18s', transform: filtersOpen ? 'rotate(180deg)' : 'none' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {filtersOpen && (
          <div className="board-filters">
            <select className="filter-btn" value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
              <option value="">Responsável: Todos</option>
              {users.map((user) => <option key={user.id} value={user.name}>{user.name}</option>)}
            </select>

            <select className="filter-btn" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="">Prioridade: Todas</option>
              <option value="Alta">🔴 Alta</option>
              <option value="Média">🟡 Média</option>
              <option value="Baixa">🟢 Baixa</option>
            </select>

            <select className="filter-btn" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
              <option value="">Projeto: Todos</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>

            <input type="date" className="filter-btn" title="De" value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              style={{ fontFamily: 'inherit', fontSize: '0.82rem' }}
            />
            <input type="date" className="filter-btn" title="Até" value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              style={{ fontFamily: 'inherit', fontSize: '0.82rem' }}
            />

            <button className="filter-btn" style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
              onClick={() => setImportModal(true)}>
              <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Importar
            </button>

            {(filterUser || filterPriority || filterProject || filterDateFrom || filterDateTo) && (
              <button className="filter-btn" style={{ color: '#ef4123', borderColor: '#ef4123' }}
                onClick={() => { setFilterUser(''); setFilterPriority(''); setFilterProject(''); setFilterDateFrom(''); setFilterDateTo(''); }}>
                ✕ Limpar
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-state">Carregando atividades...</div>
      ) : error ? (
        <div className="loading-state" style={{ color: '#BF2600' }}>{error}</div>
      ) : viewMode === 'calendar' ? (
        <div style={{ padding: '0 20px 20px' }}>
          <TaskCalendarView
            tasks={filteredTasks}
            onViewTask={(task) => setTaskDetail({ open: true, task })}
          />
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="kanban-board">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                col={col}
                tasks={tasksByGroup(col.id)}
                onAddCard={(statusGroup) => setActivityModal({ open: true, task: null, defaultStatus: STATUS_MAP[statusGroup] })}
                onViewCard={(task) => setTaskDetail({ open: true, task })}
                onDeleteCard={handleDeleteCard}
              />
            ))}
          </div>
        </DndContext>
      )}

      <TaskDetailModal
        open={taskDetail.open}
        task={taskDetail.task}
        projectName={taskDetail.task ? projects.find((project) => project.id === taskDetail.task!.project_id)?.name ?? taskDetail.task.category : undefined}
        onClose={() => setTaskDetail({ open: false, task: null })}
        onEdit={(task) => { setTaskDetail({ open: false, task: null }); setActivityModal({ open: true, task }); }}
        onDelete={(id) => { setTaskDetail({ open: false, task: null }); handleDeleteCard(id); }}
      />

      <ActivityModal
        open={activityModal.open}
        task={activityModal.task}
        defaultStatus={activityModal.defaultStatus}
        projects={projects}
        users={users}
        onClose={() => setActivityModal({ open: false, task: null })}
        onSave={handleSaveActivity}
      />

      <ImportModal
        open={importModal}
        projects={projects}
        users={users}
        onClose={() => setImportModal(false)}
        onImported={(newTasks) => setTasks((currentTasks) => [...currentTasks, ...newTasks])}
        onProjectsCreated={(newProjects) => setProjects((currentProjects) => [...currentProjects, ...newProjects])}
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

      {projectsModal && (
        <div className="modal-backdrop" onClick={() => setProjectsModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Projetos</h3>
              <button type="button" className="modal-close-btn" onClick={() => setProjectsModal(false)}>&times;</button>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#6b778c', marginBottom: '12px' }}>
              Gerencie projetos na aba <strong>Projetos</strong>.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
              {projects.length === 0 ? (
                <p style={{ color: '#6b778c', fontSize: '0.85rem' }}>Nenhum projeto cadastrado.</p>
              ) : projects.map((project) => (
                <div key={project.id} style={{ padding: '8px 12px', border: '1px solid #dfe1e6', borderRadius: '4px', background: '#fafbfc' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#172b4d' }}>{project.name}</span>
                  {project.owner && <span style={{ fontSize: '0.78rem', color: '#6b778c', marginLeft: '8px' }}>{project.owner}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
