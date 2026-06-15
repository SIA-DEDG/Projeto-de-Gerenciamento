'use client';

import { useState, useEffect, useRef } from 'react';
import MonthCalendar, { CalendarItem } from '@/components/MonthCalendar';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import {
  fetchAbsences,
  createAbsence,
  updateAbsence,
  deleteAbsence,
  fetchUsers,
  type Absence,
  type UserPublic,
} from '@/lib/api';
import { getUser, canSeeAllAbsences } from '@/lib/auth';

const REASONS = ['Doença', 'Evento', 'Aula', 'Férias', 'Outros'];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const REASON_COLORS: Record<string, { color: string; bg: string }> = {
  'Doença':  { color: '#b91c1c', bg: '#fee2e2' },
  'Evento':  { color: '#1d4ed8', bg: '#dbeafe' },
  'Aula':    { color: '#15803d', bg: '#dcfce7' },
  'Férias':  { color: '#9333ea', bg: '#f3e8ff' },
  'Outros':  { color: '#92400e', bg: '#fef3c7' },
};

function reasonColor(r: string) {
  return REASON_COLORS[r] ?? { color: '#475569', bg: '#f1f5f9' };
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDate(s: string) {
  if (!s) return '-';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function currentMonthRange() {
  const now = new Date();
  const y = now.getFullYear(), mi = now.getMonth();
  const first = `${y}-${String(mi+1).padStart(2,'0')}-01`;
  const last  = `${y}-${String(mi+1).padStart(2,'0')}-${String(new Date(y,mi+1,0).getDate()).padStart(2,'0')}`;
  return { from: first, to: last, label: MONTHS_PT[mi] };
}

function DayPicker({ selected, onChange, initialDate }: {
  selected: string[];
  onChange: (days: string[]) => void;
  initialDate?: string;
}) {
  const today = new Date();
  const init  = initialDate ? new Date(initialDate + 'T12:00:00') : today;
  const [year, setYear]   = useState(init.getFullYear());
  const [month, setMonth] = useState(init.getMonth());

  const firstDOW    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const cells: (number|null)[] = [
    ...Array(firstDOW).fill(null),
    ...Array.from({length: daysInMonth}, (_, i) => i+1),
  ];

  function toggle(day: number) {
    const s = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    onChange(selected.includes(s) ? selected.filter(d => d !== s) : [...selected, s]);
  }

  const todayStr = ymd(today);

  return (
    <div style={{ border:'1px solid var(--border-light)', borderRadius:7, overflow:'hidden', userSelect:'none', width:'100%', maxWidth:240 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 8px', background:'var(--bg-subtle)', borderBottom:'1px solid var(--border-light)' }}>
        <button onClick={() => { if (month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1); }}
          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', fontSize:'0.9rem', lineHeight:1, padding:'2px 5px' }}>‹</button>
        <span style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--text-primary)' }}>{MONTHS_PT[month]} {year}</span>
        <button onClick={() => { if (month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1); }}
          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', fontSize:'0.9rem', lineHeight:1, padding:'2px 5px' }}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', padding:'3px 6px 0' }}>
        {WEEKDAYS.map((w,i) => (
          <div key={i} style={{ textAlign:'center', fontSize:'0.6rem', fontWeight:700, color:'var(--text-muted)', padding:'2px 0' }}>{w}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', padding:'0 6px 6px', gap:1 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const s = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isSel = selected.includes(s);
          const isToday = s === todayStr;
          return (
            <button key={i} onClick={() => toggle(day)}
              style={{
                aspectRatio:'1', borderRadius:'50%', border:'none', cursor:'pointer',
                fontSize:'0.68rem', fontWeight: isSel||isToday ? 700 : 400,
                background: isSel ? 'var(--primary)' : isToday ? 'var(--primary-light)' : 'transparent',
                color: isSel ? '#fff' : isToday ? 'var(--primary)' : 'var(--text-primary)',
                outline: 'none', padding:0,
              }}
            >{day}</button>
          );
        })}
      </div>
    </div>
  );
}

function DateRangePicker({ from, to, onChange }: {
  from: string; to: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>Início</div>
        <input type="date" value={from} onChange={e => onChange(e.target.value, to < e.target.value ? e.target.value : to)}
          style={{ ...inputStyle, padding:'7px 10px' }} />
      </div>
      <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:18 }}>→</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>Fim</div>
        <input type="date" value={to} min={from} onChange={e => onChange(from, e.target.value)}
          style={{ ...inputStyle, padding:'7px 10px' }} />
      </div>
    </div>
  );
}

