'use client';

import { useState, useEffect, useMemo } from 'react';
import { fetchLogs, clearLogs } from '@/lib/api';
import { getUser } from '@/lib/auth';
import type { ActivityLog } from '@/lib/api';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';

const ACTION_LABELS: Record<string, string> = { CREATE: 'Criou', UPDATE: 'Atualizou', DELETE: 'Excluiu' };
const ENTITY_LABELS: Record<string, string> = { task: 'Atividade', project: 'Projeto', user: 'Usuário', absence: 'Falta', event: 'Evento' };
const PAGE_SIZE = 20;

const ACTION_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  CREATE: { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
  UPDATE: { bg: '#fef9c3', color: '#92400e', dot: '#eab308' },
  DELETE: { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' },
};

const ENTITY_STYLE: Record<string, { bg: string; color: string }> = {
  task:    { bg: '#dbeafe', color: '#1d4ed8' },
  project: { bg: '#f3e8ff', color: '#7c3aed' },
  user:    { bg: '#e0f2fe', color: '#0369a1' },
  absence: { bg: '#fee2e2', color: '#b91c1c' },
  event:   { bg: '#dcfce7', color: '#15803d' },
};

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
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const colors = ['#034ea2','#15803d','#9333ea','#b91c1c','#0369a1','#be185d'];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  const color = colors[Math.abs(h) % colors.length];
  return (
    <div style={{ width: 30, height: 30, borderRadius: '50%', background: color + '18', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.68rem', flexShrink: 0 }}>
      {initials}
    </div>
  );
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
  const [selectedLog, setSelectedLog]   = useState<ActivityLog | null>(null);

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
      await clearLogs(); await load();
      addToast('success', 'Logs limpos', 'Todos os registros foram apagados.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao limpar logs');
    } finally { setClearing(false); }
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
      <header className="topbar">
        <div className="topbar-left"><h1>Logs de Atividade</h1></div>
        <div className="topbar-right">
          {isAdmin && (
            <button type="button" onClick={() => setConfirmClear(true)}
              disabled={clearing || logs.length === 0}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', background:'#fff5f5', border:'1px solid #fecaca', borderRadius:8, color:'#dc2626', fontSize:'0.82rem', fontWeight:700, cursor: clearing || logs.length === 0 ? 'not-allowed' : 'pointer', opacity: logs.length === 0 ? 0.5 : 1, fontFamily:'inherit' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              {clearing ? 'Limpando…' : 'Limpar logs'}
            </button>
          )}
        </div>
      </header>

      <div style={{ padding:'24px 28px', overflowY:'auto', flex:1, minHeight:0, display:'flex', flexDirection:'column', gap:16 }}>
        {error && (
          <div style={{ padding:'10px 16px', background:'#fee2e2', borderRadius:8, color:'#b91c1c', fontSize:'0.88rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#b91c1c', fontWeight:700, fontSize:'1rem' }}>×</button>
          </div>
        )}

        {/* Filters bar */}
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid var(--border-light)', padding:'14px 16px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', boxShadow:'0 1px 4px rgba(3,78,162,0.05)' }}>
          {/* Search */}
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg-app)', border:'1px solid var(--border-light)', borderRadius:8, padding:'6px 12px', minWidth:220, flex:1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={search} onChange={e => changeFilter(() => setSearch(e.target.value))}
              placeholder="Buscar usuário ou detalhes..."
              style={{ border:'none', outline:'none', background:'none', fontSize:'0.85rem', color:'var(--text-primary)', width:'100%', fontFamily:'inherit' }} />
            {search && <button onClick={() => changeFilter(() => setSearch(''))} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', lineHeight:1, padding:0, fontSize:'1rem' }}>×</button>}
          </div>

          {/* Select — Usuário */}
          <div style={{ position:'relative' }}>
            <select value={filterUser} onChange={e => changeFilter(() => setFilterUser(e.target.value))}
              style={{ appearance:'none', background: filterUser ? 'var(--primary-light)' : 'var(--bg-app)', border:`1px solid ${filterUser ? 'var(--primary)' : 'var(--border-light)'}`, borderRadius:8, padding:'6px 32px 6px 10px', fontSize:'0.83rem', fontFamily:'inherit', color: filterUser ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: filterUser ? 600 : 400, cursor:'pointer', outline:'none' }}>
              <option value="">Todos os usuários</option>
              {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color: filterUser ? 'var(--primary)' : 'var(--text-muted)' }}><polyline points="6 9 12 15 18 9"/></svg>
          </div>

          {/* Select — Tipo */}
          <div style={{ position:'relative' }}>
            <select value={filterEntity} onChange={e => changeFilter(() => setFilterEntity(e.target.value))}
              style={{ appearance:'none', background: filterEntity ? 'var(--primary-light)' : 'var(--bg-app)', border:`1px solid ${filterEntity ? 'var(--primary)' : 'var(--border-light)'}`, borderRadius:8, padding:'6px 32px 6px 10px', fontSize:'0.83rem', fontFamily:'inherit', color: filterEntity ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: filterEntity ? 600 : 400, cursor:'pointer', outline:'none' }}>
              <option value="">Todos os tipos</option>
              {uniqueEntities.map(e => <option key={e} value={e}>{ENTITY_LABELS[e] ?? e}</option>)}
            </select>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color: filterEntity ? 'var(--primary)' : 'var(--text-muted)' }}><polyline points="6 9 12 15 18 9"/></svg>
          </div>

          {/* Select — Ação */}
          <div style={{ position:'relative' }}>
            <select value={filterAction} onChange={e => changeFilter(() => setFilterAction(e.target.value))}
              style={{ appearance:'none', background: filterAction ? 'var(--primary-light)' : 'var(--bg-app)', border:`1px solid ${filterAction ? 'var(--primary)' : 'var(--border-light)'}`, borderRadius:8, padding:'6px 32px 6px 10px', fontSize:'0.83rem', fontFamily:'inherit', color: filterAction ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: filterAction ? 600 : 400, cursor:'pointer', outline:'none' }}>
              <option value="">Todas as ações</option>
              {uniqueActions.map(a => <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>)}
            </select>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color: filterAction ? 'var(--primary)' : 'var(--text-muted)' }}><polyline points="6 9 12 15 18 9"/></svg>
          </div>

          {activeFilters > 0 && (
            <button onClick={() => { changeFilter(() => { setFilterUser(''); setFilterEntity(''); setFilterAction(''); setSearch(''); }); }}
              style={{ background:'none', border:'1px solid var(--border-light)', borderRadius:8, padding:'6px 12px', fontSize:'0.8rem', color:'var(--text-secondary)', cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Limpar filtros
            </button>
          )}

          <span style={{ marginLeft:'auto', fontSize:'0.78rem', color:'var(--text-muted)', whiteSpace:'nowrap' }}>
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:'var(--text-muted)' }}>Carregando…</div>
        ) : (
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border-light)', overflow:'hidden', boxShadow:'0 2px 12px rgba(3,78,162,0.06)', flexShrink:0 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.845rem' }}>
              <thead>
                <tr style={{ background:'var(--bg-app)' }}>
                  {['Data / Hora','Usuário','Ação','Tipo','Detalhes'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontWeight:700, color:'var(--text-muted)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid var(--border-light)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 && (
                  <tr><td colSpan={5} style={{ padding:48, textAlign:'center', color:'var(--text-muted)' }}>Nenhum log encontrado.</td></tr>
                )}
                {pageItems.map((log, idx) => {
                  const { date, time } = formatDateTime(log.created_at);
                  const actionStyle = ACTION_STYLE[log.action] ?? { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' };
                  const entityStyle = ENTITY_STYLE[log.entity_type] ?? { bg: '#f1f5f9', color: '#475569' };
                  return (
                    <tr key={log.id}
                      onClick={() => setSelectedLog(log)}
                      style={{ borderBottom: idx < pageItems.length - 1 ? '1px solid var(--border-light)' : 'none', transition:'background 0.12s', cursor:'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-app)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      {/* Date */}
                      <td style={{ padding:'11px 16px', whiteSpace:'nowrap' }}>
                        <div style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text-primary)' }}>{date}</div>
                        <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:1 }}>{time}</div>
                      </td>
                      {/* User */}
                      <td style={{ padding:'11px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <UserAvatar name={log.user_name} />
                          <span style={{ fontWeight:600, color:'var(--text-primary)', whiteSpace:'nowrap' }}>{log.user_name}</span>
                        </div>
                      </td>
                      {/* Action */}
                      <td style={{ padding:'11px 16px' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:actionStyle.bg, color:actionStyle.color, borderRadius:20, padding:'3px 10px', fontSize:'0.72rem', fontWeight:700, whiteSpace:'nowrap' }}>
                          <span style={{ width:6, height:6, borderRadius:'50%', background:actionStyle.dot, flexShrink:0 }} />
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>
                      {/* Entity */}
                      <td style={{ padding:'11px 16px' }}>
                        <span style={{ background:entityStyle.bg, color:entityStyle.color, borderRadius:6, padding:'2px 9px', fontSize:'0.72rem', fontWeight:600, whiteSpace:'nowrap' }}>
                          {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                        </span>
                      </td>
                      {/* Details */}
                      <td style={{ padding:'11px 16px', color:'var(--text-secondary)', fontSize:'0.83rem', maxWidth:360 }}>
                        <span style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.details}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border-light)', display:'flex', alignItems:'center', justifyContent:'center', flexWrap:'wrap', gap:8 }}>
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                <button onClick={() => setPage(1)} disabled={safePage === 1} style={pgBtn(safePage === 1)} title="Primeira">«</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={pgBtn(safePage === 1)} title="Anterior">‹</button>
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 7) p = i + 1;
                  else if (safePage <= 4) p = i + 1;
                  else if (safePage >= totalPages - 3) p = totalPages - 6 + i;
                  else p = safePage - 3 + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ ...pgBtn(false), background: p === safePage ? 'var(--primary)' : 'transparent', color: p === safePage ? '#fff' : 'var(--text-secondary)', fontWeight: p === safePage ? 700 : 400, border: p === safePage ? 'none' : '1px solid var(--border-light)' }}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={pgBtn(safePage === totalPages)} title="Próxima">›</button>
                <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} style={pgBtn(safePage === totalPages)} title="Última">»</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedLog && <LogPreviewModal log={selectedLog} onClose={() => setSelectedLog(null)} />}

      <ConfirmModal open={confirmClear} title="Limpar todos os logs"
        message="Todos os registros serão apagados permanentemente. Esta ação não pode ser desfeita."
        confirmLabel="Limpar" danger onConfirm={executeClearLogs} onClose={() => setConfirmClear(false)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

function LogPreviewModal({ log, onClose }: { log: ActivityLog; onClose: () => void }) {
  const { date, time } = formatDateTime(log.created_at);
  const actionStyle = ACTION_STYLE[log.action] ?? { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' };
  const entityStyle = ENTITY_STYLE[log.entity_type] ?? { bg: '#f1f5f9', color: '#475569' };

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(3,20,50,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:'#fff', borderRadius:16, boxShadow:'0 8px 40px rgba(3,78,162,0.18)', width:'100%', maxWidth:480, padding:'28px 28px 24px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <span style={{ fontWeight:700, fontSize:'1rem', color:'var(--text-primary)' }}>Detalhes do registro</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:4, borderRadius:6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* User */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, padding:'12px 14px', background:'var(--bg-app)', borderRadius:10 }}>
          <UserAvatar name={log.user_name} />
          <div>
            <div style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--text-primary)' }}>{log.user_name}</div>
            <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:1 }}>ID: {log.user_id}</div>
          </div>
        </div>

        {/* Fields grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
          <Field label="Data">
            <span style={{ fontWeight:600, color:'var(--text-primary)' }}>{date}</span>
            <span style={{ color:'var(--text-muted)', fontSize:'0.8rem', marginLeft:6 }}>{time}</span>
          </Field>
          <Field label="Ação">
            <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:actionStyle.bg, color:actionStyle.color, borderRadius:20, padding:'3px 10px', fontSize:'0.75rem', fontWeight:700 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:actionStyle.dot, flexShrink:0 }} />
              {ACTION_LABELS[log.action] ?? log.action}
            </span>
          </Field>
          <Field label="Tipo">
            <span style={{ background:entityStyle.bg, color:entityStyle.color, borderRadius:6, padding:'2px 9px', fontSize:'0.75rem', fontWeight:600 }}>
              {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
            </span>
          </Field>
          <Field label="ID do registro">
            <span style={{ fontFamily:'monospace', fontSize:'0.78rem', color:'var(--text-secondary)', wordBreak:'break-all' }}>{log.entity_id || '—'}</span>
          </Field>
        </div>

        {/* Details */}
        <Field label="Detalhes">
          <p style={{ margin:0, fontSize:'0.86rem', color:'var(--text-secondary)', lineHeight:1.6, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
            {log.details || '—'}
          </p>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:4 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

function pgBtn(disabled: boolean): React.CSSProperties {
  return {
    minWidth: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-light)',
    background: 'transparent', color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 500,
    opacity: disabled ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 4px',
  };
}
