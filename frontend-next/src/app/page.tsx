'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  useDraggable,
  useDroppable,
  closestCenter,
} from '@dnd-kit/core';
import AppShell from '@/components/AppShell';
import ActivityModal from '@/components/ActivityModal';
import TeamModal from '@/components/TeamModal';
import CategoryModal from '@/components/CategoryModal';
import {
  fetchTasks, createTask, updateTask, deleteTask,
  fetchCategories, createCategory, deleteCategory,
  fetchTeamMembers, createTeamMember, deleteTeamMember,
} from '@/lib/api';
import { avatarColor, initials } from '@/lib/utils';
import type { Task, StatusGroup, Category, TeamMember } from '@/types';

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

function DragDots() {
  return (
    <svg viewBox="0 0 24 24" width="10" height="20" fill="currentColor" aria-hidden>
      <circle cx="9"  cy="5"  r="1.5" /><circle cx="15" cy="5"  r="1.5" />
      <circle cx="9"  cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
      <circle cx="9"  cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}

// ── Kanban Card ───────────────────────────────────────────────────────────────
function KanbanCard({
  task,
  onEdit,
  onDelete,
}: {
  task: Task;
  onEdit: (t: Task) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  return (
    <div
      ref={setNodeRef}
      className="kanban-card"
      style={{
        transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : undefined,
      }}
    >
      <div
        className="drag-handle"
        {...listeners}
        {...attributes}
        onClick={(e) => e.stopPropagation()}
      >
        <DragDots />
      </div>

      <div className="card-content" onClick={() => !isDragging && onEdit(task)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <p className="card-title" style={{ flex: 1 }}>{task.activity}</p>
          <button
            className="delete-btn"
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a1aeb7', flexShrink: 0, display: 'flex', alignItems: 'center' }}
            title="Excluir"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
        <span className={`jira-badge jira-badge-${task.badge_color}`}>
          {task.category}
        </span>
      </div>

      <div className="card-footer">
        <span className="issue-key">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
          SIA-{task.id}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: '#6b778c', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {task.date}
          </span>
          <div
            className="jira-avatar"
            style={{ background: avatarColor(task.responsible), width: 24, height: 24, fontSize: '0.6rem' }}
            title={task.responsible}
          >
            {initials(task.responsible)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({
  col, tasks, onAddCard, onEditCard, onDeleteCard,
}: {
  col: (typeof COLUMNS)[0];
  tasks: Task[];
  onAddCard: (sg: StatusGroup) => void;
  onEditCard: (t: Task) => void;
  onDeleteCard: (id: number) => void;
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
          <KanbanCard key={task.id} task={task} onEdit={onEditCard} onDelete={onDeleteCard} />
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const [activityModal, setActivityModal] = useState<{
    open: boolean;
    task: Task | null;
    defaultStatus?: string;
  }>({ open: false, task: null });
  const [teamModal, setTeamModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);

  useEffect(() => {
    Promise.all([fetchTasks(), fetchCategories(), fetchTeamMembers()])
      .then(([tasks, cats, members]) => {
        setTasks(tasks);
        setCategories(cats);
        setTeamMembers(members);
      })
      .catch((e) => setError(`Erro: ${e?.message ?? e}`))
      .finally(() => setLoading(false));
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as number;
    const newGroup = over.id as StatusGroup;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status_group === newGroup) return;

    const prev = tasks;
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status_group: newGroup } : t)));
    updateTask(task, { status_group: newGroup })
      .then((updated) => setTasks((ts) => ts.map((t) => (t.id === taskId ? updated : t))))
      .catch(() => setTasks(prev));
  }

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

  async function handleDeleteCard(id: number) {
    const previous = tasks;
    setTasks((ts) => ts.filter((t) => t.id !== id));
    try {
      await deleteTask(id);
    } catch {
      setTasks(previous);
    }
  }

  async function handleTeamChange(newMembers: TeamMember[]) {
    const added = newMembers.filter((m) => !teamMembers.find((old) => old.name === m.name));
    const removed = teamMembers.filter((m) => !newMembers.find((n) => n.name === m.name));
    setTeamMembers(newMembers);
    await Promise.all([
      ...added.map((m) => createTeamMember(m.name, m.role)),
      ...removed.map((m) => deleteTeamMember(m.name)),
    ]);
  }

  async function handleCategoryChange(newCats: Category[]) {
    const added = newCats.filter((c) => !categories.find((old) => old.name === c.name));
    const removed = categories.filter((c) => !newCats.find((n) => n.name === c.name));
    setCategories(newCats);
    await Promise.all([
      ...added.map((c) => createCategory(c.name, c.color)),
      ...removed.map((c) => deleteCategory(c.name)),
    ]);
  }

  const filteredTasks = useMemo(
    () => tasks.filter((t) => {
      if (filterUser && t.responsible !== filterUser) return false;
      if (filterDate && t.date !== filterDate) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.activity.toLowerCase().includes(q) && !t.responsible.toLowerCase().includes(q))
          return false;
      }
      return true;
    }),
    [tasks, filterUser, filterDate, search],
  );

  const tasksByGroup = useCallback(
    (sg: StatusGroup) => filteredTasks.filter((t) => t.status_group === sg),
    [filteredTasks],
  );

  return (
    <AppShell>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Board</h1>
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
          <div className="user-profile">
            <span className="avatar" title="Equipe SIA">IA</span>
          </div>
        </div>
      </div>

      <div className="board-toolbar">
        <div className="board-filters">
          <select
            className="filter-btn"
            style={{ appearance: 'none', paddingRight: 28, paddingLeft: 12, cursor: 'pointer', color: '#42526e', outline: 'none', borderColor: '#dfe1e6' }}
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          >
            <option value="">Filtrar: Todos</option>
            {teamMembers.map((m) => (
              <option key={m.name} value={m.name}>{m.name}</option>
            ))}
          </select>

          <button
            className="filter-btn"
            style={{ color: '#42526e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setTeamModal(true)}
          >
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            Equipe
          </button>

          <button
            className="filter-btn"
            style={{ color: '#42526e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setCategoryModal(true)}
          >
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Categorias
          </button>

          <input
            type="date"
            className="filter-btn"
            style={{ color: '#42526e', cursor: 'pointer', height: 32, fontFamily: 'inherit', fontSize: '0.9rem' }}
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>

        <div className="avatar-cluster">
          {teamMembers.map((m) => (
            <div
              key={m.name}
              className="jira-avatar"
              style={{ background: avatarColor(m.name), border: '2px solid #fff' }}
              title={`${m.name}${m.role ? ` (${m.role})` : ''}`}
            >
              {initials(m.name)}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Carregando atividades...</div>
      ) : error ? (
        <div className="loading-state" style={{ color: '#BF2600' }}>{error}</div>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="kanban-board">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                col={col}
                tasks={tasksByGroup(col.id)}
                onAddCard={(sg) => setActivityModal({ open: true, task: null, defaultStatus: STATUS_MAP[sg] })}
                onEditCard={(task) => setActivityModal({ open: true, task })}
                onDeleteCard={handleDeleteCard}
              />
            ))}
          </div>
        </DndContext>
      )}

      <ActivityModal
        open={activityModal.open}
        task={activityModal.task}
        defaultStatus={activityModal.defaultStatus}
        categories={categories}
        onClose={() => setActivityModal({ open: false, task: null })}
        onSave={handleSaveActivity}
      />

      <TeamModal
        open={teamModal}
        members={teamMembers}
        onClose={() => setTeamModal(false)}
        onChange={handleTeamChange}
      />

      <CategoryModal
        open={categoryModal}
        categories={categories}
        onClose={() => setCategoryModal(false)}
        onChange={handleCategoryChange}
      />
    </AppShell>
  );
}
