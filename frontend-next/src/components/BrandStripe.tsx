import type { CSSProperties } from 'react';

/**
 * Faixa institucional no topo de formulários/menus/drawers.
 *
 * ⚠️ PERÍODO ELEITORAL: as cores (listras amarelo/verde da bandeira do Piauí) vêm da
 * variável CSS `--brand-stripe` / `--brand-stripe-vertical` em `globals.css`, que é a
 * FONTE ÚNICA — trocar lá reverte a cor em todo o app (inclusive o menu).
 *
 * Para REMOVER a faixa por completo depois das eleições, basta apagar os usos de
 * `<BrandStripe />` (busque pelo nome no projeto) — ou deletar este componente.
 */
export default function BrandStripe({
  height = 4,
  orientation = 'horizontal',
  style,
}: {
  /** Espessura da faixa em px (largura, se vertical). */
  height?: number;
  orientation?: 'horizontal' | 'vertical';
  /** Overrides pontuais (ex.: posicionamento absoluto no login). */
  style?: CSSProperties;
}) {
  const vertical = orientation === 'vertical';
  return (
    <div
      aria-hidden
      style={{
        flexShrink: 0,
        background: vertical ? 'var(--brand-stripe-vertical)' : 'var(--brand-stripe)',
        height: vertical ? '100%' : height,
        width: vertical ? height : undefined,
        ...style,
      }}
    />
  );
}
