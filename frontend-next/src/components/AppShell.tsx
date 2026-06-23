'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from './Sidebar';
import { TabsProvider, useActiveTab, type PageType } from '@/context/TabsContext';

const THEME_KEY = 'sia-theme';

// Cada página é carregada apenas na primeira visita — lazy-load por tipo
const PAGES: Record<PageType, React.ComponentType> = {
  'board':             dynamic(() => import('@/app/(app)/page')),
  'minhas-atividades': dynamic(() => import('@/app/(app)/minhas-atividades/page')),
  'eventos':           dynamic(() => import('@/app/(app)/eventos/page')),
  'faltas':            dynamic(() => import('@/app/(app)/faltas/page')),
  'arquivadas':        dynamic(() => import('@/app/(app)/arquivadas/page')),
  'dashboards':        dynamic(() => import('@/app/(app)/dashboards/page')),
  'projetos':          dynamic(() => import('@/app/(app)/projetos/page')),
  'logs':              dynamic(() => import('@/app/(app)/logs/page')),
  'configuracoes':     dynamic(() => import('@/app/(app)/configuracoes/page')),
  'feedback':          dynamic(() => import('@/app/(app)/feedback/page')),
  'admin-registro':    dynamic(() => import('@/app/(app)/admin/registro/page')),
  'admin-usuarios':    dynamic(() => import('@/app/(app)/admin/usuarios/page')),
};

// Mantém páginas visitadas montadas (keep-alive): troca de aba é instantânea
function PageHost() {
  const activeTab = useActiveTab();
  const [mountedTypes, setMountedTypes] = useState<Set<PageType>>(() => {
    const s = new Set<PageType>();
    if (activeTab?.type) s.add(activeTab.type);
    return s;
  });

  useEffect(() => {
    if (activeTab?.type) {
      setMountedTypes(prev => {
        if (prev.has(activeTab.type)) return prev;
        return new Set([...prev, activeTab.type]);
      });
    }
  }, [activeTab?.type]);

  return (
    <>
      {[...mountedTypes].map(type => {
        const Component = PAGES[type];
        const isActive = activeTab?.type === type;
        return (
          <div key={type} style={{ display: isActive ? 'contents' : 'none' }}>
            <Component />
          </div>
        );
      })}
    </>
  );
}

export default function AppShell() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(THEME_KEY) : null;
    if (saved === 'dark') setTheme('dark');
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
            <PageHost />
          </div>
        </main>
      </div>
    </TabsProvider>
  );
}
