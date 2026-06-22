'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LayoutGrid, User, Logs, CalendarDays, CalendarMinus, Folder, ChartPie, Settings, MessageSquareWarning, UserRoundPlus, UsersRound, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { getUser, clearAuth, canManageUsers } from '@/lib/auth';

const ROLE_LABELS: Record<string, string> = {
  Estagiario: 'Estagiário(a)',
  Funcionario: 'Funcionário(a)',
  Tecnico: 'Técnico(a)',
  Coordenador: 'Coordenador(a)',
  Gerente: 'Gerente',
  Diretor: 'Diretor(a)',
  Admin: 'Administrador(a)',
};
import { fetchTasks, fetchFeedbacks } from '@/lib/api';
import { onTasksChanged } from '@/lib/taskEvents';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'VY';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingCountFeedback, setPendingCountFeedback] = useState(0);

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

  const loadPendingfeedback = useCallback(() => {

    fetchFeedbacks().then((feedback) => {
      setPendingCountFeedback(feedback.length);
    }).catch(() => null);
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);
  useRefetchOnFocus(loadPending);
  useEffect(() => onTasksChanged(loadPending), [loadPending]);

  useEffect(() => { loadPendingfeedback(); }, [loadPendingfeedback]);
  useRefetchOnFocus(loadPendingfeedback);
  useEffect(() => onTasksChanged(loadPendingfeedback), [loadPendingfeedback]);

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

      <div className="sidebar-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <div className="sidebar-section">
          <div className="sidebar-section-title">Planejamento</div>
          <ul className="nav">
            <li className={pathname === '/' ? 'active' : ''}>
              <Link href="/" className="nav-link">
                <span className="nav-icon">
                  <LayoutGrid size={18} />
                </span>
                Atividades
              </Link>
            </li>
            <li className={pathname === '/minhas-atividades' ? 'active' : ''}>
              <Link href="/minhas-atividades" className="nav-link" style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 'inherit' }}>
                  <span className="nav-icon">
                    <User size={18} />
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
                  <CalendarMinus size={18} />
                </span>
                Faltas
              </Link>
            </li>
            <li className={pathname === '/eventos' ? 'active' : ''}>
              <Link href="/eventos" className="nav-link">
                <span className="nav-icon">
                  <CalendarDays size={18} />
                </span>
                Eventos
              </Link>
            </li>
            <li className={pathname === '/dashboards' ? 'active' : ''}>
              <Link href="/dashboards" className="nav-link">
                <ChartPie size={18} />
                Dashboards
              </Link>
            </li>
            <li className={pathname === '/projetos' ? 'active' : ''}>
              <Link href="/projetos" className="nav-link">
                <span className="nav-icon">
                  <Folder size={18} />
                </span>
                Projetos
              </Link>
            </li>
            <li className={pathname === '/logs' ? 'active' : ''}>
              <Link href="/logs" className="nav-link">
                <span className="nav-icon">
                  <Logs size={18} />
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
                  <Settings size={18} />
                </span>
                Configurações
              </Link>
            </li>
            <li className={pathname === '/feedback' ? 'active' : ''}>
              <Link href="/feedback" className="nav-link">
                <span className="nav-icon">
                  <MessageSquareWarning size={18} />
                </span>
                Relatar Feedback
                {pendingCountFeedback > 0 && (
                  <span style={{ background: '#ef4123', color: '#fff', fontSize: '0.65rem', fontWeight: 700, borderRadius: 20, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0, lineHeight: 1 }}>
                    {pendingCountFeedback > 99 ? '99+' : pendingCountFeedback}
                  </span>
                )}
              </Link>
            </li>
            {canManageUsers(user?.role) && (
              <li className={pathname === '/admin/registro' ? 'active' : ''}>
                <Link href="/admin/registro" className="nav-link">
                  <span className="nav-icon">
                    <UserRoundPlus size={18} />
                  </span>
                  Cadastrar usuário
                </Link>
              </li>
            )}
            {canManageUsers(user?.role) && (
              <li className={pathname === '/admin/usuarios' ? 'active' : ''}>
                <Link href="/admin/usuarios" className="nav-link">
                  <span className="nav-icon">
                    <UsersRound size={18} />
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
                <Settings size={14} style={{ marginRight: 8 }} />
                Configurações
              </Link>
              <button className="sidebar-account-item sidebar-account-logout" onClick={handleLogout}>
                <LogOut size={14} style={{ marginRight: 8 }} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
