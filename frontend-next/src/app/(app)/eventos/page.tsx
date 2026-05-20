'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  fetchEvents, createEvent, updateEvent, deleteEvent, fetchUsers,
  type CalendarEvent, type UserPublic,
} from '@/lib/api';

// ── helpers ───────────────────────────────────────────────────────────────────

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const PALETTE = [
  { color: '#1d4ed8', bg: '#dbeafe', light: '#eff6ff' },
  { color: '#15803d', bg: '#dcfce7', light: '#f0fdf4' },
  { color: '#9333ea', bg: '#f3e8ff', light: '#faf5ff' },
  { color: '#b91c1c', bg: '#fee2e2', light: '#fff5f5' },
  { color: '#b45309', bg: '#fef3c7', light: '#fffbeb' },
  { color: '#0f766e', bg: '#ccfbf1', light: '#f0fdfa' },
  { color: '#be185d', bg: '#fce7f3', light: '#fdf2f8' },
  { color: '#7c3aed', bg: '#ede9fe', light: '#f5f3ff' },
];

function palette(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function ymd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const [,month,day] = dateStr.split('-');
  return `${day}/${month}`;
}

function formatDateFull(dateStr: string) {
  if (!dateStr) return '-';
  const [year,month,day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function parseResps(jsonStr: string): string[] {
  try { return JSON.parse(jsonStr); } catch { return []; }
}

function eventsForDay(events: CalendarEvent[], day: string) {
  return events.filter((calEvent) => calEvent.start_date <= day && calEvent.end_date >= day);
}

// ── Preview popup ─────────────────────────────────────────────────────────────

interface PreviewState {
  event: CalendarEvent;
  cursorX: number;
  cursorY: number;
}

function EventPreview({
  preview, onEdit, onDelete, onClose, deleting,
}: {
  preview: PreviewState;
  onEdit: (ev: CalendarEvent) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  deleting: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { event: calEvent, cursorX, cursorY } = preview;
  const colorPalette = palette(calEvent.id);
  const responsibles = parseResps(calEvent.responsibles);
  const sameDay = calEvent.start_date === calEvent.end_date;

  // Adjust position so popup stays in viewport
  const [pos, setPos] = useState({ left: cursorX + 12, top: cursorY - 8 });
  useEffect(() => {
    if (!ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    setPos({
      left: Math.min(cursorX + 12, vw - width - 16),
      top:  Math.min(cursorY - 8,  vh - height - 16),
    });
  }, [cursorX, cursorY]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', left: pos.left, top: pos.top, zIndex: 2000,
        background: '#fff', borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
        width: 280, overflow: 'hidden',
        border: '1px solid var(--border-light)',
      }}
    >
      {/* Color bar + close */}
      <div style={{ height: 5, background: colorPalette.color }} />
      <div style={{ padding: '14px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, wordBreak: 'break-word' }}>
            {calEvent.name}
          </div>
          <span style={{ background: colorPalette.bg, color: colorPalette.color, borderRadius: 4, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>{calEvent.event_type}</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1, padding: '0 0 0 8px', flexShrink: 0 }}>×</button>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Date / time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>
            {sameDay ? formatDateFull(calEvent.start_date) : `${formatDate(calEvent.start_date)} → ${formatDateFull(calEvent.end_date)}`}
            {calEvent.start_time && <span style={{ marginLeft: 6, fontWeight: 600, color: colorPalette.color }}>{calEvent.start_time}</span>}
          </span>
        </div>

        {/* Responsibles */}
        {responsibles.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginTop: 2, flexShrink: 0 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>{responsibles.join(', ')}</span>
          </div>
        )}

        {/* Attendees */}
        {calEvent.attendees && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginTop: 2, flexShrink: 0 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>{calEvent.attendees}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 16px 14px', display: 'flex', gap: 8 }}>
        <button
          onClick={() => { onDelete(calEvent.id); onClose(); }}
          disabled={deleting === calEvent.id}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 7, border: '1px solid #fecaca',
            background: '#fff5f5', color: '#dc2626', fontSize: '0.82rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          {deleting === calEvent.id ? 'Excluindo…' : 'Excluir'}
        </button>
        <button
          onClick={() => { onClose(); onEdit(calEvent); }}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 7, border: 'none',
            background: 'var(--primary)', color: '#fff', fontSize: '0.82rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Editar
        </button>
      </div>
    </div>
  );
}

// ── EventChip (month view) ────────────────────────────────────────────────────

function EventChip({ event: calEvent, onClick }: { event: CalendarEvent; onClick: (e: React.MouseEvent) => void }) {
  const colorPalette = palette(calEvent.id);
  const responsibles = parseResps(calEvent.responsibles);
  return (
    <div
      onClick={onClick}
      style={{ background: colorPalette.bg, borderLeft: `3px solid ${colorPalette.color}`, borderRadius: 4, padding: '3px 6px', marginBottom: 2, cursor: 'pointer' }}
    >
      {calEvent.start_time && <div style={{ fontSize: '0.6rem', color: colorPalette.color, fontWeight: 700, lineHeight: 1, marginBottom: 1 }}>{calEvent.start_time}</div>}
      <div style={{ fontSize: '0.65rem', fontWeight: 600, color: colorPalette.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{calEvent.name}</div>
      {responsibles.length > 0 && <div style={{ fontSize: '0.58rem', color: colorPalette.color, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{responsibles[0]}{responsibles.length > 1 ? ` +${responsibles.length-1}` : ''}</div>}
    </div>
  );
}

// ── Month view ────────────────────────────────────────────────────────────────

function MonthView({ events, year, month, todayStr, onChipClick, onClickDay }: {
  events: CalendarEvent[]; year: number; month: number; todayStr: string;
  onChipClick: (ev: CalendarEvent, e: React.MouseEvent) => void;
  onClickDay: (d: string) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--border-light)' }}>
        {WEEKDAYS_SHORT.map(w => (
          <div key={w} style={{ padding:'8px 4px', textAlign:'center', fontSize:'0.72rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{w}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
        {cells.map((day, idx) => {
          const dayStr = day ? `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` : '';
          const isToday = dayStr === todayStr;
          const dayEvs = dayStr ? eventsForDay(events, dayStr) : [];
          return (
            <div
              key={idx}
              onClick={() => day && onClickDay(dayStr)}
              style={{
                minHeight: 72, padding: '4px 5px',
                borderRight: (idx+1)%7!==0 ? '1px solid var(--border-light)' : 'none',
                borderBottom: idx<cells.length-7 ? '1px solid var(--border-light)' : 'none',
                background: day===null ? '#f8fafc' : '#fff',
                cursor: day ? 'pointer' : undefined,
              }}
            >
              {day && (
                <>
                  <div style={{
                    fontSize:'0.75rem', fontWeight:isToday?700:500,
                    color:isToday?'#fff':'var(--text-secondary)',
                    background:isToday?'var(--primary)':'transparent',
                    width:22, height:22, borderRadius:'50%',
                    display:'flex', alignItems:'center', justifyContent:'center', marginBottom:3,
                  }}>{day}</div>
                  <div>
                    {dayEvs.slice(0,2).map((calEvent) => (
                      <EventChip key={calEvent.id} event={calEvent} onClick={(e) => { e.stopPropagation(); onChipClick(calEvent, e); }} />
                    ))}
                    {dayEvs.length > 2 && <div style={{ fontSize:'0.6rem', color:'var(--text-muted)', paddingLeft:4 }}>+{dayEvs.length-2} mais</div>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Week view ─────────────────────────────────────────────────────────────────

function WeekView({ events, weekStart, todayStr, onChipClick, onClickDay }: {
  events: CalendarEvent[]; weekStart: Date; todayStr: string;
  onChipClick: (ev: CalendarEvent, e: React.MouseEvent) => void;
  onClickDay: (d: string) => void;
}) {
  const days = Array.from({length:7}, (_, i) => { const dayDate=new Date(weekStart); dayDate.setDate(weekStart.getDate()+i); return dayDate; });

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
      {days.map((dayDate, idx) => {
        const dayStr = ymd(dayDate);
        const isToday = dayStr === todayStr;
        const dayEvs = eventsForDay(events, dayStr);
        return (
          <div key={idx}
            style={{ borderRight: idx<6?'1px solid var(--border-light)':'none', minHeight:240, cursor:'pointer' }}
            onClick={() => onClickDay(dayStr)}
          >
            <div style={{ padding:'10px 8px 6px', borderBottom:'1px solid var(--border-light)', textAlign:'center' }}>
              <div style={{ fontSize:'0.7rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{WEEKDAYS_SHORT[dayDate.getDay()]}</div>
              <div style={{
                fontSize:'1.1rem', fontWeight:isToday?700:500,
                color:isToday?'#fff':'var(--text-primary)',
                background:isToday?'var(--primary)':'transparent',
                width:32, height:32, borderRadius:'50%',
                display:'flex', alignItems:'center', justifyContent:'center', margin:'4px auto 0',
              }}>{dayDate.getDate()}</div>
            </div>
            <div style={{ padding:'6px 5px' }}>
              {dayEvs.map((calEvent) => {
                const colorPalette = palette(calEvent.id);
                const responsibles = parseResps(calEvent.responsibles);
                return (
                  <div key={calEvent.id}
                    onClick={(e) => { e.stopPropagation(); onChipClick(calEvent, e); }}
                    style={{
                      background:colorPalette.bg, borderLeft:`4px solid ${colorPalette.color}`,
                      borderRadius:6, padding:'8px 10px', marginBottom:6, cursor:'pointer',
                      boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
                    }}
                  >
                    {calEvent.start_time && <div style={{ fontSize:'0.68rem', color:colorPalette.color, fontWeight:700, marginBottom:2 }}>{calEvent.start_time}</div>}
                    <div style={{ fontSize:'0.78rem', fontWeight:700, color:colorPalette.color, marginBottom:2 }}>{calEvent.name}</div>
                    {responsibles.length > 0 && <div style={{ fontSize:'0.7rem', color:colorPalette.color, opacity:0.75 }}>{responsibles.slice(0,2).join(', ')}{responsibles.length>2?` +${responsibles.length-2}`:''}</div>}
                    <div style={{ marginTop:4 }}>
                      <span style={{ fontSize:'0.62rem', background:'rgba(255,255,255,0.7)', color:colorPalette.color, borderRadius:3, padding:'1px 6px', fontWeight:600 }}>{calEvent.event_type}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EventosPage() {
  const now = new Date();
  const todayStr = ymd(now);

  const [events, setEvents]     = useState<CalendarEvent[]>([]);
  const [users, setUsers]       = useState<UserPublic[]>([]);
  const [loading, setLoading]   = useState(true);
  const [viewMode, setViewMode] = useState<'month'|'week'>('month');
  const [year, setYear]         = useState(now.getFullYear());
  const [month, setMonth]       = useState(now.getMonth());
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const initialWeekStart = new Date(now); initialWeekStart.setDate(initialWeekStart.getDate()-initialWeekStart.getDay()); initialWeekStart.setHours(0,0,0,0); return initialWeekStart;
  });

  // Preview
  const [preview, setPreview] = useState<PreviewState | null>(null);

  // Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);

  // Form
  const [evName, setEvName]         = useState('');
  const [respList, setRespList]     = useState<string[]>([]);
  const [evType, setEvType]         = useState<'Presencial'|'Online'>('Presencial');
  const [attendees, setAttendees]   = useState('');
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [startTime, setStartTime]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [formErr, setFormErr]       = useState('');
  const [respSearch, setRespSearch] = useState('');
  const [respOpen, setRespOpen]     = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [fetchedEvents, allUsers] = await Promise.all([fetchEvents(), fetchUsers()]);
      setEvents(fetchedEvents); setUsers(allUsers.filter((user) => user.role !== 'Admin'));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function handleChipClick(calEvent: CalendarEvent, e: React.MouseEvent) {
    setPreview({ event: calEvent, cursorX: e.clientX, cursorY: e.clientY });
  }

  const closePreview = useCallback(() => setPreview(null), []);

  function openNew(prefDate = '') {
    setPreview(null);
    setEditing(null);
    setEvName(''); setRespList([]); setEvType('Presencial'); setAttendees('');
    setStartDate(prefDate); setEndDate(prefDate); setStartTime(''); setFormErr('');
    setRespSearch(''); setRespOpen(false);
    setShowModal(true);
  }

  function openEdit(ev: CalendarEvent) {
    setPreview(null);
    setEditing(ev);
    setEvName(ev.name); setRespList(parseResps(ev.responsibles));
    setEvType(ev.event_type as 'Presencial'|'Online');
    setAttendees(ev.attendees ?? ''); setStartDate(ev.start_date); setEndDate(ev.end_date);
    setStartTime(ev.start_time ?? ''); setFormErr(''); setRespSearch(''); setRespOpen(false);
    setShowModal(true);
  }

  async function handleSave() {
    if (!evName.trim() || !startDate || !endDate) { setFormErr('Preencha nome, data de início e data de fim.'); return; }
    if (startDate > endDate) { setFormErr('Data de início não pode ser posterior à data de fim.'); return; }
    setFormErr(''); setSaving(true);
    const responsible_ids = respList
      .map((userName) => users.find((user) => user.name === userName)?.id)
      .filter((id): id is string => !!id);
    const payload = {
      name: evName.trim(), responsible_ids,
      event_type: evType, attendees: attendees.trim() || null,
      start_date: startDate, end_date: endDate, start_time: startTime || null,
    };
    try {
      if (editing) {
        const updated = await updateEvent(editing.id, payload);
        setEvents((currentEvents) => currentEvents.map((calEvent) => calEvent.id === updated.id ? updated : calEvent));
      } else {
        const created = await createEvent(payload);
        setEvents((currentEvents) => [created, ...currentEvents]);
      }
      setShowModal(false);
    } catch (err: unknown) {
      setFormErr(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try { await deleteEvent(id); setEvents((currentEvents) => currentEvents.filter((calEvent) => calEvent.id !== id)); }
    finally { setDeleting(null); }
  }

  function toggleResp(name: string) {
    setRespList((currentList) => currentList.includes(name) ? currentList.filter((respName) => respName !== name) : [...currentList, name]);
  }

  const filteredUsers = useMemo(
    () => users.filter((user) => user.name.toLowerCase().includes(respSearch.toLowerCase())),
    [users, respSearch]
  );

  function prevPeriod() {
    if (viewMode === 'month') { if (month===0){setYear((currentYear)=>currentYear-1);setMonth(11);}else setMonth((currentMonth)=>currentMonth-1); }
    else setWeekStart((currentWeekStart) => { const newWeekStart=new Date(currentWeekStart); newWeekStart.setDate(newWeekStart.getDate()-7); return newWeekStart; });
  }
  function nextPeriod() {
    if (viewMode === 'month') { if (month===11){setYear((currentYear)=>currentYear+1);setMonth(0);}else setMonth((currentMonth)=>currentMonth+1); }
    else setWeekStart((currentWeekStart) => { const newWeekStart=new Date(currentWeekStart); newWeekStart.setDate(newWeekStart.getDate()+7); return newWeekStart; });
  }
  function goToday() {
    const today = new Date();
    setYear(today.getFullYear()); setMonth(today.getMonth());
    const weekStartDate=new Date(today); weekStartDate.setDate(today.getDate()-today.getDay()); weekStartDate.setHours(0,0,0,0); setWeekStart(weekStartDate);
  }

  const weekEnd = useMemo(() => { const endDate=new Date(weekStart); endDate.setDate(endDate.getDate()+6); return endDate; }, [weekStart]);
  const headerLabel = viewMode==='month'
    ? `${MONTHS[month]} ${year}`
    : `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].slice(0,3)} – ${weekEnd.getDate()} ${MONTHS[weekEnd.getMonth()].slice(0,3)} ${weekEnd.getFullYear()}`;

  const upcoming = useMemo(() => {
    const limit = new Date(); limit.setDate(limit.getDate()+30);
    const limitStr = ymd(limit);
    return events.filter((calEvent)=>calEvent.end_date>=todayStr&&calEvent.start_date<=limitStr)
      .sort((a,b)=>a.start_date.localeCompare(b.start_date)).slice(0,5);
  }, [events, todayStr]);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Eventos</h1>
        </div>
      </div>
      <div style={{ padding:'32px 28px' }}>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:20, alignItems:'start' }}>
        {/* Calendar */}
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border-light)', overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
          {/* Toolbar */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border-light)', flexWrap:'wrap', gap:10 }}>
            <div style={{ display:'flex', background:'var(--bg-subtle)', borderRadius:8, padding:3, gap:2 }}>
              {(['week','month'] as const).map(v => (
                <button key={v} onClick={()=>setViewMode(v)} style={{
                  background:viewMode===v?'#fff':'transparent',
                  border:viewMode===v?'1px solid var(--border-light)':'1px solid transparent',
                  borderRadius:6, padding:'5px 14px', fontSize:'0.82rem', fontWeight:600,
                  color:viewMode===v?'var(--primary)':'var(--text-muted)', cursor:'pointer',
                  boxShadow:viewMode===v?'0 1px 4px rgba(0,0,0,0.08)':'none',
                }}>{v==='week'?'Semana':'Mês'}</button>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button onClick={prevPeriod} style={navBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontWeight:700, fontSize:'0.92rem', color:'var(--text-primary)', minWidth:180, textAlign:'center' }}>{headerLabel}</span>
              <button onClick={nextPeriod} style={navBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <button onClick={goToday} style={{ background:'none', border:'1px solid var(--border-light)', borderRadius:7, padding:'5px 14px', fontSize:'0.82rem', fontWeight:600, color:'var(--text-secondary)', cursor:'pointer' }}>Hoje</button>
          </div>

          {loading ? (
            <div style={{ padding:48, textAlign:'center', color:'var(--text-muted)' }}>Carregando...</div>
          ) : viewMode==='month' ? (
            <MonthView events={events} year={year} month={month} todayStr={todayStr}
              onChipClick={handleChipClick} onClickDay={(dayStr)=>openNew(dayStr)} />
          ) : (
            <WeekView events={events} weekStart={weekStart} todayStr={todayStr}
              onChipClick={handleChipClick} onClickDay={(dayStr)=>openNew(dayStr)} />
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid var(--border-light)', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border-light)', fontWeight:700, fontSize:'0.78rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Próximos eventos</div>
            {upcoming.length===0
              ? <div style={{ padding:'20px 16px', color:'var(--text-muted)', fontSize:'0.83rem' }}>Nenhum evento nos próximos 30 dias.</div>
              : upcoming.map((calEvent) => {
                  const colorPalette = palette(calEvent.id);
                  const responsibles = parseResps(calEvent.responsibles);
                  return (
                    <div key={calEvent.id} onClick={(e)=>handleChipClick(calEvent,e)} style={{ padding:'12px 16px', borderBottom:'1px solid var(--border-light)', cursor:'pointer', display:'flex', gap:10, alignItems:'flex-start' }}>
                      <div style={{ width:4, borderRadius:4, background:colorPalette.color, alignSelf:'stretch', flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'0.83rem', fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{calEvent.name}</div>
                        <div style={{ fontSize:'0.73rem', color:'var(--text-muted)', marginTop:2 }}>
                          {formatDateFull(calEvent.start_date)}{calEvent.start_date!==calEvent.end_date?` → ${formatDateFull(calEvent.end_date)}`:''}
                          {calEvent.start_time?` · ${calEvent.start_time}`:''}
                        </div>
                        {responsibles.length>0 && <div style={{ fontSize:'0.7rem', color:'var(--text-secondary)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{responsibles.join(', ')}</div>}
                      </div>
                      <span style={{ background:colorPalette.bg, color:colorPalette.color, borderRadius:4, padding:'2px 7px', fontSize:'0.68rem', fontWeight:600, flexShrink:0 }}>{calEvent.event_type}</span>
                    </div>
                  );
                })
            }
          </div>

          <div style={{ background:'#fff', borderRadius:12, border:'1px solid var(--border-light)', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border-light)', fontWeight:700, fontSize:'0.78rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Todos ({events.length})</div>
            <div style={{ maxHeight:320, overflowY:'auto' }}>
              {events.length===0
                ? <div style={{ padding:'20px 16px', color:'var(--text-muted)', fontSize:'0.83rem' }}>Nenhum evento.</div>
                : events.map((calEvent) => {
                    const colorPalette = palette(calEvent.id);
                    return (
                      <div key={calEvent.id} style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-light)', display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:colorPalette.color, flexShrink:0 }} />
                        <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={(e)=>handleChipClick(calEvent,e)}>
                          <div style={{ fontSize:'0.8rem', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{calEvent.name}</div>
                          <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{formatDateFull(calEvent.start_date)}</div>
                        </div>
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={()=>openEdit(calEvent)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--primary)', padding:'2px 4px' }} title="Editar">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={()=>handleDelete(calEvent.id)} disabled={deleting===calEvent.id} style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', padding:'2px 4px' }} title="Excluir">
                            {deleting===calEvent.id?'…':<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>}
                          </button>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </div>
        </div>
      </div>

      {/* Preview popup */}
      {preview && (
        <EventPreview
          preview={preview}
          onEdit={openEdit}
          onDelete={handleDelete}
          onClose={closePreview}
          deleting={deleting}
        />
      )}

      {/* Edit / Create modal */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e=>{if(e.target===e.currentTarget)setShowModal(false);}}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:520, boxShadow:'0 24px 64px rgba(0,0,0,0.22)', overflow:'hidden' }}>
            <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border-light)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ margin:0, fontSize:'1.05rem', fontWeight:700 }}>{editing?'Editar Evento':'Novo Evento'}</h2>
              <button onClick={()=>setShowModal(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1.3rem', color:'var(--text-muted)', lineHeight:1 }}>×</button>
            </div>
            <div style={{ padding:'22px', display:'flex', flexDirection:'column', gap:16, maxHeight:'70vh', overflowY:'auto' }}>
              <div>
                <label style={lbl}>Nome do Evento *</label>
                <input type="text" value={evName} onChange={e=>setEvName(e.target.value)} placeholder="Ex: Reunião de planejamento" style={inp} />
              </div>
              <div style={{ position:'relative' }}>
                <label style={lbl}>Responsável(eis)</label>
                <div onClick={()=>setRespOpen((isOpen)=>!isOpen)} style={{ ...inp, cursor:'pointer', display:'flex', flexWrap:'wrap', gap:5, minHeight:38, alignItems:'center' }}>
                  {respList.length===0
                    ? <span style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>Selecione responsáveis...</span>
                    : respList.map((respName)=>(
                      <span key={respName} style={{ background:'#dbeafe', color:'#1d4ed8', borderRadius:4, padding:'2px 7px', fontSize:'0.78rem', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                        {respName}<button onClick={(e)=>{e.stopPropagation();toggleResp(respName);}} style={{ background:'none', border:'none', cursor:'pointer', padding:0, color:'#1d4ed8', lineHeight:1 }}>×</button>
                      </span>
                    ))
                  }
                </div>
                {respOpen && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid var(--border-light)', borderRadius:7, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:50, marginTop:4 }}>
                    <div style={{ padding:'8px 10px' }}>
                      <input autoFocus type="text" value={respSearch} onChange={e=>setRespSearch(e.target.value)} placeholder="Buscar..." style={{ ...inp, padding:'5px 9px', fontSize:'0.82rem' }} onClick={e=>e.stopPropagation()} />
                    </div>
                    <div style={{ maxHeight:160, overflowY:'auto' }}>
                      {filteredUsers.map((user)=>(
                        <div key={user.id} onClick={()=>toggleResp(user.name)} style={{ padding:'8px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:8, background:respList.includes(user.name)?'#eff6ff':'transparent', fontSize:'0.85rem' }}>
                          <span style={{ width:16, height:16, borderRadius:3, border:`2px solid ${respList.includes(user.name)?'#1d4ed8':'var(--border-light)'}`, background:respList.includes(user.name)?'#1d4ed8':'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            {respList.includes(user.name)&&<svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="2 6 5 9 10 3"/></svg>}
                          </span>
                          {user.name}
                        </div>
                      ))}
                    </div>
                    <div style={{ padding:'6px 10px', borderTop:'1px solid var(--border-light)', textAlign:'right' }}>
                      <button onClick={()=>setRespOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'0.8rem', color:'var(--primary)', fontWeight:600 }}>Fechar</button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label style={lbl}>Tipo *</label>
                <div style={{ display:'flex', gap:12 }}>
                  {(['Presencial','Online'] as const).map(t=>(
                    <label key={t} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:'0.88rem', fontWeight:evType===t?600:400, color:evType===t?'var(--primary)':'var(--text-secondary)' }}>
                      <input type="radio" name="evType" value={t} checked={evType===t} onChange={()=>setEvType(t)} style={{ accentColor:'var(--primary)' }} />{t}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Horário (opcional)</label>
                <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Quem vai comparecer</label>
                <textarea value={attendees} onChange={e=>setAttendees(e.target.value)} rows={2} placeholder="Ex: Equipe de vendas, Diretoria..." style={{ ...inp, resize:'vertical', minHeight:60 }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label style={lbl}>Data de Início *</label><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Data de Fim *</label><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} style={inp} /></div>
              </div>
              {formErr && <p style={{ color:'#ef4444', fontSize:'0.82rem', margin:0 }}>{formErr}</p>}
            </div>
            <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border-light)', display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={()=>setShowModal(false)} style={cancelBtn}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={saveBtn}>{saving?'Salvando…':editing?'Salvar alterações':'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => openNew()}
        title="Novo Evento"
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
    </div>
    </>
  );
}

const lbl: React.CSSProperties = { display:'block', fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:5 };
const inp: React.CSSProperties = { width:'100%', border:'1px solid var(--border-light)', borderRadius:7, padding:'8px 11px', fontSize:'0.88rem', outline:'none', boxSizing:'border-box', background:'#fff', color:'var(--text-primary)' };
const navBtn: React.CSSProperties = { background:'none', border:'1px solid var(--border-light)', borderRadius:6, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)' };
const cancelBtn: React.CSSProperties = { background:'var(--bg-subtle)', border:'1px solid var(--border-light)', borderRadius:7, padding:'8px 18px', fontSize:'0.88rem', cursor:'pointer', fontWeight:500, color:'var(--text-secondary)' };
const saveBtn: React.CSSProperties = { background:'var(--primary)', color:'#fff', border:'none', borderRadius:7, padding:'8px 22px', fontSize:'0.88rem', fontWeight:600, cursor:'pointer' };
