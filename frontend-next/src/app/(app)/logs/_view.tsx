'use client';

import { useState, useEffect, useMemo } from 'react';
import { fetchLogs, clearLogs } from '@/lib/api';
import { getUser } from '@/lib/auth';
import type { ActivityLog } from '@/lib/api';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import { Trash2, Search, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Criou',
  UPDATE: 'Editou',
  DELETE: 'Excluiu',
};

const ACTION_COLORS: Record<string, string> = {
  CREATE:    'var(--blue)',
  UPDATE:    'var(--blue)',
  DELETE:    '#b42318',
  absences:  '#A87A00',
  completed: '#1B8A4B',
};

const ENTITY_LABELS: Record<string, string> = {
  task:    'Atividade',
  project: 'Projeto',
  user:    'Usuário',
  absence: 'Falta',
  event:   'Evento',
};

const PAGE_SIZE = 25;

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    const parts = iso.split(' ');
    return { date: parts[0] ?? iso, time: parts[1] ?? '' };
  }
  return {
    date: d.toLocaleDateString('pt-BR'),
    time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}

function UserAvatar({ name }: { name: string }) {
  const inits = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const colors = ['var(--blue)', '#1b8a4b', '#9333ea', '#b42318', '#0369a1', '#be185d'];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  const color = colors[Math.abs(h) % colors.length];
  return (
    <div style={{
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: color,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--mono)',
      fontSize: '0.62rem',
      fontWeight: 600,
      flexShrink: 0,
    }}>
      {inits}
    </div>
  );
}

