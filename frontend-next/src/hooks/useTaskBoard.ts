'use client';

import { useState, useCallback, useEffect } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  fetchTasks, createTask, updateTask, deleteTask,
  fetchProjects, fetchUsers,
  getCachedTasks, getCachedProjects, getCachedUsers,
} from '@/lib/api';
import type { UserPublic } from '@/lib/api';
import { resolveCoResponsibleIds, STATUS_NEXT } from '@/lib/utils';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import type { Task, StatusGroup, Project } from '@/types';

// ── Tipos exportados ──────────────────────────────────────────────────────────

export interface ActivityFormData {
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
}

export interface ConfirmDialogState {
  title: string;
  message?: string;
  onConfirm: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Centraliza o estado e as operações comuns às páginas de board de atividades
 * (Atividades e Minhas Atividades). Cada página adiciona sua própria lógica
 * de filtragem em cima dos `allTasks` retornados aqui.
 */
export function useTaskBoard() {
  const [allTasks, setAllTasks] = useState<Task[]>(() => getCachedTasks() ?? []);
  const [isLoading, setIsLoading] = useState(() => getCachedTasks() === null);
  const [loadError, setLoadError] = useState('');
  const [projects, setProjects] = useState<Project[]>(() => getCachedProjects() ?? []);
  const [users, setUsers] = useState<UserPublic[]>(
    () => (getCachedUsers() ?? []).filter((u) => u.role !== 'Admin'),
  );

  const [activityModal, setActivityModal] = useState<{
    open: boolean;
    task: Task | null;
    defaultStatus?: string;
  }>({ open: false, task: null });

  const [openedTask, setOpenedTask] = useState<Task | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmDialogState | null>(null);
  const [selectionColumn, setSelectionColumn] = useState<StatusGroup | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // ── Carregamento de dados ─────────────────────────────────────────────────

  const loadBoardData = useCallback(() => {
    Promise.all([fetchTasks(), fetchProjects(), fetchUsers()])
      .then(([tasks, loadedProjects, loadedUsers]) => {
        setAllTasks(tasks);
        setProjects(loadedProjects);
        setUsers(loadedUsers.filter((u) => u.role !== 'Admin'));
      })
      .catch((e) => setLoadError(`Erro: ${e?.message ?? e}`))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { loadBoardData(); }, [loadBoardData]);
  useRefetchOnFocus(loadBoardData);

  // ── Drag & drop ───────────────────────────────────────────────────────────

  function handleDragEnd(event: DragEndEvent) {
    if (selectionColumn) return;
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const newGroup = over.id as StatusGroup;
    const task = allTasks.find((x) => x.id === taskId);
    if (!task || task.status_group === newGroup) return;

    const previousTasks = allTasks;
    setAllTasks((curr) => curr.map((x) => x.id === taskId ? { ...x, status_group: newGroup } : x));

    const coIds = resolveCoResponsibleIds(task.co_responsibles, users);
    updateTask(task, { status_group: newGroup, co_responsible_ids: coIds })
      .then((updated) => setAllTasks((curr) => curr.map((x) => x.id === taskId ? updated : x)))
      .catch(() => setAllTasks(previousTasks));
  }

  // ── Criar / editar atividade ──────────────────────────────────────────────

  function openCreateActivityModal(defaultStatus?: string) {
    setActivityModal({ open: true, task: null, defaultStatus });
  }

  function openEditActivityModal(task: Task) {
    setActivityModal({ open: true, task });
  }

  function closeActivityModal() {
    setActivityModal({ open: false, task: null });
  }

  /**
   * Salva a atividade (criar ou editar).
   * Retorna a tarefa criada (para o chamador exibir um toast), ou null em edição.
   */
  async function saveActivity(formData: ActivityFormData): Promise<Task | null> {
    const existingTask = activityModal.task;
    setActivityModal({ open: false, task: null });

    const responsibleId = users.find((u) => u.name === formData.responsible)?.id ?? null;
    const coIds = resolveCoResponsibleIds(formData.co_responsibles, users);
    const payload = {
      ...formData,
      project_id: formData.project_id ?? undefined,
      responsible_id: responsibleId,
      co_responsible_ids: coIds,
    };

    if (existingTask) {
      const updated = await updateTask(existingTask, payload);
      setAllTasks((curr) => curr.map((x) => x.id === existingTask.id ? updated : x));
      if (openedTask?.id === existingTask.id) setOpenedTask(updated);
      return null;
    } else {
      const created = await createTask(payload);
      setAllTasks((curr) => [...curr, created]);
      return created;
    }
  }

  // ── Excluir atividade ─────────────────────────────────────────────────────

  function requestDeleteTask(taskId: string) {
    setPendingConfirm({
      title: 'Excluir atividade',
      message: 'Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setOpenedTask(null);
        setAllTasks((curr) => curr.filter((x) => x.id !== taskId));
        try { await deleteTask(taskId); } catch { loadBoardData(); }
      },
    });
  }

  // ── Avançar status da tarefa aberta ──────────────────────────────────────

  function advanceOpenedTaskStatus() {
    if (!openedTask) return;
    const nextGroup = STATUS_NEXT[openedTask.status_group];
    if (!nextGroup) return;

    const coIds = resolveCoResponsibleIds(openedTask.co_responsibles, users);
    const optimistic = { ...openedTask, status_group: nextGroup };
    setOpenedTask(optimistic);
    setAllTasks((curr) => curr.map((x) => x.id === openedTask.id ? optimistic : x));

    updateTask(openedTask, { status_group: nextGroup, co_responsible_ids: coIds })
      .then((updated) => {
        setOpenedTask(updated);
        setAllTasks((curr) => curr.map((x) => x.id === updated.id ? updated : x));
      })
      .catch(() => {
        setOpenedTask(openedTask);
        loadBoardData();
      });
  }

  // ── Seleção múltipla ──────────────────────────────────────────────────────

  function toggleTaskSelection(taskId: string) {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  }

  function selectAllTasksInColumn(columnTasks: Task[]) {
    setSelectedTaskIds(new Set(columnTasks.map((t) => t.id)));
  }

  function beginColumnSelection(column: StatusGroup) {
    setSelectionColumn(column);
    setSelectedTaskIds(new Set());
  }

  function cancelSelection() {
    setSelectionColumn(null);
    setSelectedTaskIds(new Set());
  }

  /**
   * Move as tarefas selecionadas para outro grupo de status.
   * Retorna a quantidade de tarefas movidas (para o chamador exibir um toast).
   */
  async function moveSelectedTasks(targetGroup: StatusGroup): Promise<number> {
    if (!selectionColumn || selectedTaskIds.size === 0) return 0;
    const ids = [...selectedTaskIds];
    const previousTasks = allTasks;

    setAllTasks((curr) => curr.map((t) => ids.includes(t.id) ? { ...t, status_group: targetGroup } : t));
    cancelSelection();

    try {
      await Promise.all(ids.map((id) => {
        const task = previousTasks.find((x) => x.id === id)!;
        const coIds = resolveCoResponsibleIds(task.co_responsibles, users);
        return updateTask(task, { status_group: targetGroup, co_responsible_ids: coIds });
      }));
      return ids.length;
    } catch {
      setAllTasks(previousTasks);
      return 0;
    }
  }

  function requestDeleteSelectedTasks() {
    if (!selectionColumn || selectedTaskIds.size === 0) return;
    const ids = [...selectedTaskIds];
    setPendingConfirm({
      title: `Excluir ${ids.length} atividade(s)`,
      message: 'Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setAllTasks((curr) => curr.filter((t) => !ids.includes(t.id)));
        cancelSelection();
        try { await Promise.all(ids.map((id) => deleteTask(id))); } catch { loadBoardData(); }
      },
    });
  }

  // ── Saída ─────────────────────────────────────────────────────────────────

  return {
    // Dados
    allTasks,
    setAllTasks,
    isLoading,
    loadError,
    projects,
    setProjects,
    users,

    // Modal de atividade
    activityModal,
    openCreateActivityModal,
    openEditActivityModal,
    closeActivityModal,
    saveActivity,

    // Drawer de detalhe
    openedTask,
    setOpenedTask,

    // Diálogo de confirmação
    pendingConfirm,
    setPendingConfirm,

    // Seleção múltipla
    selectionColumn,
    selectedTaskIds,
    toggleTaskSelection,
    selectAllTasksInColumn,
    beginColumnSelection,
    cancelSelection,
    moveSelectedTasks,
    requestDeleteSelectedTasks,

    // Operações
    handleDragEnd,
    requestDeleteTask,
    advanceOpenedTaskStatus,
    loadBoardData,
  };
}
