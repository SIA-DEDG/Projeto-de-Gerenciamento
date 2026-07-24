'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  LayoutGrid, User, CalendarDays, CalendarMinus, Folder,
  ChartPie, Logs, Settings, MessageSquareWarning,
  UserRoundPlus, UsersRound, Archive, LogOut, Moon, Sun,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getUser, clearAuth, canManageUsers, isSuperAdmin, hasPermission } from '@/lib/auth';
import { fetchTasks, fetchFeedbacks } from '@/lib/api';
import { onTasksChanged } from '@/lib/taskEvents';
import { useTabs, useActiveTab, PAGE_INFO, type PageType } from '@/context/TabsContext';

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
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
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
    // Conta apenas perguntas/feedbacks ainda pendentes; respondidas saem do badge.
    fetchFeedbacks().then((fb) => setPendingCountFeedback(fb.filter((f) => f.status !== 'respondida').length)).catch(() => null);
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);
  useEffect(() => onTasksChanged(loadPending), [loadPending]);

  useEffect(() => { loadPendingFeedback(); }, [loadPendingFeedback]);
  useEffect(() => onTasksChanged(loadPendingFeedback), [loadPendingFeedback]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  function handleLogout() { clearAuth(); router.replace('/login'); }

  function nav(type: PageType) {
    openTab(type);
    history.replaceState(null, '', PAGE_INFO[type].path);
  }

  function isActiveType(type: PageType) {
    return activeTab?.type === type ? 'sidebar-nav-link active' : 'sidebar-nav-link';
  }

  function NavLink({ type, children, style }: { type: PageType; children: React.ReactNode; style?: React.CSSProperties }) {
    return (
      <button onClick={() => nav(type)} className={isActiveType(type)} style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', ...style }}>
        {children}
      </button>
    );
  }

  const canCreateUsers = canManageUsers(user?.role) && hasPermission(user, 'users.create');
  const canViewUsers = canManageUsers(user?.role) && hasPermission(user, 'users.view');
  const canViewDiretorias = isSuperAdmin(user) && hasPermission(user, 'diretorias.view');
  const isAdmin = canCreateUsers || canViewUsers || canViewDiretorias;
  const isSuperAdminUser = isSuperAdmin(user);

  return (
    <aside
      className="sidebar"
      onMouseEnter={() => setSidebarExpanded(true)}
      onMouseLeave={() => { setSidebarExpanded(false); setMenuOpen(false); }}
    >
      {user && (
        <div style={{ padding: '10px 16px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px',
            borderRadius: 3, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: isSuperAdminUser ? '#f59e0b' : (user.directoria_color ?? '#6b7280'),
            }} />
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500, letterSpacing: '0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isSuperAdminUser ? 'Sistema Global' : (user.directoria_name ?? 'Sem diretoria')}
            </span>
          </div>
        </div>
      )}

      {/* Navegação */}
      <div className="sidebar-nav-area">
        {/* PLANEJAMENTO */}
        <div className="sidebar-group">
          <span className="sidebar-group-label">Planejamento</span>
          <ul className="sidebar-nav">
            <li>
              <NavLink type="board">
                <span className="nav-icon"><LayoutGrid size={17} /></span>
                <span className="rail-label">Atividades</span>
              </NavLink>
            </li>
            <li>
              <NavLink type="minhas-atividades" style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span className="nav-icon"><User size={17} /></span>
                  <span className="rail-label">Minhas atividades</span>
                </span>
                {pendingCount > 0 && (
                  <span className="sidebar-nav-badge rail-label">{pendingCount > 99 ? '99+' : pendingCount}</span>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink type="eventos">
                <span className="nav-icon"><CalendarDays size={17} /></span>
                <span className="rail-label">Eventos</span>
              </NavLink>
            </li>
            <li>
              <NavLink type="faltas">
                <span className="nav-icon"><CalendarMinus size={17} /></span>
                <span className="rail-label">Faltas</span>
              </NavLink>
            </li>
            <li>
              <NavLink type="arquivadas">
                <span className="nav-icon"><Archive size={17} /></span>
                <span className="rail-label">Arquivadas</span>
              </NavLink>
            </li>
          </ul>
        </div>

        <div className="sidebar-divider" />

        {/* ANÁLISE */}
        <div className="sidebar-group">
          <span className="sidebar-group-label">Análise</span>
          <ul className="sidebar-nav">
            <li>
              <NavLink type="dashboards">
                <span className="nav-icon"><ChartPie size={17} /></span>
                <span className="rail-label">Dashboards</span>
              </NavLink>
            </li>
            <li>
              <NavLink type="projetos">
                <span className="nav-icon"><Folder size={17} /></span>
                <span className="rail-label">Projetos</span>
              </NavLink>
            </li>
            <li>
              <NavLink type="logs">
                <span className="nav-icon"><Logs size={17} /></span>
                <span className="rail-label">Logs</span>
              </NavLink>
            </li>
          </ul>
        </div>

        <div className="sidebar-divider" />

        {/* SISTEMA */}
        <div className="sidebar-group">
          <span className="sidebar-group-label">Sistema</span>
          <ul className="sidebar-nav">
            <li>
              <NavLink type="configuracoes">
                <span className="nav-icon"><Settings size={17} /></span>
                <span className="rail-label">Configurações</span>
              </NavLink>
            </li>
            <li>
              <NavLink type="feedback" style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span className="nav-icon"><MessageSquareWarning size={17} /></span>
                  <span className="rail-label">Feedback</span>
                </span>
                {pendingCountFeedback > 0 && (
                  <span className="sidebar-nav-badge rail-label">{pendingCountFeedback > 99 ? '99+' : pendingCountFeedback}</span>
                )}
              </NavLink>
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
                {canCreateUsers && (
                  <li>
                    <NavLink type="admin-registro">
                      <span className="nav-icon"><UserRoundPlus size={17} /></span>
                      <span className="rail-label">Cadastrar usuário</span>
                    </NavLink>
                  </li>
                )}
                {canViewUsers && (
                  <li>
                    <NavLink type="admin-usuarios">
                      <span className="nav-icon"><UsersRound size={17} /></span>
                      <span className="rail-label">Gerenciar usuários</span>
                    </NavLink>
                  </li>
                )}
                {canViewDiretorias && (
                  <li>
                    <NavLink type="admin-diretorias">
                      <span className="nav-icon"><Folder size={17} /></span>
                      <span className="rail-label">Diretorias</span>
                    </NavLink>
                  </li>
                )}
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
          <button className="sidebar-user-btn" onClick={() => sidebarExpanded && setMenuOpen((o) => !o)}>
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info rail-hide">
              <span className="sidebar-user-name">{user?.name ?? 'Usuário'}</span>
              <span className="sidebar-user-role">{ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? ''}</span>
            </div>
          </button>

          {menuOpen && (
            <div className="sidebar-user-menu">
              <button onClick={() => { nav('configuracoes'); setMenuOpen(false); }} className="sidebar-user-menu-item" style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
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