function actionColor(action: string): string {
  return ACTION_COLORS[action] ?? 'var(--text-3)';
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export default function LogsPage() {
  const [logs, setLogs]           = useState<ActivityLog[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [clearing, setClearing]   = useState(false);
  const [filterUser, setFilterUser]     = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [confirmClear, setConfirmClear] = useState(false);

  const isAdmin = getUser()?.role === 'Admin';
  const { toasts, addToast, dismissToast } = useToast();

  function load() {
    setLoading(true);
    return fetchLogs()
      .then(setLogs)
      .catch((e) => setError(e?.message ?? 'Erro ao carregar logs'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function executeClearLogs() {
    setClearing(true);
    try {
      await clearLogs();
      await load();
      addToast('success', 'Logs limpos', 'Todos os registros foram apagados.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao limpar logs');
    } finally {
      setClearing(false);
    }
  }

  const uniqueUsers    = useMemo(() => [...new Set(logs.map(l => l.user_name))].sort(), [logs]);
  const uniqueEntities = useMemo(() => [...new Set(logs.map(l => l.entity_type))].sort(), [logs]);
  const uniqueActions  = useMemo(() => [...new Set(logs.map(l => l.action))].sort(), [logs]);

  const filtered = useMemo(() => logs.filter(log => {
    if (filterUser   && log.user_name   !== filterUser)   return false;
    if (filterEntity && log.entity_type !== filterEntity) return false;
    if (filterAction && log.action      !== filterAction) return false;
    if (search && !log.details?.toLowerCase().includes(search.toLowerCase()) &&
        !log.user_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [logs, filterUser, filterEntity, filterAction, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function changeFilter(fn: () => void) { fn(); setPage(1); }

  const activeFilters = [filterUser, filterEntity, filterAction, search].filter(Boolean).length;

  return (
    <>
      <PageHeader
        eyebrow="Auditoria do sistema"
        title="Logs"
        right={isAdmin ? (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            disabled={clearing || logs.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(180,35,24,0.06)', border: '1px solid rgba(180,35,24,0.2)', borderRadius: 3, color: '#b42318', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit', cursor: clearing || logs.length === 0 ? 'not-allowed' : 'pointer', opacity: logs.length === 0 ? 0.5 : 1, flexShrink: 0 }}
          >
            <Trash2 size={12} />
            {clearing ? 'Limpando…' : 'Limpar logs'}
          </button>
        ) : undefined}
      />

      {/* Body */}
      <div style={{ padding: '0 32px 32px', overflowY: 'auto', flex: 1, minHeight: 0 }}>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            background: 'rgba(180,35,24,0.06)',
            border: '1px solid rgba(180,35,24,0.18)',
            borderRadius: 3,
            color: '#b42318',
            fontSize: '0.82rem',
            marginTop: 16,
          }}>
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b42318', fontWeight: 700, fontSize: '1rem', lineHeight: 1, fontFamily: 'inherit' }}
            >
              ×
            </button>
          </div>
        )}

        {/* Filtros */}
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '16px 0',
        }}>
          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 3,
            padding: '6px 12px',
            minWidth: 200,
            flex: 1,
          }}>
            <Search size={13} color="var(--text-3)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={e => changeFilter(() => setSearch(e.target.value))}
              placeholder="Buscar usuário ou detalhes…"
              style={{
                border: 'none',
                outline: 'none',
                background: 'none',
                fontSize: '0.82rem',
                color: 'var(--text)',
                width: '100%',
                fontFamily: 'inherit',
              }}
            />
            {search && (
              <button
                onClick={() => changeFilter(() => setSearch(''))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', lineHeight: 1, padding: 0, fontFamily: 'inherit' }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filtro usuário */}
          <div style={{ position: 'relative' }}>
            <select
              value={filterUser}
              onChange={e => changeFilter(() => setFilterUser(e.target.value))}
              className="filter-chip"
              style={{ color: filterUser ? 'var(--blue)' : undefined, borderColor: filterUser ? 'var(--blue)' : undefined }}
            >
              <option value="">Todos os usuários</option>
              {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {/* Filtro tipo */}
          <div style={{ position: 'relative' }}>
            <select
              value={filterEntity}
              onChange={e => changeFilter(() => setFilterEntity(e.target.value))}
              className="filter-chip"
              style={{ color: filterEntity ? 'var(--blue)' : undefined, borderColor: filterEntity ? 'var(--blue)' : undefined }}
            >
              <option value="">Todos os tipos</option>
              {uniqueEntities.map(e => <option key={e} value={e}>{ENTITY_LABELS[e] ?? e}</option>)}
            </select>
          </div>

          {/* Filtro ação */}
          <div style={{ position: 'relative' }}>
            <select
              value={filterAction}
              onChange={e => changeFilter(() => setFilterAction(e.target.value))}
              className="filter-chip"
              style={{ color: filterAction ? 'var(--blue)' : undefined, borderColor: filterAction ? 'var(--blue)' : undefined }}
            >
              <option value="">Todas as ações</option>
              {uniqueActions.map(a => <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>)}
            </select>
          </div>

          {activeFilters > 0 && (
            <button
              className="filter-clear-btn"
              onClick={() => changeFilter(() => { setFilterUser(''); setFilterEntity(''); setFilterAction(''); setSearch(''); })}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <X size={11} />
              Limpar filtros
            </button>
          )}

          <span className="mono" style={{
            marginLeft: 'auto',
            fontSize: '0.65rem',
            color: 'var(--text-3)',
            whiteSpace: 'nowrap',
            letterSpacing: '0.5px',
          }}>
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Log feed */}
        {loading ? (
          <div className="loading-state">Carregando…</div>
        ) : pageItems.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum log encontrado.</p>
          </div>
        ) : (
          <div>
            {pageItems.map((log) => {
              const { date, time } = formatDateTime(log.created_at);
              const aColor = actionColor(log.action);
              const aLabel = actionLabel(log.action);

              return (
                <div
                  key={log.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '88px 1fr 120px',
                    gap: 20,
                    padding: '14px 0',
                    borderBottom: '1px solid var(--line-2)',
                    alignItems: 'center',
                  }}
                >
                  {/* Col 1 — tempo */}
                  <div>
                    <div className="mono" style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text)' }}>
                      {time}
                    </div>
                    <div className="mono" style={{
                      fontSize: '0.6rem',
                      color: 'var(--text-3)',
                      letterSpacing: '0.5px',
                      marginTop: 1,
                    }}>
                      {date}
                    </div>
                  </div>

                  {/* Col 2 — conteúdo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <UserAvatar name={log.user_name} />
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{log.user_name}</strong>
                      {' '}
                      {aLabel.toLowerCase()}
                      {log.details && (
                        <>
                          {' '}
                          <span style={{ color: 'var(--blue)', fontWeight: 500 }}>
                            {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                          </span>
                          {' — '}
                          {log.details}
                        </>
                      )}
                    </span>
                  </div>

                  {/* Col 3 — tipo */}
                  <div style={{ justifySelf: 'end', textAlign: 'right' }}>
                    <span className="mono" style={{
                      fontSize: '0.66rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: aColor,
                      whiteSpace: 'nowrap',
                    }}>
                      {aLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(1)} disabled={safePage === 1}>«</button>
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 7) p = i + 1;
              else if (safePage <= 4) p = i + 1;
              else if (safePage >= totalPages - 3) p = totalPages - 6 + i;
              else p = safePage - 3 + i;
              return (
                <button
                  key={p}
                  className={`page-btn${p === safePage ? ' active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            })}
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
            <button className="page-btn" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>»</button>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmClear}
        title="Limpar todos os logs"
        message="Todos os registros serão apagados permanentemente. Esta ação não pode ser desfeita."
        confirmLabel="Limpar"
        danger
        onConfirm={executeClearLogs}
        onClose={() => setConfirmClear(false)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

