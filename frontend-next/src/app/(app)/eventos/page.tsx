'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Calendar, Users, User, Trash2, Pencil, ChevronLeft, ChevronRight, Clock, AlertCircle, ChevronDown, List, Check, Plus } from 'lucide-react';
import {
  fetchEvents, createEvent, updateEvent, deleteEvent, fetchUsers,
  setEventMinutes, removeEventMinutes,
  type CalendarEvent, type UserPublic,
} from '@/lib/api';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import { getUser } from '@/lib/auth';

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

const WEEKDAYS_MINI = ['D','S','T','Q','Q','S','S'];

function EventDayPicker({ selected, onChange, initialDate }: {
  selected: string[];
  onChange: (days: string[]) => void;
  initialDate?: string;
}) {
  const today = new Date();
  const init = initialDate ? new Date(initialDate + 'T12:00:00') : today;
  const [pickYear, setPickYear] = useState(init.getFullYear());
  const [pickMonth, setPickMonth] = useState(init.getMonth());
  const firstDOW = new Date(pickYear, pickMonth, 1).getDay();
  const daysInMonth = new Date(pickYear, pickMonth + 1, 0).getDate();
  const cells: (number|null)[] = [...Array(firstDOW).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i+1)];
  const todayStr = ymd(today);
  function toggle(s: string) {
    onChange(selected.includes(s) ? selected.filter(d => d !== s) : [...selected, s].sort());
  }
  return (
    <div style={{ border:'1px solid var(--border-light)', borderRadius:7, overflow:'hidden', userSelect:'none', width:'100%', maxWidth:240 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 8px', background:'var(--bg-subtle)', borderBottom:'1px solid var(--border-light)' }}>
        <button type="button" onClick={() => { if(pickMonth===0){setPickYear(y=>y-1);setPickMonth(11);}else setPickMonth(m=>m-1); }}
          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', fontSize:'0.9rem', lineHeight:1, padding:'2px 5px' }}>‹</button>
        <span style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--text-primary)' }}>{MONTHS[pickMonth]} {pickYear}</span>
        <button type="button" onClick={() => { if(pickMonth===11){setPickYear(y=>y+1);setPickMonth(0);}else setPickMonth(m=>m+1); }}
          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', fontSize:'0.9rem', lineHeight:1, padding:'2px 5px' }}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', padding:'3px 6px 0' }}>
        {WEEKDAYS_MINI.map((w,i) => (
          <div key={i} style={{ textAlign:'center', fontSize:'0.6rem', fontWeight:700, color:'var(--text-muted)', padding:'2px 0' }}>{w}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', padding:'0 6px 6px', gap:1 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const s = `${pickYear}-${String(pickMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isSel = selected.includes(s);
          const isToday = s === todayStr;
          return (
            <button key={i} type="button" onClick={() => toggle(s)}
              style={{
                aspectRatio:'1', borderRadius:'50%', border: isSel ? '2px solid var(--primary)' : '2px solid transparent',
                cursor:'pointer', fontSize:'0.68rem', fontWeight: isSel||isToday ? 700 : 400,
                background: isSel ? 'var(--primary)' : isToday ? 'var(--primary-light)' : 'transparent',
                color: isSel ? '#fff' : isToday ? 'var(--primary)' : 'var(--text-primary)',
                outline:'none', padding:0,
              }}>{day}</button>
          );
        })}
      </div>
    </div>
  );
}

