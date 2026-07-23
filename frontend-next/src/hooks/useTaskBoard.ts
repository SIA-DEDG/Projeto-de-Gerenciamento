'use client';

import { useState, useCallback, useEffect } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  fetchTasks, createTask, updateTask, deleteTask, archiveTask,
  fetchProjects, fetchUsers, pinTask, unpinTask,
  getCachedTasks, getCachedProjects, getCachedUsers,
  addTaskFile, addTaskLink, removeTaskAttachment, invalidateTasksCache,
} from '@/lib/api';
import type { UserPublic } from '@/lib/api';
import { isSuperAdmin } from '@/lib/auth';
import { resolveCoResponsibleIds, taskCoResponsibleIds, STATUS_NEXT } from '@/lib/utils';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import { onTasksChanged } from '@/lib/taskEvents';
import type { Task, StatusGroup, Project, TaskAttachment } from '@/types';

// ── Tipos exportados ──────────────────────────────────────────────────────────

export interface ActivityFormData {
  activity: string;
  description: string;
  category: string;
  project_id: string | null;
  status: string;
  responsible: string;
  // IDs já resolvidos pelo modal (incluem membros de outra diretoria envolvida); quando
  // presentes, têm prioridade sobre a resolução por nome (limitada à própria diretoria).
  responsible_id?: string | null;
  co_responsible_ids?: string[];
  date: string;
  priority: string;
  co_responsibles: string | null;
  external_collaborators: string | null;
  deadline: string | null;
  attachments?: { name: string; type: string; size: number; data: string }[];
  links?: { name: string; url: string }[];
  removedAttachmentIndices?: number[];
}

