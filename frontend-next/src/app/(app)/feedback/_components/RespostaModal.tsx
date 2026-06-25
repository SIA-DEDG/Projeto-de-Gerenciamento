'use client';

import { useState } from 'react';
import { setFeedbackResposta, type FeedbackItem } from '@/lib/api';
import { inp } from './types';

interface Props {
  item: FeedbackItem;
  onClose: () => void;
  onSaved: (updated: FeedbackItem) => void;
}

export default function RespostaModal({ item, onClose, onSaved }: Props) {
  const [text, setText] = useState(item.resposta ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await setFeedbackResposta(item.id, text.trim() || null);
      onSaved(updated);
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(3,78,162,0.22)', backdropFilter: 'blur(2px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 500, maxHeight: '90vh', boxShadow: '0 20px 60px rgba(3,78,162,0.18), 0 4px 16px rgba(0,0,0,0.10)', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'modal-pop-in-flex 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
        <div style={{ height: 5, flexShrink: 0, background: 'linear-gradient(to right, var(--blue) 40%, #fdb913 40% 55%, #ef4123 55% 75%, #007932 75%)' }} />
        <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 4 }}>Feedback</div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Resposta oficial</h2>
          </div>
          <button onClick={onClose} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-subtle)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>✕</button>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', border: '1px solid var(--border-light)' }}>
            {item.titulo}
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
            placeholder="Digite a resposta oficial…"
            style={{ ...inp, resize: 'vertical', minHeight: 100, lineHeight: 1.6 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-subtle)', flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ padding: '6px 14px', background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-secondary)' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '6px 18px', background: saving ? 'var(--text-muted)' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
