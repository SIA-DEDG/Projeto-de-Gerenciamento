'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';
import { getUser } from '@/lib/auth';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname        = usePathname();
  const isBoard         = pathname === '/' || pathname === '/configuracoes';
  const isMyActivities  = pathname === '/minhas-atividades';
  const showPanel       = isBoard || isMyActivities;
  const [panelOpen, setPanelOpen] = useState(true);

  const filterUser = isMyActivities ? (getUser()?.name ?? undefined) : undefined;

  return (
    <div className="app-container">
      <Sidebar />

      <main className={`main-content${isBoard ? '' : ' has-logo-corner'}`}>
        {children}

        {/* Logo no topbar — só em páginas que NÃO são o Board */}
        {!isBoard && !isMyActivities && (
          <div className="app-logo-corner">
            <Image
              src="/logo-sia.svg"
              alt="SIA — Governo do Piauí"
              width={120}
              height={36}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
        )}
      </main>

      {showPanel && (
        <RightPanel
          open={panelOpen}
          onToggle={() => setPanelOpen((o) => !o)}
          filterUser={filterUser}
        />
      )}
    </div>
  );
}
