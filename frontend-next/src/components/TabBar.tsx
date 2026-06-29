'use client';

import { useState, useRef, useEffect } from 'react';
import { LayoutGrid, List, Calendar } from 'lucide-react';
import { useTabs, useActiveTab, PAGE_INFO, type Tab } from '@/context/TabsContext';

function ViewIcon({ view }: { view: string }) {
  const size = 11;
  if (view === 'list')     return <List     size={size} />;
  if (view === 'calendar') return <Calendar size={size} />;
  return <LayoutGrid size={size} />;
}

function tabHasFilters(tab: Tab): boolean {
  const { search, filterUser, filterPriority, filterProject } = tab.filters;
  return !!(search || filterUser || filterPriority || filterProject);
}

const BOARD_LIKE: Set<Tab['type']> = new Set(['board', 'minhas-atividades']);

interface TabBarProps {
  rightSlot?: React.ReactNode;
}

export default function TabBar({ rightSlot }: TabBarProps = {}) {
  const { tabs, activeTabId, openTab, closeTab, activateTab, renameTab, reorderTabs, closeAllTabs } = useTabs();

  const [renamingId, setRenamingId]   = useState<string | null>(null);
  const [renameInputValue, setRenameVal]     = useState('');
  const renameRef = useRef<HTMLInputElement>(null);
  const tabBarRef    = useRef<HTMLDivElement>(null);

  // drag state
  const dragSourceIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renamingId]);

  // Scroll active tab into view
  useEffect(() => {
    if (!tabBarRef.current) return;
    const active = tabBarRef.current.querySelector('[data-active="true"]') as HTMLElement | null;
    if (active) active.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [activeTabId]);

  // Auto-rename when new tab is added
  const prevTabCount = useRef(tabs.length);
  useEffect(() => {
    if (tabs.length > prevTabCount.current) {
      const newest = tabs[tabs.length - 1];
      if (newest && newest.name === 'Nova aba' && newest.id === activeTabId) {
        setRenamingId(newest.id);
        setRenameVal(newest.name);
      }
    }
    prevTabCount.current = tabs.length;
  }, [tabs, activeTabId]);

  function startRename(tab: Tab, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setRenamingId(tab.id);
    setRenameVal(tab.name);
  }

  function commitRename() {
    if (renamingId) renameTab(renamingId, renameInputValue.trim() || 'Aba');
    setRenamingId(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { setRenamingId(null); }
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────
  function onDragStart(e: React.DragEvent, index: number) {
    dragSourceIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    const dragImageElement = document.createElement('div');
    dragImageElement.style.cssText = 'position:absolute;top:-9999px;opacity:0;';
    document.body.appendChild(dragImageElement);
    e.dataTransfer.setDragImage(dragImageElement, 0, 0);
    setTimeout(() => document.body.removeChild(dragImageElement), 0);
  }

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragSourceIndexRef.current !== null && dragSourceIndexRef.current !== index) {
      setDragOverIndex(index);
    }
  }

  function onDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragSourceIndexRef.current !== null && dragSourceIndexRef.current !== index) {
      reorderTabs(dragSourceIndexRef.current, index);
    }
    dragSourceIndexRef.current = null;
    setDragOverIndex(null);
  }

  function onDragEnd() {
    dragSourceIndexRef.current = null;
    setDragOverIndex(null);
  }

  return (
    <div className="tab-bar-outer ssel">
      {/* × Fechar todas — lado esquerdo, só aparece com 2+ abas */}
      {tabs.length > 1 && (
        <button
          onClick={closeAllTabs}
          title="Fechar todas as abas"
          style={{ width: 36, height: '100%', flexShrink: 0, border: 'none', borderRight: '1px solid var(--line-1)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.12s, background 0.12s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#b42318'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          ×
        </button>
      )}

      {/* Área scrollável das abas */}
      <div ref={tabBarRef} className="tab-bar-scroll">
        {tabs.map((tab, index) => {
          const active       = tab.id === activeTabId;
          const filtered     = tabHasFilters(tab);
          const canClose     = tabs.length > 1;
          const isBoard      = BOARD_LIKE.has(tab.type);
          const isDragTarget = dragOverIndex === index && dragSourceIndexRef.current !== index;
          const href         = PAGE_INFO[tab.type].path;

          return (
            <div
              key={tab.id}
              data-active={active}
              draggable
              className={`tab-item${active ? ' active' : ''}${isDragTarget ? ' drag-over' : ''}`}
              onDoubleClick={(e) => startRename(tab, e)}
              onDragStart={(e) => onDragStart(e, index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDrop={(e) => onDrop(e, index)}
              onDragEnd={onDragEnd}
              title={renamingId !== tab.id ? tab.name : undefined}
            >
              {renamingId === tab.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: '100%' }}>
                  {isBoard && <span className="tab-view-icon"><ViewIcon view={tab.filters.view} /></span>}
                  <input
                    ref={renameRef}
                    value={renameInputValue}
                    onChange={e => setRenameVal(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={handleKeyDown}
                    onClick={e => e.stopPropagation()}
                    className="tab-rename-input"
                  />
                </div>
              ) : (
                <button
                  onClick={() => {
                    activateTab(tab.id);
                    history.replaceState(null, '', href);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0 12px', height: '100%',
                    background: 'none', border: 'none', color: 'inherit',
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit',
                    flex: 1, minWidth: 0, textAlign: 'left',
                  }}
                >
                  {isBoard && <span className="tab-view-icon"><ViewIcon view={tab.filters.view} /></span>}
                  <span className="tab-name">{tab.name}</span>
                  {filtered && <span className="tab-filter-dot" />}
                </button>
              )}

              {canClose && renamingId !== tab.id && (
                <span
                  className="tab-close"
                  onClick={e => { e.preventDefault(); e.stopPropagation(); closeTab(tab.id); }}
                  title="Fechar aba"
                >
                  ×
                </span>
              )}
            </div>
          );
        })}

        {/* Botão "+" */}
        <button
          className="tab-add-btn"
          onClick={() => openTab('board', { forceNew: true, name: 'Nova aba' })}
          title="Nova aba (Atividades)"
        >
          +
        </button>

      </div>

      {/* Slot direito — fixo, não scrollável */}
      {rightSlot && (
        <div className="tab-bar-right">
          {rightSlot}
        </div>
      )}
    </div>
  );
}