function EventDateRangePicker({ from, to, onChange }: {
  from: string; to: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>Início</div>
        <input type="date" value={from} onChange={e => onChange(e.target.value, to < e.target.value ? e.target.value : to)}
          style={{ ...inp, padding:'7px 10px' }} />
      </div>
      <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:18 }}>→</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>Fim</div>
        <input type="date" value={to} min={from} onChange={e => onChange(from, e.target.value)}
          style={{ ...inp, padding:'7px 10px' }} />
      </div>
    </div>
  );
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
  const isPast = calEvent.end_date < new Date().toISOString().slice(0, 10);

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
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <span style={{ background: colorPalette.bg, color: colorPalette.color, borderRadius: 4, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>{calEvent.event_type}</span>
            {calEvent.is_private && <span style={{ background: '#f3e8ff', color: '#7c3aed', borderRadius: 4, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>Privado</span>}
            {isPast && <span style={{ background: '#f1f5f9', color: '#64748b', borderRadius: 4, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>Passado</span>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1, padding: '0 0 0 8px', flexShrink: 0 }}>×</button>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Date / time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <Calendar size={13} />
          <span>
            {sameDay ? formatDateFull(calEvent.start_date) : `${formatDate(calEvent.start_date)} → ${formatDateFull(calEvent.end_date)}`}
            {calEvent.start_time && <span style={{ marginLeft: 6, fontWeight: 600, color: colorPalette.color }}>{calEvent.start_time}</span>}
          </span>
        </div>

        {/* Responsibles */}
        {responsibles.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <Users size={13} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>{responsibles.join(', ')}</span>
          </div>
        )}

        {/* Attendees */}
        {calEvent.attendees && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <User size={13} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>{calEvent.attendees}</span>
          </div>
        )}

        {/* Ata de reunião */}
        <div style={{ borderTop: '1px solid var(--line-2)', paddingTop: 8, marginTop: 2 }}>
          {calEvent.minutes_file_name ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
              <span className="ata-badge anexada">Ata: {calEvent.minutes_file_name}</span>
              <button className="btn btn-danger btn-xs" onClick={async () => {
                const updated = await removeEventMinutes(calEvent.id);
                onClose();
                window.dispatchEvent(new CustomEvent('event-ata-updated', { detail: updated }));
              }}>Remover</button>
            </div>
          ) : (
            <div>
              <span className="ata-badge pendente" style={{ marginBottom: 6, display: 'inline-block' }}>Ata pendente</span>
              <input type="file" accept=".pdf" id={`ata-${calEvent.id}`} style={{ display: 'none' }}
                onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    const b64 = (ev.target?.result as string).split(',')[1] ?? '';
                    const updated = await setEventMinutes(calEvent.id, f.name, b64);
                    onClose();
                    window.dispatchEvent(new CustomEvent('event-ata-updated', { detail: updated }));
                  };
                  reader.readAsDataURL(f);
                }} />
              <label htmlFor={`ata-${calEvent.id}`} className="btn btn-secondary btn-xs" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Anexar ata (.pdf)</label>
            </div>
          )}
        </div>
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
          <Trash2 size={13} />
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
          <Pencil size={13} />
          Editar
        </button>
      </div>
    </div>
  );
}

// ── EventChip (month view) ────────────────────────────────────────────────────

