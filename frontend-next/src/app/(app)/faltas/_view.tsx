﻿'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, AlertTriangle, X, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import Calendario, { type CalendarioItem } from '@/components/Calendario';
import ConfirmModal from '@/components/ConfirmModal';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import {
  fetchAbsences, createAbsence, updateAbsence, deleteAbsence, approveAbsence,
  fetchUsers, fetchAllUsers, fetchDiretorias,
  type Absence, type UserPublic, type Directoria,
} from '@/lib/api';
import { getUser, canSeeAllAbsences, canApproveFaltas, isSuperAdmin } from '@/lib/auth';
import PageHeader from '@/components/PageHeader';
import BrandStripe from '@/components/BrandStripe';

const REASON_COLORS: Record<string, string> = {
  Doença:  '#b42318',
  Evento:  'var(--blue)',
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

const AVATAR_COLORS = ['var(--blue)','#1B8A4B','#b42318','#A87A00','#0369a1','#9333ea'];
function avatarBg(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* ── Modal de registro de falta ─────────────────────────────────────── */
function FaltaModal({ users, currentUserId, currentUserName, existing, canApprove, onClose, onSaved }: {
  users: UserPublic[];
  currentUserId: string;
  currentUserName: string;
  existing?: Absence;
  canApprove: boolean;
  onClose: () => void;
  onSaved: (a: Absence) => void;
}) {
  const [reason, setReason]           = useState(existing?.reason ?? 'Doença');
  const [justification, setJustification] = useState(existing?.justification ?? '');
  const [startDate, setStartDate]     = useState(existing?.start_date ?? ymd(new Date()));
  const [endDate, setEndDate]         = useState(existing?.end_date ?? ymd(new Date()));
  const [saving, setSaving]           = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [error, setError]             = useState('');
  const isEdit = !!existing;

  const { requestClose, guard } = useUnsavedGuard(onClose);
  const dirty =
    JSON.stringify({ reason, justification, startDate, endDate }) !==
    JSON.stringify({
      reason: existing?.reason ?? 'Doença',
      justification: existing?.justification ?? '',
      startDate: existing?.start_date ?? ymd(new Date()),
      endDate: existing?.end_date ?? ymd(new Date()),
    });

  // Nome fixo — no create é o usuário logado, no edit é o servidor do registro
  const serverName = isEdit ? existing.employee_name : currentUserName;

  const statusColor = STATUS_COLORS[existing?.approval_status ?? 'pendente'] ?? '#A87A00';
  const statusLabel = existing?.approval_status ?? 'pendente';

  const daysDiff = (() => {
    try {
      const s = new Date(startDate + 'T12:00:00');
      const e2 = new Date(endDate + 'T12:00:00');
      return Math.round((e2.getTime() - s.getTime()) / 86400000) + 1;
    } catch { return 1; }
  })();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (isEdit) {
        const updated = await updateAbsence(existing.id, { reason, justification: justification || null, start_date: startDate, end_date: endDate });
        onSaved(updated);
      } else {
        const created = await createAbsence({ user_id: currentUserId || null, reason, justification: justification || null, file_name: null, file_data: null, start_date: startDate, end_date: endDate });
        onSaved(created);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally { setSaving(false); }
  }

  async function handleChangeStatus(newStatus: 'aprovada' | 'recusada' | 'pendente') {
    if (!existing) return;
    setChangingStatus(true);
    try {
      const updated = await approveAbsence(existing.id, newStatus);
      onSaved(updated);
      onClose();
    } catch { setError('Erro ao alterar situação.'); }
    finally { setChangingStatus(false); }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 13px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.88rem', fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: '0.66rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', display: 'block', marginBottom: 6 };

  const serverInitials = serverName.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <div onClick={() => requestClose(dirty)} style={{ position: 'fixed', inset: 0, background: 'rgba(7,22,45,0.32)', zIndex: 300 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 500, maxWidth: '94%', background: 'var(--surface)', overflowY: 'auto', zIndex: 301, borderLeft: '1px solid var(--line-1)', animation: 'drawin .24s cubic-bezier(.4,0,.2,1) both', display: 'flex', flexDirection: 'column' }}>

        {/* Faixa institucional (listras da bandeira do PI) — cor via --brand-stripe */}
        <BrandStripe />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--line-1)', flexShrink: 0, position: 'sticky', top: 4, background: 'var(--surface)', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: '#A87A00', flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-2)' }}>{isEdit ? 'Editar falta' : 'Registrar falta'}</span>
          </div>
          <button onClick={() => requestClose(dirty)} style={{ width: 30, height: 30, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '24px 28px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Preview card */}
            <div style={{ border: '1px solid var(--line-1)', borderRadius: 3, padding: '14px 16px', background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div className="mono" style={{ width: 32, height: 32, borderRadius: '50%', background: avatarBg(serverName), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 600, flexShrink: 0 }}>
                    {serverInitials}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)' }}>{serverName}</div>
                    <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>
                      {reason} · {formatDate(startDate)}{startDate !== endDate ? ` – ${formatDate(endDate)}` : ''} · {daysDiff === 1 ? '1 dia' : `${daysDiff} dias`}
                    </div>
                  </div>
                </div>
                <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: statusColor }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                  {statusLabel}
                </span>
              </div>
            </div>

            {/* Servidor — somente leitura */}
            <div>
              <label style={lbl}>Servidor</label>
              <div style={{ ...inp, background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'default', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="mono" style={{ width: 22, height: 22, borderRadius: '50%', background: avatarBg(serverName), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.56rem', fontWeight: 600, flexShrink: 0 }}>
                  {serverInitials}
                </div>
                {serverName}
              </div>
            </div>

            {/* Tipo */}
            <div>
              <label style={lbl}>Tipo</label>
              <div style={{ position: 'relative' }}>
                <select value={reason} onChange={e => setReason(e.target.value)} style={{ ...inp, padding: '10px 32px 10px 13px', appearance: 'none', cursor: 'pointer' }}>
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)' }} />
              </div>
            </div>

            {/* Período */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>Início</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inp}
                  onFocus={e => { e.target.style.borderColor = 'var(--blue)'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; }} />
              </div>
              <div>
                <label style={lbl}>Fim (opcional)</label>
                <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} style={inp}
                  onFocus={e => { e.target.style.borderColor = 'var(--blue)'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; }} />
              </div>
            </div>

            {/* Justificativa */}
            <div>
              <label style={lbl}>Justificativa</label>
              <textarea value={justification} onChange={e => setJustification(e.target.value)} rows={3}
                placeholder="Descreva o motivo da ausência"
                style={{ ...inp, resize: 'vertical', minHeight: 80, lineHeight: 1.5 }}
                onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = 'inset 0 0 0 1px var(--blue)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
            </div>

            {/* Alterar situação — só na edição com permissão */}
            {isEdit && canApprove && (
              <div>
                <label style={lbl}>Alterar situação</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['aprovada', 'recusada', 'pendente'] as const).map(s => {
                    const color = STATUS_COLORS[s] ?? '#A87A00';
                    const isActive = statusLabel === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={changingStatus || isActive}
                        onClick={() => handleChangeStatus(s)}
                        style={{
                          flex: 1, padding: '9px 6px', borderRadius: 3, fontFamily: 'inherit',
                          border: isActive ? `2px solid ${color}` : '1px solid var(--border)',
                          background: isActive ? `${color}12` : 'var(--surface)',
                          color: isActive ? color : 'var(--text-2)',
                          fontSize: '0.78rem', fontWeight: isActive ? 700 : 500,
                          cursor: isActive ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          transition: 'all 0.12s',
                          opacity: changingStatus && !isActive ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { if (!isActive && !changingStatus) (e.currentTarget as HTMLButtonElement).style.borderColor = color; }}
                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Banner info — só no create */}
            {!isEdit && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface-2)' }}>
                <AlertTriangle size={14} style={{ color: '#A87A00', flexShrink: 0 }} />
                <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                  O registro entra como <strong style={{ color: '#A87A00' }}>Pendente</strong> até aprovação da coordenação.
                </span>
              </div>
            )}

            {error && <p style={{ color: '#b42318', fontSize: '0.82rem', margin: 0 }}>{error}</p>}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} style={{ flex: 1, padding: 12, border: 'none', borderRadius: 3, background: saving ? 'var(--text-3)' : 'var(--blue)', color: '#fff', fontSize: '0.84rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--blue-h)'; }}
                onMouseLeave={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--blue)'; }}>
                {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Registrar falta'}
              </button>
              <button type="button" onClick={() => requestClose(dirty)} style={{ padding: '12px 18px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text)', fontSize: '0.84rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </div>

      {guard}
    </>
  );
}

/* ── Página ──────────────────────────────────────────────────────────── */
export default function FaltasPage() {
  const currentUser = getUser();
  // Gabinete vê tudo independente do role (Coordenadores incluídos)
  const canApprove  = canApproveFaltas(currentUser);
  // Gabinete vê todas as diretorias; Super-Admin também
  const isGabinete  = isSuperAdmin(currentUser) || currentUser?.directoria_name?.toLowerCase() === 'gabinete';
  // Gabinete vê tudo independente do role (Coordenadores incluídos)
  const seeAll      = canSeeAllAbsences(currentUser?.role) || isGabinete;
  const { toasts, addToast, dismissToast } = useToast();
  const now = new Date();

  const [absences, setAbsences]       = useState<Absence[]>([]);
  const [users, setUsers]             = useState<UserPublic[]>([]);
  const [diretorias, setDiretorias]   = useState<Directoria[]>([]);
  const [loading, setLoading]         = useState(true);
  const [view, setView]               = useState<'list' | 'calendar'>('list');

  // Filtros
  const [filterDiretoria, setFilterDiretoria] = useState('');
  const [filterUser, setFilterUser]           = useState('');
  const [filterMonth, setFilterMonth]         = useState(''); // 'YYYY-MM' ou ''
  const [filterStatus, setFilterStatus]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message?: string; onConfirm: () => void } | null>(null);

  const monthLabel = MONTHS_PT[now.getMonth()];
  const yearLabel  = now.getFullYear();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetches: Promise<unknown>[] = [fetchAbsences()];
      if (isGabinete) {
        fetches.push(fetchAllUsers(), fetchDiretorias());
      } else {
        fetches.push(fetchUsers());
      }
      const [fetchedAbsences, allUsers, dirs] = await Promise.all(fetches) as [Absence[], UserPublic[], Directoria[]?];
      setAbsences(fetchedAbsences);
      setUsers((allUsers ?? []).filter((u: UserPublic) => u.role !== 'Admin'));
      if (dirs) setDiretorias(dirs);
    } finally { setLoading(false); }
  }, [isGabinete]);

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
  const baseAbsences = seeAll ? absences : absences.filter(a => a.user_id === currentUser?.user_id);
  const visibleAbsences = baseAbsences.filter(a => {
    if (filterDiretoria && a.directoria_id !== filterDiretoria) return false;
    if (filterUser && a.user_id !== filterUser) return false;
    if (filterMonth) {
      const ym = a.start_date?.slice(0, 7); // 'YYYY-MM'
      if (ym !== filterMonth) return false;
    }
    if (filterStatus && a.approval_status !== filterStatus) return false;
    return true;
  });

  const approved  = visibleAbsences.filter(a => a.approval_status === 'aprovada').length;
  const pending   = visibleAbsences.filter(a => a.approval_status === 'pendente' || !a.approval_status).length;
  const servers   = new Set(visibleAbsences.map(a => a.user_id)).size;

  const summary = [
    { label: 'Registros',  value: visibleAbsences.length, color: 'var(--text)' },
    { label: 'Aprovadas',  value: approved,                color: '#157F3C' },
    { label: 'Pendentes',  value: pending,                 color: '#A87A00' },
    { label: 'Servidores', value: servers,                 color: 'var(--blue)' },
  ];

  const absencesByMonth = useMemo(() => {
    const sorted = [...visibleAbsences].sort((a, b) => b.start_date.localeCompare(a.start_date));
    const map = new Map<string, Absence[]>();
    for (const row of sorted) {
      const ym = row.start_date?.slice(0, 7) ?? '';
      if (!map.has(ym)) map.set(ym, []);
      map.get(ym)!.push(row);
    }
    return Array.from(map.entries()).map(([ym, rows]) => {
      const [year, month] = ym.split('-').map(Number);
      return { monthKey: ym, label: `${MONTHS_PT[month - 1]} ${year}`, rows };
    });
  }, [visibleAbsences]);

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
    borderBottom: active ? '2px solid var(--blue)' : '2px solid transparent',
    background: 'transparent',
    color: active ? 'var(--blue)' : 'var(--text-2)',
    fontSize: '0.82rem',
    fontWeight: active ? 600 : 400,
    padding: '0 0 10px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'color 0.12s, border-color 0.12s',
  });

  return (
    <>
      <PageHeader
        eyebrow={`Controle de frequência · ${monthLabel} ${yearLabel}`}
        title="Faltas"
        tabBarRight={
          <button
            onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 40, border: 'none', borderBottom: '2px solid transparent', background: 'transparent', color: 'var(--blue)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Plus size={14} />Registrar falta
          </button>
        }
      />

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: '1px solid var(--line-1)', borderBottom: '1px solid var(--line-1)', marginTop: 24, flexShrink: 0 }}>
        {summary.map(s => (
          <div key={s.label} style={{ padding: '20px 32px', borderRight: '1px solid var(--line-1)' }}>
            <div className="mono" style={{ fontSize: '0.66rem', fontWeight: 500, color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase' }}>{s.label}</div>
            <div className="mono" style={{ fontSize: '2rem', fontWeight: 500, letterSpacing: '-1px', color: s.color, marginTop: 8, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '18px 32px 0', borderBottom: '1px solid var(--line-1)', flexShrink: 0 }}>
        <button style={tabStyle(view === 'list')} onClick={() => setView('list')}>Lista</button>
        <button style={tabStyle(view === 'calendar')} onClick={() => setView('calendar')}>Calendário</button>
      </div>

      {/* Filtros — só para quem pode ver mais de um usuário */}
      {seeAll && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 32px', borderBottom: '1px solid var(--line-1)', flexShrink: 0, flexWrap: 'wrap', background: 'var(--surface-2)' }}>
          {/* Diretoria — só para Gabinete/Admin */}
          {isGabinete && diretorias.length > 0 && (
            <select value={filterDiretoria} onChange={e => setFilterDiretoria(e.target.value)}
              style={{ height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.82rem', background: filterDiretoria ? '#034EA20d' : 'var(--surface)', color: filterDiretoria ? '#034EA2' : 'var(--text-2)', fontFamily: 'inherit', cursor: 'pointer' }}>
              <option value="">Todas as diretorias</option>
              {diretorias.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          {/* Usuário */}
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
            style={{ height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.82rem', background: filterUser ? '#034EA20d' : 'var(--surface)', color: filterUser ? '#034EA2' : 'var(--text-2)', fontFamily: 'inherit', cursor: 'pointer' }}>
            <option value="">Todos os usuários</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {/* Mês */}
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            style={{ height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.82rem', background: filterMonth ? '#034EA20d' : 'var(--surface)', color: filterMonth ? '#034EA2' : 'var(--text-2)', fontFamily: 'inherit', cursor: 'pointer' }} />
          {/* Status */}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.82rem', background: filterStatus ? '#034EA20d' : 'var(--surface)', color: filterStatus ? '#034EA2' : 'var(--text-2)', fontFamily: 'inherit', cursor: 'pointer' }}>
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="aprovada">Aprovada</option>
            <option value="recusada">Recusada</option>
          </select>
          {/* Limpar */}
          {(filterDiretoria || filterUser || filterMonth || filterStatus) && (
            <button onClick={() => { setFilterDiretoria(''); setFilterUser(''); setFilterMonth(''); setFilterStatus(''); }}
              style={{ height: 34, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.82rem', background: 'var(--surface)', color: 'var(--text-3)', fontFamily: 'inherit', cursor: 'pointer' }}>
              Limpar filtros
            </button>
          )}
          {(filterDiretoria || filterUser || filterMonth || filterStatus) && (
            <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginLeft: 'auto' }}>
              {visibleAbsences.length} resultado(s)
            </span>
          )}
        </div>
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="loading-state">Carregando…</div>
      ) : view === 'calendar' ? (
        <div style={{ padding: '16px 32px', flex: 1, overflow: 'auto' }}>
          <Calendario
            items={calItems}
            legend={[
              { color: '#b42318', label: 'Doença' },
              { color: 'var(--blue)', label: 'Evento' },
              { color: '#157F3C', label: 'Aula' },
              { color: '#A87A00', label: 'Férias' },
              { color: 'var(--text-3)', label: 'Outros' },
            ]}
          />
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Cabeçalho da tabela */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 120px 110px 1.2fr 160px 64px', gap: 14, padding: '14px 32px', borderBottom: '1px solid var(--line-1)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
            {['Servidor','Tipo','Período','Justificativa','Situação',''].map((h, i) => (
              <span key={i} className="mono" style={{ fontSize: '0.64rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</span>
            ))}
          </div>

          {absencesByMonth.length === 0 ? (
            <div className="empty-state"><p>Nenhuma falta registrada.</p></div>
          ) : absencesByMonth.map(({ monthKey, label: monthLabel2, rows }) => (
            <div key={monthKey}>
              {/* Separador de mês — mesmo estilo da tela de Eventos (sem fundo). */}
              <div style={{ padding: '10px 32px 8px', borderBottom: '1px solid var(--line-2)', marginTop: 12 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.2px' }}>{monthLabel2}</span>
              </div>
              {rows.map(row => {
            const isPending   = !row.approval_status || row.approval_status === 'pendente';
            const isOwn       = row.user_id === currentUser?.user_id;
            const canEditRow  = canApprove || isOwn; // manager edita qualquer; usuário só a sua
            const canDeleteRow = canApprove || (isOwn && isPending); // usuário só pode excluir a própria se pendente
            const statusColor = STATUS_COLORS[row.approval_status] ?? '#A87A00';
            const reasonColor = REASON_COLORS[row.reason] ?? 'var(--text-3)';
            const startFmt = formatDate(row.start_date);
            const endFmt   = row.start_date !== row.end_date ? formatDate(row.end_date) : null;

            return (
              <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr 120px 110px 1.2fr 160px 64px', gap: 14, padding: '14px 32px', alignItems: 'center', borderBottom: '1px solid var(--line-2)' }}>
                {/* Servidor */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  <div className="mono" style={{ width: 28, height: 28, borderRadius: '50%', background: '#072f63', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${28 * 0.36}px`, fontWeight: 500, flexShrink: 0, border: '1.5px solid var(--surface)', letterSpacing: '0.5px' }}>
                    {initials(row.employee_name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.employee_name}</div>
                    {isGabinete && row.directoria_name && (
                      <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', letterSpacing: '0.3px', marginTop: 2 }}>{row.directoria_name}</div>
                    )}
                  </div>
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
                <div>
                  {isPending && canApprove ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleApproval(row.id, 'aprovada')}
                        style={{ padding: '5px 9px', border: 'none', borderRadius: 3, background: 'var(--blue)', color: '#fff', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Aprovar
                      </button>
                      <button onClick={() => handleApproval(row.id, 'recusada')}
                        style={{ padding: '5px 9px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.7rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
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

                {/* Ações */}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  {canEditRow && (
                    <button onClick={() => { setEditingAbsence(row); setShowModal(true); }} title="Editar"
                      style={{ width: 28, height: 28, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; }}>
                      <Pencil size={12} />
                    </button>
                  )}
                  {canDeleteRow && (
                    <button onClick={() => handleDelete(row.id)} title="Excluir"
                      style={{ width: 28, height: 28, borderRadius: 3, border: '1px solid rgba(180,35,24,0.2)', background: 'rgba(180,35,24,0.04)', color: '#b42318', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.10)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.04)')}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              );
            })}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <FaltaModal
          users={users}
          currentUserId={currentUser?.user_id ?? ''}
          currentUserName={currentUser?.name ?? 'Servidor'}
          existing={editingAbsence ?? undefined}
          canApprove={canApprove}
          onClose={() => { setShowModal(false); setEditingAbsence(null); }}
          onSaved={(a) => {
            if (editingAbsence) {
              setAbsences(prev => prev.map(x => x.id === a.id ? a : x));
              addToast('success', 'Falta atualizada', '');
            } else {
              setAbsences(prev => [a, ...prev]);
              addToast('success', 'Falta registrada', '');
            }
            setEditingAbsence(null);
          }}
        />
      )}

      <ConfirmModal open={!!confirm} title={confirm?.title ?? ''} message={confirm?.message} confirmLabel="Excluir" danger onConfirm={() => confirm?.onConfirm()} onClose={() => setConfirm(null)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
