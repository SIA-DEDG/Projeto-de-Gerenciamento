'use client';
import { useState } from 'react';
import { Archive, Trash2, X } from 'lucide-react';

interface Props {
  count: number;
  label: string;
  onArchiveAll: () => Promise<void>;
  onDeleteAll: () => Promise<void>;
}

export default function ArchiveBanner({ count, label, onArchiveAll, onDeleteAll }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState<'archive' | 'delete' | null>(null);

  if (dismissed || count === 0) return null;

  async function handle(action: 'archive' | 'delete') {
    setLoading(action);
    try { action === 'archive' ? await onArchiveAll() : await onDeleteAll(); setDismissed(true); }
    catch { /* ignore */ }
    finally { setLoading(null); }
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 500, display: 'flex', alignItems: 'center', gap: 12,
      background: '#1e293b', color: '#fff', borderRadius: 3,
      padding: '10px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      fontSize: '0.83rem', fontFamily: 'inherit', whiteSpace: 'nowrap',
    }}>
      <Archive size={15} strokeWidth={2} style={{ color: '#94a3b8', flexShrink: 0 }} />
      <span style={{ color: '#cbd5e1' }}>
        <strong style={{ color: '#fff' }}>{count}</strong> {label}
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => handle('archive')} disabled={loading !== null}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 3, fontSize: '0.78rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          <Archive size={12} strokeWidth={2} />
          {loading === 'archive' ? 'Arquivando…' : 'Arquivar'}
        </button>
        <button onClick={() => handle('delete')} disabled={loading !== null}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 3, fontSize: '0.78rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          <Trash2 size={12} strokeWidth={2} />
          {loading === 'delete' ? 'Excluindo…' : 'Excluir todos'}
        </button>
      </div>
      <button onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px', display: 'flex' }}>
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
