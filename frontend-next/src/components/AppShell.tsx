'use client';

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import TabBar from './TabBar';
import { TabsProvider } from '@/context/TabsContext';

const THEME_KEY = 'sia-theme';

export default function AppShell({ children }: { children: React.ReactNode }) {
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
          <TabBar />
          <div className="page-scroll">
            {children}
          </div>
        </main>
      </div>
    </TabsProvider>
  );
}
