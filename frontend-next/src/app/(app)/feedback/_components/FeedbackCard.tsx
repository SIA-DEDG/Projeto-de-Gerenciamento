'use client';

import { useState, useRef, useEffect } from 'react';
import { type FeedbackItem } from '@/lib/api';
import { parseUpvotedBy } from './types';
import CommentSection from './CommentSection';

interface Props {
  item: FeedbackItem;
  currentUserId: string;
  currentUserName: string;
  isAdmin: boolean;
  onUpvote: (id: string) => void;
  onEdit: (item: FeedbackItem) => void;
  onDelete: (item: FeedbackItem) => void;
  onRespond: (item: FeedbackItem) => void;
  onStatusChange: (id: string, status: 'pendente' | 'respondida') => void;
  upvoting: string | null;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

// ── Color maps ────────────────────────────────────────────────────────────────

function tipoStyle(tipo: string): { color: string; bg: string } {
  if (tipo === 'bug')      return { color: '#b42318', bg: '#b423180f' };
  if (tipo === 'melhoria') return { color: '#1B8A4B', bg: '#1B8A4B0f' };
  if (tipo === 'duvida')   return { color: '#A87A00', bg: '#A87A000f' };
  return { color: '#034EA2', bg: '#034EA20f' }; // sugestao / default
}

function tipoLabel(tipo: string): string {
  if (tipo === 'bug')      return 'Bug';
  if (tipo === 'melhoria') return 'Melhoria';
  if (tipo === 'duvida')   return 'Dúvida';
  return 'Sugestão';
}

function sevColor(sev: string): string {
  if (sev === 'Alta')  return '#b42318';
  if (sev === 'Média') return '#A87A00';
  if (sev === 'Baixa') return '#1B8A4B';
  return '#6b7280';
}

export default function FeedbackCard({
  item, currentUserId, currentUserName, isAdmin,
  onUpvote, onEdit, onDelete, onRespond, onStatusChange,
  upvoting, selectionMode = false, isSelected = false, onToggleSelect,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [commentCount, setCommentCount] = useState(item.comment_count ?? 0);

  const voters    = parseUpvotedBy(item.upvoted_by);
  const voted     = voters.includes(currentUserId);
  const isLoading = upvoting === item.id;
  const isAuthor  = !!item.usuario_id && item.usuario_id === currentUserId;
  const answered  = item.status === 'respondida';

  const statusColor = answered ? '#1B8A4B' : '#A87A00';
  const statusLabel = answered ? 'Respondida' : 'Pendente';

  const ts = tipoStyle(item.tipo ?? '');

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${isSelected ? '#034EA2' : 'var(--line-1)'}`,
      borderRadius: 3,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Selection overlay */}
      {selectionMode && (
        <div onClick={() => onToggleSelect?.(item.id)}
          style={{ position: 'absolute', inset: 0, zIndex: 2, cursor: 'pointer', borderRadius: 3 }} />
      )}
      {selectionMode && (
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 3,
          width: 18, height: 18, borderRadius: 3,
          border: `2px solid ${isSelected ? '#034EA2' : '#c1c7d0'}`,
          background: isSelected ? '#034EA2' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          {isSelected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 0 }}>

        {/* ── LEFT: upvote column ── */}
        <div
          onClick={() => { if (!isLoading) onUpvote(item.id); }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '16px 14px', borderRight: '1px solid var(--line-2)',
            cursor: isLoading ? 'wait' : 'pointer', minWidth: 56,
            background: voted ? '#034EA20a' : 'var(--surface-2)',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => { if (!voted) (e.currentTarget as HTMLElement).style.background = '#034EA20a'; }}
          onMouseLeave={e => { if (!voted) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
        >
          {/* Chevron up */}
          <svg width="16" height="16" viewBox="0 0 24 24"
            fill={voted ? '#034EA2' : 'none'}
            stroke={voted ? '#034EA2' : 'var(--text-3)'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 15 7-7 7 7" />
          </svg>
          <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 600, color: voted ? '#034EA2' : 'var(--text-2)' }}>
            {item.upvotes}
          </span>
        </div>

        {/* ── RIGHT: content ── */}
        <div style={{ flex: 1, padding: '16px 18px', minWidth: 0 }}>

          {/* Chips row: tipo + severidade + status + date·autor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {/* Tipo chip (filled) */}
            <span className="mono" style={{
              fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase',
              color: ts.color, background: ts.bg, padding: '3px 8px', borderRadius: 3,
            }}>
              {tipoLabel(item.tipo ?? '')}
            </span>

            {/* Severidade (text only) */}
            {item.severidade && (
              <span className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: sevColor(item.severidade) }}>
                {item.severidade}
              </span>
            )}

            {/* Status (text only) */}
            <span className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: statusColor }}>
              {statusLabel}
            </span>

            {/* Date · Autor (right-aligned) */}
            <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginLeft: 'auto', letterSpacing: '0.3px' }}>
              {item.created_at} · {item.usuario_nome ?? 'Anônimo'}
            </span>
          </div>

          {/* Title */}
          <div
            onClick={() => setExpanded(v => !v)}
            style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text)', marginBottom: 6, letterSpacing: '-0.2px', cursor: 'pointer' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#034EA2')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text)')}
          >
            {item.titulo}
          </div>

          {/* Description */}
          <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
            {expanded ? item.descricao : item.descricao?.slice(0, 220) + (item.descricao && item.descricao.length > 220 ? '…' : '')}
          </p>

          {/* Resposta oficial */}
          {item.resposta && (
            <div style={{ marginTop: 14, padding: '12px 14px', borderLeft: '3px solid #1B8A4B', background: '#1B8A4B0a', borderRadius: '0 3px 3px 0' }}>
              <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#1B8A4B', marginBottom: 5 }}>
                Resposta da equipe
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>{item.resposta}</p>
            </div>
          )}

          {/* Actions row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {/* Comment count */}
            <button onClick={() => setExpanded(v => !v)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-3)', fontFamily: 'inherit', fontSize: '0.75rem' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 600 }}>{commentCount}</span>
            </button>

            {/* Admin: RESPONDER button */}
            {isAdmin && (
              <button
                onClick={() => onRespond(item)}
                className="mono"
                style={{ marginTop: 0, padding: '5px 11px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.68rem', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.5px' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#034EA2'; (e.currentTarget as HTMLButtonElement).style.color = '#034EA2'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; }}
              >
                RESPONDER
              </button>
            )}

            {/* Admin: toggle status */}
            {isAdmin && (
              <button
                onClick={() => onStatusChange(item.id, answered ? 'pendente' : 'respondida')}
                className="mono"
                style={{ padding: '5px 11px', border: `1px solid ${answered ? 'rgba(27,138,75,0.3)' : 'var(--border)'}`, borderRadius: 3, background: answered ? 'rgba(27,138,75,0.07)' : 'var(--surface)', color: answered ? '#1B8A4B' : 'var(--text-3)', fontSize: '0.68rem', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.5px' }}
              >
                {answered ? 'PENDENTE' : 'RESPONDIDA'}
              </button>
            )}

            {/* Edit/Delete (author or admin) */}
            {(isAuthor || isAdmin) && (
              <>
                <button onClick={() => onEdit(item)}
                  className="mono"
                  style={{ padding: '5px 11px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.68rem', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.5px' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; }}
                >
                  EDITAR
                </button>
                <button onClick={() => onDelete(item)}
                  className="mono"
                  style={{ padding: '5px 11px', border: '1px solid rgba(180,35,24,0.2)', borderRadius: 3, background: 'rgba(180,35,24,0.05)', color: '#b42318', fontSize: '0.68rem', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.5px' }}
                >
                  EXCLUIR
                </button>
              </>
            )}
          </div>

          {/* Comments (expanded) */}
          {expanded && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--line-2)', paddingTop: 12 }}>
              <CommentSection
                feedbackId={item.id}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                isAdmin={isAdmin}
                onCountChange={setCommentCount}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
