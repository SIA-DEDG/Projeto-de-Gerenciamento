'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
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
  const { tabs, activeTabId, openTab, closeTab, activateTab, renameTab, reorderTabs } = useTabs();

  const [renamingId, setRenamingId]   = useState<string | null>(null);
  const [renameVal, setRenameVal]     = useState('');
  const renameRef = useRef<HTMLInputElement>(null);
  const barRef    = useRef<HTMLDivElement>(null);

  // drag state
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
    if (renamingId) renameTab(renamingId, renameVal.trim() || 'Aba');
    setRenamingId(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { setRenamingId(null); }
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────
  function onDragStart(e: React.DragEvent, index: number) {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    const ghost = document.createElement('div');
    ghost.style.cssText = 'position:absolute;top:-9999px;opacity:0;';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  }

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
      setDragOverIndex(index);
    }
  }

  function onDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
      reorderTabs(dragIndexRef.current, index);
    }
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  function onDragEnd() {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  return (
    <div ref={barRef} className="tab-bar ssel">
      {tabs.map((tab, index) => {
        const active      = tab.id === activeTabId;
        const filtered    = tabHasFilters(tab);
        const canClose    = tabs.length > 1;
        const isBoard     = BOARD_LIKE.has(tab.type);
        const isDragTarget = dragOverIndex === index && dragIndexRef.current !== index;
        const href        = PAGE_INFO[tab.type].path;

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
              /* Rename mode — plain div, no Link navigation */
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: '100%' }}>
                {isBoard && <span className="tab-view-icon"><ViewIcon view={tab.filters.view} /></span>}
                <input
                  ref={renameRef}
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={handleKeyDown}
                  onClick={e => e.stopPropagation()}
                  className="tab-rename-input"
                />
              </div>
            ) : (
              /* Normal mode — Link for navigation + click to activate */
              <Link
                href={href}
                onClick={() => activateTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0 12px', height: '100%',
                  textDecoration: 'none', color: 'inherit',
                  flex: 1, minWidth: 0,
                }}
              >
                {isBoard && (
                  <span className="tab-view-icon"><ViewIcon view={tab.filters.view} /></span>
                )}
                <span className="tab-name">{tab.name}</span>
                {filtered && <span className="tab-filter-dot" />}
              </Link>
            )}

            {/* Fechar */}
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

      <div style={{ flex: 1 }} />
      {rightSlot}
    </div>
  );
}
