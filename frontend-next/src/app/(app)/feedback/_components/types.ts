import { Info, AlertCircle, AlertTriangle, Flame } from 'lucide-react';
import React from 'react';

export type FeedbackType = 'bug' | 'melhoria';
export type Severity = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type StatusFilter = 'todos' | 'respondidas' | 'pendentes';
export type TypeFilter = 'todos' | 'bug' | 'melhoria';
export type SeverityFilter = 'todos' | 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type Sort = 'votos' | 'recentes';

export const SEVERITIES: {
  value: Severity;
  color: string;
  bg: string;
  border: string;
  Icon: React.ElementType;
}[] = [
    { value: 'Baixa', color: '#15803d', bg: '#f0fdf4', border: '#86efac', Icon: Info },
    { value: 'Média', color: '#b45309', bg: '#fffbeb', border: '#fcd34d', Icon: AlertCircle },
    { value: 'Alta', color: '#c2410c', bg: '#fff7ed', border: '#fdba74', Icon: AlertTriangle },
    { value: 'Crítica', color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', Icon: Flame },
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

export function parseUpvotedBy(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const r = JSON.parse(json);
    return Array.isArray(r) ? r : [];
  } catch { return []; }
}

export function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid var(--border-light)',
  borderRadius: 3, fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', background: 'var(--bg-input)', color: 'var(--text-primary)',
};
