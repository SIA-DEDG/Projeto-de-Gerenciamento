import type { Task, Project, Category, TeamMember, StatusGroup } from '@/types';
import { statusGroup, categoryColor, statusLabelToDb } from './utils';
import { emitTasksChanged } from './taskEvents';
import {
  getCategories,
  addCategory,
  deleteCategory as deleteCategoryLocal,
  getTeamMembers,
  saveTeamMembers,
} from './localStorage';
import { getToken, clearAuth } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const apiCache = new Map<string, { data: unknown; cachedAt: number }>();
const TTL = 45_000; // 45 seconds

function cacheGet<T>(key: string): T | null {
  const hit = apiCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.cachedAt > TTL) { apiCache.delete(key); return null; }
  return hit.data as T;
}
function cacheSet<T>(key: string, data: T): void {
  apiCache.set(key, { data, cachedAt: Date.now() });
}
function cacheInvalidate(...keys: string[]): void {
  keys.forEach((k) => apiCache.delete(k));
}

async function fetchCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== null) {
    fetcher().then((fresh) => cacheSet(key, fresh)).catch(() => null);
    return hit;
  }
  const data = await fetcher();
  cacheSet(key, data);
  return data;
}
type RawTask = Omit<Task, 'status_group' | 'badge_color' | 'date'>;

export interface UserPublic {
  id: string;
  name: string;
  username: string;
  role: string;
  must_change_password: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  created_at: string;
}

function enrichTask(rawTask: RawTask): Task {
  return {
    ...rawTask,
    status_group: statusGroup(rawTask.status),
    badge_color: categoryColor(rawTask.category),
    date: rawTask.created_at.slice(0, 10),
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader, ...options?.headers },
    ...options,
  });

  if (response.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Erro ${response.status}: ${text || response.statusText}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}


export async function fetchTasks(): Promise<Task[]> {
  return fetchCached('tasks', async () => {
    const data = await apiFetch<RawTask[]>('/api/tasks');
    return data.map(enrichTask);
  });
}

export async function invalidateTasksCache(): Promise<void> {
  cacheInvalidate('tasks');
}

export async function createTask(payload: {
  category: string;
  activity: string;
  description?: string;
  responsible_id?: string | null;
  status: string;
  priority?: string;
  date?: string;
  project_id?: string | null;
  co_responsible_ids?: string[] | null;
  external_collaborators?: string | null;
  deadline?: string | null;
}): Promise<Task> {
  const data = await apiFetch<RawTask>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      category: payload.category,
      activity: payload.activity,
      description: payload.description ?? null,
      responsible_id: payload.responsible_id ?? null,
      status: payload.status,
      priority: payload.priority || 'Média',
      created_at: payload.date || new Date().toISOString().split('T')[0],
      project_id: payload.project_id ?? null,
      co_responsible_ids: payload.co_responsible_ids ?? null,
      external_collaborators: payload.external_collaborators ?? null,
      deadline: payload.deadline ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }),
  });
  cacheInvalidate('tasks');
  emitTasksChanged();
  return enrichTask(data);
}

export async function updateTask(
  existing: Task,
  updates: {
    status?: string;
    status_group?: StatusGroup;
    category?: string;
    activity?: string;
    description?: string;
    responsible_id?: string | null;
    priority?: string;
    date?: string;
    project_id?: string | null;
    co_responsible_ids?: string[] | null;
    external_collaborators?: string | null;
    deadline?: string | null;
  },
): Promise<Task> {
  const status = updates.status_group
    ? statusLabelToDb(updates.status_group)
    : (updates.status ?? existing.status);

  const data = await apiFetch<RawTask>(`/api/tasks/${existing.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      category: updates.category ?? existing.category,
      activity: updates.activity ?? existing.activity,
      description: updates.description !== undefined ? updates.description : existing.description,
      responsible_id: updates.responsible_id !== undefined ? updates.responsible_id : existing.responsible_id,
      status,
      priority: updates.priority ?? existing.priority,
      created_at: updates.date ?? existing.created_at,
      project_id: updates.project_id !== undefined ? updates.project_id : existing.project_id,
      co_responsible_ids: updates.co_responsible_ids !== undefined
        ? updates.co_responsible_ids
        : parseCoResponsibleIds(existing.co_responsibles),
      external_collaborators: updates.external_collaborators !== undefined
        ? updates.external_collaborators
        : existing.external_collaborators,
      deadline: updates.deadline !== undefined ? updates.deadline : existing.deadline,
    }),
  });
  cacheInvalidate('tasks');
  emitTasksChanged();
  return enrichTask(data);
}

function parseCoResponsibleIds(_coResponsibles: string | null | undefined): string[] | null {
  return null;
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch<void>(`/api/tasks/${id}`, { method: 'DELETE' });
  cacheInvalidate('tasks');
  emitTasksChanged();
}

export async function importTasks(rows: {
  category: string;
  activity: string;
  description?: string;
  responsible_id?: string | null;
  status: string;
  priority: string;
  created_at: string;
  project_id?: string | null;
  deadline?: string | null;
  external_collaborators?: string | null;
  co_responsible_ids?: string[] | null;
}[]): Promise<Task[]> {
  const data = await apiFetch<RawTask[]>('/api/tasks/batch', {
    method: 'POST',
    body: JSON.stringify(rows),
  });
  cacheInvalidate('tasks');
  return data.map(enrichTask);
}


export async function fetchProjects(): Promise<Project[]> {
  return fetchCached('projects', () => apiFetch<Project[]>('/api/projects'));
}

export async function createProject(payload: Omit<Project, 'id' | 'owner'>): Promise<Project> {
  const result = await apiFetch<Project>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  cacheInvalidate('projects');
  return result;
}

export async function updateProject(
  existing: Project,
  updates: Partial<Omit<Project, 'id' | 'owner'>>,
): Promise<Project> {
  const result = await apiFetch<Project>(`/api/projects/${existing.id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...existing, ...updates, owner: undefined }),
  });
  cacheInvalidate('projects');
  return result;
}

