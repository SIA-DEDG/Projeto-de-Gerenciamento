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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,22,45,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--surface)', borderRadius: 3, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Stripe colorida */}
        <div style={{ height: 4, background: 'linear-gradient(90deg,#034EA2 0 40%,#E0A92E 40% 55%,#b42318 55% 75%,#1B8A4B 75%)', flexShrink: 0 }} />
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--line-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase' }}>Frequência</div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>Registrar falta</h2>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 3, border: '1px solid var(--border)', background: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', fontSize: '1.1rem' }}>✕</button>
        </div>

        <form onSubmit={handleSave} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
          <div>
            <label style={lbl}>Funcionário</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} style={inp}>
              <option value="">Selecionar...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Motivo</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} style={inp}>
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Início</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Fim</label>
              <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} style={inp} />
            </div>
          </div>
          <div>
            <label style={lbl}>Justificativa (opcional)</label>
            <textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={3}
              placeholder="Descreva a justificativa..."
              style={{ ...inp, resize: 'vertical', minHeight: 72 }} />
          </div>
          <div style={{ background: 'rgba(224,169,46,0.08)', border: '1px solid rgba(224,169,46,0.3)', borderRadius: 3, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} style={{ color: '#A87A00', flexShrink: 0 }} />
            <span style={{ fontSize: '0.78rem', color: '#A87A00', fontWeight: 500 }}>Envio de arquivos ainda não disponível.</span>
          </div>
          {error && <p style={{ color: '#b42318', fontSize: '0.82rem', margin: 0 }}>{error}</p>}
        </form>

        <div style={{ padding: '12px 22px', borderTop: '1px solid var(--line-1)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ padding: '9px 16px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 18px', border: 'none', borderRadius: 3, background: saving ? 'var(--text-3)' : '#034EA2', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>{saving ? 'Salvando…' : 'Registrar'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Página ──────────────────────────────────────────────────────────── */
export default function FaltasPage() {
  const currentUser = getUser();
  const seeAll   = canSeeAllAbsences(currentUser?.role);
  const canApprove = seeAll;
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
                  <div className="mono" style={{ width: 32, height: 32, borderRadius: '50%', background: avatarBg(row.employee_name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 500, flexShrink: 0 }}>
                    {initials(row.employee_name)}
                  </div>
                  <span style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.employee_name}</span>
                </div>

                {/* Tipo */}
                <span className="mono" style={{ fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.4px', textTransform: 'uppercase', color: reasonColor }}>{row.reason}</span>

                {/* Período */}
                <div>
                  <div className="mono" style={{ fontSize: '0.76rem', fontWeight: 500, color: 'var(--text)' }}>{startFmt}{endFmt ? ` → ${endFmt}` : ''}</div>
                </div>

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
