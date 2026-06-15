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
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div style={{ background: '#fff', borderRadius: 8, width: '100%', maxWidth: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #d8dee4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#24292f' }}>Resposta oficial</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#6e7781' }}>×</button>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: '0.82rem', color: '#57606a', background: '#f6f8fa', borderRadius: 6, padding: '10px 12px', border: '1px solid #d8dee4' }}>
            {item.titulo}
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
            placeholder="Digite a resposta oficial…"
            style={{ ...inp, resize: 'vertical', minHeight: 100, lineHeight: 1.6 }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose}
              style={{ padding: '8px 16px', background: '#f6f8fa', border: '1px solid #d8dee4', borderRadius: 6, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', color: '#24292f' }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '8px 18px', background: saving ? '#8c959f' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.85rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
