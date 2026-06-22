﻿'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Trash2, Pencil, ChevronLeft, ChevronRight, Clock, ChevronDown, Check, Plus, FileText, Paperclip, X as XIcon, Calendar, Users, User } from 'lucide-react';
import Calendario, { type CalendarioItem } from '@/components/Calendario';
import {
  fetchEvents, createEvent, updateEvent, deleteEvent, fetchUsers,
  setEventMinutes, removeEventMinutes,
  type CalendarEvent, type UserPublic,
} from '@/lib/api';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import { getUser } from '@/lib/auth';
import PageHeader from '@/components/PageHeader';

// â"€â"€ helpers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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
          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', fontSize:'0.9rem', lineHeight:1, padding:'2px 5px' }}>â€¹</button>
        <span style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--text-primary)' }}>{MONTHS[pickMonth]} {pickYear}</span>
        <button type="button" onClick={() => { if(pickMonth===11){setPickYear(y=>y+1);setPickMonth(0);}else setPickMonth(m=>m+1); }}
          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', fontSize:'0.9rem', lineHeight:1, padding:'2px 5px' }}>â€º</button>
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
        <div style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>InÃ­cio</div>
        <input type="date" value={from} onChange={e => onChange(e.target.value, to < e.target.value ? e.target.value : to)}
          style={{ width:'100%', border:'1px solid var(--border)', borderRadius:3, padding:'7px 10px', fontSize:'0.85rem', outline:'none', boxSizing:'border-box' as const, background:'var(--surface)', color:'var(--text)', fontFamily:'inherit' }} />
      </div>
      <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:18 }}>â†'</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>Fim</div>
        <input type="date" value={to} min={from} onChange={e => onChange(from, e.target.value)}
          style={{ width:'100%', border:'1px solid var(--border)', borderRadius:3, padding:'7px 10px', fontSize:'0.85rem', outline:'none', boxSizing:'border-box' as const, background:'var(--surface)', color:'var(--text)', fontFamily:'inherit' }} />
      </div>
    </div>
  );
}