export async function deleteProject(id: string): Promise<void> {
  await apiFetch<void>(`/api/projects/${id}`, { method: 'DELETE' });
  cacheInvalidate('projects', 'tasks');
}


export async function fetchCategories(): Promise<Category[]> {
  return getCategories();
}

export async function createCategory(name: string, color: string): Promise<void> {
  addCategory(name, color);
}

export async function deleteCategory(name: string): Promise<void> {
  deleteCategoryLocal(name);
}


export async function fetchTeamMembers(): Promise<TeamMember[]> {
  return getTeamMembers();
}

export async function createTeamMember(name: string, role: string): Promise<void> {
  const members = getTeamMembers();
  if (!members.find((m) => m.name === name)) {
    saveTeamMembers([...members, { name, role }]);
  }
}

export async function deleteTeamMember(name: string): Promise<void> {
  saveTeamMembers(getTeamMembers().filter((m) => m.name !== name));
}


export async function login(username: string, password: string): Promise<{
  token: string; user_id: string; name: string; role: string;
  username: string; must_change_password: boolean;
}> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || 'Credenciais inválidas');
  }
  return response.json();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiFetch<void>('/api/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export async function setInitialPassword(newPassword: string): Promise<void> {
  await apiFetch<void>('/api/auth/set-initial-password', {
    method: 'PUT',
    body: JSON.stringify({ new_password: newPassword }),
  });
}

export async function registerUser(payload: {
  name: string; username: string; role: string;
}): Promise<{ user_id: string; name: string; role: string; temp_password: string }> {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}


export async function fetchUsers(): Promise<UserPublic[]> {
  return fetchCached('users', () => apiFetch<UserPublic[]>('/api/users'));
}

export async function updateUserProfile(name: string): Promise<void> {
  await apiFetch<void>('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}


export async function fetchLogs(): Promise<ActivityLog[]> {
  return apiFetch<ActivityLog[]>('/api/logs');
}

export async function clearLogs(): Promise<void> {
  await apiFetch<void>('/api/logs', { method: 'DELETE' });
}


export interface Absence {
  id: string;
  user_id: string | null;
  employee_name: string;        // name from JOIN — display only
  reason: string;
  justification: string | null;
  file_name: string | null;
  file_data: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
}

export async function fetchAbsences(): Promise<Absence[]> {
  return apiFetch<Absence[]>('/api/absences');
}

export async function createAbsence(payload: {
  user_id: string | null;
  reason: string;
  justification: string | null;
  file_name: string | null;
  file_data: string | null;
  start_date: string;
  end_date: string;
}): Promise<Absence> {
  return apiFetch<Absence>('/api/absences', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteAbsence(id: string): Promise<void> {
  await apiFetch<void>(`/api/absences/${id}`, { method: 'DELETE' });
}

export async function updateAbsence(id: string, payload: {
  reason: string;
  justification: string | null;
  start_date: string;
  end_date: string;
}): Promise<Absence> {
  return apiFetch<Absence>(`/api/absences/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export interface CalendarEvent {
  id: string;
  name: string;
  responsibles: string;      // JSON array of names from junction — display only
  event_type: string;
  attendees: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  is_private?: boolean;
  is_company_wide?: boolean;
  created_by_id?: string | null;
  created_at: string;
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
  return apiFetch<CalendarEvent[]>('/api/events');
}

export async function createEvent(payload: {
  name: string;
  responsible_ids: string[];
  event_type: string;
  attendees: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
}): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>('/api/events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateEvent(id: string, payload: {
  name: string;
  responsible_ids: string[];
  event_type: string;
  attendees: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
}): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>(`/api/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteEvent(id: string): Promise<void> {
  await apiFetch<void>(`/api/events/${id}`, { method: 'DELETE' });
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch<void>(`/api/users/${id}`, { method: 'DELETE' });
  cacheInvalidate('users');
}

export async function updateUserRole(id: string, role: string): Promise<void> {
  await apiFetch<void>(`/api/users/${id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
  cacheInvalidate('users');
}

export async function adminResetUserPassword(id: string, newPassword: string): Promise<void> {
  await apiFetch<void>(`/api/users/${id}/password`, {
    method: 'PUT',
    body: JSON.stringify({ new_password: newPassword }),
  });
}
