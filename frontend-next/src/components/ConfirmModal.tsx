'use client';

import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  open, title, message, confirmLabel = 'Confirmar', danger = false, onConfirm, onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: 400 }}>
        <div className="modal-body" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 24 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: danger ? 'rgba(180,35,24,0.08)' : 'rgba(3,78,162,0.08)',
            color: danger ? 'var(--red)' : 'var(--blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <AlertTriangle size={22} />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: '8px 0 0' }}>{title}</h3>
          {message && <p style={{ fontSize: '0.845rem', color: 'var(--text-2)', lineHeight: 1.6, marginTop: 6 }}>{message}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancelar</button>
          <button
            className={`btn btn-sm${danger ? ' btn-danger' : ' btn-primary'}`}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
