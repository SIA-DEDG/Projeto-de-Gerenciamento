import type { StatusGroup } from '@/types';

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
