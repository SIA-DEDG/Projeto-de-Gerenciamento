'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  LayoutGrid, User, CalendarDays, CalendarMinus, Folder,
  ChartPie, Logs, Settings, MessageSquareWarning,
  UserRoundPlus, UsersRound, Archive, LogOut, Moon, Sun,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getUser, clearAuth, canManageUsers } from '@/lib/auth';
import { fetchTasks, fetchFeedbacks } from '@/lib/api';
import { onTasksChanged } from '@/lib/taskEvents';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import { useTabs, useActiveTab, type PageType } from '@/context/TabsContext';
import Link from 'next/link';

const ROLE_LABELS: Record<string, string> = {
  Estagiario: 'ESTAGIÁRIO(A)',
  Funcionario: 'FUNCIONÁRIO(A)',
  Tecnico: 'TÉCNICO(A)',
  Coordenador: 'COORDENADOR(A)',
  Gerente: 'GERENTE',
  Diretor: 'DIRETOR(A)',
  Admin: 'ADMIN',
};

interface Props {
  onToggleTheme: () => void;
  isDark: boolean;
}

export default function Sidebar({ onToggleTheme, isDark }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingCountFeedback, setPendingCountFeedback] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const { openTab } = useTabs();
  const activeTab = useActiveTab();

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
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  function handleLogout() { clearAuth(); router.replace('/login'); }

  // Navigate via tab system
  function nav(type: PageType) {
    openTab(type);
  }

  function isActiveType(type: PageType) {
    return activeTab?.type === type ? 'sidebar-nav-link active' : 'sidebar-nav-link';
  }

  const isAdmin = canManageUsers(user?.role);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">★</div>
        <div className="rail-hide" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span className="sidebar-logo-name">Tasks SIA</span>
          <span className="sidebar-logo-sub">DEDG · GOV-PI</span>
        </div>
      </div>

      {/* Navegação */}
      <div className="sidebar-nav-area">
        {/* PLANEJAMENTO */}
        <div className="sidebar-group">
          <span className="sidebar-group-label">Planejamento</span>
          <ul className="sidebar-nav">
            <li>
              <button onClick={() => nav('board')} className={isActiveType('board')}>
                <span className="nav-icon"><LayoutGrid size={17} /></span>
                <span className="rail-label">Atividades</span>
              </button>
            </li>
            <li>
              <button onClick={() => nav('minhas-atividades')} className={isActiveType('minhas-atividades')} style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span className="nav-icon"><User size={17} /></span>
                  <span className="rail-label">Minhas atividades</span>
                </span>
                {pendingCount > 0 && (
                  <span className="sidebar-nav-badge rail-label">{pendingCount > 99 ? '99+' : pendingCount}</span>
                )}
              </button>
            </li>
            <li>
              <button onClick={() => nav('eventos')} className={isActiveType('eventos')}>
                <span className="nav-icon"><CalendarDays size={17} /></span>
                <span className="rail-label">Eventos</span>
              </button>
            </li>
            <li>
              <button onClick={() => nav('faltas')} className={isActiveType('faltas')}>
                <span className="nav-icon"><CalendarMinus size={17} /></span>
                <span className="rail-label">Faltas</span>
              </button>
            </li>
            <li>
              <button onClick={() => nav('arquivadas')} className={isActiveType('arquivadas')}>
                <span className="nav-icon"><Archive size={17} /></span>
                <span className="rail-label">Arquivadas</span>
              </button>
            </li>
          </ul>
        </div>

        <div className="sidebar-divider" />

        {/* ANÁLISE */}
        <div className="sidebar-group">
          <span className="sidebar-group-label">Análise</span>
          <ul className="sidebar-nav">
            <li>
              <button onClick={() => nav('dashboards')} className={isActiveType('dashboards')}>
                <span className="nav-icon"><ChartPie size={17} /></span>
                <span className="rail-label">Dashboards</span>
              </button>
            </li>
            <li>
              <button onClick={() => nav('projetos')} className={isActiveType('projetos')}>
                <span className="nav-icon"><Folder size={17} /></span>
                <span className="rail-label">Projetos</span>
              </button>
            </li>
            <li>
              <button onClick={() => nav('logs')} className={isActiveType('logs')}>
                <span className="nav-icon"><Logs size={17} /></span>
                <span className="rail-label">Logs</span>
              </button>
            </li>
          </ul>
        </div>

        <div className="sidebar-divider" />

        {/* SISTEMA */}
        <div className="sidebar-group">
          <span className="sidebar-group-label">Sistema</span>
          <ul className="sidebar-nav">
            <li>
              <button onClick={() => nav('configuracoes')} className={isActiveType('configuracoes')}>
                <span className="nav-icon"><Settings size={17} /></span>
                <span className="rail-label">Configurações</span>
              </button>
            </li>
            <li>
              <button onClick={() => nav('feedback')} className={isActiveType('feedback')} style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span className="nav-icon"><MessageSquareWarning size={17} /></span>
                  <span className="rail-label">Feedback</span>
                </span>
                {pendingCountFeedback > 0 && (
                  <span className="sidebar-nav-badge rail-label">{pendingCountFeedback > 99 ? '99+' : pendingCountFeedback}</span>
                )}
              </button>
            </li>
          </ul>
        </div>

        {/* ADMIN — condicional */}
        {isAdmin && (
          <>
            <div className="sidebar-divider" />
            <div className="sidebar-group">
              <span className="sidebar-group-label">Admin</span>
              <ul className="sidebar-nav">
                <li>
                  <button onClick={() => nav('admin-registro')} className={isActiveType('admin-registro')}>
                    <span className="nav-icon"><UserRoundPlus size={17} /></span>
                    <span className="rail-label">Cadastrar usuário</span>
                  </button>
                </li>
                <li>
                  <button onClick={() => nav('admin-usuarios')} className={isActiveType('admin-usuarios')}>
                    <span className="nav-icon"><UsersRound size={17} /></span>
                    <span className="rail-label">Gerenciar usuários</span>
                  </button>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Rodapé */}
      <div className="sidebar-footer">
        {/* Botão alternar tema */}
        <button className="sidebar-theme-btn" onClick={onToggleTheme}>
          <span className="nav-icon">
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </span>
          <span className="rail-label">{isDark ? 'Tema claro' : 'Tema escuro'}</span>
        </button>

        {/* Usuário */}
        <div className="sidebar-user-wrap" ref={menuRef}>
          <button className="sidebar-user-btn" onClick={() => setMenuOpen((o) => !o)}>
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info rail-hide">
              <span className="sidebar-user-name">{user?.name ?? 'Usuário'}</span>
              <span className="sidebar-user-role">{ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? ''}</span>
            </div>
          </button>

          {menuOpen && (
            <div className="sidebar-user-menu">
              <button className="sidebar-user-menu-item" onClick={() => { nav('configuracoes'); setMenuOpen(false); }}>
                <Settings size={14} />
                Configurações
              </button>
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
