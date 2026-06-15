'use client';

import { useState, useRef, useEffect } from 'react';
import { Bug, Lightbulb } from 'lucide-react';
import { type FeedbackItem } from '@/lib/api';
import { avatarColor, severityMeta, parseUpvotedBy, truncate } from './types';
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
}

export default function FeedbackCard({ item, currentUserId, currentUserName, isAdmin, onUpvote, onEdit, onDelete, onRespond, onStatusChange, upvoting }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(item.comment_count ?? 0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);
  const answered = item.status === 'respondida';
  const voters = parseUpvotedBy(item.upvoted_by);
  const voted = voters.includes(currentUserId);
  const isLoading = upvoting === item.id;
  const sv = item.tipo === 'bug' && item.severidade ? severityMeta(item.severidade) : null;
  const authorName = item.usuario_nome ?? 'Anônimo';
  const bgColor = avatarColor(authorName);
  const isAuthor = !!item.usuario_id && item.usuario_id === currentUserId;

  let imageList: { nome: string; dados: string }[] = [];
  if (item.imagens && item.imagens !== 'null') {
    try { imageList = JSON.parse(item.imagens); } catch { /* noop */ }
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 8,
      border: '1px solid var(--border-light)',
      boxShadow: 'var(--shadow-card)',
      marginBottom: 12,
      transition: 'box-shadow 0.15s',
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6, zIndex: 1 }}>
        <span style={{
          padding: '3px 11px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700,
          background: item.tipo === 'bug' ? '#fef2f2' : 'rgba(3,78,162,0.08)',
          color: item.tipo === 'bug' ? '#b91c1c' : 'var(--primary)',
          border: `1px solid ${item.tipo === 'bug' ? '#fca5a5' : 'rgba(3,78,162,0.22)'}`,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          {item.tipo === 'bug' ? <Bug size={11} /> : <Lightbulb size={11} />}
          {item.tipo === 'bug' ? 'Bug' : 'Sugestão'}
        </span>
        {(isAuthor || isAdmin) && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              title="Opções"
              style={{
                width: 28, height: 28, borderRadius: 6,
                background: menuOpen ? 'var(--bg-hover)' : 'none',
                border: `1px solid ${menuOpen ? 'var(--border-light)' : 'transparent'}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', transition: 'all 0.15s', flexDirection: 'column', gap: 3,
              }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.background = 'var(--bg-hover)'; b.style.borderColor = 'var(--border-light)'; }}
              onMouseLeave={e => { if (!menuOpen) { const b = e.currentTarget; b.style.background = 'none'; b.style.borderColor = 'transparent'; } }}
            >
              {[0,1,2].map(i => (
                <span key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor', display: 'block' }} />
              ))}
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', top: 32, right: 0, zIndex: 50,
                background: '#fff', border: '1px solid var(--border-light)',
                borderRadius: 8, boxShadow: '0 4px 16px rgba(3,78,162,0.12)',
                minWidth: 130,
              }}>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => { setMenuOpen(false); onRespond(item); }}
                      style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.83rem', fontFamily: 'inherit', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      Resposta oficial
                    </button>
                    <div style={{ height: 1, background: 'var(--border-light)', margin: '0 8px' }} />
                  </>
                )}
                <button
                  onClick={() => { setMenuOpen(false); onEdit(item); }}
                  style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.83rem', fontFamily: 'inherit', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Editar
                </button>
                <div style={{ height: 1, background: 'var(--border-light)', margin: '0 8px' }} />
                <button
                  onClick={() => { setMenuOpen(false); onDelete(item); }}
                  style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.83rem', fontFamily: 'inherit', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 8 }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#fef2f2')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  Excluir
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '18px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* Upvote */}
        <button
          onClick={() => onUpvote(item.id)}
          disabled={isLoading}
          title={voted ? 'Remover voto' : 'Votar'}
          style={{
            flexShrink: 0,
            width: 58,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            background: voted ? 'rgba(3,78,162,0.07)' : 'var(--bg-subtle)',
            border: `1.5px solid ${voted ? 'var(--primary)' : 'var(--border-light)'}`,
            borderRadius: 8, padding: '10px 6px',
            cursor: isLoading ? 'wait' : 'pointer',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => { if (!voted && !isLoading) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)'; }}
          onMouseLeave={e => { if (!voted) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-light)'; }}
        >
          <svg width="14" height="12" viewBox="0 0 24 20" style={{ display: 'block' }}>
            <polygon points="12,2 22,18 2,18"
              fill={voted ? 'var(--primary)' : 'none'}
              stroke={voted ? 'var(--primary)' : 'var(--text-muted)'}
              strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: voted ? 'var(--primary)' : 'var(--text-primary)', lineHeight: 1 }}>
            {item.upvotes}
          </span>
        </button>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Title */}
          <div style={{ marginBottom: 8, paddingRight: 90 }}>
            <button
              onClick={() => setExpanded(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit', width: '100%' }}
            >
              <span
                style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, display: 'block', transition: 'color 0.15s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--primary)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
              >
                {item.titulo}
              </span>
            </button>
          </div>

          {/* Description */}
          <p style={{ margin: '0 0 14px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            {expanded ? item.descricao : truncate(item.descricao, 200)}
          </p>

          {/* Footer row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

            {/* Author */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: bgColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                {authorName.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '0.79rem', fontWeight: 600, color: 'var(--text-primary)' }}>{authorName}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>· {item.created_at}</span>
            </div>

            <div style={{ flex: 1 }} />

            {/* Contagem de comentários */}
            <button
              onClick={() => setExpanded(v => !v)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontFamily: 'inherit' }}
              title="Ver comentários"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{commentCount}</span>
            </button>

            {/* Severity badge */}
            {sv && (
              <span style={{ background: sv.bg, color: sv.color, border: `1px solid ${sv.border}`, borderRadius: 4, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <sv.Icon size={11} />
                {item.severidade}
              </span>
            )}

            {/* Status badge — clicável só para admin */}
            {isAdmin ? (
              <button
                onClick={() => onStatusChange(item.id, answered ? 'pendente' : 'respondida')}
                title={answered ? 'Marcar como pendente' : 'Marcar como respondida'}
                style={{
                  padding: '2px 9px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700,
                  background: answered ? 'rgba(0,121,50,0.09)' : 'var(--bg-subtle)',
                  color: answered ? '#007932' : 'var(--text-muted)',
                  border: `1px solid ${answered ? 'rgba(0,121,50,0.22)' : 'var(--border-light)'}`,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.7')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
              >
                {answered ? 'Respondida' : 'Pendente'}
              </button>
            ) : (
            <span style={{
              padding: '2px 9px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700,
              background: answered ? 'rgba(0,121,50,0.09)' : 'var(--bg-subtle)',
              color: answered ? '#007932' : 'var(--text-muted)',
              border: `1px solid ${answered ? 'rgba(0,121,50,0.22)' : 'var(--border-light)'}`,
            }}>
              {answered ? 'Respondida' : 'Pendente'}
            </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded: images + official response + comments */}
      {expanded && (
        <>
          {(imageList.length > 0 || answered) && (
            <div style={{ padding: '16px 20px 0' }}>
              {imageList.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  {imageList.map((img, i) => (
                    <a key={i} href={img.dados} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.dados} alt={img.nome}
                        style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-light)', cursor: 'zoom-in' }} />
                    </a>
                  ))}
                </div>
              )}
              {answered && (
                <div style={{ borderRadius: 6, border: '1px solid var(--border-light)', overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ padding: '9px 14px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resposta oficial</span>
                  </div>
                  <div style={{ padding: '12px 14px', background: '#fff' }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{item.resposta}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <CommentSection
            feedbackId={item.id}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            isAdmin={isAdmin}
            onCountChange={setCommentCount}
          />
        </>
      )}
    </div>
  );
}
