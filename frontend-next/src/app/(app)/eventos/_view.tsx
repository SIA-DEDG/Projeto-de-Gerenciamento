'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Trash2, Pencil, ChevronLeft, ChevronRight, Clock, ChevronDown, Check, Plus, FileText, Paperclip, X as XIcon, Calendar, Users, User, MapPin, Download, Search, Link as LinkIcon } from 'lucide-react';
import Calendario, { type CalendarioItem } from '@/components/Calendario';
import {
  fetchEvents, createEvent, updateEvent, deleteEvent, fetchUsers,
  setEventMinutes, removeEventMinutes, getEventMinutesUrl,
  type CalendarEvent, type UserPublic,
} from '@/lib/api';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import { openSignedUrl } from '@/lib/download';
import { getUser, canManageProjects } from '@/lib/auth';
import PageHeader from '@/components/PageHeader';

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
          style={{ width:'100%', border:'1px solid var(--border)', borderRadius:3, padding:'7px 10px', fontSize:'0.85rem', outline:'none', boxSizing:'border-box' as const, background:'var(--surface)', color:'var(--text)', fontFamily:'inherit' }} />
      </div>
      <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:18 }}>–</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>Fim</div>
        <input type="date" value={to} min={from} onChange={e => onChange(from, e.target.value)}
          style={{ width:'100%', border:'1px solid var(--border)', borderRadius:3, padding:'7px 10px', fontSize:'0.85rem', outline:'none', boxSizing:'border-box' as const, background:'var(--surface)', color:'var(--text)', fontFamily:'inherit' }} />
      </div>
    </div>
  );
}

// ?"??"? Preview popup ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"?

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
  const responsibles = parseResps(calEvent.responsibles);
  const sameDay = calEvent.start_date === calEvent.end_date;
  const isPast = calEvent.end_date < new Date().toISOString().slice(0, 10);

  const [pos, setPos] = useState({ left: cursorX + 14, top: cursorY - 8 });
  useEffect(() => {
    if (!ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    setPos({
      left: Math.min(cursorX + 14, vw - width - 16),
      top:  Math.min(cursorY - 8,  vh - height - 16),
    });
  }, [cursorX, cursorY]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  useEffect(() => {
    function handle(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: 'fixed', left: pos.left, top: pos.top, zIndex: 2000,
      background: 'var(--surface)', borderRadius: 3,
      boxShadow: '0 8px 32px rgba(7,22,45,0.18), 0 2px 8px rgba(7,22,45,0.08)',
      width: 320, overflow: 'hidden',
      border: '1px solid var(--line-1)',
    }}>
      {/* Stripe Gov-PI */}
      <div style={{ height: 4, background: 'linear-gradient(90deg,var(--blue-fixed) 0 40%,#E0A92E 40% 55%,#b42318 55% 75%,#1B8A4B 75%)', flexShrink: 0 }} />

      {/* Header: nome + chips + fechar */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--line-1)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.35, wordBreak: 'break-word', flex: 1 }}>
            {calEvent.name}
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', color: 'var(--text-3)', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; }}
          >
            <XIcon size={12} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span className="mono" style={{ background: isPast ? 'var(--surface-2)' : 'var(--primary-light)', color: isPast ? 'var(--text-3)' : 'var(--blue)', borderRadius: 3, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.3px' }}>
            {calEvent.event_type}
          </span>
          <span className="mono" style={{ background: isPast ? 'rgba(154,161,172,0.1)' : 'rgba(21,127,60,0.08)', color: isPast ? '#9aa1ac' : '#157F3C', borderRadius: 3, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.3px' }}>
            {isPast ? 'Realizado' : 'Agendado'}
          </span>
          {calEvent.is_private && (
            <span className="mono" style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed', borderRadius: 3, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.3px' }}>Privado</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {/* Data */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-2)', fontWeight: 500 }}>
            {sameDay ? formatDateFull(calEvent.start_date) : `${formatDateFull(calEvent.start_date)} – ${formatDateFull(calEvent.end_date)}`}
            {calEvent.start_time && <span style={{ marginLeft: 8, fontWeight: 700, color: 'var(--blue)' }}>{calEvent.start_time}</span>}
          </span>
        </div>

        {/* Responsáveis */}
        {responsibles.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Users size={13} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{responsibles.join(', ')}</span>
          </div>
        )}

        {/* Local/participantes */}
        {calEvent.attendees && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <MapPin size={13} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{calEvent.attendees}</span>
          </div>
        )}

        {/* Ata de reunião */}
        <div style={{ borderTop: '1px solid var(--line-2)', paddingTop: 9, marginTop: 2 }}>
          {calEvent.minutes_file_name ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Paperclip size={12} style={{ color: '#157F3C', flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: '#157F3C', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                  {calEvent.minutes_file_name}
                </span>
              </div>
              <button
                onClick={async () => { const u = await removeEventMinutes(calEvent.id); onClose(); window.dispatchEvent(new CustomEvent('event-ata-updated', { detail: u })); }}
                style={{ fontSize: '0.72rem', fontWeight: 600, color: '#b42318', background: 'rgba(180,35,24,0.06)', border: '1px solid rgba(180,35,24,0.15)', borderRadius: 3, padding: '3px 8px', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.06)')}
              >
                Remover
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Paperclip size={12} style={{ color: '#A87A00', flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: '#A87A00', fontWeight: 600 }}>Ata pendente</span>
              </div>
              <>
                <input type="file" accept=".pdf" id={`ata-${calEvent.id}`} style={{ display: 'none' }}
                  onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      const b64 = (ev.target?.result as string).split(',')[1] ?? '';
                      const u = await setEventMinutes(calEvent.id, f.name, b64);
                      onClose();
                      window.dispatchEvent(new CustomEvent('event-ata-updated', { detail: u }));
                    };
                    reader.readAsDataURL(f);
                  }} />
                <label htmlFor={`ata-${calEvent.id}`}
                  style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-2)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 3, padding: '3px 8px', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Paperclip size={11} />Anexar
                </label>
              </>
            </div>
          )}
        </div>
      </div>

      {/* Ações */}
      <div style={{ padding: '8px 16px 14px', display: 'flex', gap: 8 }}>
        <button
          onClick={() => { onDelete(calEvent.id); onClose(); }}
          disabled={deleting === calEvent.id}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', flex: 1, borderRadius: 3, border: '1px solid rgba(180,35,24,0.2)', background: 'rgba(180,35,24,0.05)', color: '#b42318', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.10)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.05)')}
        >
          <Trash2 size={13} />{deleting === calEvent.id ? 'Excluindo…' : 'Excluir'}
        </button>
        <button
          onClick={() => { onClose(); onEdit(calEvent); }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', flex: 1, borderRadius: 3, border: 'none', background: 'var(--blue)', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-h)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--blue)')}
        >
          <Pencil size={13} />Editar
        </button>
      </div>
    </div>
  );
}

