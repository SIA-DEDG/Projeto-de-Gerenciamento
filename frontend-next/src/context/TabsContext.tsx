'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';

// ── Page types & paths ────────────────────────────────────────────────────────

export type PageType =
  | 'board'
  | 'minhas-atividades'
  | 'arquivadas'
  | 'eventos'
  | 'faltas'
  | 'projetos'
  | 'dashboards'
  | 'feedback'
  | 'logs'
  | 'configuracoes'
  | 'admin-registro'
  | 'admin-usuarios'
  | 'admin-diretorias';

export const PAGE_INFO: Record<PageType, { path: string; defaultName: string }> = {
  'board':              { path: '/',                 defaultName: 'Atividades' },
  'minhas-atividades':  { path: '/minhas-atividades', defaultName: 'Minhas atividades' },
  'arquivadas':         { path: '/arquivadas',        defaultName: 'Arquivadas' },
  'eventos':            { path: '/eventos',           defaultName: 'Eventos' },
  'faltas':             { path: '/faltas',            defaultName: 'Faltas' },
  'projetos':           { path: '/projetos',          defaultName: 'Projetos' },
  'dashboards':         { path: '/dashboards',        defaultName: 'Dashboards' },
  'feedback':           { path: '/feedback',          defaultName: 'Feedback' },
  'logs':               { path: '/logs',              defaultName: 'Logs' },
  'configuracoes':      { path: '/configuracoes',     defaultName: 'Configurações' },
  'admin-registro':     { path: '/admin/registro',    defaultName: 'Cadastrar usuário' },
  'admin-usuarios':     { path: '/admin/usuarios',    defaultName: 'Gerenciar usuários' },
  'admin-diretorias':   { path: '/admin/diretorias',  defaultName: 'Diretorias' },
};

export function pathToPageType(pathname: string): PageType | null {
  for (const [type, info] of Object.entries(PAGE_INFO) as [PageType, { path: string }][]) {
    if (info.path === pathname) return type;
  }
  if (pathname.startsWith('/admin/registro')) return 'admin-registro';
  if (pathname.startsWith('/admin/usuarios')) return 'admin-usuarios';
  return null;
}

// ── Filter state (persisted per tab for board-like pages) ─────────────────────

export type View = 'kanban' | 'list' | 'calendar';

export interface TabFilters {
  search: string;
  filterUser: string;
  filterPriority: string;
  filterProject: string;
  filterDateFrom: string;
  filterDateTo: string;
  view: View;
}

const DEFAULT_FILTERS: TabFilters = {
  search: '',
  filterUser: '',
  filterPriority: '',
  filterProject: '',
  filterDateFrom: '',
  filterDateTo: '',
  view: 'kanban',
};

// ── Tab model ─────────────────────────────────────────────────────────────────

export interface Tab {
  id: string;
  type: PageType;
  name: string;
  filters: TabFilters;
}

// ── Context ───────────────────────────────────────────────────────────────────

