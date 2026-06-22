'use client';

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';

const THEME_KEY = 'sia-theme';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') setTheme('dark');
  }, []);

  function toggleTheme() {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }

  return (
    <div className={`app-container${theme === 'dark' ? ' theme-dark' : ''}`}>
      <Sidebar onToggleTheme={toggleTheme} isDark={theme === 'dark'} />
      <main className="main-content">
        <div className="page-scroll">
          {children}
        </div>
      </main>
    </div>
  );
}
