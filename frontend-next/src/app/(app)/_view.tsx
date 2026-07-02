'use client';

import { useState, useEffect, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensors, useSensor } from '@dnd-kit/core';
import ActivityModal from '@/components/ActivityModal';
import DrawerDetalhe from '@/components/DrawerDetalhe';
import ImportModal from '@/components/ImportModal';
import KanbanColumn from '@/components/KanbanColumn';
import TaskListView from '@/components/TaskListView';
import ConfirmModal from '@/components/ConfirmModal';
import Calendario, { type CalendarioItem } from '@/components/Calendario';
import PageHeader from '@/components/PageHeader';
import ToastContainer from '@/components/ToastContainer';
import { useToast } from '@/hooks/useToast';
import { useTaskBoard, type ActivityFormData } from '@/hooks/useTaskBoard';
import { KANBAN_COLUMNS } from '@/lib/utils';
import { useTabs, useActiveTab } from '@/context/TabsContext';
import { Search, Plus, Download, FileUp } from 'lucide-react';
import type { StatusGroup } from '@/types';

const STATUS_LABELS: Record<StatusGroup, string> = {
  pending: 'Pendente', in_progress: 'Em Andamento', review: 'Em Revisão', done: 'Concluído',
};

export default function BoardPage() {
  const { toasts, addToast, dismissToast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [importModalOpen, setImportModalOpen] = useState(false);

  // ── Filtros da aba ────────────────────────────────────────────────────────

  const { patchActiveTab } = useTabs();
  const activeTab = useActiveTab();
  const tabFilters = activeTab?.filters;
  const search = tabFilters?.search ?? '';
  const filterUser = tabFilters?.filterUser ?? '';
  const filterPriority = tabFilters?.filterPriority ?? '';
  const filterProject = tabFilters?.filterProject ?? '';
  const filterDateFrom = tabFilters?.filterDateFrom ?? '';
  const filterDateTo = tabFilters?.filterDateTo ?? '';
  const view = tabFilters?.view ?? 'kanban';

  // ── Estado e operações do board ───────────────────────────────────────────

  const {
    allTasks, setAllTasks, isLoading, loadError,
    projects, setProjects, users,
    activityModal, openCreateActivityModal, openEditActivityModal, closeActivityModal, saveActivity,
    openedTask, setOpenedTask,
    pendingConfirm, setPendingConfirm,
    selectionColumn, selectedTaskIds,
    toggleTaskSelection, selectAllTasksInColumn, beginColumnSelection, cancelSelection,
    moveSelectedTasks, requestDeleteSelectedTasks,
    handleDragEnd, requestDeleteTask, requestArchiveTask, advanceOpenedTaskStatus,
  } = useTaskBoard();

  // Limpa seleção ao trocar de aba
  useEffect(() => {
    cancelSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.id]);

  // ── Filtragem de tarefas ──────────────────────────────────────────────────

  const filteredTasks = useMemo(() => allTasks.filter((t) => {
    if (filterUser && t.responsible !== filterUser) return false;
    if (filterPriority && t.priority?.toLowerCase() !== filterPriority.toLowerCase()) return false;
    if (filterProject && t.project_id !== filterProject) return false;
    if (filterDateFrom && t.date < filterDateFrom) return false;
    if (filterDateTo && t.date > filterDateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.activity.toLowerCase().includes(q)
        && !t.responsible.toLowerCase().includes(q)
        && !t.category?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [allTasks, filterUser, filterPriority, filterProject, filterDateFrom, filterDateTo, search]);

  // ── Estatísticas do header ────────────────────────────────────────────────

  const todayStr = new Date().toISOString().split('T')[0];
  const boardStats = useMemo(() => {
    const doneCount = filteredTasks.filter(t => t.status_group === 'done').length;
    const openCount = filteredTasks.length - doneCount;
    const overdueCount = filteredTasks.filter(t => t.status_group !== 'done' && t.deadline && t.deadline < todayStr).length;
    const completedPct = filteredTasks.length > 0 ? Math.round((doneCount / filteredTasks.length) * 100) : 0;
    return [
      { label: 'ABERTAS', value: String(openCount), color: 'var(--blue)' },
      { label: 'ATRASADAS', value: String(overdueCount), color: '#b42318' },
      { label: 'CONCLUÍDO', value: `${completedPct}%`, color: '#1B8A4B' },
    ];
  }, [filteredTasks, todayStr]);

  // ── Itens do calendário ───────────────────────────────────────────────────

  const calendarItems: CalendarioItem[] = useMemo(() => filteredTasks.map((t) => ({
    id: t.id,
    title: t.activity,
    start_date: t.deadline ?? t.date,
    end_date: t.deadline ?? t.date,
    color: t.status_group === 'done' ? 'var(--s-done)'
      : t.status_group === 'review' ? 'var(--s-review)'
        : t.status_group === 'in_progress' ? 'var(--s-progress)'
          : 'var(--s-pending)',
    label: t.responsible,
  })), [filteredTasks]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const hasActiveFilters = filterUser || filterPriority || filterProject || filterDateFrom || filterDateTo;

  async function handleSaveActivity(formData: ActivityFormData) {
    const created = await saveActivity(formData);
    if (created) addToast('success', 'Atividade criada', `"${created.activity}" foi adicionada.`);
  }

  async function handleMoveSelected(targetGroup: StatusGroup) {
    const count = await moveSelectedTasks(targetGroup);
    if (count > 0) {
      addToast('success', 'Atividades movidas', `${count} atividade(s) movida(s) para ${STATUS_LABELS[targetGroup]}.`);
    }
  }

  function exportCSV() {
    const header = ['Atividade', 'Categoria', 'Responsável', 'Status', 'Prioridade', 'Prazo', 'Criado em', 'Projeto', 'Co-responsáveis', 'Colaboradores externos'];
    const rows = filteredTasks.map((t) => {
      const projectName = projects.find((p) => p.id === t.project_id)?.name ?? '';
      const coResponsibles = t.co_responsibles
        ? (() => { try { return (JSON.parse(t.co_responsibles!) as string[]).join('; '); } catch { return ''; } })()
        : '';
      return [t.activity, t.category, t.responsible, t.status, t.priority, t.deadline ?? '', t.date, projectName, coResponsibles, t.external_collaborators ?? ''];
    });
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atividades_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <PageHeader
        eyebrow="Planejamento"
        title="Atividades"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            {boardStats.map((stat) => (
              <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: stat.color, boxShadow: `0 0 0 3px ${stat.color}1f`, flexShrink: 0 }} />
                <span className="mono" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>{stat.value}</span>
                <span className="mono" style={{ fontSize: '0.66rem', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-3)' }}>{stat.label}</span>
              </div>
            ))}
          </div>
        }
        tabBarRight={
          <button
            onClick={() => openCreateActivityModal()}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 40, border: 'none', borderBottom: '2px solid transparent', background: 'transparent', color: 'var(--blue)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Plus size={14} />
            Nova atividade
          </button>
        }
      />

      {/* Toolbar: view + busca + filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 32px', borderBottom: '1px solid var(--line-1)', flexShrink: 0, background: 'var(--surface)', flexWrap: 'wrap' }}>
        {/* Seletor de view */}
        <div style={{ display: 'flex', gap: 18 }}>
          {(['kanban', 'list', 'calendar'] as const).map((v) => {
            const viewLabels = { kanban: 'Quadro', list: 'Lista', calendar: 'Calendário' };
            const isActive = view === v;
            return (
              <button key={v} onClick={() => patchActiveTab({ view: v })}
                style={{ background: 'none', border: 'none', padding: '0 0 4px', fontSize: '0.86rem', fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text)' : 'var(--text-3)', cursor: 'pointer', borderBottom: isActive ? '2px solid var(--blue)' : '2px solid transparent', letterSpacing: '-0.1px', fontFamily: 'inherit' }}>
                {viewLabels[v]}
              </button>
            );
          })}
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

        {/* Busca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', borderRadius: 3, padding: '7px 11px', flex: '1 1 160px', minWidth: 140, maxWidth: 230 }}>
          <Search size={14} style={{ color: '#a7adb6', flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => patchActiveTab({ search: e.target.value })}
            placeholder="Pesquisar..."
            style={{ border: 'none', outline: 'none', background: 'none', fontSize: '0.82rem', color: 'var(--text)', width: '100%', fontFamily: 'inherit' }}
          />
        </div>

        {/* Filtros */}
        <select value={filterUser} onChange={(e) => patchActiveTab({ filterUser: e.target.value })}
          style={{ padding: '7px 11px', borderRadius: 3, border: filterUser ? '1px solid var(--blue)' : '1px solid var(--border)', background: 'var(--surface)', color: filterUser ? 'var(--blue)' : 'var(--text-2)', fontSize: '0.8rem', fontWeight: filterUser ? 600 : 400, cursor: 'pointer', outline: 'none' }}>
          <option value="">Responsável</option>
          {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
        </select>

        <select value={filterPriority} onChange={(e) => patchActiveTab({ filterPriority: e.target.value })}
          style={{ padding: '7px 11px', borderRadius: 3, border: filterPriority ? '1px solid var(--blue)' : '1px solid var(--border)', background: 'var(--surface)', color: filterPriority ? 'var(--blue)' : 'var(--text-2)', fontSize: '0.8rem', fontWeight: filterPriority ? 600 : 400, cursor: 'pointer', outline: 'none' }}>
          <option value="">Prioridade</option>
          <option value="Alta">Alta</option>
          <option value="Média">Média</option>
          <option value="Baixa">Baixa</option>
        </select>

        <select value={filterProject} onChange={(e) => patchActiveTab({ filterProject: e.target.value })}
          style={{ padding: '7px 11px', borderRadius: 3, border: filterProject ? '1px solid var(--blue)' : '1px solid var(--border)', background: 'var(--surface)', color: filterProject ? 'var(--blue)' : 'var(--text-2)', fontSize: '0.8rem', fontWeight: filterProject ? 600 : 400, cursor: 'pointer', outline: 'none', maxWidth: 130, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <option value="">Projeto</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {/* Filtro por data */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: filterDateFrom || filterDateTo ? '1px solid var(--blue)' : '1px solid var(--border)', borderRadius: 3, padding: '0 8px', height: 34, background: 'var(--surface)' }}>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => patchActiveTab({ filterDateFrom: e.target.value })}
            style={{ border: 'none', outline: 'none', background: 'none', fontSize: '0.78rem', color: filterDateFrom ? 'var(--blue)' : 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}
          />
          <span style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>–</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => patchActiveTab({ filterDateTo: e.target.value })}
            style={{ border: 'none', outline: 'none', background: 'none', fontSize: '0.78rem', color: filterDateTo ? 'var(--blue)' : 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => patchActiveTab({ filterUser: '', filterPriority: '', filterProject: '', filterDateFrom: '', filterDateTo: '' })}
            className="mono"
            style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}
          >
            LIMPAR
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Ações: importar e exportar */}
        {/* <button
          onClick={() => setImportModalOpen(true)}
          title="Importar atividades via CSV"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--blue)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <FileUp size={13} />Importar
        </button>
        <button
          onClick={exportCSV}
          title="Exportar atividades visíveis como CSV"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--blue)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <Download size={13} />Exportar
        </button> */}

        <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)', letterSpacing: '0.5px' }}>
          {filteredTasks.length} ATIVIDADES
        </span>
      </div>

      {/* Conteúdo principal */}
      {isLoading ? (
        <div className="loading-state">Carregando atividades…</div>
      ) : loadError ? (
        <div className="loading-state" style={{ color: 'var(--red)' }}>{loadError}</div>
      ) : view === 'calendar' ? (
        <div style={{ padding: '16px 32px', flex: 1, overflow: 'auto' }}>
          <Calendario
            items={calendarItems}
            onItemClick={(item) => { const t = allTasks.find((x) => x.id === item.id); if (t) setOpenedTask(t); }}
            legend={[
              { color: 'var(--s-pending)', label: 'Pendente' },
              { color: 'var(--s-progress)', label: 'Em Andamento' },
              { color: 'var(--s-review)', label: 'Em Revisão' },
              { color: 'var(--s-done)', label: 'Concluído' },
            ]}
          />
        </div>
      ) : view === 'list' ? (
        <TaskListView
          tasks={filteredTasks}
          projects={projects}
          onTaskClick={setOpenedTask}
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', alignItems: 'start', flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={filteredTasks.filter((t) => t.status_group === col.id)}
                projects={projects}
                onAddCard={(sg) => openCreateActivityModal(STATUS_LABELS[sg])}
                onViewCard={setOpenedTask}
                onDeleteCard={requestDeleteTask}
                onArchiveCard={requestArchiveTask}
                isSelecting={selectionColumn === col.id}
                selectedTaskIds={selectedTaskIds}
                onToggleSelect={toggleTaskSelection}
                onStartSelect={() => beginColumnSelection(col.id)}
              />
            ))}
          </div>
        </DndContext>
      )}

      {/* Drawer de detalhe */}
      {openedTask && (
        <DrawerDetalhe
          task={openedTask}
          onClose={() => setOpenedTask(null)}
          onEdit={(t) => { setOpenedTask(null); openEditActivityModal(t); }}
          onDelete={(id) => { setOpenedTask(null); requestDeleteTask(id); }}
          onAdvanceStatus={advanceOpenedTaskStatus}
          onArchive={(id) => { setOpenedTask(null); requestArchiveTask(id); }}
        />
      )}

      {/* Barra de seleção múltipla */}
      {selectionColumn && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 200, whiteSpace: 'nowrap' }}>
          <span className="mono" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-2)', marginRight: 4 }}>
            {selectedTaskIds.size} selecionado(s)
          </span>
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => selectAllTasksInColumn(filteredTasks.filter((t) => t.status_group === selectionColumn))}
          >
            Todos
          </button>
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Mover para</span>
          {KANBAN_COLUMNS.filter((c) => c.id !== selectionColumn).map((target) => (
            <button
              key={target.id}
              className="btn btn-secondary btn-xs"
              disabled={selectedTaskIds.size === 0}
              onClick={() => handleMoveSelected(target.id)}
            >
              {target.title}
            </button>
          ))}
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
          <button className="btn btn-danger btn-xs" disabled={selectedTaskIds.size === 0} onClick={requestDeleteSelectedTasks}>Excluir</button>
          <button className="btn btn-ghost btn-xs" onClick={cancelSelection}>Cancelar</button>
        </div>
      )}

      <ActivityModal
        open={activityModal.open}
        task={activityModal.task}
        defaultStatus={activityModal.defaultStatus}
        projects={projects}
        tasks={allTasks}
        users={users}
        onClose={closeActivityModal}
        onSave={handleSaveActivity}
      />
      <ImportModal
        open={importModalOpen}
        projects={projects}
        users={users}
        onClose={() => setImportModalOpen(false)}
        onImported={(newTasks) => setAllTasks((curr) => [...curr, ...newTasks])}
        onProjectsCreated={(newProjects) => setProjects((curr) => [...curr, ...newProjects])}
      />
      <ConfirmModal
        open={!!pendingConfirm}
        title={pendingConfirm?.title ?? ''}
        message={pendingConfirm?.message}
        confirmLabel={pendingConfirm?.confirmLabel ?? 'Confirmar'}
        danger={pendingConfirm?.danger ?? false}
        onConfirm={() => pendingConfirm?.onConfirm()}
        onClose={() => setPendingConfirm(null)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
