'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  DndContext, DragEndEvent, useDroppable,
  closestCenter, PointerSensor, useSensors, useSensor,
} from '@dnd-kit/core';
import ActivityModal from '@/components/ActivityModal';
import DrawerDetalhe from '@/components/DrawerDetalhe';
import KanbanCard from '@/components/KanbanCard';
import ConfirmModal from '@/components/ConfirmModal';
import Calendario, { type CalendarioItem } from '@/components/Calendario';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import {
  fetchTasks, createTask, updateTask, deleteTask,
  fetchProjects, fetchUsers,
} from '@/lib/api';
import { statusGroupLabel } from '@/lib/utils';
import { getUser } from '@/lib/auth';
import { LayoutGrid, List, Calendar, Search, Funnel, Plus, Ellipsis } from 'lucide-react';
import type { UserPublic } from '@/lib/api';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import type { Task, StatusGroup, Project } from '@/types';
import { useTabs, useActiveTab } from '@/context/TabsContext';

const COLUMNS: { id: StatusGroup; title: string; color: string }[] = [
  { id: 'pending',    title: 'Pendente',    color: 'var(--s-pending)' },
  { id: 'in_progress',title: 'Em Andamento',color: 'var(--s-progress)' },
  { id: 'review',     title: 'Em Revisão',  color: 'var(--s-review)' },
  { id: 'done',       title: 'Concluído',   color: 'var(--s-done)' },
];

const STATUS_MAP: Record<StatusGroup, string> = {
  pending: 'Pendente', in_progress: 'Em Andamento', review: 'Em Revisão', done: 'Concluído',
};

function KanbanColumn({
  col, tasks, onAddCard, onViewCard, onDeleteCard,
  isSelecting, selectedTaskIds, onToggleSelect, onStartSelect,
}: {
  col: typeof COLUMNS[0]; tasks: Task[];
  onAddCard: (sg: StatusGroup) => void; onViewCard: (t: Task) => void; onDeleteCard: (id: string) => void;
  isSelecting: boolean; selectedTaskIds: Set<string>; onToggleSelect: (id: string) => void; onStartSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); }
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
          <button className="column-action-btn" onClick={() => setMenuOpen((o) => !o)}><Ellipsis size={14} /></button>
          {menuOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: 150, padding: '2px 0' }}>
              <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text)', fontFamily: 'inherit' }}
                onClick={() => { setMenuOpen(false); onStartSelect(); }}>Selecionar itens</button>
            </div>
          )}
        </div>
      </div>
      <div className="kanban-cards">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onView={onViewCard} onDelete={onDeleteCard}
            selectionMode={isSelecting} isSelected={selectedTaskIds.has(task.id)} onToggleSelect={onToggleSelect} />
        ))}
      </div>
      {!isSelecting && (
        <button className="column-add-btn" onClick={() => onAddCard(col.id)}>
          <Plus size={13} />Adicionar atividade
        </button>
      )}
    </div>
  );
}

type View = 'kanban' | 'list' | 'calendar';