interface TabsContextValue {
  tabs: Tab[];
  activeTabId: string;
  openTab: (type: PageType, opts?: { name?: string; filters?: Partial<TabFilters>; forceNew?: boolean }) => void;
  closeTab: (id: string) => void;
  closeAllTabs: () => void;
  activateTab: (id: string) => void;
  patchActiveTab: (patch: Partial<TabFilters>) => void;
  renameTab: (id: string, name: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

const INITIAL_TABS: Tab[] = [
  { id: 'tb0', type: 'board', name: 'Atividades', filters: { ...DEFAULT_FILTERS } },
];

const LS_TABS = 'sia-tabs';
const LS_ACTIVE = 'sia-active-tab';

function loadTabs(): Tab[] {
  if (typeof window === 'undefined') return INITIAL_TABS;
  try {
    const raw = localStorage.getItem(LS_TABS);
    if (raw) {
      const parsed = JSON.parse(raw) as Tab[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_TABS;
}

function loadActiveId(tabs: Tab[]): string {
  if (typeof window === 'undefined') return tabs[0].id;
  try {
    const saved = localStorage.getItem(LS_ACTIVE);
    if (saved && tabs.find(t => t.id === saved)) return saved;
  } catch {}
  return tabs[0].id;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [tabs, setTabs] = useState<Tab[]>(loadTabs);
  const [activeTabId, setActiveTabId] = useState<string>(() => loadActiveId(loadTabs()));

  // Refs kept in sync each render so callbacks don't capture stale closures
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  tabsRef.current = tabs;
  activeTabIdRef.current = activeTabId;

  useEffect(() => {
    try { localStorage.setItem(LS_TABS, JSON.stringify(tabs)); } catch {}
  }, [tabs]);

  useEffect(() => {
    try { localStorage.setItem(LS_ACTIVE, activeTabId); } catch {}
  }, [activeTabId]);

  // On initial load: sync active tab to the current URL path
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const type = pathToPageType(pathname);
    if (!type) return;
    const currentTabs = tabsRef.current;
    const currentActiveId = activeTabIdRef.current;
    const match = currentTabs.find(t => t.type === type);
    if (match) {
      if (match.id !== currentActiveId) setActiveTabId(match.id);
    } else if (type !== 'board') {
      const id = 'tb' + Date.now();
      const info = PAGE_INFO[type];
      setTabs(prev => [...prev, { id, type, name: info.defaultName, filters: { ...DEFAULT_FILTERS } }]);
      setActiveTabId(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── openTab ───────────────────────────────────────────────────────────────
  // Uses tabsRef so it never closes over stale `tabs` and needs no deps.

  const openTab = useCallback((
    type: PageType,
    opts: { name?: string; filters?: Partial<TabFilters>; forceNew?: boolean } = {},
  ) => {
    const { name, filters, forceNew = false } = opts;

    if (!forceNew && type !== 'board') {
      const existing = tabsRef.current.find(t => t.type === type);
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }
    }

    const id = 'tb' + Date.now();
    const newTab: Tab = {
      id,
      type,
      name: name ?? PAGE_INFO[type].defaultName,
      filters: { ...DEFAULT_FILTERS, ...filters },
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
  }, []);

  // ── closeTab ──────────────────────────────────────────────────────────────

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex(t => t.id === id);
      const next = prev.filter(t => t.id !== id);
      if (id === activeTabIdRef.current) {
        const newActive = next[Math.max(0, idx - 1)];
        if (newActive) setActiveTabId(newActive.id);
      }
      return next;
    });
  }, []);

  // ── closeAllTabs ──────────────────────────────────────────────────────────

  const closeAllTabs = useCallback(() => {
    const fresh: Tab = { id: `tb${Date.now()}`, type: 'board', name: 'Atividades', filters: { ...DEFAULT_FILTERS } };
    setTabs([fresh]);
    setActiveTabId(fresh.id);
  }, []);

  // ── activateTab ───────────────────────────────────────────────────────────

  const activateTab = useCallback((id: string) => {
    if (id === activeTabIdRef.current) return;
    const tab = tabsRef.current.find(t => t.id === id);
    if (!tab) return;
    setActiveTabId(id);
  }, []);

  // ── patchActiveTab ────────────────────────────────────────────────────────

  const patchActiveTab = useCallback((patch: Partial<TabFilters>) => {
    setTabs(prev =>
      prev.map(t => t.id === activeTabIdRef.current
        ? { ...t, filters: { ...t.filters, ...patch } }
        : t,
      ),
    );
  }, []);

  // ── renameTab ─────────────────────────────────────────────────────────────

  const renameTab = useCallback((id: string, name: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, name: name || 'Aba' } : t));
  }, []);

  // ── reorderTabs ───────────────────────────────────────────────────────────

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setTabs(prev => {
      if (fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ tabs, activeTabId, openTab, closeTab, closeAllTabs, activateTab, patchActiveTab, renameTab, reorderTabs }),
    [tabs, activeTabId, openTab, closeTab, closeAllTabs, activateTab, patchActiveTab, renameTab, reorderTabs],
  );

  return (
    <TabsContext.Provider value={value}>
      {children}
    </TabsContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('useTabs must be used within TabsProvider');
  return ctx;
}

export function useActiveTab(): Tab | undefined {
  const { tabs, activeTabId } = useTabs();
  return tabs.find(t => t.id === activeTabId);
}
