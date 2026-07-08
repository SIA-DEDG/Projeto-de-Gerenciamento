import type { StatusGroup, Project, Task } from '@/types';

// Mescla duas listas de usuários deduplicando por `id` (os de `extra` prevalecem).
// Usado nos modais para juntar a própria diretoria com a "outra diretoria envolvida".
export function mergeUsersById<T extends { id: string }>(base: T[], extra: T[]): T[] {
  const byId = new Map(base.map(u => [u.id, u]));
  extra.forEach(u => byId.set(u.id, u));
  return [...byId.values()];
}

// ── Projetos do usuário ─────────────────────────────────────────────────────────

/**
 * IDs dos projetos em que o usuário é dono (owner) OU participa de alguma atividade
 * vinculada a ele (responsável ou co-responsável das tasks do projeto).
 *
 * A titularidade é conferida por `owner_id` (robusto contra diferenças de acento/
 * espaço/caixa no nome) e, como fallback, pelo nome do owner.
 */
export function userProjectIds(
  projects: Project[],
  tasks: Task[],
  userName: string | null | undefined,
  userId?: string | null,
): Set<string> {
  const ids = new Set<string>();
  if (!userName && !userId) return ids;
  for (const p of projects) {
    if ((userId && p.owner_id === userId) || (userName && p.owner === userName)) ids.add(p.id);
    // Responsável explícito do projeto (delegado).
    if (userId && p.responsible_ids?.includes(userId)) ids.add(p.id);
  }
  for (const t of tasks) {
    if (!t.project_id || ids.has(t.project_id)) continue;
    if (!userName) continue;
    let mine = t.responsible === userName;
    if (!mine && t.co_responsibles) {
      try { mine = (JSON.parse(t.co_responsibles) as string[]).includes(userName); } catch { /* ignore */ }
    }
    if (mine) ids.add(t.project_id);
  }
  return ids;
}

// ── Permissões de projeto (espelham backend projects.perms.ts) ──────────────────
// Admin, Diretor e Gerente têm poder total sobre qualquer projeto (editar, excluir,
// trocar responsável, gerenciar colaboradores) — fallback por cargo. Não os torna
// membros/colaboradores: só conta quem for explicitamente adicionado.
function isPrivRole(role: string | undefined): boolean {
  return role === 'Admin' || role === 'Diretor' || role === 'Gerente';
}

// Dono ou responsável delegado.
export function isProjectMember(project: Project, userId: string | null | undefined): boolean {
  if (!userId) return false;
  return project.owner_id === userId || !!project.responsible_ids?.includes(userId);
}

// Criar atividades / anexar arquivos e links — SOMENTE membros (inclui Estagiário).
// Cargo privilegiado não entra aqui: só "usa" o projeto quem faz parte.
export function canUseProjectClient(project: Project, userId: string | null | undefined, _role?: string | undefined): boolean {
  return isProjectMember(project, userId);
}

// Editar os dados do projeto — cargo privilegiado, o dono/responsável (inclusive
// Estagiário quando é o responsável) ou colaborador não-Estagiário.
export function canEditProjectClient(project: Project, userId: string | null | undefined, role: string | undefined): boolean {
  const isOwner = !!userId && project.owner_id === userId;
  const memberCanEdit = isProjectMember(project, userId) && role !== 'Estagiario' && role !== 'Estagiário';
  return isPrivRole(role) || isOwner || memberCanEdit;
}

// Excluir / gerenciar responsáveis — dono ou cargo privilegiado (Admin/Diretor/Gerente).
export function canManageProjectClient(project: Project, userId: string | null | undefined, role: string | undefined): boolean {
  return (!!userId && project.owner_id === userId) || isPrivRole(role);
}

// ── Status ────────────────────────────────────────────────────────────────────

/** Cor hex de cada grupo de status (usada em cards, lista e spinebars). */
export const STATUS_COLORS: Record<StatusGroup, string> = {
  pending:     '#9aa1ac',
  in_progress: '#034ea2', // azul FIXO — não segue o accent configurável
  review:      '#E0A92E',
  done:        '#1B8A4B',
};

/** Próximo grupo de status no fluxo de trabalho. `done` não tem próximo. */
export const STATUS_NEXT: Partial<Record<StatusGroup, StatusGroup>> = {
  pending:     'in_progress',
  in_progress: 'review',
  review:      'done',
};

/** Definição das colunas do quadro Kanban — ordem e aparência. */
export const KANBAN_COLUMNS: { id: StatusGroup; title: string; color: string }[] = [
  { id: 'pending',     title: 'Pendente',     color: 'var(--s-pending)' },
  { id: 'in_progress', title: 'Em Andamento', color: 'var(--s-progress)' },
  { id: 'review',      title: 'Em Revisão',   color: 'var(--s-review)' },
  { id: 'done',        title: 'Concluído',    color: 'var(--s-done)' },
];

// ── Priority ──────────────────────────────────────────────────────────────────

