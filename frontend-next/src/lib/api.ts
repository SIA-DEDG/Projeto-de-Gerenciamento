import { supabase } from './supabase';
import type { Task, Project, Category, TeamMember, StatusGroup } from '@/types';
import { statusGroup, categoryColor, statusLabelToDb } from './utils';

function enrichTask(t: Omit<Task, 'status_group' | 'badge_color' | 'date'>): Task {
  const sg = statusGroup(t.status);
  return {
    ...t,
    status_group: sg,
    badge_color: categoryColor(t.category),
    date: t.created_at,
  };
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(enrichTask);
}

export async function createTask(payload: {
  category: string;
  activity: string;
  responsible: string;
  status: string;
  priority?: string;
  date?: string;
  project_id?: number;
}): Promise<Task> {
  const { date, priority, project_id, ...rest } = payload;
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...rest,
      priority: priority || 'Média',
      created_at: date || new Date().toISOString().split('T')[0],
      ...(project_id ? { project_id } : {}),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return enrichTask(data);
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
    category: updates.category ?? existing.category,
    activity: updates.activity ?? existing.activity,
    responsible: updates.responsible ?? existing.responsible,
    status,
    priority: updates.priority ?? existing.priority,
    created_at: updates.date ?? existing.created_at,
  };

  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', existing.id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return enrichTask(data);
}

export async function deleteTask(id: number): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Projects ──────────────────────────────────────────────────────────────────

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
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createProject(payload: Omit<Project, 'id'>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(normalizeProject(payload))
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProject(
  existing: Project,
  updates: Partial<Omit<Project, 'id'>>,
): Promise<Project> {
  const merged = { ...existing, ...updates };
  const { data, error } = await supabase
    .from('projects')
    .update(normalizeProject(merged))
    .eq('id', existing.id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProject(id: number): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('name, color')
    .order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCategory(name: string, color: string): Promise<void> {
  const { error } = await supabase.from('categories').insert({ name, color });
  if (error) throw new Error(error.message);
}

export async function deleteCategory(name: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('name', name);
  if (error) throw new Error(error.message);
}

// ── Team Members ──────────────────────────────────────────────────────────────

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('name, role')
    .order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createTeamMember(name: string, role: string): Promise<void> {
  const { error } = await supabase.from('team_members').insert({ name, role });
  if (error) throw new Error(error.message);
}

export async function deleteTeamMember(name: string): Promise<void> {
  const { error } = await supabase.from('team_members').delete().eq('name', name);
  if (error) throw new Error(error.message);
}
