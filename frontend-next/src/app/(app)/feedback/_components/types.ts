import React from 'react';

export type FeedbackType = 'sugestao' | 'bug' | 'melhoria' | 'duvida';
export type Severity = 'Baixa' | 'Média' | 'Alta';
export type StatusFilter = 'todos' | 'respondidas' | 'pendentes';
export type TypeFilter = 'todos' | 'sugestao' | 'bug' | 'melhoria' | 'duvida';
export type SeverityFilter = 'todos' | 'Baixa' | 'Média' | 'Alta';
export type Sort = 'votos' | 'recentes';

export const SEVERITIES: { value: Severity; color: string }[] = [
  { value: 'Baixa', color: '#1B8A4B' },
  { value: 'Média', color: '#A87A00' },
  { value: 'Alta',  color: '#b42318' },
];

const AVATAR_COLORS = ['#e67e22', '#27ae60', '#2980b9', '#8e44ad', '#c0392b', '#16a085', '#e74c3c', '#1abc9c'];

export function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function severityMeta(s: string | null) {
  return SEVERITIES.find(x => x.value === s) ?? null;
}

export function parseUpvotedBy(value: string[] | string | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const r = JSON.parse(value);
    return Array.isArray(r) ? r : [];
  } catch { return []; }
}

export function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
  borderRadius: 3, fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--text)',
};
