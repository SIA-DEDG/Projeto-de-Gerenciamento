'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Cabeçalho colapsável de seções de arquivos/links.
 *
 * - `variant="primary"` (padrão): barra azul cheia, rótulo branco — grupos de topo.
 * - `variant="sub"`: cabeçalho discreto (fundo claro, rótulo em cinza, menor) — para
 *   subgrupos aninhados (ex.: Arquivos/Links dentro de "Atividades"/"Projeto"),
 *   criando hierarquia visual clara.
 */
export default function CollapsibleGroup({
  label,
  count,
  defaultOpen = true,
  variant = 'primary',
  children,
}: {
  label: string;
  count?: number;
  defaultOpen?: boolean;
  variant?: 'primary' | 'sub';
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isSub = variant === 'sub';

  const buttonStyle: React.CSSProperties = isSub
    ? {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
        background: open ? 'var(--surface-2)' : 'transparent', color: 'var(--text-2)',
        border: '1px solid var(--line-1)', borderRadius: 3,
        padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit',
        marginBottom: open ? 6 : 0, transition: 'background 0.12s',
      }
    : {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
        background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 3,
        padding: '10px 13px', cursor: 'pointer', fontFamily: 'inherit',
        marginBottom: open ? 8 : 0,
      };

  const labelStyle: React.CSSProperties = isSub
    ? { fontFamily: 'var(--mono)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-3)' }
    : { fontFamily: 'var(--mono)', fontSize: '0.66rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#fff' };

  const chevColor = isSub ? 'var(--text-3)' : '#fff';
  const chevSize = isSub ? 13 : 14;

  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} style={buttonStyle}>
        <span style={labelStyle}>
          {label}{count !== undefined ? ` · ${count}` : ''}
        </span>
        {open ? <ChevronUp size={chevSize} color={chevColor} /> : <ChevronDown size={chevSize} color={chevColor} />}
      </button>
      {open && children}
    </div>
  );
}
