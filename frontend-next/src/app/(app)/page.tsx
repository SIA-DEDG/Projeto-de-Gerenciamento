'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  DndContext, DragEndEvent, useDroppable,
  closestCenter, PointerSensor, useSensors, useSensor,
} from '@dnd-kit/core';
import ActivityModal from '@/components/ActivityModal';
import DrawerDetalhe from '@/components/DrawerDetalhe';
import ImportModal from '@/components/ImportModal';
import KanbanCard from '@/components/KanbanCard';
import ConfirmModal from '@/components/ConfirmModal';
import Calendario, { type CalendarioItem } from '@/components/Calendario';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import {
  fetchTasks, createTask, updateTask, deleteTask,
  fetchProjects, fetchUsers,
} from '@/lib/api';
import { statusGroupLabel, statusLabelToDb } from '@/lib/utils';
import {
  LayoutGrid, List, Calendar, Search, Download, FileUp, Plus, Funnel, Ellipsis,
} from 'lucide-react';
import type { UserPublic } from '@/lib/api';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import type { Task, StatusGroup, Project } from '@/types';

const COLUMNS: { id: StatusGroup; title: string; color: string }[] = [
  { id: 'pending',    title: 'Pendente',    color: 'var(--s-pending)' },
  { id: 'in_progress',title: 'Em Andamento',color: 'var(--s-progress)' },
  { id: 'review',     title: 'Em Revisão',  color: 'var(--s-review)' },
  { id: 'done',       title: 'Concluído',   color: 'var(--s-done)' },
];

const STATUS_MAP: Record<StatusGroup, string> = {
  pending:     'Pendente',
  in_progress: 'Em Andamento',
  review:      'Em Revisão',
  done:        'Concluído',
};

function KanbanColumn({
  col, tasks, onAddCard, onViewCard, onDeleteCard,
  isSelecting, selectedTaskIds, onToggleSelect, onStartSelect,
}: {
  col: typeof COLUMNS[0];
  tasks: Task[];
  onAddCard: (sg: StatusGroup) => void;
  onViewCard: (t: Task) => void;
  onDeleteCard: (id: string) => void;
  isSelecting: boolean;
  selectedTaskIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onStartSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div ref={setNodeRef} className={`kanban-column${isOver && !isSelecting ? ' drag-over' : ''}`}>
      <div className="column-header">
        <div className="column-header-left">
          <span className="column-status-bar" style={{ background: col.color }} />
          <span className="column-title">{col.title}</span>
          <span className="column-count">{tasks.length}</span>
        </div>
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button className="column-action-btn" onClick={() => setMenuOpen((o) => !o)} title="Opções">
            <Ellipsis size={14} />
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: 160, padding: '2px 0' }}>
              <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text)', fontFamily: 'inherit' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                onClick={() => { setMenuOpen(false); onStartSelect(); }}>
                Selecionar itens
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
        <button className="column-add-btn" onClick={() => onAddCard(col.id)}>
          <Plus size={13} />
          Adicionar atividade
        </button>
      )}
    </div>
  );
}

type View = 'kanban' | 'list' | 'calendar';