export default function MinhasAtividadesPage() {
  const { toasts, addToast, dismissToast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const currentUser = getUser();

  // ── Tab context ──────────────────────────────────────────────────────────
  const { patchActiveTab } = useTabs();
  const activeTab = useActiveTab();
  const tabFilters = activeTab?.filters;
  const search         = tabFilters?.search    ?? '';
  const filterPriority = tabFilters?.fPrio     ?? '';
  const view           = tabFilters?.view      ?? 'kanban';

  // Reset selection on tab switch
  useEffect(() => {
    setSelectionMode(null);
    setSelectedTaskIds(new Set());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.id]);

  // ── API data ─────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [activityModal, setActivityModal] = useState<{ open: boolean; task: Task | null; defaultStatus?: string }>({ open: false, task: null });
  const [drawer, setDrawer] = useState<Task | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message?: string; onConfirm: () => void } | null>(null);
  const [selectionMode, setSelectionMode] = useState<StatusGroup | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    Promise.all([fetchTasks(), fetchProjects(), fetchUsers()])
      .then(([t, p, u]) => { setTasks(t); setProjects(p); setUsers(u.filter((x) => x.role !== 'Admin')); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefetchOnFocus(load);

  const myTasks = useMemo(() => {
    const name = currentUser?.name ?? '';
    return tasks.filter((t) => {
      if (t.responsible !== name) {
        try { const co = JSON.parse(t.co_responsibles ?? '[]') as string[]; if (!co.includes(name)) return false; } catch { return false; }
      }
      if (filterPriority && t.priority?.toLowerCase() !== filterPriority.toLowerCase()) return false;
      if (search) { const q = search.toLowerCase(); if (!t.activity.toLowerCase().includes(q) && !t.category?.toLowerCase().includes(q)) return false; }
      return true;
    });
  }, [tasks, currentUser, filterPriority, search]);

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
    if (t.co_responsibles) { try { const names = JSON.parse(t.co_responsibles) as string[]; coIds = names.map((n) => users.find((u) => u.name === n)?.id).filter((id): id is string => !!id); } catch { coIds = null; } }
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
    if (data.co_responsibles) { try { const names = JSON.parse(data.co_responsibles) as string[]; coIds = names.map((n) => users.find((u) => u.name === n)?.id).filter((id): id is string => !!id); } catch { coIds = null; } }
    const payload = { ...data, project_id: data.project_id ?? undefined, responsible_id, co_responsible_ids: coIds };
    if (task) {
      const updated = await updateTask(task, payload);
      setTasks((curr) => curr.map((x) => (x.id === task.id ? updated : x)));
      if (drawer?.id === task.id) setDrawer(updated);
    } else {
      const created = await createTask(payload);
      setTasks((curr) => [...curr, created]);
      addToast('success', 'Atividade criada', `"${created.activity}" criada.`);
    }
  }

  function handleDeleteCard(id: string) {
    setConfirm({ title: 'Excluir atividade', message: 'Esta ação não pode ser desfeita.', onConfirm: async () => {
      setDrawer(null); setTasks((curr) => curr.filter((x) => x.id !== id));
      try { await deleteTask(id); } catch { load(); }
    }});
  }

  function handleAdvanceStatus() {
    if (!drawer) return;
    const NEXT: Record<string, StatusGroup> = { pending: 'in_progress', in_progress: 'review', review: 'done' };
    const next = NEXT[drawer.status_group]; if (!next) return;
    let coIds: string[] | null = null;
    if (drawer.co_responsibles) { try { const names = JSON.parse(drawer.co_responsibles) as string[]; coIds = names.map((n) => users.find((u) => u.name === n)?.id).filter((id): id is string => !!id); } catch { coIds = null; } }
    const updated = { ...drawer, status_group: next };
    setDrawer(updated); setTasks((curr) => curr.map((x) => (x.id === drawer.id ? updated : x)));
    updateTask(drawer, { status_group: next, co_responsible_ids: coIds })
      .then((res) => { setDrawer(res); setTasks((curr) => curr.map((x) => (x.id === res.id ? res : x))); })
      .catch(() => { setDrawer(drawer); load(); });
  }

  function handleToggleSelect(id: string) {
    setSelectedTaskIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  const tasksByGroup = useCallback((sg: StatusGroup) => myTasks.filter((t) => t.status_group === sg), [myTasks]);

  const calItems: CalendarioItem[] = useMemo(() => myTasks.map((t) => ({
    id: t.id, title: t.activity,
    start_date: t.deadline ?? t.date, end_date: t.deadline ?? t.date,
    color: t.status_group === 'done' ? 'var(--s-done)' : t.status_group === 'review' ? 'var(--s-review)' : t.status_group === 'in_progress' ? 'var(--s-progress)' : 'var(--s-pending)',
    label: t.priority,
  })), [myTasks]);

  return (
    <>
      {/* ── Header de tela ── */}
      <div style={{ padding: '26px 32px 0', flexShrink: 0, background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div className="mono" style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-3)', letterSpacing: '1.4px', textTransform: 'uppercase' }}>
              Atribuídas a você
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 600, letterSpacing: '-0.7px', color: 'var(--text)', marginTop: 6 }}>Minhas atividades</h1>
          </div>
        </div>
      </div>

      {/* ── View toggle + filtros ── */}
      <div style={{ borderBottom: '1px solid var(--line-1)', flexShrink: 0, background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', padding: '0 28px' }}>
          {(['kanban', 'list', 'calendar'] as const).map((v) => {
            const labels = { kanban: 'Quadro', list: 'Lista', calendar: 'Calendário' };
            const isAct = view === v;
            return (
              <button key={v} onClick={() => patchActiveTab({ view: v })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', height: 40, border: 'none', borderBottom: isAct ? '2px solid #034EA2' : '2px solid transparent', background: 'transparent', color: isAct ? '#034EA2' : 'var(--text-2)', fontSize: '0.82rem', fontWeight: isAct ? 600 : 400, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', transition: 'color 0.12s, border-color 0.12s' }}>
                {labels[v]}
              </button>
            );
          })}
          <button onClick={() => setActivityModal({ open: true, task: null, defaultStatus: 'Pendente' })}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 40, border: 'none', borderBottom: '2px solid transparent', background: 'transparent', color: '#034EA2', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, marginLeft: 'auto', fontFamily: 'inherit' }}>
            <Plus size={14} />Nova atividade
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 32px', flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 11px', width: 230 }}>
            <Search size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            <input value={search} onChange={(e) => patchActiveTab({ search: e.target.value })} placeholder="Pesquisar..." style={{ border: 'none', outline: 'none', background: 'none', fontSize: '0.82rem', color: 'var(--text)', width: '100%', fontFamily: 'inherit' }} />
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <select value={filterPriority} onChange={(e) => patchActiveTab({ fPrio: e.target.value })} className={`filter-chip${filterPriority ? ' active' : ''}`}>
            <option value="">Prioridade</option>
            <option value="Alta">Alta</option>
            <option value="Média">Média</option>
            <option value="Baixa">Baixa</option>
          </select>
          {filterPriority && (
            <button onClick={() => patchActiveTab({ fPrio: '' })} className="mono" style={{ fontSize: '0.72rem', fontWeight: 500, color: '#034EA2', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}>LIMPAR</button>
          )}
          <div style={{ flex: 1 }} />
          <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)', letterSpacing: '0.5px' }}>{myTasks.length} ATIVIDADES</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Carregando suas atividades…</div>
      ) : view === 'calendar' ? (
        <div style={{ padding: '16px 32px', flex: 1, overflow: 'auto' }}>
          <Calendario items={calItems} onItemClick={(item) => { const t = tasks.find((x) => x.id === item.id); if (t) setDrawer(t); }} legend={[
            { color: 'var(--s-pending)', label: 'Pendente' }, { color: 'var(--s-progress)', label: 'Em Andamento' },
            { color: 'var(--s-review)', label: 'Em Revisão' }, { color: 'var(--s-done)', label: 'Concluído' },
          ]} />
        </div>
      ) : view === 'list' ? (
        <div className="list-view">
          <table className="list-table">
            <thead><tr><th>Atividade</th><th>Prioridade</th><th>Status</th><th>Prazo</th><th>Projeto</th></tr></thead>
            <tbody>
              {myTasks.map((t) => (
                <tr key={t.id} onClick={() => setDrawer(t)}>
                  <td style={{ fontWeight: 600 }}>{t.activity}</td>
                  <td><span className="mono" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: t.priority === 'Alta' ? 'var(--red)' : t.priority === 'Baixa' ? 'var(--green-t)' : 'var(--gold-t)' }}>{t.priority}</span></td>
                  <td><span className={`status-chip ${t.status_group}`}>{statusGroupLabel(t.status_group)}</span></td>
                  <td className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{t.deadline ?? '—'}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{projects.find((p) => p.id === t.project_id)?.name ?? t.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {myTasks.length === 0 && <div className="empty-state"><p>Nenhuma atividade atribuída a você.</p></div>}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="kanban-board" style={{ flex: 1 }}>
            {COLUMNS.map((col) => (
              <KanbanColumn key={col.id} col={col} tasks={tasksByGroup(col.id)}
                onAddCard={(sg) => setActivityModal({ open: true, task: null, defaultStatus: STATUS_MAP[sg] })}
                onViewCard={(t) => setDrawer(t)} onDeleteCard={handleDeleteCard}
                isSelecting={selectionMode === col.id} selectedTaskIds={selectedTaskIds}
                onToggleSelect={handleToggleSelect} onStartSelect={() => { setSelectionMode(col.id); setSelectedTaskIds(new Set()); }} />
            ))}
          </div>
        </DndContext>
      )}

      {drawer && (
        <DrawerDetalhe task={drawer} onClose={() => setDrawer(null)}
          onEdit={(t) => { setDrawer(null); setActivityModal({ open: true, task: t }); }}
          onDelete={(id) => { setDrawer(null); handleDeleteCard(id); }}
          onAdvanceStatus={handleAdvanceStatus} />
      )}

      {selectionMode && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 200, whiteSpace: 'nowrap' }}>
          <span className="mono" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-2)' }}>{selectedTaskIds.size} selecionado(s)</span>
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
          {COLUMNS.filter((c) => c.id !== selectionMode).map((target) => (
            <button key={target.id} className="btn btn-secondary btn-xs" disabled={selectedTaskIds.size === 0}
              onClick={async () => {
                const ids = [...selectedTaskIds];
                const prev = tasks;
                setTasks((curr) => curr.map((t) => ids.includes(t.id) ? { ...t, status_group: target.id } : t));
                setSelectionMode(null); setSelectedTaskIds(new Set());
                try { await Promise.all(ids.map((id) => { const t = prev.find((x) => x.id === id)!; let coIds: string[] | null = null; if (t.co_responsibles) { try { const names = JSON.parse(t.co_responsibles) as string[]; coIds = names.map((n) => users.find((u) => u.name === n)?.id).filter((id): id is string => !!id); } catch { coIds = null; } } return updateTask(t, { status_group: target.id, co_responsible_ids: coIds }); })); } catch { setTasks(prev); }
              }}>
              {target.title}
            </button>
          ))}
          <button className="btn btn-ghost btn-xs" onClick={() => { setSelectionMode(null); setSelectedTaskIds(new Set()); }}>Cancelar</button>
        </div>
      )}

      <ActivityModal open={activityModal.open} task={activityModal.task} defaultStatus={activityModal.defaultStatus}
        defaultResponsible={currentUser?.name}
        projects={projects} users={users}
        onClose={() => setActivityModal({ open: false, task: null })} onSave={handleSaveActivity} />
      <ConfirmModal open={!!confirm} title={confirm?.title ?? ''} message={confirm?.message} confirmLabel="Excluir" danger onConfirm={() => confirm?.onConfirm()} onClose={() => setConfirm(null)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
