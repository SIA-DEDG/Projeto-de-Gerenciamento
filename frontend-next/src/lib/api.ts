import type { Task, Project, StatusGroup } from '@/types';
import { statusGroup, categoryColor, statusLabelToDb } from './utils';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

function enrichTask(t: Omit<Task, 'status_group' | 'badge_color' | 'date'>): Task {
  const sg = statusGroup(t.status);
  return {
    ...t,
    status_group: sg,
    badge_color: categoryColor(t.category),
    date: t.created_at,
  };
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export async function fetchTasks(): Promise<Task[]> {
  const rows = await req<Task[]>('/api/tasks');
  return rows.map(enrichTask);
}

export async function createTask(payload: {
  category: string;
  activity: string;
  responsible: string;
  status: string;
  priority?: string;
  date?: string;
}): Promise<Task> {
  const { date, priority, ...rest } = payload;
  const row = await req<Task>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      ...rest,
      priority: priority || 'Média',
      created_at: date || new Date().toISOString().split('T')[0],
    }),
  });
  return enrichTask(row);
}

export async function updateTask(
  existing: Task,
  updates: {
    status?: string;
    status_group?: StatusGroup;
    category?: string;
    activity?: string;
    responsible?: string;
    priority?: string;
    date?: string;
  },
): Promise<Task> {
  const status = updates.status_group
    ? statusLabelToDb(updates.status_group)
    : (updates.status ?? existing.status);

  const payload = {
    id: existing.id,
    category: updates.category ?? existing.category,
    activity: updates.activity ?? existing.activity,
    responsible: updates.responsible ?? existing.responsible,
    status,
    priority: updates.priority ?? existing.priority,
    created_at: updates.date ?? existing.created_at,
  };

  const row = await req<Task>(`/api/tasks/${existing.id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return enrichTask(row);
}

export async function deleteTask(id: number): Promise<void> {
  await req<null>(`/api/tasks/${id}`, { method: 'DELETE' });
}

// ── Projects ──────────────────────────────────────────────────────────────────

// Postgres rejeita ''::date — converte campos opcionais vazios para null
function normalizeProject(p: Omit<Project, 'id'>) {
  return {
    name: p.name,
    category:         p.category         || null,
    owner:            p.owner            || null,
    deadline:         p.deadline         || null,
    executive_status: p.executive_status || null,
    objective:        p.objective        || null,
    scope:            p.scope            || null,
    summary:          p.summary          || null,
  };
}

export async function fetchProjects(): Promise<Project[]> {
  return req<Project[]>('/api/projects');
}

export async function createProject(payload: Omit<Project, 'id'>): Promise<Project> {
  return req<Project>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(normalizeProject(payload)),
  });
}

export async function updateProject(
  existing: Project,
  updates: Partial<Omit<Project, 'id'>>,
): Promise<Project> {
  const merged = { ...existing, ...updates };
  return req<Project>(`/api/projects/${existing.id}`, {
    method: 'PUT',
    body: JSON.stringify(normalizeProject(merged)),
  });
}

export async function deleteProject(id: number): Promise<void> {
  await req<null>(`/api/projects/${id}`, { method: 'DELETE' });
}
