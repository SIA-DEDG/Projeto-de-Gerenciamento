'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getUser, clearAuth, canManageUsers } from '@/lib/auth';

const ROLE_LABELS: Record<string, string> = {
  Estagiario:  'Estagiário(a)',
  Funcionario: 'Funcionário(a)',
  Tecnico:     'Técnico(a)',
  Coordenador: 'Coordenador(a)',
  Gerente:     'Gerente',
  Diretor:     'Diretor(a)',
  Admin:       'Administrador(a)',
};
import { fetchTasks } from '@/lib/api';
import { onTasksChanged } from '@/lib/taskEvents';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'VY';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => { setUser(getUser()); }, []);

  const loadPending = useCallback(() => {
    const currentUser = getUser();
    if (!currentUser) return;
    fetchTasks().then((tasks) => {
      const mine = tasks.filter((task) => {
        if (task.status_group == 'done') return false;
        if (task.responsible === currentUser.name) return true;
        try {
          const coResponsibles: string[] = task.co_responsibles ? JSON.parse(task.co_responsibles) : [];
          return coResponsibles.includes(currentUser.name);
        } catch { return false; }
      });
      setPendingCount(mine.length);
    }).catch(() => null);
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);
  useRefetchOnFocus(loadPending);
  useEffect(() => onTasksChanged(loadPending), [loadPending]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  function handleLogout() {
    clearAuth();
    router.replace('/login');
  }

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-icon">TS</div>
        <div className="logo-text">
          <span className="logo-title">Tasks SIA</span>
          <span className="logo-subtitle">Atividades e Projetos</span>
        </div>
      </div>

      <div className="sidebar-divider" />

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
      <div className="sidebar-section">
        <div className="sidebar-section-title">Planejamento</div>
        <ul className="nav">
          <li className={pathname === '/' ? 'active' : ''}>
            <Link href="/" className="nav-link">
              <span className="nav-icon">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </span>
              Atividades
            </Link>
          </li>
          <li className={pathname === '/minhas-atividades' ? 'active' : ''}>
            <Link href="/minhas-atividades" className="nav-link" style={{ justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 'inherit' }}>
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                Minhas Atividades
              </span>
              {pendingCount > 0 && (
                <span style={{ background: '#ef4123', color: '#fff', fontSize: '0.65rem', fontWeight: 700, borderRadius: 20, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0, lineHeight: 1 }}>
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </Link>
          </li>
          <li className={pathname === '/faltas' ? 'active' : ''}>
            <Link href="/faltas" className="nav-link">
              <span className="nav-icon">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <line x1="9" y1="15" x2="9" y2="15" strokeWidth="3" strokeLinecap="round" />
                  <line x1="15" y1="15" x2="15" y2="15" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
              Faltas
            </Link>
          </li>
          <li className={pathname === '/eventos' ? 'active' : ''}>
            <Link href="/eventos" className="nav-link">
              <span className="nav-icon">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="M8 14h.01" strokeWidth="3" strokeLinecap="round" />
                  <path d="M12 14h.01" strokeWidth="3" strokeLinecap="round" />
                  <path d="M16 14h.01" strokeWidth="3" strokeLinecap="round" />
                  <path d="M8 18h.01" strokeWidth="3" strokeLinecap="round" />
                  <path d="M12 18h.01" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
              Eventos
            </Link>
          </li>
          <li className={pathname === '/dashboards' ? 'active' : ''}>
            <Link href="/dashboards" className="nav-link">
              <span className="nav-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M18 20V10" />
                  <path d="M12 20V4" />
                  <path d="M6 20v-6" />
                </svg>
              </span>
              Dashboards
            </Link>
          </li>
          <li className={pathname === '/projetos' ? 'active' : ''}>
            <Link href="/projetos" className="nav-link">
              <span className="nav-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </span>
              Projetos
            </Link>
          </li>
          <li className={pathname === '/logs' ? 'active' : ''}>
            <Link href="/logs" className="nav-link">
              <span className="nav-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <line x1="8" y1="10" x2="16" y2="10" />
                  <line x1="8" y1="14" x2="16" y2="14" />
                  <line x1="8" y1="18" x2="12" y2="18" />
                </svg>
              </span>
              Logs
            </Link>
          </li>
        </ul>
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-section">
        <div className="sidebar-section-title">Configuração</div>
        <ul className="nav">
          <li className={pathname === '/configuracoes' ? 'active' : ''}>
            <Link href="/configuracoes" className="nav-link">
              <span className="nav-icon">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </span>
              Configurações
            </Link>
          </li>
          {canManageUsers(user?.role) && (
            <li className={pathname === '/admin/registro' ? 'active' : ''}>
              <Link href="/admin/registro" className="nav-link">
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                </span>
                Cadastrar usuário
              </Link>
            </li>
          )}
          {canManageUsers(user?.role) && (
            <li className={pathname === '/admin/usuarios' ? 'active' : ''}>
              <Link href="/admin/usuarios" className="nav-link">
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                Gerenciar usuários
              </Link>
            </li>
          )}
        </ul>
      </div>
      </div>{/* fim container scrollable */}

      <div className="sidebar-footer">
        <div className="sidebar-user" style={{ position: 'relative' }} ref={menuRef}>
          <button
            className="sidebar-user-btn"
            onClick={() => setMenuOpen((isOpen) => !isOpen)}
            title="Conta"
          >
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name ?? 'Usuário'}</span>
              <span className="sidebar-user-role">{ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? ''}</span>
            </div>
          </button>

          {menuOpen && (
            <div className="sidebar-account-menu">
              <Link
                href="/configuracoes"
                className="sidebar-account-item"
                onClick={() => setMenuOpen(false)}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" style={{ marginRight: 8, stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.18V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Configurações
              </Link>
              <button className="sidebar-account-item sidebar-account-logout" onClick={handleLogout}>
                <svg viewBox="0 0 24 24" width="14" height="14" style={{ marginRight: 8 }}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
