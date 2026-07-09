// Feedback visual de campo obrigatório não preenchido (usado nos formulários/modais).

// Animação de "tremida" via Web Animations API — reinicia a cada chamada sem depender
// de CSS (não sofre com o problema de re-trigger de @keyframes no mesmo elemento).
const SHAKE_KEYFRAMES: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-6px)' },
  { transform: 'translateX(6px)' },
  { transform: 'translateX(-4px)' },
  { transform: 'translateX(4px)' },
  { transform: 'translateX(0)' },
];

export function shakeField(el: Element | null | undefined): void {
  el?.animate?.(SHAKE_KEYFRAMES, { duration: 380, easing: 'ease-in-out' });
}

// Rola até o campo e aplica a tremida (destaca o primeiro campo inválido no submit).
export function focusInvalidField(el: Element | null | undefined): void {
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  shakeField(el);
}

// Considera um HTML de rich-text "vazio" (sem texto real), p/ validar campos de descrição.
export function isHtmlEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0;
}

export const REQUIRED_MSG = 'Campo obrigatório';