function EventChip({ event: calEvent, onClick, isPast }: { event: CalendarEvent; onClick: (e: React.MouseEvent) => void; isPast?: boolean }) {
  const colorPalette = palette(calEvent.id);
  const responsibles = parseResps(calEvent.responsibles);
  return (
    <div
      onClick={onClick}
      style={{ background: isPast ? '#f1f5f9' : colorPalette.bg, borderLeft: `3px solid ${isPast ? '#94a3b8' : colorPalette.color}`, borderRadius: 4, padding: '3px 6px', marginBottom: 2, cursor: 'pointer', opacity: isPast ? 0.75 : 1 }}
    >
      {isPast
        ? <div style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 700, lineHeight: 1, marginBottom: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Passado</div>
        : calEvent.start_time && <div style={{ fontSize: '0.6rem', color: colorPalette.color, fontWeight: 700, lineHeight: 1, marginBottom: 1 }}>{calEvent.start_time}</div>
      }
      <div style={{ fontSize: '0.65rem', fontWeight: 600, color: isPast ? '#64748b' : colorPalette.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{calEvent.name}</div>
      {responsibles.length > 0 && <div style={{ fontSize: '0.58rem', color: isPast ? '#94a3b8' : colorPalette.color, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{responsibles[0]}{responsibles.length > 1 ? ` +${responsibles.length-1}` : ''}</div>}
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
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', background:'var(--bg-app)', borderBottom:'1px solid var(--border-light)' }}>
        {WEEKDAYS_SHORT.map((w, i) => (
          <div key={w} style={{ padding:'10px 4px', textAlign:'center', fontSize:'0.68rem', fontWeight:700, color: i===0||i===6 ? '#94a3b8' : 'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{w}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))' }}>
        {cells.map((day, idx) => {
          const col = idx % 7;
          const isWeekend = col === 0 || col === 6;
          const dayStr = day ? `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` : '';
          const isToday = dayStr === todayStr;
          const dayEvs = dayStr ? eventsForDay(events, dayStr) : [];
          return (
            <div
              key={idx}
              onClick={() => day && onClickDay(dayStr)}
              style={{
                minHeight: 86, overflow: 'hidden', padding: '6px 6px 4px',
                borderRight: col!==6 ? '1px solid var(--border-light)' : 'none',
                borderBottom: idx<cells.length-7 ? '1px solid var(--border-light)' : 'none',
                background: day===null ? 'var(--bg-app)' : isWeekend ? '#fafbfc' : '#fff',
                cursor: day ? 'pointer' : undefined,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (day) (e.currentTarget as HTMLDivElement).style.background = 'var(--primary-light)'; }}
              onMouseLeave={e => { if (day) (e.currentTarget as HTMLDivElement).style.background = day===null ? 'var(--bg-app)' : isWeekend ? '#fafbfc' : '#fff'; }}
            >
              {day && (
                <>
                  <div style={{
                    fontSize:'0.78rem', fontWeight:isToday?800:dayEvs.length>0?600:400,
                    color:isToday?'#fff':isWeekend?'#94a3b8':'var(--text-secondary)',
                    background:isToday?'var(--primary)':'transparent',
                    width:26, height:26, borderRadius:'50%',
                    display:'flex', alignItems:'center', justifyContent:'center', marginBottom:4,
                    boxShadow: isToday ? '0 2px 6px rgba(3,78,162,0.35)' : 'none',
                  }}>{day}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                    {dayEvs.slice(0,2).map((calEvent) => (
                      <EventChip key={calEvent.id} event={calEvent} isPast={calEvent.end_date < todayStr} onClick={(e) => { e.stopPropagation(); onChipClick(calEvent, e); }} />
                    ))}
                    {dayEvs.length > 2 && <div style={{ fontSize:'0.6rem', color:'var(--primary)', fontWeight:600, paddingLeft:4 }}>+{dayEvs.length-2} mais</div>}
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
    <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))' }}>
      {days.map((dayDate, idx) => {
        const dayStr = ymd(dayDate);
        const isToday = dayStr === todayStr;
        const dayEvs = eventsForDay(events, dayStr);
        return (
          <div key={idx}
            style={{ borderRight: idx<6?'1px solid var(--border-light)':'none', minHeight:240, overflow:'hidden', cursor:'pointer' }}
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
                const isPast = calEvent.end_date < todayStr;
                return (
                  <div key={calEvent.id}
                    onClick={(e) => { e.stopPropagation(); onChipClick(calEvent, e); }}
                    style={{
                      background: isPast ? '#f1f5f9' : colorPalette.bg,
                      borderLeft: `4px solid ${isPast ? '#94a3b8' : colorPalette.color}`,
                      borderRadius:6, padding:'8px 10px', marginBottom:6, cursor:'pointer',
                      boxShadow:'0 1px 4px rgba(0,0,0,0.06)', opacity: isPast ? 0.75 : 1,
                    }}
                  >
                    {isPast
                      ? <div style={{ fontSize:'0.6rem', color:'#94a3b8', fontWeight:700, marginBottom:2, textTransform:'uppercase', letterSpacing:'0.05em' }}>Passado</div>
                      : calEvent.start_time && <div style={{ fontSize:'0.68rem', color:colorPalette.color, fontWeight:700, marginBottom:2 }}>{calEvent.start_time}</div>
                    }
                    <div style={{ fontSize:'0.78rem', fontWeight:700, color: isPast ? '#64748b' : colorPalette.color, marginBottom:2 }}>{calEvent.name}</div>
                    {responsibles.length > 0 && <div style={{ fontSize:'0.7rem', color: isPast ? '#94a3b8' : colorPalette.color, opacity:0.75 }}>{responsibles.slice(0,2).join(', ')}{responsibles.length>2?` +${responsibles.length-2}`:''}</div>}
                    {!isPast && (
                      <div style={{ marginTop:4 }}>
                        <span style={{ fontSize:'0.62rem', background:'rgba(255,255,255,0.7)', color:colorPalette.color, borderRadius:3, padding:'1px 6px', fontWeight:600 }}>{calEvent.event_type}</span>
                      </div>
                    )}
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
  const me = getUser();
  const { toasts, addToast, dismissToast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message?: string; onConfirm: () => void } | null>(null);

  const [events, setEvents]     = useState<CalendarEvent[]>([]);
  const [users, setUsers]       = useState<UserPublic[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab] = useState<'agenda' | 'atas' | 'calendar'>('agenda');
  const [viewMode, setViewMode] = useState<'month'|'week'>('month');
  const [ataUploading, setAtaUploading] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      const updated = (e as CustomEvent<CalendarEvent>).detail;
      setEvents((curr) => curr.map((x) => (x.id === updated.id ? updated : x)));
    }
    window.addEventListener('event-ata-updated', handler);
    return () => window.removeEventListener('event-ata-updated', handler);
  }, []);

  const visibleEvents = useMemo(() => events, [events]);
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
  const [useRange, setUseRange]       = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([todayStr]);
  const [startTime, setStartTime]   = useState('');
  const [isPrivate, setIsPrivate]         = useState(false);
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
    setSelectedDates([prefDate || todayStr]);
    setUseRange(false);
    setStartDate(prefDate || todayStr); setEndDate(prefDate || todayStr);
    setStartTime(''); setIsPrivate(false); setFormErr('');
    setRespSearch(''); setRespOpen(false);
    setShowModal(true);
  }

  function openEdit(ev: CalendarEvent) {
    setPreview(null);
    setEditing(ev);
    setEvName(ev.name); setRespList(parseResps(ev.responsibles));
    setEvType(ev.event_type as 'Presencial'|'Online');
    setAttendees(ev.attendees ?? '');
    setSelectedDates([ev.start_date]);
    setUseRange(ev.start_date !== ev.end_date);
    setStartDate(ev.start_date); setEndDate(ev.end_date);
    setStartTime(ev.start_time ?? ''); setIsPrivate(ev.is_private ?? false); setFormErr(''); setRespSearch(''); setRespOpen(false);
    setShowModal(true);
  }

  async function handleSave() {
    const computedStart = useRange ? startDate : selectedDates[0] ?? '';
    const computedEnd   = useRange ? endDate   : selectedDates[selectedDates.length - 1] ?? '';
    if (!evName.trim() || !computedStart) { setFormErr('Preencha nome e data.'); return; }
    if (useRange && computedStart > computedEnd) { setFormErr('Data de início não pode ser posterior à data de fim.'); return; }
    if (!useRange && selectedDates.length === 0) { setFormErr('Selecione ao menos um dia.'); return; }
    setFormErr(''); setSaving(true);
    const responsible_ids = respList
      .map((userName) => users.find((user) => user.name === userName)?.id)
      .filter((id): id is string => !!id);
    const basePayload = {
      name: evName.trim(), responsible_ids,
      event_type: evType, attendees: attendees.trim() || null,
      start_time: startTime || null,
      is_private: isPrivate,
      is_company_wide: false,
    };
    try {
      if (editing) {
        const payload = { ...basePayload, start_date: computedStart, end_date: computedEnd };
        const updated = await updateEvent(editing.id, payload);
        setEvents((currentEvents) => currentEvents.map((calEvent) => calEvent.id === updated.id ? updated : calEvent));
      } else if (!useRange && selectedDates.length > 1) {
        const created = await Promise.all(
          selectedDates.map(date => createEvent({ ...basePayload, start_date: date, end_date: date }))
        );
        setEvents((currentEvents) => [...created, ...currentEvents]);
        addToast('success', `${created.length} eventos criados`, `"${evName.trim()}" adicionado para ${created.length} dias.`);
      } else {
        const payload = { ...basePayload, start_date: computedStart, end_date: computedEnd };
        const created = await createEvent(payload);
        setEvents((currentEvents) => [created, ...currentEvents]);
        addToast('success', 'Evento criado', `"${created.name}" foi adicionado ao calendário.`);
      }
      setShowModal(false);
    } catch (err: unknown) {
      setFormErr(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  function handleDelete(id: string) {
    setConfirmDialog({
      title: 'Excluir evento',
      message: 'Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setDeleting(id);
        try { await deleteEvent(id); setEvents((currentEvents) => currentEvents.filter((calEvent) => calEvent.id !== id)); }
        finally { setDeleting(null); }
      },
    });
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
    return visibleEvents.filter((calEvent)=>calEvent.end_date>=todayStr&&calEvent.start_date<=limitStr)
      .sort((a,b)=>a.start_date.localeCompare(b.start_date)).slice(0,5);
  }, [visibleEvents, todayStr]);

  const pastEvents = useMemo(() =>
    visibleEvents
      .filter((calEvent) => calEvent.end_date < todayStr)
      .sort((a, b) => b.end_date.localeCompare(a.end_date)),
    [visibleEvents, todayStr],
  );

  const [pastOpen, setPastOpen] = useState(false);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1 style={{ fontSize: '1rem', fontWeight: 700 }}>Eventos</h1>
          <div className="segmented" style={{ marginLeft: 12 }}>
            <button className={`segmented-btn${tab === 'agenda' ? ' active' : ''}`} onClick={() => setTab('agenda')}>Agenda</button>
            <button className={`segmented-btn${tab === 'atas' ? ' active' : ''}`} onClick={() => setTab('atas')}>Atas</button>
            <button className={`segmented-btn${tab === 'calendar' ? ' active' : ''}`} onClick={() => setTab('calendar')}>Calendário</button>
          </div>
        </div>
      </div>
      {tab === 'atas' && (
        <div style={{ padding: '16px 32px 32px' }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)' }}>
              {events.filter((e) => e.minutes_file_name).length} ata(s) anexada(s)
            </span>
          </div>
          {events.filter((e) => e.minutes_file_name).length === 0 ? (
            <div className="empty-state"><p>Nenhuma ata anexada ainda.</p></div>
          ) : events.filter((e) => e.minutes_file_name).map((ev) => (
            <div key={ev.id} className="event-row">
              <div>
                <div className="event-row-title">{ev.name}</div>
                <div className="event-row-meta">
                  <span className="mono">{ev.start_date}</span>
                  <span className="ata-badge anexada">Ata: {ev.minutes_file_name}</span>
                </div>
              </div>
              <button className="btn btn-danger btn-xs" style={{ marginLeft: 'auto' }}
                onClick={async () => {
                  const updated = await removeEventMinutes(ev.id);
                  setEvents((curr) => curr.map((x) => (x.id === ev.id ? updated : x)));
                  addToast('success', 'Ata removida', '');
                }}>
                Remover ata
              </button>
            </div>
          ))}
        </div>
      )}

      {tab !== 'atas' && <div style={{ padding:'32px 28px' }}>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:20, alignItems:'start' }}>
        {/* Calendar */}
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border-light)', overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
          {/* Toolbar */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid var(--border-light)', flexWrap:'wrap', gap:10, background:'#fff' }}>
            <div style={{ display:'flex', background:'var(--bg-app)', borderRadius:10, padding:3, gap:1 }}>
              {(['week','month'] as const).map(v => (
                <button key={v} onClick={()=>setViewMode(v)} style={{
                  background:viewMode===v?'#fff':'transparent',
                  border:'none', borderRadius:8, padding:'6px 16px', fontSize:'0.82rem', fontWeight:600,
                  color:viewMode===v?'var(--primary)':'var(--text-muted)', cursor:'pointer',
                  boxShadow:viewMode===v?'0 1px 4px rgba(3,78,162,0.1)':'none',
                  transition:'all 0.15s',
                }}>{v==='week'?'Semana':'Mês'}</button>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <button onClick={prevPeriod} style={navBtn}>
                <ChevronLeft size={13} />
              </button>
              <span style={{ fontWeight:700, fontSize:'1rem', color:'var(--text-primary)', minWidth:190, textAlign:'center', letterSpacing:'-0.3px' }}>{headerLabel}</span>
              <button onClick={nextPeriod} style={navBtn}>
                <ChevronRight size={13} />
              </button>
            </div>
            <button onClick={goToday} style={{ background:'var(--primary-light)', border:'none', borderRadius:8, padding:'6px 16px', fontSize:'0.82rem', fontWeight:600, color:'var(--primary)', cursor:'pointer', transition:'background 0.15s' }}>Hoje</button>
          </div>

          {loading ? (
            <div style={{ padding:48, textAlign:'center', color:'var(--text-muted)' }}>Carregando...</div>
          ) : viewMode==='month' ? (
            <MonthView events={visibleEvents} year={year} month={month} todayStr={todayStr}
              onChipClick={handleChipClick} onClickDay={(dayStr)=>openNew(dayStr)} />
          ) : (
            <WeekView events={visibleEvents} weekStart={weekStart} todayStr={todayStr}
              onChipClick={handleChipClick} onClickDay={(dayStr)=>openNew(dayStr)} />
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Próximos */}
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border-light)', overflow:'hidden', boxShadow:'0 2px 8px rgba(3,78,162,0.05)' }}>
            <div style={{ padding:'13px 16px', borderBottom:'1px solid var(--border-light)', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:7, background:'var(--primary-light)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Clock size={14} color="var(--primary)" />
              </div>
              <span style={{ fontWeight:700, fontSize:'0.85rem', color:'var(--text-primary)' }}>Próximos eventos</span>
              {upcoming.length>0 && <span style={{ marginLeft:'auto', background:'var(--primary-light)', color:'var(--primary)', borderRadius:20, padding:'1px 8px', fontSize:'0.7rem', fontWeight:700 }}>{upcoming.length}</span>}
            </div>
            {upcoming.length===0 ? (
              <div style={{ padding:'24px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                <AlertCircle size={28} style={{ color:'var(--text-muted)', opacity:0.4 }} />
                <span style={{ color:'var(--text-muted)', fontSize:'0.8rem', textAlign:'center' }}>Nenhum evento nos próximos 30 dias</span>
              </div>
            ) : upcoming.map((calEvent) => {
                const colorPalette = palette(calEvent.id);
                const responsibles = parseResps(calEvent.responsibles);
                return (
                  <div key={calEvent.id} onClick={(e)=>handleChipClick(calEvent,e)}
                    style={{ padding:'11px 16px', borderBottom:'1px solid var(--border-light)', cursor:'pointer', display:'flex', gap:10, alignItems:'flex-start', transition:'background 0.12s' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-app)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='')}>
                    <div style={{ width:36, height:36, borderRadius:9, background:colorPalette.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:colorPalette.color }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:2 }}>{calEvent.name}</div>
                      <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>
                        {formatDateFull(calEvent.start_date)}{calEvent.start_date!==calEvent.end_date?` → ${formatDateFull(calEvent.end_date)}`:''}
                        {calEvent.start_time?` · ${calEvent.start_time}`:''}
                      </div>
                      {responsibles.length>0 && <div style={{ fontSize:'0.68rem', color:'var(--text-secondary)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{responsibles.join(', ')}</div>}
                    </div>
                    <span style={{ background:colorPalette.bg, color:colorPalette.color, borderRadius:20, padding:'2px 8px', fontSize:'0.65rem', fontWeight:700, flexShrink:0 }}>{calEvent.event_type}</span>
                  </div>
                );
              })
            }
          </div>

          {/* Passados */}
          {pastEvents.length > 0 && (
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
              <button
                onClick={() => setPastOpen(o => !o)}
                style={{ width:'100%', padding:'13px 16px', borderBottom: pastOpen ? '1px solid #e2e8f0' : 'none', display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}
              >
                <div style={{ width:28, height:28, borderRadius:7, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Clock size={14} color="#64748b" />
                </div>
                <span style={{ fontWeight:700, fontSize:'0.85rem', color:'#64748b' }}>Eventos passados</span>
                <span style={{ marginLeft:'auto', background:'#f1f5f9', color:'#64748b', borderRadius:20, padding:'1px 8px', fontSize:'0.7rem', fontWeight:700 }}>{pastEvents.length}</span>
                <ChevronDown size={12} color="#94a3b8" style={{ transition:'transform 0.15s', transform: pastOpen ? 'rotate(180deg)' : 'none', flexShrink:0 }} />
              </button>
              {pastOpen && (
                <div style={{ maxHeight:280, overflowY:'auto' }}>
                  {pastEvents.map((calEvent) => (
                    <div key={calEvent.id}
                      style={{ padding:'9px 14px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:8, transition:'background 0.12s' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='#f8fafc')}
                      onMouseLeave={e=>(e.currentTarget.style.background='')}>
                      <div style={{ flex:1, minWidth:0, cursor:'pointer', opacity:0.75 }} onClick={(e)=>handleChipClick(calEvent,e)}>
                        <div style={{ fontSize:'0.78rem', fontWeight:600, color:'#475569', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{calEvent.name}</div>
                        <div style={{ fontSize:'0.68rem', color:'#94a3b8', marginTop:1 }}>{formatDateFull(calEvent.start_date)}{calEvent.start_date!==calEvent.end_date?` → ${formatDateFull(calEvent.end_date)}`:''}</div>
                      </div>
                      <button
                        onClick={() => handleDelete(calEvent.id)}
                        disabled={deleting === calEvent.id}
                        style={{ background:'#fff5f5', border:'none', cursor:'pointer', color:'#ef4444', padding:'5px', borderRadius:6, display:'flex', flexShrink:0, transition:'background 0.15s' }}
                        title="Excluir"
                        onMouseEnter={e=>(e.currentTarget.style.background='#fee2e2')}
                        onMouseLeave={e=>(e.currentTarget.style.background='#fff5f5')}
                      >
                        {deleting===calEvent.id
                          ? <span style={{fontSize:'0.7rem'}}>…</span>
                          : <Trash2 size={12} />
                        }
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Todos */}
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border-light)', overflow:'hidden', boxShadow:'0 2px 8px rgba(3,78,162,0.05)' }}>
            <div style={{ padding:'13px 16px', borderBottom:'1px solid var(--border-light)', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:7, background:'var(--primary-light)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <List size={14} color="var(--primary)" />
              </div>
              <span style={{ fontWeight:700, fontSize:'0.85rem', color:'var(--text-primary)' }}>Todos</span>
              <span style={{ marginLeft:'auto', background:'var(--primary-light)', color:'var(--primary)', borderRadius:20, padding:'1px 8px', fontSize:'0.7rem', fontWeight:700 }}>{visibleEvents.length}</span>
            </div>
            <div style={{ maxHeight:320, overflowY:'auto' }}>
              {visibleEvents.length===0 ? (
                <div style={{ padding:'24px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                  <Calendar size={28} style={{ color:'var(--text-muted)', opacity:0.4 }} />
                  <span style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>Nenhum evento</span>
                </div>
              ) : visibleEvents.map((calEvent) => {
                  const colorPalette = palette(calEvent.id);
                  return (
                    <div key={calEvent.id}
                      style={{ padding:'9px 14px', borderBottom:'1px solid var(--border-light)', display:'flex', alignItems:'center', gap:8, transition:'background 0.12s' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-app)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='')}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:colorPalette.color, flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={(e)=>handleChipClick(calEvent,e)}>
                        <div style={{ fontSize:'0.78rem', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{calEvent.name}</div>
                        <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:1 }}>{formatDateFull(calEvent.start_date)}</div>
                      </div>
                      <div style={{ display:'flex', gap:3 }}>
                        <button onClick={()=>openEdit(calEvent)} style={{ background:'var(--primary-light)', border:'none', cursor:'pointer', color:'var(--primary)', padding:'5px', borderRadius:6, display:'flex', transition:'background 0.15s' }} title="Editar"
                          onMouseEnter={e=>(e.currentTarget.style.background='var(--primary-glow)')}
                          onMouseLeave={e=>(e.currentTarget.style.background='var(--primary-light)')}>
                          <Pencil size={12} />
                        </button>
                        <button onClick={()=>handleDelete(calEvent.id)} disabled={deleting===calEvent.id} style={{ background:'#fff5f5', border:'none', cursor:'pointer', color:'#ef4444', padding:'5px', borderRadius:6, display:'flex', transition:'background 0.15s' }} title="Excluir"
                          onMouseEnter={e=>(e.currentTarget.style.background='#fee2e2')}
                          onMouseLeave={e=>(e.currentTarget.style.background='#fff5f5')}>
                          {deleting===calEvent.id?<span style={{fontSize:'0.7rem'}}>…</span>:<Trash2 size={12} />}
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
        <div style={{ position:'fixed', inset:0, background:'rgba(3,78,162,0.22)', backdropFilter:'blur(2px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e=>{if(e.target===e.currentTarget)setShowModal(false);}}>
          <div style={{ background:'#fff', borderRadius:'var(--radius-lg)', width:'100%', maxWidth:520, maxHeight:'90vh', boxShadow:'0 20px 60px rgba(3,78,162,0.18), 0 4px 16px rgba(0,0,0,0.10)', overflow:'hidden', display:'flex', flexDirection:'column', animation:'modal-pop-in-flex 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            <div style={{ height:5, flexShrink:0, background:'linear-gradient(to right, #034ea2 40%, #fdb913 40% 55%, #ef4123 55% 75%, #007932 75%)' }} />
            <div style={{ padding:'16px 20px 14px', borderBottom:'1px solid var(--border-light)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, flexShrink:0 }}>
              <div>
                <div style={{ fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)', marginBottom:4 }}>{editing?'Editar evento':'Novo evento'}</div>
                <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:'var(--text-primary)', fontFamily:'inherit' }}>{editing?(evName||'Editar Evento'):'Preencha os dados abaixo'}</h2>
              </div>
              <button onClick={()=>setShowModal(false)} style={{ flexShrink:0, width:28, height:28, borderRadius:'var(--radius-sm)', border:'1px solid var(--border-light)', background:'var(--bg-subtle)', color:'var(--text-muted)', cursor:'pointer', fontSize:'0.85rem', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit' }}>✕</button>
            </div>
            <div style={{ padding:'22px', display:'flex', flexDirection:'column', gap:16, flex:1, overflowY:'auto' }}>
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
                            {respList.includes(user.name)&&<Check size={9} color="#fff" strokeWidth={2.5} />}
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
              <div>
                <label style={lbl}>Data(s) *</label>
                <div style={{ display:'flex', background:'var(--bg-subtle)', border:'1px solid var(--border-light)', borderRadius:9, padding:3, gap:2, marginBottom:12 }}>
                  {([false, true] as const).map(isRange => (
                    <button key={String(isRange)} type="button" onClick={() => setUseRange(isRange)}
                      style={{
                        flex:1, padding:'6px 0', borderRadius:7, border:'none', cursor:'pointer',
                        fontSize:'0.83rem', fontWeight:600, fontFamily:'inherit',
                        background: useRange === isRange ? '#fff' : 'transparent',
                        color: useRange === isRange ? 'var(--primary)' : 'var(--text-muted)',
                        boxShadow: useRange === isRange ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                        transition: 'all 0.15s',
                      }}>
                      {isRange ? 'Intervalo' : 'Dia único'}
                    </button>
                  ))}
                </div>
                {useRange ? (
                  <EventDateRangePicker from={startDate} to={endDate}
                    onChange={(f, t) => { setStartDate(f); setEndDate(t); }} />
                ) : (
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <EventDayPicker selected={selectedDates} onChange={setSelectedDates} initialDate={selectedDates[0]} />
                    <div style={{ paddingTop:4, flex:1 }}>
                      <div style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)', marginBottom:6 }}>
                        {selectedDates.length > 1 ? `${selectedDates.length} dias selecionados` : 'Selecionado'}
                      </div>
                      {selectedDates.length === 0 ? (
                        <span style={{ fontSize:'0.78rem', color:'var(--text-muted)', fontStyle:'italic' }}>Nenhum dia selecionado</span>
                      ) : (
                        <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight: selectedDates.length >= 7 ? 140 : 'none', overflowY: selectedDates.length >= 7 ? 'auto' : 'visible', paddingRight: selectedDates.length >= 7 ? 6 : 0 }}>
                          {selectedDates.map(d => (
                            <div key={d} style={{ display:'flex', alignItems:'center', gap:4 }}>
                              <span style={{ background:'var(--primary-light)', color:'var(--primary)', borderRadius:5, padding:'3px 7px', fontSize:'0.75rem', fontWeight:600, flex:1, whiteSpace:'nowrap' }}>
                                {formatDateFull(d)}
                              </span>
                              <button type="button" onClick={() => setSelectedDates(selectedDates.filter(x => x !== d))}
                                style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:'0.9rem', lineHeight:1, padding:'0 2px', flexShrink:0 }}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedDates.length > 1 && (
                        <div style={{ marginTop:8, fontSize:'0.72rem', color:'var(--text-muted)', fontStyle:'italic' }}>
                          Serão criados {selectedDates.length} eventos
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* Toggle de visibilidade */}
              <div>
                <div style={{ fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:8 }}>Visibilidade</div>
                <div onClick={() => setIsPrivate((v) => !v)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:8, border:`1.5px solid ${isPrivate ? 'var(--primary)' : 'var(--border-light)'}`, background: isPrivate ? 'var(--primary-light)' : '#fff', cursor:'pointer', userSelect:'none', transition:'all 0.15s' }}>
                  <div>
                    <div style={{ fontSize:'0.85rem', fontWeight:600, color: isPrivate ? 'var(--primary)' : 'var(--text-primary)' }}>Privado</div>
                    <div style={{ fontSize:'0.73rem', color:'var(--text-muted)', marginTop:1 }}>Visível só para você e superiores</div>
                  </div>
                  <div style={{ width:38, height:22, borderRadius:11, background: isPrivate ? 'var(--primary)' : '#cbd5e1', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                    <div style={{ position:'absolute', top:3, left: isPrivate ? 19 : 3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </div>
              </div>
              {formErr && <p style={{ color:'#ef4444', fontSize:'0.82rem', margin:0 }}>{formErr}</p>}
            </div>
            <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border-light)', background:'var(--bg-subtle)', display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>
              <button onClick={()=>setShowModal(false)} style={{ padding:'6px 14px', background:'#fff', border:'1px solid var(--border-light)', borderRadius:'var(--radius-sm)', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:'var(--text-secondary)' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={{ padding:'6px 18px', background:saving?'var(--text-muted)':'var(--primary)', color:'#fff', border:'none', borderRadius:'var(--radius-sm)', fontSize:'0.8rem', fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>{saving?'Salvando…':editing?'Salvar alterações':'Salvar'}</button>
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
        <Plus size={22} strokeWidth={2.5} />
      </button>
    </div>}

    <ConfirmModal
      open={!!confirmDialog}
      title={confirmDialog?.title ?? ''}
      message={confirmDialog?.message}
      confirmLabel="Excluir"
      danger
      onConfirm={() => confirmDialog?.onConfirm()}
      onClose={() => setConfirmDialog(null)}
    />
    <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

const lbl: React.CSSProperties = { display:'block', fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:5 };
const inp: React.CSSProperties = { width:'100%', border:'1px solid var(--border-light)', borderRadius:7, padding:'8px 11px', fontSize:'0.88rem', outline:'none', boxSizing:'border-box', background:'#fff', color:'var(--text-primary)' };
const navBtn: React.CSSProperties = { background:'none', border:'1px solid var(--border-light)', borderRadius:6, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)' };
const cancelBtn: React.CSSProperties = { background:'var(--bg-subtle)', border:'1px solid var(--border-light)', borderRadius:7, padding:'8px 18px', fontSize:'0.88rem', cursor:'pointer', fontWeight:500, color:'var(--text-secondary)' };
const saveBtn: React.CSSProperties = { background:'var(--primary)', color:'#fff', border:'none', borderRadius:7, padding:'8px 22px', fontSize:'0.88rem', fontWeight:600, cursor:'pointer' };