export default function BoardPage() {
  const { toasts, addToast, dismissToast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

  const [view, setView] = useState<View>('kanban');
  const [activityModal, setActivityModal] = useState<{ open: boolean; task: Task | null; defaultStatus?: string }>({ open: false, task: null });
  const [drawer, setDrawer] = useState<Task | null>(null);
  const [importModal, setImportModal] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message?: string; onConfirm: () => void } | null>(null);
  const [selectionMode, setSelectionMode] = useState<StatusGroup | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    Promise.all([fetchTasks(), fetchProjects(), fetchUsers()])
      .then(([t, p, u]) => { setTasks(t); setProjects(p); setUsers(u.filter((user) => user.role !== 'Admin')); })
      .catch((e) => setError(`Erro: ${e?.message ?? e}`))
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
    const t = tasks.find((x) => x.id === taskId);
    if (!t || t.status_group === newGroup) return;
    const prev = tasks;
    setTasks((curr) => curr.map((x) => (x.id === taskId ? { ...x, status_group: newGroup } : x)));
    let coIds: string[] | null = null;
    if (t.co_responsibles) {
      try { const names = JSON.parse(t.co_responsibles) as string[]; coIds = names.map((n) => users.find((u) => u.name === n)?.id).filter((id): id is string => !!id); } catch { coIds = null; }
    }
    updateTask(t, { status_group: newGroup, co_responsible_ids: coIds })
      .then((updated) => setTasks((curr) => curr.map((x) => (x.id === taskId ? updated : x))))
      .catch(() => setTasks(prev));
  }

  async function handleSaveActivity(data: {
    activity: string; description: string; category: string; project_id: string | null;
    status: string; responsible: string; date: string; priority: string;
    co_responsibles: string | null; external_collaborators: string | null; deadline: string | null;
  }) {
    const { task } = activityModal;
    setActivityModal({ open: false, task: null });
    const responsible_id = users.find((u) => u.name === data.responsible)?.id ?? null;
    let coIds: string[] | null = null;
    if (data.co_responsibles) {
      try { const names = JSON.parse(data.co_responsibles) as string[]; coIds = names.map((n) => users.find((u) => u.name === n)?.id).filter((id): id is string => !!id); } catch { coIds = null; }
    }
    const payload = { ...data, project_id: data.project_id ?? undefined, responsible_id, co_responsible_ids: coIds };
    if (task) {
      const updated = await updateTask(task, payload);
      setTasks((curr) => curr.map((x) => (x.id === task.id ? updated : x)));
      if (drawer?.id === task.id) setDrawer(updated);
    } else {
      const created = await createTask(payload);
      setTasks((curr) => [...curr, created]);
      addToast('success', 'Atividade criada', `"${created.activity}" foi adicionada.`);
    }
  }

  function handleDeleteCard(id: string) {
    setConfirm({
      title: 'Excluir atividade',
      message: 'Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setDrawer(null);
        setTasks((curr) => curr.filter((x) => x.id !== id));
        try { await deleteTask(id); } catch { load(); }
      },
    });
  }

  function handleAdvanceStatus() {
    if (!drawer) return;
    const NEXT: Record<string, StatusGroup> = { pending: 'in_progress', in_progress: 'review', review: 'done' };
    const next = NEXT[drawer.status_group];
    if (!next) return;
    let coIds: string[] | null = null;
    if (drawer.co_responsibles) {
      try { const names = JSON.parse(drawer.co_responsibles) as string[]; coIds = names.map((n) => users.find((u) => u.name === n)?.id).filter((id): id is string => !!id); } catch { coIds = null; }
    }
    const updated = { ...drawer, status_group: next };
    setDrawer(updated);
    setTasks((curr) => curr.map((x) => (x.id === drawer.id ? updated : x)));
    updateTask(drawer, { status_group: next, co_responsible_ids: coIds })
      .then((res) => { setDrawer(res); setTasks((curr) => curr.map((x) => (x.id === res.id ? res : x))); })
      .catch(() => { setDrawer(drawer); load(); });
  }

  function handleToggleSelect(id: string) {
    setSelectedTaskIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function handleCancelSelect() { setSelectionMode(null); setSelectedTaskIds(new Set()); }

  async function handleMoveSelected(to: StatusGroup) {
    if (!selectionMode || selectedTaskIds.size === 0) return;
    const ids = [...selectedTaskIds];
    const prev = tasks;
    setTasks((curr) => curr.map((t) => ids.includes(t.id) ? { ...t, status_group: to } : t));
    setSelectionMode(null); setSelectedTaskIds(new Set());
    try {
      await Promise.all(ids.map((id) => {
        const t = prev.find((x) => x.id === id)!;
        let coIds: string[] | null = null;
        if (t.co_responsibles) { try { const names = JSON.parse(t.co_responsibles) as string[]; coIds = names.map((n) => users.find((u) => u.name === n)?.id).filter((id): id is string => !!id); } catch { coIds = null; } }
        return updateTask(t, { status_group: to, co_responsible_ids: coIds });
      }));
      addToast('success', 'Atividades movidas', `${ids.length} atividade(s) movida(s) para ${STATUS_MAP[to]}.`);
    } catch { setTasks(prev); }
  }

  function handleDeleteSelected() {
    if (!selectionMode || selectedTaskIds.size === 0) return;
    const ids = [...selectedTaskIds];
    setConfirm({ title: `Excluir ${ids.length} atividade(s)`, message: 'Esta ação não pode ser desfeita.', onConfirm: async () => {
      setTasks((curr) => curr.filter((t) => !ids.includes(t.id)));
      setSelectionMode(null); setSelectedTaskIds(new Set());
      try { await Promise.all(ids.map((id) => deleteTask(id))); } catch { load(); }
    }});
  }

  const filteredTasks = useMemo(
    () => tasks.filter((t) => {
      if (filterUser && t.responsible !== filterUser) return false;
      if (filterPriority && t.priority?.toLowerCase() !== filterPriority.toLowerCase()) return false;
      if (filterProject && t.project_id !== filterProject) return false;
      if (filterDateFrom && t.date < filterDateFrom) return false;
      if (filterDateTo && t.date > filterDateTo) return false;
      if (search) { const q = search.toLowerCase(); if (!t.activity.toLowerCase().includes(q) && !t.responsible.toLowerCase().includes(q) && !t.category?.toLowerCase().includes(q)) return false; }
      return true;
    }),
    [tasks, filterUser, filterPriority, filterProject, filterDateFrom, filterDateTo, search],
  );

  function exportCSV() {
    const header = ['Atividade','Categoria','Responsável','Status','Prioridade','Prazo','Criado em','Projeto','Co-responsáveis','Colaboradores externos'];
    const rows = filteredTasks.map((t) => {
      const proj = projects.find((p) => p.id === t.project_id)?.name ?? '';
      const co = t.co_responsibles ? (() => { try { return (JSON.parse(t.co_responsibles!) as string[]).join('; '); } catch { return ''; } })() : '';
      return [t.activity, t.category, t.responsible, t.status, t.priority, t.deadline ?? '', t.date, proj, co, t.external_collaborators ?? ''];
    });
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `atividades_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  const tasksByGroup = useCallback((sg: StatusGroup) => filteredTasks.filter((t) => t.status_group === sg), [filteredTasks]);

  const calItems: CalendarioItem[] = useMemo(() => filteredTasks.map((t) => ({
    id: t.id,
    title: t.activity,
    start_date: t.deadline ?? t.date,
    end_date: t.deadline ?? t.date,
    color: t.status_group === 'done' ? 'var(--s-done)' : t.status_group === 'review' ? 'var(--s-review)' : t.status_group === 'in_progress' ? 'var(--s-progress)' : 'var(--s-pending)',
    label: t.responsible,
  })), [filteredTasks]);

  const hasFilters = filterUser || filterPriority || filterProject || filterDateFrom || filterDateTo;

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <h1 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Atividades</h1>
          <div className="view-toggle">
            <button className={`view-toggle-btn${view === 'kanban' ? ' active' : ''}`} onClick={() => setView('kanban')}><LayoutGrid size={13} />Quadro</button>
            <button className={`view-toggle-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}><List size={13} />Lista</button>
            <button className={`view-toggle-btn${view === 'calendar' ? ' active' : ''}`} onClick={() => setView('calendar')}><Calendar size={13} />Calendário</button>
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-search">
            <Search size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            <input type="text" placeholder="Pesquisar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setImportModal(true)}><FileUp size={13} />Importar</button>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV} disabled={filteredTasks.length === 0}><Download size={13} />CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => setActivityModal({ open: true, task: null })}><Plus size={13} />Nova atividade</button>
        </div>
      </div>

      {/* Toolbar de filtros */}
      <div className="toolbar">
        <Funnel size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <select className={`filter-chip${filterUser ? ' active' : ''}`} value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
          <option value="">Responsável</option>
          {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
        </select>
        <select className={`filter-chip${filterPriority ? ' active' : ''}`} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">Prioridade</option>
          <option value="Alta">Alta</option>
          <option value="Média">Média</option>
          <option value="Baixa">Baixa</option>
        </select>
        <select className={`filter-chip${filterProject ? ' active' : ''}`} value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="">Projeto</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className={`filter-date-range${filterDateFrom || filterDateTo ? ' filter-chip active' : ''}`}>
          <span className="filter-date-label">Criado</span>
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="filter-date-input" />
          <span className="filter-date-label">→</span>
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="filter-date-input" />
        </div>
        {hasFilters && (
          <button className="filter-clear-btn" onClick={() => { setFilterUser(''); setFilterPriority(''); setFilterProject(''); setFilterDateFrom(''); setFilterDateTo(''); }}>✕ Limpar</button>
        )}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="loading-state">Carregando atividades…</div>
      ) : error ? (
        <div className="loading-state" style={{ color: 'var(--red)' }}>{error}</div>
      ) : view === 'calendar' ? (
        <div style={{ padding: '16px 32px', flex: 1, overflow: 'auto' }}>
          <Calendario
            items={calItems}
            onItemClick={(item) => { const t = tasks.find((x) => x.id === item.id); if (t) setDrawer(t); }}
            legend={[
              { color: 'var(--s-pending)', label: 'Pendente' },
              { color: 'var(--s-progress)', label: 'Em Andamento' },
              { color: 'var(--s-review)', label: 'Em Revisão' },
              { color: 'var(--s-done)', label: 'Concluído' },
            ]}
          />
        </div>
      ) : view === 'list' ? (
        <div className="list-view">
          <table className="list-table">
            <thead>
              <tr>
                <th>Atividade</th>
                <th>Projeto</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>Prazo</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((t) => (
                <tr key={t.id} onClick={() => setDrawer(t)}>
                  <td style={{ fontWeight: 600 }}>{t.activity}</td>
                  <td style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>{projects.find((p) => p.id === t.project_id)?.name ?? t.category}</td>
                  <td>
                    <span className="mono" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: t.priority === 'Alta' ? 'var(--red)' : t.priority === 'Baixa' ? 'var(--green-t)' : 'var(--gold-t)' }}>{t.priority}</span>
                  </td>
                  <td><span className={`status-chip ${t.status_group}`}>{statusGroupLabel(t.status_group)}</span></td>
                  <td className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{t.deadline ?? '—'}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{t.responsible}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTasks.length === 0 && <div className="empty-state"><p>Nenhuma atividade encontrada.</p></div>}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="kanban-board" style={{ flex: 1 }}>
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                col={col}
                tasks={tasksByGroup(col.id)}
                onAddCard={(sg) => setActivityModal({ open: true, task: null, defaultStatus: STATUS_MAP[sg] })}
                onViewCard={(t) => setDrawer(t)}
                onDeleteCard={handleDeleteCard}
                isSelecting={selectionMode === col.id}
                selectedTaskIds={selectedTaskIds}
                onToggleSelect={handleToggleSelect}
                onStartSelect={() => { setSelectionMode(col.id); setSelectedTaskIds(new Set()); }}
              />
            ))}
          </div>
        </DndContext>
      )}

      {/* Drawer de detalhe */}
      {drawer && (
        <DrawerDetalhe
          task={drawer}
          onClose={() => setDrawer(null)}
          onEdit={(t) => { setDrawer(null); setActivityModal({ open: true, task: t }); }}
          onDelete={(id) => { setDrawer(null); handleDeleteCard(id); }}
          onAdvanceStatus={handleAdvanceStatus}
        />
      )}

      {/* Barra de seleção múltipla */}
      {selectionMode && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 200, whiteSpace: 'nowrap' }}>
          <span className="mono" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-2)', marginRight: 4 }}>{selectedTaskIds.size} selecionado(s)</span>
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
          <button className="btn btn-ghost btn-xs" onClick={() => setSelectedTaskIds(new Set(tasksByGroup(selectionMode).map((t) => t.id)))}>Todos</button>
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Mover para</span>
          {COLUMNS.filter((c) => c.id !== selectionMode).map((target) => (
            <button key={target.id} className="btn btn-secondary btn-xs" disabled={selectedTaskIds.size === 0} onClick={() => handleMoveSelected(target.id)}>{target.title}</button>
          ))}
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
          <button className="btn btn-danger btn-xs" disabled={selectedTaskIds.size === 0} onClick={handleDeleteSelected}>Excluir</button>
          <button className="btn btn-ghost btn-xs" onClick={handleCancelSelect}>Cancelar</button>
        </div>
      )}

      <ActivityModal open={activityModal.open} task={activityModal.task} defaultStatus={activityModal.defaultStatus} projects={projects} users={users} onClose={() => setActivityModal({ open: false, task: null })} onSave={handleSaveActivity} />
      <ImportModal open={importModal} projects={projects} users={users} onClose={() => setImportModal(false)} onImported={(nt) => setTasks((curr) => [...curr, ...nt])} onProjectsCreated={(np) => setProjects((curr) => [...curr, ...np])} />
      <ConfirmModal open={!!confirm} title={confirm?.title ?? ''} message={confirm?.message} confirmLabel="Excluir" danger onConfirm={() => confirm?.onConfirm()} onClose={() => setConfirm(null)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
