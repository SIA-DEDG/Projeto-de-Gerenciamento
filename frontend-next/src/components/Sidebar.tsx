'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  LayoutGrid, User, CalendarDays, CalendarMinus, Folder,
  ChartPie, Logs, Settings, MessageSquareWarning,
  UserRoundPlus, UsersRound, LogOut, Sun, Moon, Users,
  Archive,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { getUser, clearAuth, canManageUsers } from '@/lib/auth';
import { fetchTasks, fetchFeedbacks } from '@/lib/api';
import { onTasksChanged } from '@/lib/taskEvents';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';

const ROLE_LABELS: Record<string, string> = {
  Estagiario: 'Estagiário(a)',
  Funcionario: 'Funcionário(a)',
  Tecnico: 'Técnico(a)',
  Coordenador: 'Coordenador(a)',
  Gerente: 'Gerente',
  Diretor: 'Diretor(a)',
  Admin: 'Administrador(a)',
};

interface Props {
  onToggleTheme: () => void;
  isDark: boolean;
}

export default function Sidebar({ onToggleTheme, isDark }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingCountFeedback, setPendingCountFeedback] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'SIA';

  useEffect(() => { setUser(getUser()); }, []);

  const loadPending = useCallback(() => {
    const currentUser = getUser();
    if (!currentUser) return;
    fetchTasks().then((tasks) => {
      const mine = tasks.filter((t) => {
        if (t.status_group === 'done') return false;
        if (t.responsible === currentUser.name) return true;
        try {
          const co: string[] = t.co_responsibles ? JSON.parse(t.co_responsibles) : [];
          return co.includes(currentUser.name);
        } catch { return false; }
      });
      setPendingCount(mine.length);
    }).catch(() => null);
  }, []);

  const loadPendingFeedback = useCallback(() => {
    fetchFeedbacks().then((fb) => setPendingCountFeedback(fb.length)).catch(() => null);
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);
  useRefetchOnFocus(loadPending);
  useEffect(() => onTasksChanged(loadPending), [loadPending]);

  useEffect(() => { loadPendingFeedback(); }, [loadPendingFeedback]);
  useRefetchOnFocus(loadPendingFeedback);
  useEffect(() => onTasksChanged(loadPendingFeedback), [loadPendingFeedback]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  function handleLogout() {
    clearAuth();
    router.replace('/login');
  }

  function isActive(path: string) {
    return pathname === path ? 'sidebar-nav-link active' : 'sidebar-nav-link';
  }

  const isAdmin = canManageUsers(user?.role);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">TS</div>
        <div>
          <div className="sidebar-logo-name">Tasks SIA</div>
          <div className="sidebar-logo-sub">DEDG · GOV-PI</div>
        </div>
      </div>

      {/* Navegação */}
      <div className="sidebar-nav-area">
        {/* PLANEJAMENTO */}
        <div className="sidebar-group">
          <span className="sidebar-group-label">Planejamento</span>
          <ul className="sidebar-nav">
            <li>
              <Link href="/" className={isActive('/')}>
                <span className="nav-icon"><LayoutGrid size={16} /></span>
                Atividades
              </Link>
            </li>
            <li>
              <Link href="/minhas-atividades" className={isActive('/minhas-atividades')} style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span className="nav-icon"><User size={16} /></span>
                  Minhas Atividades
                </span>
                {pendingCount > 0 && (
                  <span className="sidebar-nav-badge">{pendingCount > 99 ? '99+' : pendingCount}</span>
                )}
              </Link>
            </li>
            <li>
              <Link href="/eventos" className={isActive('/eventos')}>
                <span className="nav-icon"><CalendarDays size={16} /></span>
                Eventos
              </Link>
            </li>
            <li>
              <Link href="/faltas" className={isActive('/faltas')}>
                <span className="nav-icon"><CalendarMinus size={16} /></span>
                Faltas
              </Link>
            </li>
          </ul>
        </div>

        <div className="sidebar-divider" />

        {/* ANÁLISE */}
        <div className="sidebar-group">
          <span className="sidebar-group-label">Análise</span>
          <ul className="sidebar-nav">
            <li>
              <Link href="/dashboards" className={isActive('/dashboards')}>
                <span className="nav-icon"><ChartPie size={16} /></span>
                Dashboards
              </Link>
            </li>
            <li>
              <Link href="/projetos" className={isActive('/projetos')}>
                <span className="nav-icon"><Folder size={16} /></span>
                Projetos
              </Link>
            </li>
            <li>
              <Link href="/logs" className={isActive('/logs')}>
                <span className="nav-icon"><Logs size={16} /></span>
                Logs
              </Link>
            </li>
          </ul>
        </div>

        <div className="sidebar-divider" />

        {/* SISTEMA */}
        <div className="sidebar-group">
          <span className="sidebar-group-label">Sistema</span>
          <ul className="sidebar-nav">
            <li>
              <Link href="/configuracoes" className={isActive('/configuracoes')}>
                <span className="nav-icon"><Settings size={16} /></span>
                Configurações
              </Link>
            </li>
            <li>
              <Link href="/feedback" className={isActive('/feedback')} style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span className="nav-icon"><MessageSquareWarning size={16} /></span>
                  Feedback
                </span>
                {pendingCountFeedback > 0 && (
                  <span className="sidebar-nav-badge">{pendingCountFeedback > 99 ? '99+' : pendingCountFeedback}</span>
                )}
              </Link>
            </li>
            <li>
              <Link href="/arquivadas" className={isActive('/arquivadas')}>
                <span className="nav-icon"><Archive size={16} /></span>
                Arquivadas
              </Link>
            </li>
            <li>
              <Link href="/equipe" className={isActive('/equipe')}>
                <span className="nav-icon"><Users size={16} /></span>
                Equipe
              </Link>
            </li>
            {isAdmin && (
              <li>
                <Link href="/admin/registro" className={pathname.startsWith('/admin') ? 'sidebar-nav-link active' : 'sidebar-nav-link'}>
                  <span className="nav-icon"><UserRoundPlus size={16} /></span>
                  Cadastrar usuário
                </Link>
              </li>
            )}
            {isAdmin && (
              <li>
                <Link href="/admin/usuarios" className={isActive('/admin/usuarios')}>
                  <span className="nav-icon"><UsersRound size={16} /></span>
                  Gerenciar usuários
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Rodapé */}
      <div className="sidebar-footer">
        <button className="sidebar-theme-btn" onClick={onToggleTheme}>
          <span className="nav-icon">
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </span>
          {isDark ? 'Tema claro' : 'Tema escuro'}
        </button>

        <div className="sidebar-user-wrap" ref={menuRef}>
          <button className="sidebar-user-btn" onClick={() => setMenuOpen((o) => !o)}>
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name ?? 'Usuário'}</span>
              <span className="sidebar-user-role">{ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? ''}</span>
            </div>
          </button>

          {menuOpen && (
            <div className="sidebar-user-menu">
              <Link
                href="/configuracoes"
                className="sidebar-user-menu-item"
                onClick={() => setMenuOpen(false)}
              >
                <Settings size={14} />
                Configurações
              </Link>
              <button className="sidebar-user-menu-item danger" onClick={handleLogout}>
                <LogOut size={14} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
