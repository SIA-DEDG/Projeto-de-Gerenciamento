﻿'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import Calendario, { type CalendarioItem } from '@/components/Calendario';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import {
  fetchAbsences, createAbsence, updateAbsence, deleteAbsence, approveAbsence,
  fetchUsers, type Absence, type UserPublic,
} from '@/lib/api';
import { getUser, canSeeAllAbsences } from '@/lib/auth';
import PageHeader from '@/components/PageHeader';

const REASON_COLORS: Record<string, string> = {
  Doença:  '#b42318',
  Evento:  '#034EA2',
  Aula:    '#157F3C',
  Férias:  '#A87A00',
  Outros:  'var(--text-3)',
};

const STATUS_COLORS: Record<string, string> = {
  aprovada: '#157F3C',
  pendente: '#A87A00',
  recusada: '#b42318',
};

const REASONS = ['Doença', 'Evento', 'Aula', 'Férias', 'Outros'];
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDate(s: string) {
  if (!s) return '-';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const AVATAR_COLORS = ['#034EA2','#1B8A4B','#b42318','#A87A00','#0369a1','#9333ea'];
function avatarBg(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* ── Modal de registro de falta ─────────────────────────────────────── */
function FaltaModal({ users, currentUserId, onClose, onSaved }: {
  users: UserPublic[];
  currentUserId: string;
  onClose: () => void;
  onSaved: (a: Absence) => void;
}) {
  const [userId, setUserId] = useState(currentUserId);
  const [reason, setReason] = useState('Doença');
  const [justification, setJustification] = useState('');
  const [startDate, setStartDate] = useState(ymd(new Date()));
  const [endDate, setEndDate] = useState(ymd(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { setError('Selecione um funcionário.'); return; }
    setSaving(true); setError('');
    try {
      const created = await createAbsence({ user_id: userId || null, reason, justification: justification || null, file_name: null, file_data: null, start_date: startDate, end_date: endDate });
      onSaved(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally { setSaving(false); }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 13px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.85rem', fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: '0.63rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', display: 'block', marginBottom: 6 };

  // Preview state
  const previewUser = users.find(u => u.id === userId);
  const daysDiff = (() => {
    try {
      const s = new Date(startDate + 'T12:00:00');
      const e2 = new Date(endDate + 'T12:00:00');
      return Math.round((e2.getTime() - s.getTime()) / 86400000) + 1;
    } catch { return 1; }
  })();

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(7,22,45,0.32)', zIndex: 300 }} />
      {/* Drawer */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 472, maxWidth: '94%', background: 'var(--surface)', overflowY: 'auto', zIndex: 301, borderLeft: '1px solid var(--line-1)', animation: 'drawin .24s cubic-bezier(.4,0,.2,1) both', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px', borderBottom: '1px solid var(--line-1)', flexShrink: 0, position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: '#A87A00', flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-2)' }}>Registrar falta</span>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSave} style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '24px 28px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Preview card */}
            <div style={{ border: '1px solid var(--line-1)', borderRadius: 3, padding: '14px 16px', background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div className="mono" style={{ width: 32, height: 32, borderRadius: '50%', background: '#072f63', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 600, flexShrink: 0 }}>
                    {(previewUser?.name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)' }}>{previewUser?.name ?? 'Servidor'}</div>
                    <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>
                      {reason} · {formatDate(startDate)}{startDate !== endDate ? ` – ${formatDate(endDate)}` : ''} · {daysDiff === 1 ? '1 dia' : `${daysDiff} dias`}
                    </div>
                  </div>
                </div>
                <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#A87A00' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#A87A00' }} />
                  Pendente
                </span>
              </div>
            </div>

            {/* Servidor */}
            <div>
              <label className="mono" style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>Servidor</label>
              <div style={{ position: 'relative' }}>
                <select value={userId} onChange={e => setUserId(e.target.value)} style={{ ...inp, padding: '11px 32px 11px 13px', appearance: 'none', cursor: 'pointer' }}>
                  <option value="">Selecionar...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>

            {/* Tipo */}
            <div>
              <label className="mono" style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>Tipo</label>
              <div style={{ position: 'relative' }}>
                <select value={reason} onChange={e => setReason(e.target.value)} style={{ ...inp, padding: '11px 32px 11px 13px', appearance: 'none', cursor: 'pointer' }}>
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>

            {/* Período */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="mono" style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>Início</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inp}
                  onFocus={e => { e.target.style.borderColor = '#034EA2'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; }} />
              </div>
              <div>
                <label className="mono" style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>Fim (opcional)</label>
                <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} style={inp}
                  onFocus={e => { e.target.style.borderColor = '#034EA2'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; }} />
              </div>
            </div>

            {/* Justificativa */}
            <div>
              <label className="mono" style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>Justificativa</label>
              <textarea value={justification} onChange={e => setJustification(e.target.value)} rows={3}
                placeholder="Descreva o motivo da ausência"
                style={{ ...inp, resize: 'vertical', minHeight: 80, lineHeight: 1.5 }}
                onFocus={e => { e.target.style.borderColor = '#034EA2'; e.target.style.boxShadow = 'inset 0 0 0 1px #034EA2'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
            </div>

            {/* Info banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface-2)' }}>
              <AlertTriangle size={14} style={{ color: '#A87A00', flexShrink: 0 }} />
              <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                O registro entra como <strong style={{ color: '#A87A00' }}>Pendente</strong> até aprovação da coordenação.
              </span>
            </div>

            {error && <p style={{ color: '#b42318', fontSize: '0.82rem', margin: 0 }}>{error}</p>}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} style={{ flex: 1, padding: 12, border: 'none', borderRadius: 3, background: saving ? 'var(--text-3)' : '#034EA2', color: '#fff', fontSize: '0.84rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Salvando…' : 'Registrar falta'}
              </button>
              <button type="button" onClick={onClose} style={{ padding: '12px 18px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text)', fontSize: '0.84rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

/* ── Página ──────────────────────────────────────────────────────────── */
export default function FaltasPage() {
  const currentUser = getUser();
  const seeAll   = canSeeAllAbsences(currentUser?.role);
  // Diretor, Gerente e Admin podem aprovar/recusar faltas
  const canApprove = currentUser?.role === 'Admin' || currentUser?.role === 'Diretor' || currentUser?.role === 'Gerente' || currentUser?.role === 'Coordenador';
  const { toasts, addToast, dismissToast } = useToast();
  const now = new Date();

  const [absences, setAbsences] = useState<Absence[]>([]);
  const [users, setUsers]       = useState<UserPublic[]>([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState<'list' | 'calendar'>('list');
  const [showModal, setShowModal] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message?: string; onConfirm: () => void } | null>(null);

  const monthLabel = MONTHS_PT[now.getMonth()];
  const yearLabel  = now.getFullYear();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedAbsences, allUsers] = await Promise.all([fetchAbsences(), fetchUsers()]);
      setAbsences(fetchedAbsences);
      setUsers(allUsers.filter(u => u.role !== 'Admin'));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApproval(id: string, status: 'aprovada' | 'recusada') {
    try {
      const updated = await approveAbsence(id, status);
      setAbsences((prev) => prev.map((a) => (a.id === id ? updated : a)));
      addToast('success', status === 'aprovada' ? 'Aprovada' : 'Recusada', 'Status atualizado.');
    } catch { addToast('error', 'Erro', 'Não foi possível alterar o status.'); }
  }

  function handleDelete(id: string) {
    setConfirm({ title: 'Excluir justificativa', message: 'Esta ação não pode ser desfeita.', onConfirm: async () => {
      await deleteAbsence(id);
      setAbsences((prev) => prev.filter(a => a.id !== id));
    }});
  }

  /* ── Dados calculados ── */
  const visibleAbsences = seeAll ? absences : absences.filter(a => a.user_id === currentUser?.user_id);

  const approved  = visibleAbsences.filter(a => a.approval_status === 'aprovada').length;
  const pending   = visibleAbsences.filter(a => a.approval_status === 'pendente' || !a.approval_status).length;
  const servers   = new Set(visibleAbsences.map(a => a.user_id)).size;

  const summary = [
    { label: 'Registros',  value: visibleAbsences.length, color: 'var(--text)' },
    { label: 'Aprovadas',  value: approved,                color: '#157F3C' },
    { label: 'Pendentes',  value: pending,                 color: '#A87A00' },
    { label: 'Servidores', value: servers,                 color: '#034EA2' },
  ];

  const calItems: CalendarioItem[] = visibleAbsences.map(a => ({
    id: a.id,
    title: a.employee_name,
    start_date: a.start_date,
    end_date: a.end_date,
    color: REASON_COLORS[a.reason] ?? 'var(--text-3)',
    label: a.reason,
  }));

  /* ── Tab style ── */
  const tabStyle = (active: boolean): React.CSSProperties => ({
    border: 'none',
    borderBottom: active ? '2px solid #034EA2' : '2px solid transparent',
    background: 'transparent',
    color: active ? '#034EA2' : 'var(--text-2)',
    fontSize: '0.82rem',
    fontWeight: active ? 600 : 400,
    padding: '0 0 10px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'color 0.12s, border-color 0.12s',
  });

  return (
    <>
      <PageHeader eyebrow={`Controle de frequência · ${monthLabel} ${yearLabel}`} title="Faltas" />

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: '1px solid var(--line-1)', borderBottom: '1px solid var(--line-1)', marginTop: 24, flexShrink: 0 }}>
        {summary.map(s => (
          <div key={s.label} style={{ padding: '20px 32px', borderRight: '1px solid var(--line-1)' }}>
            <div className="mono" style={{ fontSize: '0.66rem', fontWeight: 500, color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase' }}>{s.label}</div>
            <div className="mono" style={{ fontSize: '2rem', fontWeight: 500, letterSpacing: '-1px', color: s.color, marginTop: 8, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs + botão */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '18px 32px 0', borderBottom: '1px solid var(--line-1)', flexShrink: 0 }}>
        <button style={tabStyle(view === 'list')} onClick={() => setView('list')}>Lista</button>
        <button style={tabStyle(view === 'calendar')} onClick={() => setView('calendar')}>Calendário</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 13px', border: 'none', borderRadius: 3, background: '#034EA2', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Plus size={14} />
          Registrar falta
        </button>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="loading-state">Carregando…</div>
      ) : view === 'calendar' ? (
        <div style={{ padding: '16px 32px', flex: 1, overflow: 'auto' }}>
          <Calendario
            items={calItems}
            legend={[
              { color: '#b42318', label: 'Doença' },
              { color: '#034EA2', label: 'Evento' },
              { color: '#157F3C', label: 'Aula' },
              { color: '#A87A00', label: 'Férias' },
              { color: 'var(--text-3)', label: 'Outros' },
            ]}
          />
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Cabeçalho da tabela */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 150px 120px 1.4fr 160px', gap: 18, padding: '14px 32px', borderBottom: '1px solid var(--line-1)', background: 'var(--surface-2)' }}>
            {['Servidor','Tipo','Período','Justificativa','Situação'].map(h => (
              <span key={h} className="mono" style={{ fontSize: '0.64rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</span>
            ))}
          </div>

          {visibleAbsences.length === 0 ? (
            <div className="empty-state"><p>Nenhuma falta registrada.</p></div>
          ) : visibleAbsences.map(row => {
            const isPending = !row.approval_status || row.approval_status === 'pendente';
            const statusColor = STATUS_COLORS[row.approval_status] ?? '#A87A00';
            const reasonColor = REASON_COLORS[row.reason] ?? 'var(--text-3)';
            const startFmt = formatDate(row.start_date);
            const endFmt   = row.start_date !== row.end_date ? formatDate(row.end_date) : null;

            return (
              <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr 150px 120px 1.4fr 160px', gap: 18, padding: '15px 32px', alignItems: 'center', borderBottom: '1px solid var(--line-2)' }}>
                {/* Servidor */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  <div className="mono" style={{ width: 28, height: 28, borderRadius: '50%', background: '#072f63', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${28 * 0.36}px`, fontWeight: 500, flexShrink: 0, border: '1.5px solid var(--surface)', letterSpacing: '0.5px' }}>
                    {initials(row.employee_name)}
                  </div>
                  <span style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.employee_name}</span>
                </div>

                {/* Tipo */}
                <span className="mono" style={{ fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--text-2)' }}>{row.reason}</span>

                {/* Período */}
                {(() => {
                  const start = new Date(row.start_date + 'T12:00:00');
                  const end = new Date(row.end_date + 'T12:00:00');
                  const daysDiff = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
                  return (
                    <div>
                      <div className="mono" style={{ fontSize: '0.76rem', fontWeight: 500, color: 'var(--text)' }}>{startFmt}{endFmt ? ` – ${endFmt}` : ''}</div>
                      <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: 1 }}>{daysDiff === 1 ? '1 dia' : `${daysDiff} dias`}</div>
                    </div>
                  );
                })()}

                {/* Justificativa */}
                <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.justification || <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>Sem justificativa</span>}</span>

                {/* Situação */}
                <div style={{ justifySelf: 'end' }}>
                  {isPending && canApprove ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleApproval(row.id, 'aprovada')}
                        style={{ padding: '6px 11px', border: 'none', borderRadius: 3, background: '#034EA2', color: '#fff', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Aprovar
                      </button>
                      <button onClick={() => handleApproval(row.id, 'recusada')}
                        style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.7rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#b42318'; (e.currentTarget as HTMLButtonElement).style.color = '#b42318'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; }}>
                        Recusar
                      </button>
                    </div>
                  ) : (
                    <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: statusColor }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                      {row.approval_status || 'pendente'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <FaltaModal
          users={users}
          currentUserId={currentUser?.user_id ?? ''}
          onClose={() => setShowModal(false)}
          onSaved={(a) => { setAbsences(prev => [a, ...prev]); addToast('success', 'Falta registrada', ''); }}
        />
      )}

      <ConfirmModal open={!!confirm} title={confirm?.title ?? ''} message={confirm?.message} confirmLabel="Excluir" danger onConfirm={() => confirm?.onConfirm()} onClose={() => setConfirm(null)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
