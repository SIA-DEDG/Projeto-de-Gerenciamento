'use client';

import TabBar from './TabBar';

interface Props {
  eyebrow?: string;
  title: string;
  /** Conteúdo extra à direita do título (stats, botões, etc.) */
  right?: React.ReactNode;
  /** Conteúdo entre o header e a TabBar (ex.: sub-tabs de página) */
  below?: React.ReactNode;
  /** Conteúdo no lado direito da tab bar (ex.: botão "Nova atividade") */
  tabBarRight?: React.ReactNode;
}

/**
 * Header padronizado de página: eyebrow + título + conteúdo direita,
 * seguido automaticamente da TabBar global de navegação.
 */
export default function PageHeader({ eyebrow, title, right, below, tabBarRight }: Props) {
  return (
    <>
      <div style={{
        padding: '26px 32px 16px',
        flexShrink: 0,
        background: 'var(--surface)',
        borderBottom: below ? 'none' : '1px solid var(--line-1)',
      }}>
        {eyebrow && (
          <div className="mono" style={{
            fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-3)',
            letterSpacing: '1.4px', textTransform: 'uppercase', marginBottom: 4,
          }}>
            {eyebrow}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 600, letterSpacing: '-0.7px', color: 'var(--text)', lineHeight: 1.2 }}>
            {title}
          </h1>
          {right && <div style={{ paddingBottom: 4 }}>{right}</div>}
        </div>
        {below && <div style={{ marginTop: 0 }}>{below}</div>}
      </div>

      {/* Tab bar global — sempre abaixo do título */}
      <TabBar rightSlot={tabBarRight} />
    </>
  );
}