export const PRIORITY_COLORS: Record<string, string> = {
  Alta:  'var(--blue)',
  Média: 'var(--text-2)',
  Baixa: 'var(--text-3)',
};

// ── Co-responsible helpers ────────────────────────────────────────────────────

/**
 * Converte a lista JSON de nomes de co-responsáveis para seus IDs correspondentes.
 * Retorna null quando não há nomes válidos ou a string não é JSON válido.
 */
export function resolveCoResponsibleIds(
  coResponsiblesJson: string | null | undefined,
  users: { id: string; name: string }[],
): string[] | null {
  if (!coResponsiblesJson) return null;
  try {
    const names = JSON.parse(coResponsiblesJson) as string[];
    const ids = names
      .map((name) => users.find((u) => u.name === name)?.id)
      .filter((id): id is string => !!id);
    return ids.length > 0 ? ids : null;
  } catch {
    return null;
  }
}

/**
 * IDs dos co-responsáveis a enviar numa atualização RÁPIDA (mudar status, arrastar card,
 * mover em lote), onde o formulário não é reaberto. Prefere os ids que a própria task já
 * carrega (`co_responsible_ids`, devolvidos pelo backend, incluindo membros de OUTRA
 * diretoria) — assim eles não são descartados só porque não estão em `users` (limitado à
 * própria diretoria). Só cai na resolução por nome quando a task ainda não tem ids.
 */
export function taskCoResponsibleIds(
  task: { co_responsible_ids?: string | null; co_responsibles?: string | null },
  users: { id: string; name: string }[],
): string[] | null {
  if (task.co_responsible_ids) {
    try {
      const ids = JSON.parse(task.co_responsible_ids) as string[];
      if (Array.isArray(ids)) return ids.length > 0 ? ids : null;
    } catch { /* json inválido: cai no fallback por nome */ }
  }
  return resolveCoResponsibleIds(task.co_responsibles, users);
}

// ── Deadline display ──────────────────────────────────────────────────────────

/**
 * Retorna texto e cor do prazo para exibição na view lista.
 * Tarefas concluídas nunca são marcadas como atrasadas.
 */
export function taskDeadlineDisplay(
  deadline: string | null | undefined,
  statusGroup: StatusGroup,
): { text: string; color: string } {
  if (!deadline) return { text: '—', color: 'var(--text-3)' };
  const today = new Date().toISOString().split('T')[0];
  if (statusGroup !== 'done' && deadline < today) {
    return { text: 'Atrasada', color: '#b42318' };
  }
  const [, mm, dd] = deadline.split('-');
  return { text: `${dd}/${mm}`, color: 'var(--text-3)' };
}

// ── Avatar ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#0052cc', '#36b37e', '#ff5630', '#ffab00', '#6554c0', '#00b8d9'];

export function avatarColor(name: string): string {
  if (!name) return '#6B778C';
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

const CATEGORY_COLORS: Record<string, string> = {
  'PACTO pela Economia': 'blue',
  'TOOLKIT': 'teal',
  'APRESENTAÇÕES': 'orange',
  'INDICADORES': 'green',
  'PROJETOS INTERNOS': 'purple',
  'COMUNICAÇÃO': 'red',
  'EMPREENDEDOR': 'yellow',
  'REPRESENTAÇÃO INSTITUCIONAL': 'blue',
  'CAPACITIA': 'teal',
  'EDUCAÇÃO E INOVAÇÃO': 'green',
};

const COMPLETED_STATUSES = ['Entrega', 'Homologação', 'Concluído'];
const IN_PROGRESS_STATUSES = [
  'Revisão Textual', 'Estratégico', 'Check-list',
  'Design/Conteúdo', 'Se necessário', 'Identidade Visual', 'Técnico', 'Redação',
  'Em Andamento',
];
const REVIEW_STATUSES = ['Em Revisão'];

export function statusGroup(status: string): StatusGroup {
  if (COMPLETED_STATUSES.includes(status)) return 'done';
  if (REVIEW_STATUSES.includes(status)) return 'review';
  if (IN_PROGRESS_STATUSES.includes(status)) return 'in_progress';
  return 'pending';
}

export function categoryColor(category: string): string {
  for (const key in CATEGORY_COLORS) {
    if (category && category.includes(key)) return CATEGORY_COLORS[key];
  }
  return 'blue';
}

export function statusGroupLabel(g: StatusGroup | string): string {
  if (g === 'done') return 'Concluído';
  if (g === 'review') return 'Em Revisão';
  if (g === 'in_progress') return 'Em Andamento';
  return 'Pendente';
}

export function statusLabelToDb(sg: StatusGroup): string {
  const map: Record<StatusGroup, string> = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    review: 'Em Revisão',
    done: 'Concluído',
  };
  return map[sg] ?? 'Pendente';
}

export function statusClass(g: StatusGroup | string): string {
  if (g === 'done') return 'status-chip done';
  if (g === 'review') return 'status-chip review';
  if (g === 'in_progress') return 'status-chip progress';
  return 'status-chip pending';
}
