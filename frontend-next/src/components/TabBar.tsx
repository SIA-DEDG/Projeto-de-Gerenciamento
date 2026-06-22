'use client';

import { useState, useRef, useEffect } from 'react';
import { LayoutGrid, List, Calendar } from 'lucide-react';
import { useTabs, useActiveTab, PAGE_INFO, type Tab } from '@/context/TabsContext';

// ── View icon prefix (tiny, mono style) ──────────────────────────────────────

function ViewIcon({ view }: { view: string }) {
  const size = 11;
  if (view === 'list')     return <List     size={size} />;
  if (view === 'calendar') return <Calendar size={size} />;
  return <LayoutGrid size={size} />;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function tabHasFilters(tab: Tab): boolean {
  const { search, fUser, fPrio, fProj } = tab.filters;
  return !!(search || fUser || fPrio || fProj);
}

const BOARD_LIKE: Set<Tab['type']> = new Set(['board', 'minhas-atividades']);

// ── TabBar ────────────────────────────────────────────────────────────────────

export default function TabBar() {
  const { tabs, activeTabId, openTab, closeTab, activateTab, renameTab } = useTabs();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal]   = useState('');
  const renameRef = useRef<HTMLInputElement>(null);
  const barRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renamingId]);

  // Scroll active tab into view
  useEffect(() => {
    if (!barRef.current) return;
    const active = barRef.current.querySelector('[data-active="true"]') as HTMLElement | null;
    if (active) active.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [activeTabId]);

  function startRename(tab: Tab, e: React.MouseEvent) {
    e.stopPropagation();
    setRenamingId(tab.id);
    setRenameVal(tab.name);
  }

  function commitRename() {
    if (renamingId) renameTab(renamingId, renameVal.trim() || 'Aba');
    setRenamingId(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { setRenamingId(null); }
  }

  return (
    <div
      ref={barRef}
      className="tab-bar ssel"
    >
      {tabs.map(tab => {
        const active   = tab.id === activeTabId;
        const filtered = tabHasFilters(tab);
        const canClose = tabs.length > 1;
        const isBoard  = BOARD_LIKE.has(tab.type);

        return (
          <div
            key={tab.id}
            data-active={active}
            className={`tab-item${active ? ' active' : ''}`}
            onClick={() => renamingId !== tab.id && activateTab(tab.id)}
            onDoubleClick={(e) => startRename(tab, e)}
            title={renamingId !== tab.id ? tab.name : undefined}
          >
            {/* View icon prefix — só para abas do board */}
            {isBoard && renamingId !== tab.id && (
              <span className="tab-view-icon">
                <ViewIcon view={tab.filters.view} />
              </span>
            )}

            {/* Nome ou input de rename */}
            {renamingId === tab.id ? (
              <input
                ref={renameRef}
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleKeyDown}
                onClick={e => e.stopPropagation()}
                className="tab-rename-input"
              />
            ) : (
              <span className="tab-name">{tab.name}</span>
            )}

            {/* Ponto azul — tem filtros ativos */}
            {filtered && renamingId !== tab.id && (
              <span className="tab-filter-dot" />
            )}

            {/* Botão fechar */}
            {canClose && renamingId !== tab.id && (
              <span
                className="tab-close"
                onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                title="Fechar aba"
              >
                ×
              </span>
            )}
          </div>
        );
      })}

      {/* Botão "+" — nova aba de atividades */}
      <button
        className="tab-add-btn"
        onClick={() => openTab('board', { forceNew: true, name: 'Nova aba' })}
        title="Nova aba (Atividades)"
      >
        +
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />
    </div>
  );
}
