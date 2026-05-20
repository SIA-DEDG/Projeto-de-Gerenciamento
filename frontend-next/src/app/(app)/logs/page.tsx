'use client';

import { useState, useEffect } from 'react';
import { fetchLogs, clearLogs } from '@/lib/api';
import { getUser } from '@/lib/auth';
import type { ActivityLog } from '@/lib/api';

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Criou',
  UPDATE: 'Atualizou',
  DELETE: 'Excluiu',
};

const ENTITY_LABELS: Record<string, string> = {
  task:    'Atividade',
  project: 'Projeto',
  user:    'Usuário',
};

export default function LogsPage() {
  const [logs, setLogs]         = useState<ActivityLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [clearing, setClearing] = useState(false);
  const [filterUser, setFilterUser]     = useState('');
  const [filterEntity, setFilterEntity] = useState('');

  const isAdmin = getUser()?.role === 'Admin';

  function load(): Promise<void> {
    setLoading(true);
    return fetchLogs()
      .then(setLogs)
      .catch((error) => setError(error?.message ?? 'Erro ao carregar logs'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleClearLogs() {
    if (!confirm('Tem certeza que deseja apagar TODOS os logs permanentemente? Esta ação não pode ser desfeita.')) return;
    setClearing(true);
    try {
      await clearLogs();
      await load();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Erro ao limpar logs');
    } finally {
      setClearing(false);
    }
  }

  const uniqueUsers    = [...new Set(logs.map((log) => log.user_name))].sort();
  const uniqueEntities = [...new Set(logs.map((log) => log.entity_type))].sort();

  const filtered = logs.filter((log) => {
    if (filterUser   && log.user_name   !== filterUser)   return false;
    if (filterEntity && log.entity_type !== filterEntity) return false;
    return true;
  });

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <h1>Logs de Atividade</h1>
        </div>
        <div className="topbar-right">
          {isAdmin && (
            <button
              type="button"
              onClick={handleClearLogs}
              disabled={clearing || logs.length === 0}
              style={{
                padding: '7px 16px',
                background: clearing ? '#f0f1f3' : '#ffebe6',
                border: '1px solid #de350b',
                borderRadius: '6px',
                color: '#de350b',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: clearing || logs.length === 0 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                opacity: logs.length === 0 ? 0.5 : 1,
              }}
            >
              {clearing ? 'Limpando…' : 'Limpar todos os logs'}
            </button>
          )}
        </div>
      </header>

      <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
        {error && (
          <div style={{ marginBottom: 16, padding: '10px 16px', background: '#ffebe6', borderRadius: 8, color: '#bf2600', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bf2600', fontWeight: 700, fontSize: '1rem' }}>×</button>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #dfe1e6', fontSize: '0.875rem', fontFamily: 'inherit' }}
          >
            <option value="">Todos os usuários</option>
            {uniqueUsers.map((userName) => <option key={userName} value={userName}>{userName}</option>)}
          </select>
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #dfe1e6', fontSize: '0.875rem', fontFamily: 'inherit' }}
          >
            <option value="">Todos os tipos</option>
            {uniqueEntities.map((entityType) => (
              <option key={entityType} value={entityType}>{ENTITY_LABELS[entityType] ?? entityType}</option>
            ))}
          </select>
          <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading && <p style={{ color: '#6b778c' }}>Carregando…</p>}

        {!loading && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-card)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}>
                  <th style={thStyle}>Data/Hora</th>
                  <th style={thStyle}>Usuário</th>
                  <th style={thStyle}>Ação</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', color: '#6b778c', textAlign: 'center' }}>
                      Nenhum log encontrado.
                    </td>
                  </tr>
                )}
                {filtered.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f0f1f3' }}>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{log.created_at}</td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>{log.user_name}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ ...actionBadge, ...actionColor(log.action) }}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td style={tdStyle}>{ENTITY_LABELS[log.entity_type] ?? log.entity_type}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontWeight: 600,
  color: '#6b778c',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  textAlign: 'left',
};

const tdStyle: React.CSSProperties = {
  padding: '11px 16px',
  color: '#172b4d',
  verticalAlign: 'middle',
};

const actionBadge: React.CSSProperties = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: 12,
  fontSize: '0.75rem',
  fontWeight: 600,
};

function actionColor(action: string): React.CSSProperties {
  if (action === 'CREATE') return { background: '#e3fcef', color: '#006644' };
  if (action === 'DELETE') return { background: '#ffebe6', color: '#bf2600' };
  return { background: '#fffae6', color: '#ff8b00' };
}
