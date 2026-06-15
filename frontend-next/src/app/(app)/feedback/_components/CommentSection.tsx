'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchComments, addComment, deleteComment, type FeedbackComment } from '@/lib/api';
import { avatarColor } from './types';

/* ── sub-componente: input de texto ──────────────────────────── */
interface AddInputProps {
  draft: string;
  submitting: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function AddInput({ draft, submitting, onChange, onSubmit, onCancel }: AddInputProps) {
  return (
    <div style={{ marginTop: 10 }}>
      <textarea
        value={draft}
        autoFocus
        rows={2}
        placeholder="Escreva um comentário… (Ctrl+Enter para enviar)"
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSubmit(); }}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '8px 10px', borderRadius: 6,
          border: '1.5px solid var(--border-light)',
          fontFamily: 'inherit', fontSize: '0.83rem',
          color: 'var(--text-primary)', resize: 'none',
          outline: 'none', lineHeight: 1.5, background: 'var(--bg-card)',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
        <button
          onClick={onCancel}
          style={{
            padding: '5px 12px', background: 'none',
            border: '1px solid var(--border-light)', borderRadius: 5,
            fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-secondary)',
          }}
        >Cancelar</button>
        <button
          onClick={onSubmit}
          disabled={submitting || !draft.trim()}
          style={{
            padding: '5px 14px', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 5, fontSize: '0.78rem', fontWeight: 700,
            fontFamily: 'inherit',
            cursor: submitting || !draft.trim() ? 'not-allowed' : 'pointer',
            opacity: draft.trim() ? 1 : 0.5,
          }}
        >{submitting ? '…' : 'Comentar'}</button>
      </div>
    </div>
  );
}

/* ── sub-componente: uma linha de comentário ─────────────────── */
interface CommentRowProps {
  comment: FeedbackComment;
  replies: FeedbackComment[];
  currentUserId: string;
  isAdmin: boolean;
  addingTo: string | null;
  draft: string;
  submitting: boolean;
  onReply: (id: string) => void;
  onDelete: (id: string) => void;
  onDraftChange: (v: string) => void;
  onSubmitReply: (parentId: string) => void;
  onCancelReply: () => void;
  indent?: boolean;
}

function CommentRow({
  comment, replies, currentUserId, isAdmin,
  addingTo, draft, submitting,
  onReply, onDelete, onDraftChange, onSubmitReply, onCancelReply,
  indent,
}: CommentRowProps) {
  const isOwn = !!comment.usuario_id && comment.usuario_id === currentUserId;
  const canDelete = isOwn || isAdmin;
  const bg = avatarColor(comment.usuario_nome);

  return (
    <div style={indent ? { marginLeft: 28, paddingLeft: 12, borderLeft: '2px solid var(--border-light)' } : {}}>
      <div style={{ display: 'flex', gap: 10, paddingTop: 10 }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%', background: bg, color: '#fff', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700,
        }}>
          {comment.usuario_nome.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)' }}>{comment.usuario_nome}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>· {comment.created_at}</span>
          </div>
          <p style={{ margin: '0 0 6px', fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {comment.conteudo}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {!indent && (
              <button
                onClick={() => onReply(comment.id)}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.72rem', color: 'var(--primary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
              >Responder</button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.72rem', color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit' }}
              >Excluir</button>
            )}
          </div>
          {addingTo === comment.id && (
            <AddInput
              draft={draft}
              submitting={submitting}
              onChange={onDraftChange}
              onSubmit={() => onSubmitReply(comment.id)}
              onCancel={onCancelReply}
            />
          )}
        </div>
      </div>

      {replies.map(r => (
        <CommentRow
          key={r.id}
          comment={r}
          replies={[]}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          addingTo={addingTo}
          draft={draft}
          submitting={submitting}
          onReply={onReply}
          onDelete={onDelete}
          onDraftChange={onDraftChange}
          onSubmitReply={onSubmitReply}
          onCancelReply={onCancelReply}
          indent
        />
      ))}
    </div>
  );
}

/* ── componente principal ────────────────────────────────────── */
interface Props {
  feedbackId: string;
  currentUserId: string;
  currentUserName: string;
  isAdmin: boolean;
  onCountChange?: (n: number) => void;
}

export default function CommentSection({ feedbackId, currentUserId, currentUserName, isAdmin, onCountChange }: Props) {
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [addingTo, setAddingTo] = useState<'root' | string | null>(null);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchComments(feedbackId);
      setComments(data);
      setLoaded(true);
      onCountChange?.(data.length);
    } catch { /* silent */ }
  }, [feedbackId, onCountChange]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(parentId?: string) {
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    try {
      const comment = await addComment(feedbackId, draft.trim(), parentId, currentUserName);
      const updated = [...comments, comment];
      setComments(updated);
      onCountChange?.(updated.length);
      setDraft('');
      setAddingTo(null);
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  }

  function handleCancel() {
    setAddingTo(null);
    setDraft('');
  }

  async function handleDelete(commentId: string) {
    try {
      await deleteComment(feedbackId, commentId);
      const updated = comments.filter(c => c.id !== commentId && c.parent_id !== commentId);
      setComments(updated);
      onCountChange?.(updated.length);
    } catch { /* silent */ }
  }

  const topLevel = comments.filter(c => !c.parent_id);
  const repliesOf = (id: string) => comments.filter(c => c.parent_id === id);

  return (
    <div style={{ borderTop: '1px solid var(--border-light)', padding: '14px 20px 18px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.2" strokeLinecap="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span style={{ fontSize: '0.79rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          {loaded ? `${comments.length} ${comments.length === 1 ? 'comentário' : 'comentários'}` : 'Comentários'}
        </span>
      </div>

      {loaded && (
        <>
          {topLevel.map(c => (
            <CommentRow
              key={c.id}
              comment={c}
              replies={repliesOf(c.id)}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              addingTo={addingTo}
              draft={draft}
              submitting={submitting}
              onReply={id => { setAddingTo(id); setDraft(''); }}
              onDelete={handleDelete}
              onDraftChange={setDraft}
              onSubmitReply={handleSubmit}
              onCancelReply={handleCancel}
            />
          ))}

          {/* Trigger de novo comentário */}
          {addingTo === 'root' ? (
            <div style={{ marginTop: topLevel.length > 0 ? 14 : 8 }}>
              <AddInput
                draft={draft}
                submitting={submitting}
                onChange={setDraft}
                onSubmit={() => handleSubmit(undefined)}
                onCancel={handleCancel}
              />
            </div>
          ) : (
            <button
              onClick={() => { setAddingTo('root'); setDraft(''); }}
              title="Adicionar comentário"
              style={{
                display: 'flex', alignItems: 'center', width: '100%',
                marginTop: topLevel.length > 0 ? 14 : 8,
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              }}
            >
              <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
              <div
                style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginLeft: 8,
                  border: '1.5px solid var(--border-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'var(--primary)'; el.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--border-light)'; el.style.color = 'var(--text-muted)'; }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
            </button>
          )}
        </>
      )}
    </div>
  );
}
