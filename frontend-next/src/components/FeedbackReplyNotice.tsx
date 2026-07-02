'use client';

import { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { getUser } from '@/lib/auth';
import { fetchFeedbacks } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

const NOTICE_DURATION = 10_000; // ~10s, depois some com fade
const SEEN_KEY = (userId: string) => `sia_feedback_seen_answered_${userId}`;

function readSeen(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY(userId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSeen(userId: string, ids: Set<string>): void {
  try {
    localStorage.setItem(SEEN_KEY(userId), JSON.stringify([...ids]));
  } catch {
    /* localStorage indisponível — aviso é acessório, ignora */
  }
}

/**
 * Aviso acessório exibido ao entrar no sistema: se algum feedback enviado pelo
 * usuário foi respondido, mostra um toast curto (~10s). Cada feedback respondido
 * é avisado apenas uma vez (rastreado em localStorage por usuário).
 */
export default function FeedbackReplyNotice() {
  const { toasts, addToast, dismissToast } = useToast();

  useEffect(() => {
    const user = getUser();
    if (!user) return;

    let cancelled = false;
    fetchFeedbacks()
      .then((feedbacks) => {
        if (cancelled) return;

        // "Respondido" = tem resposta oficial (texto) OU status marcado como respondida.
        // As duas ações são independentes no sistema, então basta uma delas.
        const answered = feedbacks.filter(
          (f) => f.usuario_id === user.user_id && (!!f.resposta || f.status === 'respondida'),
        );
        if (answered.length === 0) return;

        const seen = readSeen(user.user_id);
        const fresh = answered.filter((f) => !seen.has(f.id));
        if (fresh.length === 0) return;

        if (fresh.length > 3) {
          addToast('success', 'Feedbacks respondidos', `${fresh.length} das suas sugestões foram respondidas.`, NOTICE_DURATION);
        } else {
          fresh.forEach((f) =>
            addToast('success', 'Feedback respondido', `Sua sugestão "${f.titulo}" foi respondida.`, NOTICE_DURATION),
          );
        }

        // Marca todos os respondidos atuais como vistos (não repete no próximo login).
        answered.forEach((f) => seen.add(f.id));
        writeSeen(user.user_id, seen);
      })
      .catch(() => {
        /* silencioso */
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 28, zIndex: 2000,
      display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
      width: 'min(600px, calc(100vw - 32px))', pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <div key={t.id} className={`fb-notice${t.leaving ? ' leaving' : ''}`}
          style={{
            pointerEvents: 'auto', width: '100%', display: 'flex', alignItems: 'center', gap: 16,
            padding: '18px 22px', borderRadius: 'var(--radius, 6px)',
            background: 'var(--green)', color: '#fff',
            boxShadow: '0 10px 34px rgba(27,138,75,0.38), 0 2px 10px rgba(0,0,0,0.14)',
          }}>
          {/* Ícone em badge translúcido */}
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={22} strokeWidth={2.5} color="#fff" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', marginBottom: 3 }}>
              Feedback
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.2px', lineHeight: 1.25 }}>
              {t.title}
            </div>
            <div style={{ fontSize: '0.86rem', color: 'rgba(255,255,255,0.92)', lineHeight: 1.45, marginTop: 3 }}>
              {t.message}
            </div>
          </div>

          <button type="button" onClick={() => dismissToast(t.id)} title="Fechar"
            style={{
              width: 30, height: 30, borderRadius: 5, flexShrink: 0, alignSelf: 'flex-start',
              border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)',
              color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}>
            <X size={16} />
          </button>
        </div>
      ))}

      <style>{`
        .fb-notice { animation: fbNoticeIn .28s cubic-bezier(.2,.8,.2,1) both; }
        .fb-notice.leaving { animation: fbNoticeOut .22s ease forwards; }
        @keyframes fbNoticeIn  { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fbNoticeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(18px); } }
      `}</style>
    </div>
  );
}
