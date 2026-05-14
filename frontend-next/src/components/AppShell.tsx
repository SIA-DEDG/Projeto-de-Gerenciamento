'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import SettingsModal from './SettingsModal';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="app-container">
      <Sidebar onSettingsClick={() => setSettingsOpen(true)} />
      <main className="main-content">{children}</main>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