export interface ConfirmDialogState {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

// Projeta localmente o resultado das mudanças de anexo (para atualização otimista da UI):
// remove os índices marcados e acrescenta os novos links/arquivos.
function applyAttachmentChanges(existing: TaskAttachment[], formData: ActivityFormData): TaskAttachment[] {
  const removed = new Set(formData.removedAttachmentIndices ?? []);
  const kept = existing.filter((_, i) => !removed.has(i));
  const links: TaskAttachment[] = (formData.links ?? []).map((l) => ({ type: 'link', name: l.name, url: l.url }));
  const files: TaskAttachment[] = (formData.attachments ?? []).map((f) => ({ type: 'file', name: f.name, path: '', size: f.size, mimeType: f.type }));
  return [...kept, ...links, ...files];
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
  // Admin dentro de uma diretoria conta como usuário normal; só o Super-Admin
  // (Admin sem diretoria) fica fora dos seletores de responsável.
  const [users, setUsers] = useState<UserPublic[]>(
    () => (getCachedUsers() ?? []).filter((u) => !isSuperAdmin(u)),
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
        setUsers(loadedUsers.filter((u) => !isSuperAdmin(u)));
      })
      .catch((e) => setLoadError(`Erro: ${e?.message ?? e}`))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { loadBoardData(); }, [loadBoardData]);
  useRefetchOnFocus(loadBoardData);
  // Reflete na hora (mesma aba) qualquer criar/editar/mover/excluir feito em outra
  // tela — igual Projetos e Sidebar já fazem. Entre usuários/navegadores é o polling.
  useEffect(() => onTasksChanged(loadBoardData), [loadBoardData]);

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

    const coIds = taskCoResponsibleIds(task, users);
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

    // Prioriza os IDs já resolvidos pelo modal (incluem outra diretoria); só cai na
    // resolução por nome (própria diretoria) quando o modal não os forneceu.
    const responsibleId = formData.responsible_id !== undefined
      ? formData.responsible_id
      : (users.find((u) => u.name === formData.responsible)?.id ?? null);
    const coIds = formData.co_responsible_ids ?? resolveCoResponsibleIds(formData.co_responsibles, users);
    const payload = {
      ...formData,
      project_id: formData.project_id ?? undefined,
      responsible_id: responsibleId,
      co_responsible_ids: coIds,
    };

    if (existingTask) {
      // UI otimista: reflete a mudança de anexos na hora; a rede roda em 2º plano.
      const optimistic = { ...existingTask, attachments: applyAttachmentChanges(existingTask.attachments ?? [], formData) };
      setAllTasks((curr) => curr.map((x) => x.id === existingTask.id ? optimistic : x));
      if (openedTask?.id === existingTask.id) setOpenedTask(optimistic);
      try {
        // Salva os anexos ANTES do updateTask: o refetch que ele dispara já vem com eles.
        await persistAttachments(existingTask.id, formData);
        const updated = await updateTask(existingTask, payload); // retorna a task já com os anexos finais
        setAllTasks((curr) => curr.map((x) => x.id === existingTask.id ? updated : x));
        if (openedTask?.id === existingTask.id) setOpenedTask(updated);
        invalidateTasksCache(); // reconcilia outras telas em segundo plano
      } catch {
        setAllTasks((curr) => curr.map((x) => x.id === existingTask.id ? existingTask : x)); // reverte
        if (openedTask?.id === existingTask.id) setOpenedTask(existingTask);
      }
      return null;
    } else {
      const created = await createTask(payload);
      const finalAtts = await persistAttachments(created.id, formData);
      const next = finalAtts ? { ...created, attachments: finalAtts } : created;
      setAllTasks((curr) => [...curr.filter(x => x.id !== created.id), next]);
      invalidateTasksCache();
      return next;
    }
  }

  // Fixa/desfixa a atividade (pin é por usuário). UI otimista: reflete na hora e
  // reverte se a rede falhar. Atualiza também o drawer aberto, se for a mesma tarefa.
  async function togglePin(taskId: string, pinned: boolean) {
    // Atualiza o flag e reordena mantendo os fixados no topo (sort estável preserva a
    // ordem por data dentro de cada grupo) — espelha o `pinnedFirst` do backend.
    setAllTasks((curr) => {
      const updated = curr.map((t) => (t.id === taskId ? { ...t, pinned } : t));
      return [...updated].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
    });
    setOpenedTask((curr) => (curr && curr.id === taskId ? { ...curr, pinned } : curr));
    try {
      await (pinned ? pinTask(taskId) : unpinTask(taskId));
      invalidateTasksCache();
    } catch {
      setAllTasks((curr) => {
        const reverted = curr.map((t) => (t.id === taskId ? { ...t, pinned: !pinned } : t));
        return [...reverted].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
      });
      setOpenedTask((curr) => (curr && curr.id === taskId ? { ...curr, pinned: !pinned } : curr));
    }
  }

  // Aplica remoções (índices originais, ordem decrescente) e uploads de arquivos/links,
  // em sequência (evita perda de escrita na coluna JSON) e retorna a lista final de anexos
  // devolvida pelo servidor. Propaga erro para o chamador reverter a UI otimista.
  async function persistAttachments(taskId: string, formData: ActivityFormData): Promise<TaskAttachment[] | null> {
    let latest: TaskAttachment[] | null = null;
    for (const idx of [...(formData.removedAttachmentIndices ?? [])].sort((a, b) => b - a)) {
      latest = await removeTaskAttachment(taskId, idx);
    }
    for (const f of formData.attachments ?? []) {
      latest = await addTaskFile(taskId, { name: f.name, data: f.data, mimeType: f.type, size: f.size });
    }
    for (const l of formData.links ?? []) {
      latest = await addTaskLink(taskId, l.name, l.url);
    }
    return latest;
  }

  // ── Excluir atividade ─────────────────────────────────────────────────────

  function requestDeleteTask(taskId: string) {
    setPendingConfirm({
      title: 'Excluir atividade',
      message: 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      danger: true,
      onConfirm: async () => {
        setOpenedTask(null);
        setAllTasks((curr) => curr.filter((x) => x.id !== taskId));
        try { await deleteTask(taskId); } catch { loadBoardData(); }
      },
    });
  }

  // ── Arquivar atividade ────────────────────────────────────────────────────

  function requestArchiveTask(taskId: string) {
    setPendingConfirm({
      title: 'Arquivar atividade',
      message: 'A atividade será movida para Arquivadas.',
      confirmLabel: 'Arquivar',
      danger: false,
      onConfirm: async () => {
        setOpenedTask(null);
        setAllTasks((curr) => curr.filter((x) => x.id !== taskId));
        try { await archiveTask(taskId); } catch { loadBoardData(); }
      },
    });
  }

  // ── Avançar status da tarefa aberta ──────────────────────────────────────

  function advanceOpenedTaskStatus() {
    if (!openedTask) return;
    const nextGroup = STATUS_NEXT[openedTask.status_group];
    if (!nextGroup) return;

    const coIds = taskCoResponsibleIds(openedTask, users);
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
        const coIds = taskCoResponsibleIds(task, users);
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
      confirmLabel: 'Excluir',
      danger: true,
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
    togglePin,
    requestDeleteTask,
    requestArchiveTask,
    advanceOpenedTaskStatus,
    loadBoardData,
  };
}
