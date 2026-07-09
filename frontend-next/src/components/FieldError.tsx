import { REQUIRED_MSG } from '@/lib/formShake';

/** Mensagem de erro exibida abaixo de um campo obrigatório não preenchido. */
export default function FieldError({ show, message = REQUIRED_MSG }: {
  show: boolean;
  message?: string;
}) {
  if (!show) return null;
  return (
    <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, color: '#b42318', fontSize: '0.72rem', fontWeight: 500 }}>
      <span aria-hidden style={{ fontSize: '0.8rem', lineHeight: 1 }}>⚠</span>
      {message}
    </div>
  );
}
