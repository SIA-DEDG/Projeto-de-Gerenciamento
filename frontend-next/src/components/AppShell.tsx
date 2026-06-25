'use client';

import { useEffect, useState, lazy, Suspense, useRef } from 'react';
import Sidebar from './Sidebar';
import { TabsProvider, useTabs } from '@/context/TabsContext';
import type { PageType } from '@/context/TabsContext';

const THEME_KEY  = 'sia-theme';
const ACCENT_KEY = 'sia-accent';

function darkenHex(hex: string, pct: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 1 - pct / 100;
  return `#${[r, g, b].map(v => Math.max(0, Math.round(v * f)).toString(16).padStart(2, '0')).join('')}`;
}

export function applyAccentColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const rgb = `${r},${g},${b}`;
  const h = darkenHex(hex, 15);
  const root = document.documentElement;
  root.style.setProperty('--blue',          hex);
  root.style.setProperty('--blue-h',        h);
  root.style.setProperty('--primary',       hex);
  root.style.setProperty('--primary-hover', h);
  root.style.setProperty('--primary-light', `rgba(${rgb},0.08)`);
  root.style.setProperty('--primary-glow',  `rgba(${rgb},0.2)`);
  root.style.setProperty('--s-progress',    hex);
  let style = document.getElementById('sia-accent-css') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'sia-accent-css';
    document.head.appendChild(style);
  }
  style.textContent = `
    :root { --blue:${hex}; --blue-h:${h}; --primary:${hex}; --s-progress:${hex};
            --primary-light:rgba(${rgb},0.08); --primary-glow:rgba(${rgb},0.2); }
  `;
}

// ── Lazy views — um componente por página ─────────────────────────────────────
const PAGE_VIEWS: Record<PageType, React.LazyExoticComponent<() => React.JSX.Element | null>> = {
  'board':             lazy(() => import('@/app/(app)/_view')),
  'minhas-atividades': lazy(() => import('@/app/(app)/minhas-atividades/_view')),
  'arquivadas':        lazy(() => import('@/app/(app)/arquivadas/_view')),
  'eventos':           lazy(() => import('@/app/(app)/eventos/_view')),
  'faltas':            lazy(() => import('@/app/(app)/faltas/_view')),
  'projetos':          lazy(() => import('@/app/(app)/projetos/_view')),
  'dashboards':        lazy(() => import('@/app/(app)/dashboards/_view')),
  'feedback':          lazy(() => import('@/app/(app)/feedback/_view')),
  'logs':              lazy(() => import('@/app/(app)/logs/_view')),
  'configuracoes':     lazy(() => import('@/app/(app)/configuracoes/_view')),
  'admin-registro':    lazy(() => import('@/app/(app)/admin/registro/_view')),
  'admin-usuarios':    lazy(() => import('@/app/(app)/admin/usuarios/_view')),
  'admin-diretorias':  lazy(() => import('@/app/(app)/admin/diretorias/_view')),
};

// ── Renderizador de abas — todas montadas, só a ativa é visível ───────────────
function TabViewport() {
  const { tabs, activeTabId } = useTabs();

  // Rastreia quais tabs já foram montadas (não desmonta até a tab ser fechada)
  const mountedRef = useRef<Set<string>>(new Set());
  tabs.forEach(t => {
    if (t.id === activeTabId) mountedRef.current.add(t.id);
  });
  // Remove tabs que foram fechadas
  const tabIds = new Set(tabs.map(t => t.id));
  mountedRef.current.forEach(id => { if (!tabIds.has(id)) mountedRef.current.delete(id); });

  return (
    <>
      {tabs.map(tab => {
        const isMounted = mountedRef.current.has(tab.id);
        if (!isMounted) return null;

        const PageView = PAGE_VIEWS[tab.type];
        const isActive = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            style={{ display: isActive ? 'contents' : 'none' }}
            aria-hidden={!isActive}
          >
            <Suspense fallback={null}>
              <PageView />
            </Suspense>
          </div>
        );
      })}
    </>
  );
}

// ── AppShell ─────────────────────────────────────────────────────────────────
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(THEME_KEY) : null;
    if (saved === 'dark') setTheme('dark');
    const accent = typeof window !== 'undefined' ? localStorage.getItem(ACCENT_KEY) : null;
    if (accent) applyAccentColor(accent);
  }, []);

  function toggleTheme() {
    setTheme(t => {
      const next = t === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }

  return (
    <TabsProvider>
      <div className={`app-container${theme === 'dark' ? ' theme-dark' : ''}`}>
        <div className="sidebar-rail-wrapper">
          <Sidebar onToggleTheme={toggleTheme} isDark={theme === 'dark'} />
        </div>

        <main className="main-content">
          <div className="page-scroll">
            {/* children é sempre null (page.tsx retorna null) — mantido para Next.js */}
            {children}
            {/* Todas as views abertas ficam montadas — troca de aba é só CSS */}
            <TabViewport />
          </div>
        </main>
      </div>
    </TabsProvider>
  );
}