// â"€â"€ Preview popup â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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
        background: '#fff', borderRadius: 3,
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
            <span style={{ background: colorPalette.bg, color: colorPalette.color, borderRadius: 3, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>{calEvent.event_type}</span>
            {calEvent.is_private && <span style={{ background: '#f3e8ff', color: '#7c3aed', borderRadius: 3, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>Privado</span>}
            {isPast && <span style={{ background: '#f1f5f9', color: '#64748b', borderRadius: 3, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>Passado</span>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1, padding: '0 0 0 8px', flexShrink: 0 }}>Ã—</button>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Date / time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <Calendar size={13} />
          <span>
            {sameDay ? formatDateFull(calEvent.start_date) : `${formatDate(calEvent.start_date)} â†' ${formatDateFull(calEvent.end_date)}`}
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
            flex: 1, padding: '7px 0', borderRadius: 3, border: '1px solid #fecaca',
            background: '#fff5f5', color: '#dc2626', fontSize: '0.82rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          <Trash2 size={13} />
          {deleting === calEvent.id ? 'Excluindoâ€¦' : 'Excluir'}
        </button>
        <button
          onClick={() => { onClose(); onEdit(calEvent); }}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 3, border: 'none',
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

// â"€â"€ EventChip (month view) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

// â"€â"€ Month view â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

// â"€â"€ Week view â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

// â"€â"€ Main page â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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
    if (useRange && computedStart > computedEnd) { setFormErr('Data de inÃ­cio não pode ser posterior Ã  data de fim.'); return; }
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
        addToast('success', 'Evento criado', `"${created.name}" foi adicionado ao Calendário.`);
      }
      setShowModal(false);
    } catch (err: unknown) {
      setFormErr(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  function handleDelete(id: string) {
    setConfirmDialog({
      title: 'Excluir evento',
      message: 'Esta aÃ§ão não pode ser desfeita.',
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
    : `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].slice(0,3)} â€" ${weekEnd.getDate()} ${MONTHS[weekEnd.getMonth()].slice(0,3)} ${weekEnd.getFullYear()}`;

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

  /* â"€â"€ Grupos de agenda â"€â"€ */
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

  const atasEvents = useMemo(() =>
    visibleEvents.filter(ev => ev.minutes_file_name),
    [visibleEvents]
  );

  const WEEKDAYS_S = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const MONTHS_S   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  function parseDateUTC(s: string) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function tabStyle(active: boolean): React.CSSProperties {
    return {
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
    };
  }

  const [pastOpen, setPastOpen] = useState(false);

  /* â"€â"€ Calendario items â"€â"€ */
  const calItems: CalendarioItem[] = useMemo(() => visibleEvents.map(ev => ({
    id: ev.id,
    title: ev.name,
    start_date: ev.start_date,
    end_date: ev.end_date,
    color: ev.end_date < todayStr ? '#9aa1ac' : '#034EA2',
    label: ev.event_type,
  })), [visibleEvents, todayStr]);

  return (
    <>
      <PageHeader eyebrow="Planejamento · DEDG" title="Eventos" />

      {/* â"€â"€ Tab bar â"€â"€ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '18px 32px 0', borderBottom: '1px solid var(--line-1)', flexShrink: 0 }}>
        <button style={tabStyle(tab === 'agenda')} onClick={() => setTab('agenda')}>Agenda</button>
        <button style={tabStyle(tab === 'atas')} onClick={() => setTab('atas')}>Atas de reunião</button>
        <button style={tabStyle(tab === 'calendar')} onClick={() => setTab('calendar')}>Calendário</button>
        <div style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)', letterSpacing: '0.5px' }}>
          {visibleEvents.length} EVENTOS
        </span>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <button onClick={() => openNew()}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 13px', border: 'none', borderRadius: 3, background: '#034EA2', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Plus size={14} />
          Novo evento
        </button>
      </div>
      {/* â•â• AGENDA â•â• */}
      {tab === 'agenda' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div className="loading-state">Carregando eventosâ€¦</div>
          ) : evGroups.length === 0 ? (
            <div className="empty-state"><p>Nenhum evento encontrado.</p></div>
          ) : evGroups.map(group => (
            <div key={group.label}>
              <div className="mono" style={{ fontSize: '0.66rem', fontWeight: 500, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--text-3)', padding: '22px 32px 10px' }}>
                {group.label}
              </div>
              {group.items.map(ev => {
                const dt = parseDateUTC(ev.start_date);
                const isPast = ev.end_date < todayStr;
                const resps = parseResps(ev.responsibles);
                const dateColor = isPast ? 'var(--text-3)' : 'var(--text)';
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
                        <span style={{ color: 'var(--border)' }}>Â·</span>
                        <span className="mono" style={{ fontSize: '0.6rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: isPast ? 'var(--text-3)' : '#034EA2' }}>
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
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{ev.attendees}</span>
                        )}
                      </div>
                    </div>
                    {/* Direita: avatares + badge */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                      {resps.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {resps.slice(0, 3).map((name, i) => {
                            const colors = ['#034EA2','#1B8A4B','#b42318','#A87A00'];
                            let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
                            const bg = colors[Math.abs(h) % colors.length];
                            const inits = name.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                            return (
                              <div key={name} className="mono" title={name} style={{ width: 28, height: 28, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 600, marginLeft: i > 0 ? -6 : 0, border: '2px solid var(--surface)', flexShrink: 0, zIndex: 3 - i }}>
                                {inits}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Badge de ata */}
                      {ev.minutes_file_name ? (
                        <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.62rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#157F3C' }}>
                          <Paperclip size={11} />
                          Anexada
                        </span>
                      ) : isPast ? (
                        <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.62rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#A87A00' }}>
                          <Paperclip size={11} />
                          Pendente
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* â•â• ATAS â•â• */}
      {tab === 'atas' && (
        <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid var(--line-1)' }}>
          {atasEvents.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-3)' }}>
              <div className="mono" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>Nenhuma ata anexada ainda. Abra um evento realizado para anexar.</div>
            </div>
          ) : atasEvents.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 32px', borderBottom: '1px solid var(--line-2)', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
              <div style={{ width: 38, height: 38, border: '1px solid var(--border)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#034EA2', flexShrink: 0 }}>
                <FileText size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.minutes_file_name}</div>
                <div className="mono" style={{ fontSize: '0.64rem', color: 'var(--text-3)', letterSpacing: '0.3px', marginTop: 3 }}>{a.start_date}</div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', maxWidth: 230, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
              <button
                onClick={async (e) => { e.stopPropagation(); const updated = await removeEventMinutes(a.id); setEvents(curr => curr.map(x => x.id === a.id ? updated : x)); addToast('success', 'Ata removida', ''); }}
                style={{ width: 34, height: 34, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit' }}
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

      {/* â•â• CALENDÃRIO â•â• */}
      {tab === 'calendar' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 32px' }}>
          <Calendario
            items={calItems}
            onItemClick={(item) => { const ev = events.find(e => e.id === item.id); if (ev) setPreview({ event: ev, cursorX: 0, cursorY: 0 }); }}
            legend={[
              { color: '#034EA2', label: 'Agendado' },
              { color: '#9aa1ac', label: 'Realizado' },
            ]}
          />
        </div>
      )}

      {/* â•â• PREVIEW popup (clique no evento) â•â• */}
      {preview && (
        <div onClick={closePreview} style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 320, background: 'var(--surface)', border: '1px solid var(--line-1)', borderRadius: 3, boxShadow: '0 8px 28px rgba(7,22,45,0.18)', overflow: 'hidden', zIndex: 51 }}>
            <div style={{ height: 4, background: 'linear-gradient(90deg,#034EA2 0 40%,#E0A92E 40% 55%,#b42318 55% 75%,#1B8A4B 75%)' }} />
            <div style={{ padding: '14px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)', wordBreak: 'break-word', marginBottom: 4 }}>{preview.event.name}</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <span className="mono" style={{ background: 'rgba(3,78,162,0.08)', color: '#034EA2', borderRadius: 3, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700 }}>{preview.event.event_type}</span>
                  {preview.event.is_private && <span className="mono" style={{ background: 'rgba(147,51,234,0.08)', color: '#9333ea', borderRadius: 3, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700 }}>Privado</span>}
                </div>
              </div>
              <button onClick={closePreview} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '1.1rem', lineHeight: 1, padding: '0 0 0 8px', flexShrink: 0 }}>Ã—</button>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="mono" style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
                {preview.event.start_date === preview.event.end_date ? formatDateFull(preview.event.start_date) : `${formatDate(preview.event.start_date)} â†' ${formatDateFull(preview.event.end_date)}`}
                {preview.event.start_time && <span style={{ marginLeft: 6, fontWeight: 600, color: '#034EA2' }}>{preview.event.start_time}</span>}
              </div>
              {parseResps(preview.event.responsibles).length > 0 && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{parseResps(preview.event.responsibles).join(', ')}</div>
              )}
              {/* Ata */}
              <div style={{ borderTop: '1px solid var(--line-2)', paddingTop: 10, marginTop: 2 }}>
                {preview.event.minutes_file_name ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                    <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', color: '#157F3C' }}>
                      <Paperclip size={11} />
                      {preview.event.minutes_file_name}
                    </span>
                    <button className="btn btn-danger btn-xs" onClick={async () => {
                      const updated = await removeEventMinutes(preview.event.id);
                      setEvents(curr => curr.map(x => x.id === preview.event.id ? updated : x));
                      closePreview();
                      addToast('success', 'Ata removida', '');
                    }}>Remover</button>
                  </div>
                ) : (
                  <div>
                    <span className="mono" style={{ display: 'block', alignItems: 'center', gap: 4, fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', color: '#A87A00', marginBottom: 6 }}>
                      <Paperclip size={11} />
                      Ata pendente
                    </span>
                    <input type="file" accept=".pdf" id={`ata-${preview.event.id}`} style={{ display: 'none' }}
                      onChange={async e => {
                        const f = e.target.files?.[0]; if (!f) return;
                        const reader = new FileReader();
                        reader.onload = async ev2 => {
                          const b64 = (ev2.target?.result as string).split(',')[1] ?? '';
                          const updated = await setEventMinutes(preview.event.id, f.name, b64);
                          setEvents(curr => curr.map(x => x.id === preview.event.id ? updated : x));
                          closePreview();
                          addToast('success', 'Ata anexada', f.name);
                        };
                        reader.readAsDataURL(f);
                      }} />
                    <label htmlFor={`ata-${preview.event.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <FileText size={13} />
                      Anexar ata (.pdf)
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: '10px 16px 14px', display: 'flex', gap: 8 }}>
              <button onClick={() => { handleDelete(preview.event.id); closePreview(); }}
                style={{ flex: 1, padding: '7px 0', borderRadius: 3, border: '1px solid rgba(180,35,24,0.25)', background: 'rgba(180,35,24,0.06)', color: '#b42318', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Trash2 size={13} />Excluir
              </button>
              <button onClick={() => { closePreview(); openEdit(preview.event); }}
                style={{ flex: 1, padding: '7px 0', borderRadius: 3, border: 'none', background: '#034EA2', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Pencil size={13} />Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â•â• MODAL criar/editar evento â•â• */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,22,45,0.5)', backdropFilter: 'blur(1px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: 'var(--surface)', borderRadius: 3, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 4, flexShrink: 0, background: 'linear-gradient(90deg,#034EA2 0 40%,#E0A92E 40% 55%,#b42318 55% 75%,#1B8A4B 75%)' }} />
            <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid var(--line-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexShrink: 0 }}>
              <div>
                <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', marginBottom: 4 }}>{editing ? 'Editar evento' : 'Novo evento'}</div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'inherit' }}>{editing ? (evName || 'Editar Evento') : 'Preencha os dados abaixo'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 3, border: '1px solid var(--border)', background: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}><XIcon size={14} /></button>
            </div>
            <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1, overflowY: 'auto' }}>
              <div>
                <label className="mono" style={modalLabel}>Nome do Evento *</label>
                <input type="text" value={evName} onChange={e => setEvName(e.target.value)} placeholder="Ex: reunião de planejamento" style={modalInp} />
              </div>
              <div style={{ position: 'relative' }}>
                <label className="mono" style={modalLabel}>ResponsÃ¡vel(eis)</label>
                <div onClick={() => setRespOpen(o => !o)} style={{ ...modalInp, cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: 5, minHeight: 38, alignItems: 'center' }}>
                  {respList.length === 0
                    ? <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Selecione responsÃ¡veis...</span>
                    : respList.map(name => (
                      <span key={name} style={{ background: 'rgba(3,78,162,0.08)', color: '#034EA2', borderRadius: 3, padding: '2px 7px', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {name}
                        <button onClick={e => { e.stopPropagation(); toggleResp(name); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#034EA2', lineHeight: 1 }}>Ã—</button>
                      </span>
                    ))
                  }
                </div>
                {respOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, marginTop: 4 }}>
                    <div style={{ padding: '8px 10px' }}>
                      <input autoFocus type="text" value={respSearch} onChange={e => setRespSearch(e.target.value)} placeholder="Buscar..." style={{ ...modalInp, padding: '5px 9px', fontSize: '0.82rem' }} onClick={e => e.stopPropagation()} />
                    </div>
                    <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                      {filteredUsers.map(u => (
                        <div key={u.id} onClick={() => toggleResp(u.name)} style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: respList.includes(u.name) ? 'rgba(3,78,162,0.04)' : 'transparent', fontSize: '0.85rem' }}>
                          <span style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${respList.includes(u.name) ? '#034EA2' : 'var(--border)'}`, background: respList.includes(u.name) ? '#034EA2' : 'var(--surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {respList.includes(u.name) && <Check size={9} color="#fff" strokeWidth={2.5} />}
                          </span>
                          {u.name}
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '6px 10px', borderTop: '1px solid var(--line-1)', textAlign: 'right' }}>
                      <button onClick={() => setRespOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#034EA2', fontWeight: 600, fontFamily: 'inherit' }}>Fechar</button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="mono" style={modalLabel}>Tipo *</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {(['Presencial', 'Online'] as const).map(t => (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.88rem', fontWeight: evType === t ? 600 : 400, color: evType === t ? '#034EA2' : 'var(--text-2)' }}>
                      <input type="radio" name="evType" value={t} checked={evType === t} onChange={() => setEvType(t)} style={{ accentColor: '#034EA2' }} />{t}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="mono" style={modalLabel}>HorÃ¡rio (opcional)</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={modalInp} />
              </div>
              <div>
                <label className="mono" style={modalLabel}>Participantes</label>
                <textarea value={attendees} onChange={e => setAttendees(e.target.value)} rows={2} placeholder="Ex: Equipe de vendas, Diretoria..." style={{ ...modalInp, resize: 'vertical', minHeight: 60 }} />
              </div>
              <div>
                <label className="mono" style={modalLabel}>Data(s) *</label>
                <div style={{ display: 'flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 3, padding: 3, gap: 2, marginBottom: 12 }}>
                  {([false, true] as const).map(isRange => (
                    <button key={String(isRange)} type="button" onClick={() => setUseRange(isRange)}
                      style={{ flex: 1, padding: '6px 0', borderRadius: 3, border: 'none', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600, fontFamily: 'inherit', background: useRange === isRange ? 'var(--surface)' : 'transparent', color: useRange === isRange ? '#034EA2' : 'var(--text-2)', boxShadow: useRange === isRange ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                      {isRange ? 'Intervalo' : 'Dia Ãºnico'}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {selectedDates.map(d => (
                            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ background: 'rgba(3,78,162,0.08)', color: '#034EA2', borderRadius: 3, padding: '3px 7px', fontSize: '0.75rem', fontWeight: 600, flex: 1 }}>{formatDateFull(d)}</span>
                              <button type="button" onClick={() => setSelectedDates(selectedDates.filter(x => x !== d))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '0.9rem', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>Ã—</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="mono" style={{ fontSize: '0.66rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', marginBottom: 8 }}>Visibilidade</div>
                <div onClick={() => setIsPrivate(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 3, border: `1px solid ${isPrivate ? '#034EA2' : 'var(--border)'}`, background: isPrivate ? 'rgba(3,78,162,0.04)' : 'var(--surface)', cursor: 'pointer', userSelect: 'none', transition: 'all 0.12s' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isPrivate ? '#034EA2' : 'var(--text)' }}>Privado</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-3)', marginTop: 1 }}>VisÃ­vel sÃ³ para vocÃª e superiores</div>
                  </div>
                  <div style={{ width: 38, height: 22, borderRadius: 3, background: isPrivate ? '#034EA2' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 3, left: isPrivate ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </div>
              </div>
              {formErr && <p style={{ color: '#b42318', fontSize: '0.82rem', margin: 0 }}>{formErr}</p>}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line-1)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-2)' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '9px 18px', background: saving ? 'var(--text-3)' : '#034EA2', color: '#fff', border: 'none', borderRadius: 3, fontSize: '0.82rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>{saving ? 'Salvandoâ€¦' : editing ? 'Salvar alteraÃ§Ãµes' : 'Salvar'}</button>
            </div>
          </div>
        </div>
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
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

const modalLabel: React.CSSProperties = { display: 'block', fontSize: '0.63rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', marginBottom: 6 };
const modalInp: React.CSSProperties = { width: '100%', border: '1px solid var(--border)', borderRadius: 3, padding: '10px 13px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit' };
