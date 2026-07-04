'use client';

import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  // Ação do botão secundário. Quando ausente, o secundário apenas fecha (comportamento padrão).
  // Útil quando as duas opções fazem algo (ex.: "Salvar com" vs. "Salvar sem"), mantendo o
  // clique no backdrop como um simples fechar.
  onCancel?: () => void;
  // Sobrepõe o z-index do backdrop (padrão do CSS é 400). Necessário quando este confirm
  // precisa aparecer acima de um modal com z-index maior (ex.: modais de feedback usam 1000).
  zIndex?: number;
}

export default function ConfirmModal({
  open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false, onConfirm, onClose, onCancel, zIndex,
}: Props) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" style={zIndex !== undefined ? { zIndex } : undefined} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: 400 }}>
        <div className="modal-body" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 24 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: danger ? 'rgba(180,35,24,0.08)' : 'var(--primary-light)',
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
          <button className="btn btn-secondary btn-sm" onClick={() => { onCancel?.(); onClose(); }}>{cancelLabel}</button>
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
