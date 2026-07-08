import { useEffect, useRef } from 'react';

// Intervalo padrão do polling em segundo plano (ms). Ver comentário do hook.
const DEFAULT_POLL_MS = 30_000;

/**
 * Mantém os dados em sincronia com mudanças feitas "do outro lado" — outra aba,
 * outra pessoa ou outra diretoria — sem precisar dar refresh manual:
 *
 *  - recarrega ao VOLTAR O FOCO para a janela/aba (foco ou troca de aba);
 *  - enquanto a página está VISÍVEL, refaz o fetch a cada `intervalMs` em
 *    segundo plano; quando a aba fica escondida, o polling PAUSA (não gasta
 *    chamadas à toa) e retoma ao voltar.
 *
 * O `refetch` roda sem bloquear a UI — passe um que atualize o estado sem
 * reativar spinner/scroll, para a tela não piscar. Passe `intervalMs <= 0`
 * para desligar o polling e manter só o refetch ao focar.
 */
export function useRefetchOnFocus(refetch: () => void, intervalMs: number = DEFAULT_POLL_MS) {
  // Guarda o refetch mais recente sem reiniciar o intervalo a cada render.
  const saved = useRef(refetch);
  saved.current = refetch;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer || intervalMs <= 0) return;
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') saved.current();
      }, intervalMs);
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

    function handleVisibility() {
      if (document.visibilityState === 'visible') { saved.current(); start(); }
      else stop();
    }
    function handleFocus() { saved.current(); }

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    if (document.visibilityState === 'visible') start();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      stop();
    };
  }, [intervalMs]);
}