// ?"??"? EventChip (month view) ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"?

function EventChip({ event: calEvent, onClick, isPast }: { event: CalendarEvent; onClick: (e: React.MouseEvent) => void; isPast?: boolean }) {
  const colorPalette = palette(calEvent.id);
  const responsibles = parseResps(calEvent.responsibles);
  return (
    <div
      onClick={onClick}
      style={{ background: isPast ? '#f1f5f9' : colorPalette.bg, borderLeft: `3px solid ${isPast ? '#94a3b8' : colorPalette.color}`, borderRadius: 3, padding: '3px 6px', marginBottom: 2, cursor: 'pointer', opacity: isPast ? 0.75 : 1 }}
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

// ?"??"? Month view ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"?

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

// ?"??"? Week view ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"?

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

// ?"??"? Main page ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"?

export default function EventosPage() {
  const now = new Date();
  const todayStr = ymd(now);
  const me = getUser();
  const { toasts, addToast, dismissToast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message?: string; confirmLabel?: string; onConfirm: () => void } | null>(null);

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
  const [evEventType, setEvEventType] = useState('Reunião');
  const [evType, setEvType]         = useState<'Presencial'|'Online'|'Híbrido'>('Presencial'); // modalidade
  const [evLocal, setEvLocal]       = useState('');
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
  const [ataFile, setAtaFile]       = useState<{ name: string; data: string } | null>(null);

  const EV_TYPES = ['Reunião', 'Workshop', 'Comitê', 'Visita', 'Assembleia', 'Evento externo', 'Outro'];
  const MODALIDADE_OPTIONS = ['Presencial', 'Online', 'Híbrido'] as const;

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
    setEvName(''); setRespList([]); setEvEventType('Reunião'); setEvType('Presencial'); setEvLocal(''); setAttendees('');
    setSelectedDates([prefDate || todayStr]);
    setUseRange(false);
    setStartDate(prefDate || todayStr); setEndDate(prefDate || todayStr);
    setStartTime(''); setIsPrivate(false); setFormErr('');
    setRespSearch(''); setRespOpen(false);
    setAtaFile(null);
    setShowModal(true);
  }

  function openEdit(ev: CalendarEvent) {
    setPreview(null);
    setEditing(ev);
    setEvName(ev.name); setRespList(parseResps(ev.responsibles));
    setEvEventType(ev.event_type || 'Reunião');
    setEvType('Presencial'); // modalidade não está na API, default
    setEvLocal('');
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
    // Combina local + participantes externos no campo attendees da API
    const attendeesField = [evLocal.trim(), attendees.trim()].filter(Boolean).join(' · ') || null;
    const basePayload = {
      name: evName.trim(), responsible_ids,
      event_type: evEventType,
      attendees: attendeesField,
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
        let created = await createEvent(payload);
        if (ataFile) {
          try { created = await setEventMinutes(created.id, ataFile.name, ataFile.data); } catch { /* não bloqueia */ }
        }
        setEvents((currentEvents) => [created, ...currentEvents]);
        addToast('success', 'Evento criado', `"${created.name}" criado${ataFile ? ' com ata anexada' : ''}.`);
      }
      setShowModal(false);
    } catch (err: unknown) {
      setFormErr(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  function handleDelete(id: string) {
    setConfirmDialog({
      title: 'Excluir evento',
      message: 'Esta aç?o n?o pode ser desfeita.',
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
    : `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].slice(0,3)} ??" ${weekEnd.getDate()} ${MONTHS[weekEnd.getMonth()].slice(0,3)} ${weekEnd.getFullYear()}`;

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

  /* ?"??"? Grupos de agenda ?"??"? */
  const agendados = useMemo(() =>
    visibleEvents.filter(ev => ev.end_date >= todayStr).sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [visibleEvents, todayStr]
  );
  const realizados = useMemo(() =>
    visibleEvents.filter(ev => ev.end_date < todayStr).sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [visibleEvents, todayStr]
  );

  const evGroups = [
    { label: 'Agendados', items: agendados },
    { label: 'Realizados', items: realizados },
  ].filter(g => g.items.length > 0);

  const [ataSearch, setAtaSearch] = useState('');
  const atasEvents = useMemo(() => {
    const q = ataSearch.trim().toLowerCase();
    return visibleEvents.filter(ev =>
      ev.minutes_file_name &&
      (!q || ev.name.toLowerCase().includes(q) || ev.minutes_file_name.toLowerCase().includes(q)),
    );
  }, [visibleEvents, ataSearch]);

  const WEEKDAYS_S = ['Dom','Seg','Ter','Qua','Qui','Sex','S?b'];
  const MONTHS_S   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  function parseDateUTC(s: string) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function groupByMonth<T extends { start_date: string }>(items: T[]): { monthKey: string; label: string; items: T[] }[] {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const ym = item.start_date.slice(0, 7);
      if (!map.has(ym)) map.set(ym, []);
      map.get(ym)!.push(item);
    }
    return Array.from(map.entries()).map(([ym, evs]) => {
      const [year, month] = ym.split('-').map(Number);
      return { monthKey: ym, label: `${MONTHS[month - 1]} ${year}`, items: evs };
    });
  }

  function tabStyle(active: boolean): React.CSSProperties {
    return {
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
    };
  }

  const [pastOpen, setPastOpen] = useState(false);
  const [filterEvMonth, setFilterEvMonth] = useState(''); // 'MM'
  const [filterEvDay, setFilterEvDay] = useState('');     // 'DD'
  const [filterEvType, setFilterEvType] = useState('');

  const filteredForAgenda = useMemo(() => visibleEvents.filter(ev => {
    if (filterEvMonth && ev.start_date.slice(5, 7) !== filterEvMonth) return false;
    if (filterEvDay && ev.start_date.slice(8, 10) !== filterEvDay) return false;
    if (filterEvType && ev.event_type !== filterEvType) return false;
    return true;
  }), [visibleEvents, filterEvMonth, filterEvDay, filterEvType]);

  /* ── Grupos de agenda (filtrados) ── */
  const agendadosFilt = useMemo(() =>
    filteredForAgenda.filter(ev => ev.end_date >= todayStr).sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [filteredForAgenda, todayStr]
  );
  const realizadosFilt = useMemo(() =>
    filteredForAgenda.filter(ev => ev.end_date < todayStr).sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [filteredForAgenda, todayStr]
  );
  const evGroupsFilt = [
    { label: 'Agendados', items: agendadosFilt },
    { label: 'Realizados', items: realizadosFilt },
  ].filter(g => g.items.length > 0);

  /* ?"??"? Calendario items ?"??"? */
  const calItems: CalendarioItem[] = useMemo(() => visibleEvents.map(ev => ({
    id: ev.id,
    title: ev.name,
    start_date: ev.start_date,
    end_date: ev.end_date,
    color: ev.end_date < todayStr ? '#9aa1ac' : 'var(--blue)',
    label: ev.event_type,
  })), [visibleEvents, todayStr]);

  return (
    <>
      <PageHeader
        eyebrow="Agendamento de Eventos"
        title="Eventos"
        tabBarRight={
          canManageProjects(getUser()?.role) ? (
            <button
              onClick={() => openNew()}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 40, border: 'none', borderBottom: '2px solid transparent', background: 'transparent', color: 'var(--blue)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Plus size={14} />Novo evento
            </button>
          ) : undefined
        }
      />

      {/* Sub-tabs + filtros (mesma linha, estilo Atividades) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 32px', borderBottom: '1px solid var(--line-1)', flexShrink: 0, flexWrap: 'wrap' }}>
        <button style={{ background: 'none', border: 'none', padding: '0 0 4px', fontSize: '.86rem', fontWeight: tab === 'agenda' ? 600 : 400, color: tab === 'agenda' ? 'var(--text)' : 'var(--text-3)', cursor: 'pointer', borderBottom: tab === 'agenda' ? '2px solid var(--blue)' : '2px solid transparent', letterSpacing: '-.1px', fontFamily: 'inherit' }} onClick={() => setTab('agenda')}>Agenda</button>
        <button style={{ background: 'none', border: 'none', padding: '0 0 4px', fontSize: '.86rem', fontWeight: tab === 'atas' ? 600 : 400, color: tab === 'atas' ? 'var(--text)' : 'var(--text-3)', cursor: 'pointer', borderBottom: tab === 'atas' ? '2px solid var(--blue)' : '2px solid transparent', letterSpacing: '-.1px', fontFamily: 'inherit' }} onClick={() => setTab('atas')}>Atas de reunião</button>
        <button style={{ background: 'none', border: 'none', padding: '0 0 4px', fontSize: '.86rem', fontWeight: tab === 'calendar' ? 600 : 400, color: tab === 'calendar' ? 'var(--text)' : 'var(--text-3)', cursor: 'pointer', borderBottom: tab === 'calendar' ? '2px solid var(--blue)' : '2px solid transparent', letterSpacing: '-.1px', fontFamily: 'inherit' }} onClick={() => setTab('calendar')}>Calendário</button>

        {tab === 'agenda' && (
          <>
            <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

            {/* Mês */}
            <select value={filterEvMonth} onChange={e => setFilterEvMonth(e.target.value)}
              style={{ padding: '7px 11px', borderRadius: 3, border: filterEvMonth ? '1px solid var(--blue)' : '1px solid var(--border)', background: 'var(--surface)', color: filterEvMonth ? 'var(--blue)' : 'var(--text-2)', fontSize: '0.8rem', fontWeight: filterEvMonth ? 600 : 400, cursor: 'pointer', outline: 'none' }}>
              <option value="">Mês</option>
              {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
            </select>

            {/* Dia */}
            <select value={filterEvDay} onChange={e => setFilterEvDay(e.target.value)}
              style={{ padding: '7px 11px', borderRadius: 3, border: filterEvDay ? '1px solid var(--blue)' : '1px solid var(--border)', background: 'var(--surface)', color: filterEvDay ? 'var(--blue)' : 'var(--text-2)', fontSize: '0.8rem', fontWeight: filterEvDay ? 600 : 400, cursor: 'pointer', outline: 'none' }}>
              <option value="">Dia</option>
              {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {/* Tipo */}
            <select value={filterEvType} onChange={e => setFilterEvType(e.target.value)}
              style={{ padding: '7px 11px', borderRadius: 3, border: filterEvType ? '1px solid var(--blue)' : '1px solid var(--border)', background: 'var(--surface)', color: filterEvType ? 'var(--blue)' : 'var(--text-2)', fontSize: '0.8rem', fontWeight: filterEvType ? 600 : 400, cursor: 'pointer', outline: 'none' }}>
              <option value="">Tipo</option>
              {EV_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            {(filterEvMonth || filterEvDay || filterEvType) && (
              <button onClick={() => { setFilterEvMonth(''); setFilterEvDay(''); setFilterEvType(''); }}
                className="mono"
                style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}>
                LIMPAR
              </button>
            )}
          </>
        )}

        {tab === 'atas' && (
          <>
            <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', borderRadius: 3, padding: '7px 11px', width: 260 }}>
              <Search size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              <input value={ataSearch} onChange={e => setAtaSearch(e.target.value)} placeholder="Buscar ata ou evento..."
                style={{ border: 'none', outline: 'none', background: 'none', fontSize: '0.82rem', color: 'var(--text)', width: '100%', fontFamily: 'inherit' }} />
              {ataSearch && (
                <button onClick={() => setAtaSearch('')} title="Limpar"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: 0 }}>
                  <XIcon size={13} />
                </button>
              )}
            </div>
          </>
        )}

        <div style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)', letterSpacing: '0.5px' }}>
          {tab === 'agenda' ? `${filteredForAgenda.length} EVENTO${filteredForAgenda.length !== 1 ? 'S' : ''}`
            : tab === 'atas' ? `${atasEvents.length} ATA${atasEvents.length !== 1 ? 'S' : ''}`
            : `${visibleEvents.length} EVENTO${visibleEvents.length !== 1 ? 'S' : ''}`}
        </span>
      </div>
      {/* ── AGENDA ── */}
      {tab === 'agenda' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div className="loading-state">Carregando eventos…</div>
          ) : evGroupsFilt.length === 0 ? (
            <div className="empty-state"><p>Nenhum evento encontrado.</p></div>
          ) : evGroupsFilt.map(group => (
            <div key={group.label}>
              {/* Label do grupo: Agendados / Realizados */}
              <div className="mono" style={{ fontSize: '0.66rem', fontWeight: 600, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--text-3)', padding: '20px 32px 0' }}>
                {group.label}
              </div>

              {/* Sub-grupos por mês */}
              {groupByMonth(group.items).map(monthGroup => (
                <div key={monthGroup.monthKey}>
                  {/* Separador de mês */}
                  <div style={{ padding: '10px 32px 8px', borderBottom: '1px solid var(--line-2)', marginTop: 12 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.2px' }}>{monthGroup.label}</span>
                  </div>

                  {monthGroup.items.map(ev => {
                    const dt = parseDateUTC(ev.start_date);
                    const isPast = ev.end_date < todayStr;
                    const resps = parseResps(ev.responsibles);
                    const dateColor = isPast ? 'var(--text-2)' : 'var(--blue)';
                    return (
                      <div key={ev.id} onClick={() => { setPreview({ event: ev, cursorX: 0, cursorY: 0 }); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '16px 32px', borderTop: '1px solid var(--line-2)', cursor: 'pointer', transition: 'background 0.12s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                        {/* Bloco de data */}
                        <div className="mono" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 46, flexShrink: 0, lineHeight: 1.1 }}>
                          <span style={{ fontSize: '0.56rem', fontWeight: 500, letterSpacing: '1px', color: 'var(--text-3)', textTransform: 'uppercase' }}>{WEEKDAYS_S[dt.getDay()]}</span>
                          <span style={{ fontSize: '1.4rem', fontWeight: 500, color: dateColor, marginTop: 1 }}>{dt.getDate()}</span>
                          <span style={{ fontSize: '0.54rem', fontWeight: 500, letterSpacing: '1px', color: 'var(--text-3)', textTransform: 'uppercase' }}>{MONTHS_S[dt.getMonth()]}</span>
                        </div>
                        {/* Divider */}
                        <div style={{ width: 1, height: 44, background: 'var(--line-1)', flexShrink: 0 }} />
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="mono" style={{ fontSize: '0.6rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)' }}>{ev.event_type}</span>
                            <span style={{ color: 'var(--border)' }}>·</span>
                            <span className="mono" style={{ fontSize: '0.6rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: isPast ? 'var(--text-2)' : 'var(--blue)' }}>
                              {isPast ? 'Realizado' : 'Agendado'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text)', marginTop: 5, letterSpacing: '-0.1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                            {ev.start_time && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)', fontSize: '0.74rem' }}>
                                <Clock size={12} />
                                {ev.start_time}
                              </span>
                            )}
                            {ev.attendees && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.74rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                                <MapPin size={12} strokeWidth={1.8} />
                                {`${ev.event_type} · ${ev.attendees}`}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Direita: avatares + badge */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                          {resps.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              {resps.slice(0, 3).map((name, i) => {
                                const inits = name.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                                return (
                                  <div key={name} className="mono" title={name} style={{ width: 28, height: 28, borderRadius: '50%', background: '#072f63', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 500, marginLeft: i > 0 ? -6 : 0, border: '1.5px solid var(--surface)', flexShrink: 0, zIndex: 3 - i }}>
                                    {inits}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {(ev.minutes_file_name || isPast) && (
                            <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.62rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: ev.minutes_file_name ? '#157F3C' : '#A87A00' }}>
                              <Paperclip size={11} />
                              {ev.minutes_file_name ? 'Ata anexada' : 'Ata pendente'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ?.??.? ATAS ?.??.? */}
      {tab === 'atas' && (
        <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid var(--line-1)' }}>
          {atasEvents.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-3)' }}>
              <div className="mono" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>{ataSearch ? 'Nenhuma ata encontrada para a busca.' : 'Nenhuma ata anexada ainda. Abra um evento realizado para anexar.'}</div>
            </div>
          ) : atasEvents.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 32px', borderBottom: '1px solid var(--line-2)', transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
              {/* Ícone */}
              <div style={{ width: 40, height: 40, border: '1px solid var(--border)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)', flexShrink: 0, background: 'var(--surface-2)' }}>
                <FileText size={18} />
              </div>
              {/* Info — evento em destaque */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                  {a.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Paperclip size={11} color="var(--text-3)" />
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.minutes_file_name}</span>
                  <span style={{ color: 'var(--border)' }}>·</span>
                  <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-3)', letterSpacing: '0.3px', flexShrink: 0 }}>{a.start_date}</span>
                </div>
              </div>
              {/* Baixar */}
              <button
                onClick={async () => { try { await openSignedUrl(() => getEventMinutesUrl(a.id)); } catch { addToast('error', 'Erro', 'Não foi possível baixar a ata.'); } }}
                title="Baixar ata"
                style={{ width: 34, height: 34, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--blue)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; }}>
                <Download size={15} />
              </button>
              {/* Remover */}
              <button
                onClick={() => setConfirmDialog({
                  title: 'Remover ata',
                  message: `A ata "${a.minutes_file_name}" será removida permanentemente. Deseja continuar?`,
                  confirmLabel: 'Remover',
                  onConfirm: async () => { const updated = await removeEventMinutes(a.id); setEvents(curr => curr.map(x => x.id === a.id ? updated : x)); addToast('success', 'Ata removida', ''); },
                })}
                style={{ width: 34, height: 34, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#b42318'; (e.currentTarget as HTMLButtonElement).style.color = '#b42318'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; }}
                title="Remover ata"
              >
                <XIcon size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ?.??.? CALENDÁRIO ?.??.? */}
      {tab === 'calendar' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 32px' }}>
          <Calendario
            items={calItems}
            onItemClick={(item) => { const ev = events.find(e => e.id === item.id); if (ev) setPreview({ event: ev, cursorX: 0, cursorY: 0 }); }}
            legend={[
              { color: 'var(--blue)', label: 'Agendado' },
              { color: '#9aa1ac', label: 'Realizado' },
            ]}
          />
        </div>
      )}

      {/* Drawer de detalhe do evento */}
      {preview && (() => {
        const ev = preview.event;
        const resps = parseResps(ev.responsibles);
        const isPastEv = ev.end_date < todayStr;
        const sameDay = ev.start_date === ev.end_date;
        const dt = parseDateUTC(ev.start_date);
        const WDAYS = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
        const MONS  = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
        const dateLabel = `${WDAYS[dt.getDay()]}, ${dt.getDate()} ${MONS[dt.getMonth()]} ${dt.getFullYear()}`;
        const dateEnd   = sameDay ? null : (() => {
          const d2 = parseDateUTC(ev.end_date);
          return `${WDAYS[d2.getDay()]}, ${d2.getDate()} ${MONS[d2.getMonth()]} ${d2.getFullYear()}`;
        })();
        const modalidade = [ev.event_type, ev.attendees].filter(Boolean).join(' · ');

        return (
          <>
            {/* Overlay transparente */}
            <div onClick={closePreview} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />

            {/* Drawer lateral */}
            <div style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: 400, maxWidth: '96vw',
              background: 'var(--surface)',
              borderLeft: '1px solid var(--line-1)',
              zIndex: 201,
              display: 'flex', flexDirection: 'column',
              animation: 'drawin .22s cubic-bezier(.4,0,.2,1) both',
              overflow: 'hidden',
            }} onClick={e => e.stopPropagation()}>

              {/* Stripe Gov-PI */}
              <div style={{ height: 4, background: 'linear-gradient(90deg,var(--blue-fixed) 0 40%,#E0A92E 40% 55%,#b42318 55% 75%,#1B8A4B 75%)', flexShrink: 0 }} />

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--line-1)', flexShrink: 0 }}>
                <span className="mono" style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--text-3)' }}>Evento</span>
                <button onClick={closePreview}
                  style={{ width: 28, height: 28, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; }}>
                  <XIcon size={13} />
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>

                {/* Chips: tipo + status */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span className="mono" style={{ background: 'var(--primary-light)', color: 'var(--blue)', borderRadius: 3, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.3px' }}>{ev.event_type}</span>
                  <span className="mono" style={{ background: isPastEv ? 'rgba(154,161,172,0.1)' : 'rgba(21,127,60,0.08)', color: isPastEv ? '#9aa1ac' : '#157F3C', borderRadius: 3, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.3px' }}>
                    {isPastEv ? 'Realizado' : 'Agendado'}
                  </span>
                  {ev.is_private && <span className="mono" style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed', borderRadius: 3, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.3px' }}>Privado</span>}
                </div>

                {/* Nome */}
                <h2 style={{ fontSize: '1.3rem', fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text)', lineHeight: 1.3, margin: '0 0 22px', wordBreak: 'break-word' }}>
                  {ev.name}
                </h2>

                {/* Divisor */}
                <div style={{ height: 1, background: 'var(--line-1)', marginBottom: 20 }} />

                {/* Metadados */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 22 }}>
                  {[
                    { label: 'Data',       value: dateEnd ? `${dateLabel} – ${dateEnd}` : dateLabel },
                    ev.start_time ? { label: 'Horário',    value: ev.start_time } : null,
                    modalidade     ? { label: 'Modalidade', value: modalidade }    : null,
                  ].filter(Boolean).map((row) => row && (
                    <div key={row.label} style={{ display: 'flex', alignItems: 'baseline', padding: '11px 0', borderBottom: '1px solid var(--line-2)' }}>
                      <span className="mono" style={{ width: 110, flexShrink: 0, fontSize: '0.62rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)' }}>{row.label}</span>
                      <span style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)' }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Participantes */}
                {resps.length > 0 && (
                  <div style={{ marginBottom: 22 }}>
                    <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>Participantes</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {resps.map((name, i) => {
                        const user = users.find(u => u.name === name);
                        const inits = name.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="mono" style={{ width: 36, height: 36, borderRadius: '50%', background: '#072f63', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.64rem', fontWeight: 600, flexShrink: 0, letterSpacing: '0.5px' }}>
                              {inits}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)' }}>{name}</div>
                              {user?.role && <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: 2 }}>{user.role}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Ata da reunião */}
                <div>
                  <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>Ata da reunião</div>
                  {ev.minutes_file_name ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Card do arquivo */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--line-1)', borderRadius: 3, background: 'var(--surface-2)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)', flexShrink: 0 }}>
                          <FileText size={18} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.minutes_file_name}</div>
                          <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: 2 }}>PDF · Ata de reunião</div>
                        </div>
                        {/* Botão de download — gera signed URL temporária */}
                        {ev.minutes_file_path && (
                          <button onClick={async () => {
                            try {
                              await openSignedUrl(() => getEventMinutesUrl(ev.id));
                            } catch { addToast('error', 'Erro', 'Não foi possível gerar o link de download.'); }
                          }}
                            title="Baixar ata"
                            style={{ width: 32, height: 32, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-light)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
                            <Download size={14} />
                          </button>
                        )}
                      </div>
                      {/* Remover */}
                      <button onClick={() => setConfirmDialog({
                        title: 'Remover ata',
                        message: `A ata "${ev.minutes_file_name}" será removida permanentemente. Deseja continuar?`,
                        confirmLabel: 'Remover',
                        onConfirm: async () => {
                          const updated = await removeEventMinutes(ev.id);
                          setEvents(curr => curr.map(x => x.id === ev.id ? updated : x));
                          closePreview();
                          addToast('success', 'Ata removida', '');
                        },
                      })} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: '1px solid rgba(180,35,24,0.2)', borderRadius: 3, background: 'rgba(180,35,24,0.04)', color: '#b42318', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.10)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.04)')}>
                        <Trash2 size={13} />Remover ata
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input type="file" accept=".pdf" id={`ata-${ev.id}`} style={{ display: 'none' }}
                        onChange={async e => {
                          const f = e.target.files?.[0]; if (!f) return;
                          const reader = new FileReader();
                          reader.onload = async ev2 => {
                            const b64 = (ev2.target?.result as string).split(',')[1] ?? '';
                            const updated = await setEventMinutes(ev.id, f.name, b64);
                            setEvents(curr => curr.map(x => x.id === ev.id ? updated : x));
                            closePreview();
                            addToast('success', 'Ata anexada', f.name);
                          };
                          reader.readAsDataURL(f);
                        }} />
                      <label htmlFor={`ata-${ev.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Paperclip size={14} />Anexar ata (.pdf)
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{ borderTop: '1px solid var(--line-1)', padding: '14px 24px', display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => { closePreview(); openEdit(ev); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
                  <Pencil size={13} />Editar
                </button>
                <button onClick={closePreview}
                  style={{ flex: 1, padding: '10px', borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
                  Fechar
                </button>
                <button onClick={() => { handleDelete(ev.id); closePreview(); }}
                  title="Excluir evento"
                  style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderRadius: 3, border: '1px solid rgba(180,35,24,0.2)', background: 'rgba(180,35,24,0.05)', color: '#b42318', cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.10)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.05)')}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── DRAWER criar/editar evento — novo design + estrutura completa ── */}
      {showModal && (() => {
        // Preview card data
        const prevDate = (useRange ? startDate : selectedDates[0]) || todayStr;
        const prevDt = new Date(prevDate + 'T12:00:00');
        const WD_ABBR = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
        const MO_ABBR = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
        const prevWd  = WD_ABBR[prevDt.getDay()];
        const prevDay = String(prevDt.getDate()).padStart(2, '0');
        const prevMon = MO_ABBR[prevDt.getMonth()];
        const prevMeta = [evEventType, startTime ? startTime : null, evType, evLocal ? evLocal : null].filter(Boolean).join(' · ');

        const inp: React.CSSProperties = { width: '100%', padding: '11px 13px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.9rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
        const lbl: React.CSSProperties = { display: 'block', fontFamily: 'var(--mono)', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, color: 'var(--text-3)', marginBottom: 7 };

        return (
          <>
            {/* Backdrop */}
            <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(7,22,45,0.32)', zIndex: 200 }} />

            {/* Drawer */}
            <div className="ssel" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 500, maxWidth: '94%', background: 'var(--surface)', overflowY: 'auto', zIndex: 201, borderLeft: '1px solid var(--line-1)', animation: 'drawin .24s cubic-bezier(.4,0,.2,1) both', display: 'flex', flexDirection: 'column' }}>

              {/* Stripe Gov-PI */}
              <div style={{ height: 4, flexShrink: 0, background: 'linear-gradient(90deg,var(--blue-fixed) 0 40%,#E0A92E 40% 55%,#b42318 55% 75%,#1B8A4B 75%)' }} />

              {/* ── Header ── */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--line-1)', flexShrink: 0, position: 'sticky', top: 4, background: 'var(--surface)', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: 'var(--blue)', flexShrink: 0 }} />
                  <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-2)' }}>
                    {editing ? 'Editar evento' : 'Novo evento'}
                  </span>
                </div>
                <button onClick={() => setShowModal(false)} style={{ width: 30, height: 30, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
                  <XIcon size={15} />
                </button>
              </div>

              <div style={{ padding: '24px 28px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* ── Preview card ── */}
                <div>
                  <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>Pré-visualização</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--line-1)', borderRadius: 3, padding: '14px 16px', background: 'var(--surface-2)' }}>
                    <div className="mono" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 46, flexShrink: 0, lineHeight: 1.15 }}>
                      <span style={{ fontSize: '0.56rem', fontWeight: 500, letterSpacing: '1px', color: 'var(--text-3)' }}>{prevWd}</span>
                      <span style={{ fontSize: '1.45rem', fontWeight: 600, color: 'var(--text)' }}>{prevDay}</span>
                      <span style={{ fontSize: '0.56rem', fontWeight: 500, letterSpacing: '1px', color: 'var(--text-3)' }}>{prevMon}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: evName ? 'var(--text)' : 'var(--text-3)', lineHeight: 1.3 }}>{evName || 'Título do evento…'}</div>
                      <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', letterSpacing: '0.4px', marginTop: 4 }}>{prevMeta || '—'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      {respList.slice(0, 3).map((name, i) => {
                        const inits = name.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                        return (
                          <div key={name} className="mono" title={name} style={{ width: 24, height: 24, borderRadius: '50%', background: '#072f63', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 500, marginLeft: i > 0 ? -6 : 0, border: '1.5px solid var(--surface-2)', flexShrink: 0 }}>
                            {inits}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ── Título ── */}
                <div>
                  <label style={lbl}>Título *</label>
                  <input value={evName} onChange={e => setEvName(e.target.value)} placeholder="Ex: Reunião de planejamento" style={inp}
                    onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = 'inset 0 0 0 1px var(--blue)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
                </div>

                {/* ── Tipo + Horário (grid 1fr 110px) ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 14 }}>
                  <div>
                    <label style={lbl}>Tipo</label>
                    <div style={{ position: 'relative' }}>
                      <select value={evEventType} onChange={e => setEvEventType(e.target.value)} style={{ ...inp, padding: '11px 32px 11px 13px', appearance: 'none', cursor: 'pointer' }}>
                        {EV_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)' }} />
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Horário</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inp}
                      onFocus={e => { e.target.style.borderColor = 'var(--blue)'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; }} />
                  </div>
                </div>

                {/* ── Responsável(eis) — dropdown com busca ── */}
                <div style={{ position: 'relative' }}>
                  <label style={lbl}>Responsável(eis)</label>
                  <div onClick={() => setRespOpen(o => !o)} style={{ ...inp, cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: 5, minHeight: 44, alignItems: 'center' }}>
                    {respList.length === 0
                      ? <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Selecione responsáveis…</span>
                      : respList.map(name => (
                        <span key={name} style={{ background: 'var(--primary-light)', color: 'var(--blue)', borderRadius: 3, padding: '2px 7px', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {name}
                          <button onClick={e => { e.stopPropagation(); toggleResp(name); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--blue)', lineHeight: 1, fontSize: '1rem' }}>×</button>
                        </span>
                      ))
                    }
                    <ChevronDown size={12} style={{ marginLeft: 'auto', color: 'var(--text-3)', flexShrink: 0 }} />
                  </div>
                  {respOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, marginTop: 4 }}>
                      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--line-2)' }}>
                        <input autoFocus type="text" value={respSearch} onChange={e => setRespSearch(e.target.value)} placeholder="Buscar…" style={{ ...inp, padding: '7px 10px', fontSize: '0.82rem' }} onClick={e => e.stopPropagation()} />
                      </div>
                      <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                        {filteredUsers.map(u => (
                          <div key={u.id} onClick={() => toggleResp(u.name)} style={{ padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: respList.includes(u.name) ? 'rgba(3,78,162,0.04)' : 'transparent', fontSize: '0.85rem', color: 'var(--text)', transition: 'background 0.1s' }}
                            onMouseEnter={e => { if (!respList.includes(u.name)) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                            onMouseLeave={e => { if (!respList.includes(u.name)) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                            <span style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${respList.includes(u.name) ? 'var(--blue)' : 'var(--border)'}`, background: respList.includes(u.name) ? 'var(--blue)' : 'var(--surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {respList.includes(u.name) && <Check size={9} color="#fff" strokeWidth={2.5} />}
                            </span>
                            {u.name}
                            <span className="mono" style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-3)' }}>{u.role}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: '6px 10px', borderTop: '1px solid var(--line-1)', textAlign: 'right' }}>
                        <button onClick={() => setRespOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--blue)', fontWeight: 600, fontFamily: 'inherit' }}>Fechar</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Modalidade (segmented) + Local/link ── */}
                <div>
                  <label style={lbl}>Modalidade</label>
                  <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                    {MODALIDADE_OPTIONS.map((opt, i) => {
                      const active = evType === opt;
                      return (
                        <button key={opt} type="button" onClick={() => setEvType(opt)}
                          style={{ flex: 1, padding: '9px 6px', fontSize: '0.78rem', fontWeight: active ? 600 : 500, fontFamily: 'inherit', cursor: 'pointer', border: 'none', borderRight: i < 2 ? '1px solid var(--border)' : 'none', background: active ? 'var(--blue)' : 'var(--surface)', color: active ? '#fff' : 'var(--text-2)', transition: 'background 0.12s, color 0.12s' }}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  <input value={evLocal} onChange={e => setEvLocal(e.target.value)} placeholder="Local ou link (ex: Sala DEDG, Google Meet)" style={inp}
                    onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = 'inset 0 0 0 1px var(--blue)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
                </div>

                {/* ── Data(s): Dia único vs Intervalo ── */}
                <div>
                  <label style={lbl}>Data(s) *</label>
                  {/* Toggle Dia único / Intervalo */}
                  <div style={{ display: 'flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 3, padding: 3, gap: 2, marginBottom: 12 }}>
                    {([false, true] as const).map(isRange => (
                      <button key={String(isRange)} type="button" onClick={() => setUseRange(isRange)}
                        style={{ flex: 1, padding: '6px 0', borderRadius: 2, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit', background: useRange === isRange ? 'var(--surface)' : 'transparent', color: useRange === isRange ? 'var(--blue)' : 'var(--text-2)', boxShadow: useRange === isRange ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                        {isRange ? 'Intervalo' : 'Dia único'}
                      </button>
                    ))}
                  </div>

                  {useRange ? (
                    <EventDateRangePicker from={startDate} to={endDate} onChange={(f, t) => { setStartDate(f); setEndDate(t); }} />
                  ) : (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <EventDayPicker selected={selectedDates} onChange={setSelectedDates} initialDate={selectedDates[0]} />
                      <div style={{ paddingTop: 4, flex: 1 }}>
                        <div className="mono" style={{ fontSize: '0.68rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', marginBottom: 6 }}>
                          {selectedDates.length > 1 ? `${selectedDates.length} dias` : 'Selecionado'}
                        </div>
                        {selectedDates.length === 0 ? (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontStyle: 'italic' }}>Nenhum dia selecionado</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: selectedDates.length >= 6 ? 130 : 'none', overflowY: selectedDates.length >= 6 ? 'auto' : 'visible' }}>
                            {selectedDates.map(d => (
                              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ background: 'var(--primary-light)', color: 'var(--blue)', borderRadius: 3, padding: '3px 7px', fontSize: '0.75rem', fontWeight: 600, flex: 1, whiteSpace: 'nowrap' }}>{formatDateFull(d)}</span>
                                <button type="button" onClick={() => setSelectedDates(selectedDates.filter(x => x !== d))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '1rem', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedDates.length > 1 && (
                          <div className="mono" style={{ marginTop: 8, fontSize: '0.68rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
                            Serão criados {selectedDates.length} eventos
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Quem vai comparecer (participantes externos) ── */}
                <div>
                  <label style={lbl}>Quem vai comparecer</label>
                  <textarea value={attendees} onChange={e => setAttendees(e.target.value)} rows={2}
                    placeholder="Ex: Equipe de vendas, Diretoria, parceiros externos…"
                    style={{ ...inp, resize: 'vertical', minHeight: 68, lineHeight: 1.5 }}
                    onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = 'inset 0 0 0 1px var(--blue)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
                </div>

                {/* ── Visibilidade ── */}
                <div>
                  <label style={lbl}>Visibilidade</label>
                  <div onClick={() => setIsPrivate(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderRadius: 3, border: `1px solid ${isPrivate ? 'var(--blue)' : 'var(--border)'}`, background: isPrivate ? 'rgba(3,78,162,0.04)' : 'var(--surface)', cursor: 'pointer', userSelect: 'none', transition: 'all 0.12s' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isPrivate ? 'var(--blue)' : 'var(--text)' }}>Privado</div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-3)', marginTop: 1 }}>Visível só para você e superiores</div>
                    </div>
                    <div style={{ width: 38, height: 22, borderRadius: 3, background: isPrivate ? 'var(--blue)' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: 3, left: isPrivate ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>
                </div>

                {/* ── Ata de reunião (opcional) ── */}
                {!editing && (
                  <div>
                    <label style={lbl}>Ata de reunião <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opcional)</span></label>
                    {ataFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', border: '1px solid var(--line-1)', borderRadius: 3, background: 'var(--surface-2)' }}>
                        <FileText size={16} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.84rem', color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ataFile.name}</span>
                        <button type="button" onClick={() => setAtaFile(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#b42318')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                          <XIcon size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <input type="file" accept=".pdf" id="ata-new-event" style={{ display: 'none' }}
                          onChange={e => {
                            const f = e.target.files?.[0]; if (!f) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const b64 = (ev.target?.result as string).split(',')[1] ?? '';
                              setAtaFile({ name: f.name, data: b64 });
                            };
                            reader.readAsDataURL(f);
                            e.target.value = '';
                          }} />
                        <label htmlFor="ata-new-event" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 13px', border: '2px dashed var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-3)', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', justifyContent: 'center' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)'; (e.currentTarget as HTMLElement).style.color = 'var(--blue)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                          <Paperclip size={15} />Anexar ata (.pdf)
                        </label>
                      </>
                    )}
                  </div>
                )}

                {formErr && <p style={{ color: '#b42318', fontSize: '0.82rem', margin: 0 }}>{formErr}</p>}

                {/* ── Botões ── */}
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button onClick={handleSave} disabled={saving}
                    style={{ flex: 1, padding: 12, border: 'none', borderRadius: 3, background: saving ? 'var(--text-3)' : 'var(--blue)', color: '#fff', fontSize: '0.84rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={e => { if (!saving) (e.currentTarget.style.background = 'var(--blue-h)'); }}
                    onMouseLeave={e => { if (!saving) (e.currentTarget.style.background = saving ? 'var(--text-3)' : 'var(--blue)'); }}>
                    {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar evento'}
                  </button>
                  <button onClick={() => setShowModal(false)}
                    style={{ padding: '12px 18px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text)', fontSize: '0.84rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      <ConfirmModal
        open={!!confirmDialog}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel ?? 'Excluir'}
        danger
        onConfirm={() => confirmDialog?.onConfirm()}
        onClose={() => setConfirmDialog(null)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

const modalLabel: React.CSSProperties = { display: 'block', fontSize: '0.63rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', marginBottom: 6 };
const modalInp: React.CSSProperties = { width: '100%', border: '1px solid var(--border)', borderRadius: 3, padding: '10px 13px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit' };
