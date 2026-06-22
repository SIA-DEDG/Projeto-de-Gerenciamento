'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { Ellipsis, CirclePlus, SquareKanban, Calendar, Search, Download, Funnel, FileUp, Plus } from 'lucide-react';
import type { UserPublic } from '@/lib/api';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import type { Task, StatusGroup, Project } from '@/types';

const COLUMNS: { id: StatusGroup; title: string; dotClass: string }[] = [
  { id: 'pending', title: 'Pendentes', dotClass: 'dot-todo' },
  { id: 'in_progress', title: 'Em Andamento', dotClass: 'dot-progress' },
  { id: 'done', title: 'Concluídos', dotClass: 'dot-done' },
];

const STATUS_MAP: Record<StatusGroup, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  done: 'Concluído',
};

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({
  col, tasks, onAddCard, onViewCard, onDeleteCard,
  isSelecting, selectedTaskIds, onToggleSelect, onStartSelect, onStartSelectAll,
}: {
  col: (typeof COLUMNS)[0];
  tasks: Task[];
  onAddCard: (statusGroup: StatusGroup) => void;
  onViewCard: (task: Task) => void;
  onDeleteCard: (id: string) => void;
  isSelecting: boolean;
  selectedTaskIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onStartSelect: () => void;
  onStartSelectAll: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  return (
    <div ref={setNodeRef} className={`kanban-column${isOver && !isSelecting ? ' drag-over' : ''}`}>
      <div className="column-header">
        <div className="column-header-left">
          <span className={`column-status-dot ${col.dotClass}`} />
          <span className="column-title">{col.title}</span>
          <span className="column-count">{tasks.length}</span>
        </div>
        <div className="column-actions" style={{ position: 'relative' }} ref={menuRef}>
          <button className="column-action-btn" title="Mais opções" onClick={() => setMenuOpen(o => !o)}>
            <Ellipsis />
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              background: '#fff', border: '1px solid var(--border-light)',
              borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              zIndex: 100, minWidth: 190, padding: '4px 0',
            }}>
              <button
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 14px', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)', fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                onClick={() => { setMenuOpen(false); onStartSelect(); }}
              >
                Selecionar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="kanban-cards">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            onView={onViewCard}
            onDelete={onDeleteCard}
            selectionMode={isSelecting}
            isSelected={selectedTaskIds.has(task.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>

      {!isSelecting && (
        <button className="add-card-btn" onClick={() => onAddCard(col.id)}>
          <CirclePlus height={14} />
          Criar atividade
        </button>
      )}
    </div>
  );
}

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

  const [selectionMode, setSelectionMode] = useState<StatusGroup | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

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
    if (selectionMode) return;
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const newGroup = over.id as StatusGroup;
    const draggedTask = tasks.find((task) => task.id === taskId);
    if (!draggedTask || draggedTask.status_group === newGroup) return;

    let co_responsible_ids: string[] | null = null;
    if (draggedTask.co_responsibles) {
      try {
        const names: string[] = JSON.parse(draggedTask.co_responsibles);
        const ids = names.map((name) => users.find((u) => u.name === name)?.id).filter((id): id is string => id !== undefined);
        co_responsible_ids = ids.length > 0 ? ids : null;
      } catch { co_responsible_ids = null; }
    }

    const prev = tasks;
    setTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? { ...task, status_group: newGroup } : task)));
    updateTask(draggedTask, { status_group: newGroup, co_responsible_ids })
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

  function handleToggleSelect(id: string) {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleStartSelect(columnId: StatusGroup) {
    setSelectionMode(columnId);
    setSelectedTaskIds(new Set());
  }

  function handleStartSelectAll(columnId: StatusGroup) {
    setSelectionMode(columnId);
    setSelectedTaskIds(new Set(tasksByGroup(columnId).map(t => t.id)));
  }

  function handleCancelSelect() {
    setSelectionMode(null);
    setSelectedTaskIds(new Set());
  }

  async function handleMoveSelected(to: StatusGroup) {
    if (!selectionMode || selectedTaskIds.size === 0) return;
    const ids = [...selectedTaskIds];
    const prevTasks = tasks;
    setTasks(curr => curr.map(t => ids.includes(t.id) ? { ...t, status_group: to } : t));
    setSelectionMode(null);
    setSelectedTaskIds(new Set());
    try {
      await Promise.all(ids.map(id => {
        const task = prevTasks.find(t => t.id === id)!;
        let co_responsible_ids: string[] | null = null;
        if (task.co_responsibles) {
          try {
            const names: string[] = JSON.parse(task.co_responsibles);
            const resolved = names.map(name => users.find(u => u.name === name)?.id).filter((rid): rid is string => rid !== undefined);
            co_responsible_ids = resolved.length > 0 ? resolved : null;
          } catch { co_responsible_ids = null; }
        }
        return updateTask(task, { status_group: to, co_responsible_ids });
      }));
      addToast('success', 'Atividades movidas', `${ids.length} atividade(s) movida(s) para ${STATUS_MAP[to]}.`);
    } catch {
      setTasks(prevTasks);
    }
  }

  function handleDeleteSelected() {
    if (!selectionMode || selectedTaskIds.size === 0) return;
    const ids = [...selectedTaskIds];
    setConfirmDialog({
      title: `Excluir ${ids.length} atividade(s)`,
      message: 'Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setTasks(curr => curr.filter(t => !ids.includes(t.id)));
        setSelectionMode(null);
        setSelectedTaskIds(new Set());
        try { await Promise.all(ids.map(id => deleteTask(id))); } catch { load(); }
      },
    });
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
        const q = search.toLowerCase();
        if (
          !task.activity.toLowerCase().includes(q) &&
          !task.responsible.toLowerCase().includes(q) &&
          !task.category?.toLowerCase().includes(q)
        ) return false;
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
              <SquareKanban width={14} height={14} />
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
              <Calendar width={14} height={14} />
              Calendário
            </button>
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-search">
            <Search width={14} />
            <input
              type="text"
              placeholder="Pesquisar atividades..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setImportModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 7, border: '1px solid var(--border-light)', background: '#fff', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <FileUp width={14} />
            Importar
          </button>
          <button
            type="button"
            onClick={exportCSV}
            disabled={filteredTasks.length === 0}
            title="Exportar atividades visíveis como CSV"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 7, border: '1px solid var(--border-light)', background: '#fff', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600, cursor: filteredTasks.length === 0 ? 'not-allowed' : 'pointer', opacity: filteredTasks.length === 0 ? 0.5 : 1, fontFamily: 'inherit' }}
          >
            <Download width={14} />
            CSV
          </button>
        </div>
      </div>

      <div className="board-toolbar">
        <Funnel width={13} height={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

        <select
          className={`filter-chip${filterUser ? ' filter-chip-active' : ''}`}
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
        >
          <option value="">Responsável</option>
          {users.map((user) => <option key={user.id} value={user.name}>{user.name}</option>)}
        </select>

        <select
          className={`filter-chip${filterPriority ? ' filter-chip-active' : ''}`}
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
        >
          <option value="">Prioridade</option>
          <option value="Alta">Alta</option>
          <option value="Média">Média</option>
          <option value="Baixa">Baixa</option>
        </select>

        <select
          className={`filter-chip${filterProject ? ' filter-chip-active' : ''}`}
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
        >
          <option value="">Projeto</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>

        <div className={`filter-date-range${filterDateFrom || filterDateTo ? ' filter-chip-active' : ''}`}>
          <span className="filter-date-label">Criado</span>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="filter-date-input"
            placeholder="de"
          />
          <span className="filter-date-sep">→</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="filter-date-input"
            placeholder="até"
          />
        </div>

        {(filterUser || filterPriority || filterProject || filterDateFrom || filterDateTo) && (
          <button
            className="filter-clear-btn"
            onClick={() => { setFilterUser(''); setFilterPriority(''); setFilterProject(''); setFilterDateFrom(''); setFilterDateTo(''); }}
          >
            ✕ Limpar
          </button>
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
                isSelecting={selectionMode === col.id}
                selectedTaskIds={selectedTaskIds}
                onToggleSelect={handleToggleSelect}
                onStartSelect={() => handleStartSelect(col.id)}
                onStartSelectAll={() => handleStartSelectAll(col.id)}
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
      {viewMode === 'kanban' && !selectionMode && !taskDetail.open && !activityModal.open && (
        <button
          className="kanban-fab"
          onClick={() => setActivityModal({ open: true, task: null })}
          title="Criar atividade"
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

      {selectionMode && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#fff',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '8px 12px',
          boxShadow: '0 4px 24px rgba(3,78,162,0.13), 0 1px 4px rgba(3,78,162,0.07)',
          zIndex: 200, whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, marginRight: 4 }}>
            {selectedTaskIds.size} selecionado(s)
          </span>
          <div style={{ width: 1, height: 18, background: 'var(--border-light)', margin: '0 4px' }} />
          <button
            onClick={() => selectionMode && setSelectedTaskIds(new Set(tasksByGroup(selectionMode).map(t => t.id)))}
            style={{
              padding: '5px 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)', background: 'var(--bg-subtle)',
              color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-light)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
          >
            Selecionar todos
          </button>
          <div style={{ width: 1, height: 18, background: 'var(--border-light)', margin: '0 4px' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: 2 }}>Mover para</span>
          {COLUMNS.filter(c => c.id !== selectionMode).map(target => (
            <button
              key={target.id}
              onClick={() => handleMoveSelected(target.id)}
              disabled={selectedTaskIds.size === 0}
              style={{
                padding: '5px 12px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                background: selectedTaskIds.size > 0 ? 'var(--primary-light)' : 'transparent',
                color: selectedTaskIds.size > 0 ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '0.78rem', fontWeight: 600,
                cursor: selectedTaskIds.size > 0 ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', transition: 'background var(--transition-fast)',
              }}
              onMouseEnter={e => { if (selectedTaskIds.size > 0) e.currentTarget.style.background = 'var(--primary-glow)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = selectedTaskIds.size > 0 ? 'var(--primary-light)' : 'transparent'; }}
            >
              {target.title}
            </button>
          ))}
          <div style={{ width: 1, height: 18, background: 'var(--border-light)', margin: '0 4px' }} />
          <button
            onClick={handleDeleteSelected}
            disabled={selectedTaskIds.size === 0}
            style={{
              padding: '5px 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)',
              background: selectedTaskIds.size > 0 ? 'rgba(239,65,35,0.07)' : 'transparent',
              color: selectedTaskIds.size > 0 ? '#ef4123' : 'var(--text-muted)',
              fontSize: '0.78rem', fontWeight: 600,
              cursor: selectedTaskIds.size > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', transition: 'background var(--transition-fast)',
            }}
            onMouseEnter={e => { if (selectedTaskIds.size > 0) e.currentTarget.style.background = 'rgba(239,65,35,0.14)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = selectedTaskIds.size > 0 ? 'rgba(239,65,35,0.07)' : 'transparent'; }}
          >
            Excluir
          </button>
          <div style={{ width: 1, height: 18, background: 'var(--border-light)', margin: '0 4px' }} />
          <button
            onClick={handleCancelSelect}
            style={{
              padding: '5px 10px', borderRadius: 'var(--radius-sm)',
              border: '1px solid transparent', background: 'transparent',
              color: 'var(--text-muted)', fontSize: '0.78rem',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Cancelar
          </button>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
