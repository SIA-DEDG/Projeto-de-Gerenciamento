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

  const accentColor = danger ? '#e05c6a' : 'var(--primary)';
  const accentBg    = danger ? '#fdecea' : '#e8f0fe';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', padding: '36px 32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

        {/* Ícone */}
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Título */}
        <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', fontWeight: 700, color: '#1a1a2e', textAlign: 'center' }}>
          {title}
        </h3>

        {/* Mensagem */}
        {message && (
          <p style={{ margin: '0 0 28px', fontSize: '0.9rem', color: '#7a7f9a', lineHeight: 1.6, textAlign: 'center' }}>
            {message}
          </p>
        )}
        {!message && <div style={{ marginBottom: 28 }} />}

        {/* Botões */}
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ flex: 1, padding: '13px 0', background: '#fff', border: '1.5px solid #d8dbe8', borderRadius: 12, fontFamily: 'inherit', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', color: '#444', transition: 'background 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f6fa')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => { onConfirm(); onClose(); }}
            style={{ flex: 1, padding: '13px 0', background: accentColor, color: '#fff', border: 'none', borderRadius: 12, fontFamily: 'inherit', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
