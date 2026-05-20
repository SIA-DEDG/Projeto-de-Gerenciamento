'use client';

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
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f2' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#172b4d' }}>{title}</h3>
          {message && (
            <p style={{ margin: '8px 0 0', fontSize: '0.875rem', color: '#6b778c', lineHeight: 1.5 }}>{message}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 18px', background: 'none', border: '1px solid #dfe1e6', borderRadius: 6, fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', color: '#344563' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => { onConfirm(); onClose(); }}
            style={{ padding: '8px 20px', background: danger ? '#de350b' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