function AbsenceDetailModal({ absence, onClose, onUpdated, onDeleted }: {
  absence: Absence;
  onClose: () => void;
  onUpdated: (a: Absence) => void;
  onDeleted: (id: string) => void;
}) {
  const [mode, setMode]   = useState<'view'|'edit'>('view');
  const [reason, setReason]         = useState(absence.reason);
  const [justification, setJustification] = useState(absence.justification ?? '');
  const isSingleDay = absence.start_date === absence.end_date;
  const [useRange, setUseRange]     = useState(!isSingleDay);
  const [selectedDays, setSelectedDays] = useState<string[]>([absence.start_date]);
  const [rangeFrom, setRangeFrom]   = useState(absence.start_date);
  const [rangeTo, setRangeTo]       = useState(absence.end_date);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr]         = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave() {
    setSaving(true); setErr('');
    try {
      let start: string, end: string;
      if (useRange) {
        start = rangeFrom; end = rangeTo || rangeFrom;
      } else {
        const days = [...selectedDays].sort();
        if (days.length === 0) { setErr('Selecione ao menos um dia.'); setSaving(false); return; }
        start = days[0]; end = days[days.length - 1];
      }
      const updated = await updateAbsence(absence.id, {
        reason, justification: justification || null,
        start_date: start, end_date: end,
      });
      onUpdated(updated);
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  async function confirmAndDelete() {
    setDeleting(true);
    setConfirmDelete(false);
    try {
      await deleteAbsence(absence.id);
      onDeleted(absence.id);
      onClose();
    } finally { setDeleting(false); }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:480, boxShadow:'0 24px 64px rgba(0,0,0,0.22)', overflow:'hidden' }}>
        <div style={{ height:4, background:reasonColor(absence.reason).color }} />
        <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid var(--border-light)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:4 }}>
              {absence.employee_name}
            </div>
            <span style={{ background: reasonColor(absence.reason).bg, color: reasonColor(absence.reason).color, borderRadius:4, padding:'2px 8px', fontSize:'0.75rem', fontWeight:700 }}>{absence.reason}</span>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1.3rem', color:'var(--text-muted)', lineHeight:1 }}>×</button>
        </div>

        <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:14, maxHeight:'60vh', overflowY:'auto' }}>
          {mode === 'view' ? (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <div style={fieldLabel}>Início</div>
                  <div style={fieldValue}>{formatDate(absence.start_date)}</div>
                </div>
                <div>
                  <div style={fieldLabel}>Fim</div>
                  <div style={fieldValue}>{formatDate(absence.end_date)}</div>
                </div>
              </div>
              <div>
                <div style={fieldLabel}>Justificativa</div>
                {absence.justification
                  ? <div style={{ fontSize:'0.875rem', color:'var(--text-primary)', background:'var(--bg-subtle)', borderRadius:6, padding:'10px 12px', lineHeight:1.6 }}>{absence.justification}</div>
                  : <div style={{ fontSize:'0.85rem', color:'var(--text-muted)', fontStyle:'italic' }}>Nenhuma justificativa informada.</div>
                }
              </div>
              {absence.file_name && (
                <div>
                  <div style={fieldLabel}>Arquivo</div>
                  <span style={{ fontSize:'0.82rem', color:'var(--primary)', display:'flex', alignItems:'center', gap:5 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    {absence.file_name}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label style={labelStyle}>Motivo</label>
                <select value={reason} onChange={e => setReason(e.target.value)} style={inputStyle}>
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Justificativa</label>
                <textarea value={justification} onChange={e => setJustification(e.target.value)} rows={3}
                  style={{ ...inputStyle, resize:'vertical', minHeight:70 }} />
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom:8 }}>Data(s)</label>
                <div style={{ display:'flex', background:'var(--bg-subtle)', border:'1px solid var(--border-light)', borderRadius:9, padding:3, gap:2, marginBottom:12 }}>
                  {([false, true] as const).map(isRange => (
                    <button key={String(isRange)} onClick={() => setUseRange(isRange)}
                      style={{
                        flex:1, padding:'6px 0', borderRadius:7, border:'none', cursor:'pointer',
                        fontSize:'0.83rem', fontWeight:600,
                        background: useRange === isRange ? '#fff' : 'transparent',
                        color: useRange === isRange ? 'var(--primary)' : 'var(--text-muted)',
                        boxShadow: useRange === isRange ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                        transition: 'all 0.15s',
                      }}>
                      {isRange ? 'Intervalo' : 'Dias individuais'}
                    </button>
                  ))}
                </div>
                {useRange ? (
                  <DateRangePicker from={rangeFrom} to={rangeTo}
                    onChange={(f, t) => { setRangeFrom(f); setRangeTo(t); }} />
                ) : (
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <DayPicker selected={selectedDays} onChange={setSelectedDays} initialDate={absence.start_date} />
                    <div style={{ flex:1, minWidth:0 }}>
                      {selectedDays.length === 0 ? (
                        <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', fontStyle:'italic', paddingTop:4 }}>
                          Nenhum dia selecionado.
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)', marginBottom:6 }}>
                            {selectedDays.length} dia{selectedDays.length !== 1 ? 's' : ''}
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight: selectedDays.length >= 7 ? 140 : 'none', overflowY: selectedDays.length >= 7 ? 'auto' : 'visible' }}>
                            {[...selectedDays].sort().map(d => (
                              <span key={d} style={{ background:'var(--primary-light)', color:'var(--primary)', borderRadius:5, padding:'4px 9px', fontSize:'0.78rem', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'space-between', gap:4 }}>
                                {formatDate(d)}
                                <button onClick={() => setSelectedDays(prev => prev.filter(x => x !== d))}
                                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--primary)', padding:0, lineHeight:1, fontSize:'0.9rem', opacity:0.7 }}>×</button>
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {err && <p style={{ color:'#ef4444', fontSize:'0.82rem', margin:0 }}>{err}</p>}
            </>
          )}
        </div>

        <div style={{ padding:'12px 22px 18px', display:'flex', justifyContent:'space-between', gap:8 }}>
          <button onClick={() => setConfirmDelete(true)} disabled={deleting}
            style={{ padding:'7px 14px', background:'#fff5f5', border:'1px solid #fecaca', borderRadius:6, color:'#dc2626', fontFamily:'inherit', fontSize:'0.83rem', fontWeight:600, cursor:'pointer' }}>
            {deleting ? '...' : 'Excluir'}
          </button>
          <div style={{ display:'flex', gap:8 }}>
            {mode === 'view' ? (
              <>
                <button onClick={onClose} style={cancelBtn}>Fechar</button>
                <button onClick={() => setMode('edit')} style={saveBtn}>Editar</button>
              </>
            ) : (
              <>
                <button onClick={() => setMode('view')} style={cancelBtn}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={saveBtn}>{saving ? 'Salvando…' : 'Salvar'}</button>
              </>
            )}
          </div>
        </div>
      </div>
      <ConfirmModal
        open={confirmDelete}
        title="Excluir falta"
        message="Esta justificativa será removida permanentemente."
        confirmLabel="Excluir"
        danger
        onConfirm={confirmAndDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

export default function FaltasPage() {
  const currentUser = getUser();
  const seeAll   = canSeeAllAbsences(currentUser?.role);
  const todayStr = ymd(new Date());
  const { toasts, addToast, dismissToast } = useToast();

  const [absences, setAbsences] = useState<Absence[]>([]);
  const [users, setUsers]       = useState<UserPublic[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail]       = useState<Absence | null>(null);

  const [filterUserId, setFilterUserId] = useState<string | null>(null);
  const nowDate = new Date();
  const [calYear,  setCalYear]  = useState(nowDate.getFullYear());
  const [calMonth, setCalMonth] = useState(nowDate.getMonth());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message?: string; onConfirm: () => void } | null>(null);

  const [selectedUserId, setSelectedUserId] = useState(currentUser?.user_id ?? '');
  const [reason, setReason]         = useState('Doença');
  const [justification, setJustification] = useState('');
  const [fileName, setFileName]   = useState<string | null>(null);
  const [fileData, setFileData]   = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([todayStr]);
  const [useRange, setUseRange]   = useState(false);
  const [rangeFrom, setRangeFrom] = useState(todayStr);
  const [rangeTo, setRangeTo]     = useState(todayStr);
  const [saving, setSaving]       = useState(false);
  const [formErr, setFormErr]     = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const [fetchedAbsences, allUsers] = await Promise.all([fetchAbsences(), fetchUsers()]);
      setAbsences(fetchedAbsences);
      setUsers(allUsers.filter(u => u.role !== 'Admin'));
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [filterUserId, calYear, calMonth]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = ev => setFileData((ev.target?.result as string).split(',')[1] ?? null);
    reader.readAsDataURL(f);
  }

  async function handleSave() {
    const userId = currentUser?.user_id ?? '';
    if (!userId) { setFormErr('Usuário não identificado.'); return; }
    setFormErr(''); setSaving(true);
    try {
      const created: Absence[] = [];
      if (useRange) {
        const start = rangeFrom || todayStr;
        const end   = rangeTo   || start;
        const a = await createAbsence({
          user_id: userId || null, reason,
          justification: justification || null,
          file_name: fileName, file_data: fileData,
          start_date: start, end_date: end,
        });
        created.push(a);
      } else {
        const days = selectedDays.length > 0 ? [...selectedDays].sort() : [todayStr];
        for (const day of days) {
          const a = await createAbsence({
            user_id: userId || null, reason,
            justification: justification || null,
            file_name: fileName, file_data: fileData,
            start_date: day, end_date: day,
          });
          created.push(a);
        }
      }
      setAbsences(prev => [...created, ...prev]);
      resetForm();
      setShowModal(false);
      const label = created.length === 1 ? '1 falta registrada' : `${created.length} faltas registradas`;
      addToast('success', 'Falta registrada', `${label} com sucesso.`);
    } catch (err: unknown) {
      setFormErr(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  function resetForm(prefDay?: string) {
    setSelectedUserId(currentUser?.user_id ?? ''); setReason('Doença'); setJustification('');
    setFileName(null); setFileData(null);
    setSelectedDays(prefDay ? [prefDay] : [todayStr]); setUseRange(false);
    setRangeFrom(prefDay ?? todayStr); setRangeTo(prefDay ?? todayStr);
    setFormErr('');
    if (fileRef.current) fileRef.current.value = '';
  }

  function toggleSelection(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const pageIds = pagedAbsences.map(a => a.id);
    const allSelected = pageIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) { pageIds.forEach(id => next.delete(id)); }
      else { pageIds.forEach(id => next.add(id)); }
      return next;
    });
  }

  function confirmDeleteSelected() {
    const count = selectedIds.size;
    if (count === 0) return;
    setConfirmDialog({
      title: `Excluir ${count} justificativa${count > 1 ? 's' : ''}`,
      message: 'Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        const ids = [...selectedIds];
        for (const id of ids) {
          try { await deleteAbsence(id); } catch { /* continua */ }
        }
        setAbsences(prev => prev.filter(a => !ids.includes(a.id)));
        setSelectedIds(new Set());
      },
    });
  }

  function confirmDeleteOne(a: Absence) {
    setConfirmDialog({
      title: 'Excluir justificativa',
      message: 'Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        await deleteAbsence(a.id);
        setAbsences(prev => prev.filter(x => x.id !== a.id));
        setSelectedIds(prev => { const n = new Set(prev); n.delete(a.id); return n; });
      },
    });
  }

  function openNewFromDay(dayStr: string) {
    resetForm(dayStr);
    setShowModal(true);
  }

  const from = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
  const to   = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(new Date(calYear, calMonth + 1, 0).getDate()).padStart(2, '0')}`;
  const monthLabel = MONTHS_PT[calMonth];

  const visibleUsers = seeAll
    ? users
    : users.filter(u => u.id === currentUser?.user_id);

  const baseAbsences = seeAll
    ? absences
    : absences.filter(a => a.user_id === currentUser?.user_id);

  const filterUser = filterUserId ? visibleUsers.find(u => u.id === filterUserId) ?? null : null;

  const visibleAbsences = filterUserId
    ? baseAbsences.filter(a => a.user_id === filterUserId && a.start_date >= from && a.start_date <= to)
    : baseAbsences;

  const statsByUser: Record<string, number> = {};
  for (const a of visibleAbsences) {
    if (a.start_date >= from && a.start_date <= to)
      statsByUser[a.employee_name] = (statsByUser[a.employee_name] ?? 0) + 1;
  }

  const totalPages   = Math.max(1, Math.ceil(visibleAbsences.length / PAGE_SIZE));
  const pagedAbsences = visibleAbsences.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Calendário filtra só por pessoa (sem limite de mês) para funcionar na navegação de meses
  const calAbsences = filterUserId
    ? baseAbsences.filter(a => a.user_id === filterUserId)
    : baseAbsences;

  const calItems: CalendarItem[] = calAbsences.map(a => {
    const rc = reasonColor(a.reason);
    return { id: a.id, label: a.employee_name, start_date: a.start_date, end_date: a.end_date, color: rc.color, bg: rc.bg, subtitle: a.reason };
  });

  return (
    <>
      <div className="topbar">
        <div className="topbar-left"><h1>Faltas</h1></div>
      </div>
      <div style={{ padding:'24px 28px' }}>

      {/* Layout principal: sidebar colaboradores + calendário */}
      <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:20, marginBottom:20, alignItems:'start' }}>

        {/* Sidebar de colaboradores */}
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid var(--border-light)', overflow:'hidden', boxShadow:'0 1px 4px rgba(3,78,162,0.05)' }}>
          <div style={{ padding:'11px 16px', borderBottom:'1px solid var(--border-light)', background:'var(--bg-subtle)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)' }}>Colaboradores</span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {filterUserId && (
                <button onClick={() => setFilterUserId(null)}
                  title="Limpar filtro"
                  style={{ background:'var(--primary-light)', border:'none', borderRadius:20, padding:'2px 8px', fontSize:'0.68rem', fontWeight:700, color:'var(--primary)', cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
                  ×
                </button>
              )}
              <span style={{ background:'var(--primary-light)', color:'var(--primary)', borderRadius:20, padding:'2px 9px', fontSize:'0.7rem', fontWeight:700 }}>{visibleUsers.length}</span>
            </div>
          </div>
          <div style={{ overflowY:'auto', maxHeight:420 }}>
            {visibleUsers.length === 0 ? (
              <div style={{ padding:'28px 16px', textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem' }}>
                Nenhum colaborador nesta diretoria.
              </div>
            ) : visibleUsers.map(user => {
              const count = statsByUser[user.name] ?? 0;
              const initials = user.name.split(' ').map((w: string) => w[0]).slice(0,2).join('').toUpperCase();
              const hasAbsences = count > 0;
              const isActive = filterUserId === user.id;
              return (
                <div key={user.id}
                  onClick={() => setFilterUserId(prev => prev === user.id ? null : user.id)}
                  style={{
                    display:'flex', alignItems:'center', gap:10, padding:'10px 16px',
                    borderBottom:'1px solid var(--border-light)', cursor:'pointer',
                    background: isActive ? 'var(--primary-light)' : undefined,
                    borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                    transition:'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = ''; }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', background: isActive ? 'var(--primary)' : hasAbsences ? '#fee2e2' : 'var(--primary-light)', color: isActive ? '#fff' : hasAbsences ? '#ef4444' : 'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.7rem', flexShrink:0 }}>
                    {initials}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'0.83rem', fontWeight: isActive ? 700 : 600, color: isActive ? 'var(--primary)' : 'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={user.name}>{user.name}</div>
                    <div style={{ fontSize:'0.72rem', color: isActive ? 'var(--primary)' : hasAbsences ? '#ef4444' : 'var(--text-muted)', fontWeight:500, marginTop:1 }}>
                      {count === 0 ? `0 faltas em ${monthLabel}` : `${count} falta${count !== 1 ? 's' : ''} em ${monthLabel}`}
                    </div>
                  </div>
                  {hasAbsences && (
                    <span style={{ background: isActive ? 'var(--primary)' : '#fee2e2', color: isActive ? '#fff' : '#ef4444', borderRadius:20, padding:'2px 9px', fontSize:'0.72rem', fontWeight:700, flexShrink:0 }}>{count}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Calendário */}
        <div>
          <MonthCalendar
            items={calItems}
            title="Calendário de Ausências"
            onClickDay={openNewFromDay}
            onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
          />

          {/* Legenda inline abaixo do calendário */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:12 }}>
            {REASONS.map(r => {
              const rc = reasonColor(r);
              return (
                <div key={r} style={{ display:'flex', alignItems:'center', gap:5, background:'#fff', border:`1px solid ${rc.color}33`, borderRadius:20, padding:'3px 10px 3px 7px' }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:rc.color, display:'inline-block', flexShrink:0 }} />
                  <span style={{ fontSize:'0.72rem', fontWeight:600, color:rc.color }}>{r}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:16, border:'1px solid var(--border-light)', overflow:'hidden', boxShadow:'0 2px 12px rgba(3,78,162,0.06)' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border-light)', display:'flex', justifyContent:'space-between', alignItems:'center', minHeight:52 }}>
          {selectedIds.size > 0 ? (
            <>
              <span style={{ fontSize:'0.85rem', fontWeight:600, color:'var(--primary)', display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ background:'var(--primary-light)', color:'var(--primary)', borderRadius:20, padding:'2px 10px', fontSize:'0.78rem', fontWeight:700 }}>{selectedIds.size}</span>
                selecionado{selectedIds.size !== 1 ? 's' : ''}
              </span>
              <button
                onClick={confirmDeleteSelected}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, border:'1px solid #fecaca', background:'#fff5f5', color:'#dc2626', cursor:'pointer', fontSize:'0.82rem', fontWeight:600 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Excluir {selectedIds.size}
              </button>
            </>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <div style={{ width:30, height:30, borderRadius:8, background:'var(--primary-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <span style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--text-primary)' }}>Registros</span>
              {visibleAbsences.length > 0 && (
                <span style={{ background:'var(--primary-light)', color:'var(--primary)', borderRadius:20, padding:'2px 10px', fontSize:'0.72rem', fontWeight:700 }}>{visibleAbsences.length}</span>
              )}
              {filterUser && (
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:20, padding:'3px 10px 3px 8px', fontSize:'0.75rem', fontWeight:600, color:'#1d4ed8' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {filterUser.name} · {monthLabel}
                  <button onClick={() => setFilterUserId(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#1d4ed8', padding:0, lineHeight:1, fontSize:'0.9rem', marginLeft:2, opacity:0.7 }}>×</button>
                </span>
              )}
            </div>
          )}
        </div>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>Carregando...</div>
        ) : visibleAbsences.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:'var(--text-muted)', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity:0.3 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span style={{ fontSize:'0.88rem' }}>Nenhuma justificativa registrada.</span>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
            <thead>
              <tr>
                <th style={{ padding:'10px 10px 10px 18px', width:36, borderBottom:'1px solid var(--border-light)', background:'var(--bg-app)' }}>
                  <input
                    type="checkbox"
                    checked={pagedAbsences.length > 0 && pagedAbsences.every(a => selectedIds.has(a.id))}
                    ref={el => { if (el) { const n = pagedAbsences.filter(a => selectedIds.has(a.id)).length; el.indeterminate = n > 0 && n < pagedAbsences.length; } }}
                    onChange={toggleSelectAll}
                    style={{ cursor:'pointer', width:14, height:14, accentColor:'var(--primary)' }}
                  />
                </th>
                {['Funcionário','Motivo','Data','Justificativa',''].map((h, i) => (
                  <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:600, color:'var(--text-muted)', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid var(--border-light)', background:'var(--bg-app)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedAbsences.map((a, idx) => {
                const rc = reasonColor(a.reason);
                const isSelected = selectedIds.has(a.id);
                const initials = a.employee_name.split(' ').map((w: string) => w[0]).slice(0,2).join('').toUpperCase();
                return (
                  <tr key={a.id}
                    style={{
                      borderBottom: idx < pagedAbsences.length-1 ? '1px solid var(--border-light)' : 'none',
                      background: isSelected ? '#eff6ff' : undefined,
                      transition:'background 0.12s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background='var(--bg-subtle)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#eff6ff' : ''; }}
                  >
                    <td style={{ padding:'10px 10px 10px 18px' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(a.id)}
                        style={{ cursor:'pointer', width:14, height:14, accentColor:'var(--primary)' }}
                      />
                    </td>
                    <td style={{ padding:'10px 14px', cursor:'pointer' }} onClick={() => setDetail(a)}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--primary-light)', color:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.68rem', fontWeight:700, flexShrink:0 }}>{initials}</div>
                        <span style={{ fontWeight:600, color:'var(--text-primary)' }}>{a.employee_name}</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 14px', cursor:'pointer' }} onClick={() => setDetail(a)}>
                      <span style={{ background:rc.bg, color:rc.color, borderRadius:20, padding:'3px 10px', fontSize:'0.72rem', fontWeight:700, display:'inline-flex', alignItems:'center', gap:5 }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background:rc.color, display:'inline-block' }} />
                        {a.reason}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px', color:'var(--text-secondary)', cursor:'pointer', fontWeight:500 }} onClick={() => setDetail(a)}>
                      {a.start_date === a.end_date ? formatDate(a.start_date) : `${formatDate(a.start_date)} → ${formatDate(a.end_date)}`}
                    </td>
                    <td style={{ padding:'10px 14px', color:'var(--text-secondary)', maxWidth:220, cursor:'pointer' }} onClick={() => setDetail(a)}>
                      {a.justification
                        ? <span style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:'0.82rem' }}>{a.justification}</span>
                        : <span style={{ color:'var(--text-muted)', fontSize:'0.78rem', fontStyle:'italic' }}>Sem justificativa</span>
                      }
                    </td>
                    <td style={{ padding:'10px 12px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display:'flex', gap:4 }}>
                        <button onClick={() => setDetail(a)}
                          style={{ background:'var(--primary-light)', border:'none', cursor:'pointer', color:'var(--primary)', padding:'6px', borderRadius:7, display:'flex', transition:'background 0.15s' }}
                          title="Ver detalhes"
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-glow)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'var(--primary-light)')}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button onClick={() => confirmDeleteOne(a)}
                          style={{ background:'#fff5f5', border:'none', cursor:'pointer', color:'#dc2626', padding:'6px', borderRadius:7, display:'flex', transition:'background 0.15s' }}
                          title="Excluir"
                          onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#fff5f5')}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Paginação — sempre visível quando há dados */}
        {!loading && visibleAbsences.length > 0 && (
          <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7, border:'1px solid var(--border-light)', background: page === 1 ? 'var(--bg-app)' : '#fff', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7, border: p === page ? 'none' : '1px solid var(--border-light)', background: p === page ? 'var(--primary)' : '#fff', color: p === page ? '#fff' : 'var(--text-primary)', fontWeight: p === page ? 700 : 400, fontSize:'0.82rem', cursor:'pointer', fontFamily:'inherit' }}>
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7, border:'1px solid var(--border-light)', background: page === totalPages ? 'var(--bg-app)' : '#fff', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e => { if (e.target===e.currentTarget) setShowModal(false); }}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:520, boxShadow:'0 24px 64px rgba(0,0,0,0.22)', overflow:'hidden' }}>
            <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border-light)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ margin:0, fontSize:'1.05rem', fontWeight:700 }}>Nova Justificativa de Falta</h2>
              <button onClick={() => setShowModal(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', color:'var(--text-muted)', lineHeight:1 }}>×</button>
            </div>
            <div style={{ padding:'22px', display:'flex', flexDirection:'column', gap:16, maxHeight:'70vh', overflowY:'auto' }}>
              <div>
                <label style={labelStyle}>Funcionário</label>
                <input type="text" value={currentUser?.name ?? ''} disabled
                  style={{ ...inputStyle, background:'var(--bg-subtle)', color:'var(--text-muted)', cursor:'not-allowed' }} />
              </div>
              <div>
                <label style={labelStyle}>Motivo da Falta *</label>
                <select value={reason} onChange={e => setReason(e.target.value)} style={inputStyle}>
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Justificativa</label>
                <textarea value={justification} onChange={e => setJustification(e.target.value)} rows={3}
                  placeholder="Descreva a justificativa..." style={{ ...inputStyle, resize:'vertical', minHeight:80 }} />
              </div>
              <div>
                <label style={labelStyle}>Anexar Arquivo (ex: atestado)</label>
                <div style={{ background:'#fffbe6', border:'1px solid #ffe58f', borderRadius:6, padding:'8px 12px', marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d48806" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span style={{ fontSize:'0.78rem', color:'#ad6800', fontWeight:500 }}>Em desenvolvimento — envio de arquivos indisponível.</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, opacity:0.45, pointerEvents:'none' }}>
                  <input ref={fileRef} type="file" onChange={handleFile} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" style={{ display:'none' }} id="falta-file" />
                  <label htmlFor="falta-file" style={{ cursor:'not-allowed', background:'var(--bg-subtle)', border:'1px solid var(--border-light)', borderRadius:6, padding:'6px 14px', fontSize:'0.83rem', color:'var(--text-secondary)', fontWeight:500 }}>
                    Escolher arquivo
                  </label>
                  {fileName && <span style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>{fileName}</span>}
                </div>
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom:8 }}>Dias *</label>
                <div style={{ display:'flex', background:'var(--bg-subtle)', border:'1px solid var(--border-light)', borderRadius:9, padding:3, gap:2, marginBottom:12 }}>
                  {([false, true] as const).map(isRange => (
                    <button key={String(isRange)} onClick={() => setUseRange(isRange)}
                      style={{
                        flex:1, padding:'6px 0', borderRadius:7, border:'none', cursor:'pointer',
                        fontSize:'0.83rem', fontWeight:600,
                        background: useRange === isRange ? '#fff' : 'transparent',
                        color: useRange === isRange ? 'var(--primary)' : 'var(--text-muted)',
                        boxShadow: useRange === isRange ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                        transition: 'all 0.15s',
                      }}>
                      {isRange ? 'Intervalo' : 'Dias individuais'}
                    </button>
                  ))}
                </div>
                {useRange ? (
                  <DateRangePicker from={rangeFrom} to={rangeTo}
                    onChange={(f, t) => { setRangeFrom(f); setRangeTo(t); }} />
                ) : (
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <DayPicker selected={selectedDays} onChange={setSelectedDays} />
                    <div style={{ flex:1, minWidth:0 }}>
                      {selectedDays.length === 0 ? (
                        <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', fontStyle:'italic', paddingTop:4 }}>
                          Nenhum dia selecionado —<br/>será usado a data de hoje.
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)', marginBottom:6 }}>
                            {selectedDays.length} dia{selectedDays.length !== 1 ? 's' : ''} selecionado{selectedDays.length !== 1 ? 's' : ''}
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight: selectedDays.length >= 7 ? 140 : 'none', overflowY: selectedDays.length >= 7 ? 'auto' : 'visible' }}>
                            {[...selectedDays].sort().map(d => (
                              <span key={d} style={{ background:'var(--primary-light)', color:'var(--primary)', borderRadius:5, padding:'4px 9px', fontSize:'0.78rem', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'space-between', gap:4 }}>
                                {formatDate(d)}
                                <button onClick={() => setSelectedDays(prev => prev.filter(x => x !== d))}
                                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--primary)', padding:0, lineHeight:1, fontSize:'0.9rem', opacity:0.7 }}>×</button>
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {formErr && <p style={{ color:'#ef4444', fontSize:'0.82rem', margin:0 }}>{formErr}</p>}
            </div>
            <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border-light)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
                {!useRange && selectedDays.length > 1 ? `${selectedDays.length} registros serão criados` : ''}
              </span>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setShowModal(false)} style={cancelBtn}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={saveBtn}>
                  {saving ? 'Salvando...' : (!useRange && selectedDays.length > 1) ? `Salvar ${selectedDays.length} registros` : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <AbsenceDetailModal
          absence={detail}
          onClose={() => setDetail(null)}
          onUpdated={updated => setAbsences(prev => prev.map(a => a.id === updated.id ? updated : a))}
          onDeleted={id => setAbsences(prev => prev.filter(a => a.id !== id))}
        />
      )}

      <ConfirmModal
        open={!!confirmDialog}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message}
        confirmLabel="Excluir"
        danger
        onConfirm={() => confirmDialog?.onConfirm()}
        onClose={() => setConfirmDialog(null)}
      />

    </div>

    {/* FAB */}
    <button
      onClick={() => { resetForm(); setShowModal(true); }}
      title="Nova Justificativa de Falta"
      style={{
        position: 'fixed', bottom: 32, right: 32, zIndex: 900,
        width: 52, height: 52, borderRadius: '50%',
        background: 'var(--primary)', color: '#fff', border: 'none',
        boxShadow: '0 4px 16px rgba(3,78,162,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>

    <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

const fieldLabel: React.CSSProperties = { fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:4 };
const fieldValue: React.CSSProperties = { fontSize:'0.875rem', fontWeight:600, color:'var(--text-primary)' };
const labelStyle: React.CSSProperties = { display:'block', fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:5 };
const inputStyle: React.CSSProperties = { width:'100%', border:'1px solid var(--border-light)', borderRadius:7, padding:'8px 11px', fontSize:'0.88rem', outline:'none', boxSizing:'border-box', background:'#fff', color:'var(--text-primary)' };
const cancelBtn: React.CSSProperties = { background:'var(--bg-subtle)', border:'1px solid var(--border-light)', borderRadius:7, padding:'8px 18px', fontSize:'0.88rem', cursor:'pointer', fontWeight:500, color:'var(--text-secondary)' };
const saveBtn: React.CSSProperties = { background:'var(--primary)', color:'#fff', border:'none', borderRadius:7, padding:'8px 22px', fontSize:'0.88rem', fontWeight:600, cursor:'pointer' };
