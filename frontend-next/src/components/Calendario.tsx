'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CalendarioItem {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  color: string;
  label?: string;
}

export interface CalendarioLegendItem {
  color: string;
  label: string;
}

interface Props {
  items: CalendarioItem[];
  legend?: CalendarioLegendItem[];
  onItemClick?: (item: CalendarioItem) => void;
  onDayClick?: (date: string, items: CalendarioItem[]) => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function itemsForDay(items: CalendarioItem[], day: string) {
  return items.filter((item) => item.start_date <= day && item.end_date >= day);
}

export default function Calendario({ items, legend, onItemClick, onDayClick }: Props) {
  const today = new Date();
  const [view, setView] = useState<'month' | 'week'>('month');
  const [current, setCurrent] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayPanelOpen, setDayPanelOpen] = useState(false);

  /* ── Mês ── */
  const monthDays = useMemo(() => {
    const year = current.getFullYear();
    const month = current.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ date: string | null; day: number | null }> = [];
    for (let i = 0; i < firstDow; i++) cells.push({ date: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      cells.push({ date: ymd(dt), day: d });
    }
    return cells;
  }, [current]);

  /* ── Semana ── */
  const weekDays = useMemo(() => {
    const d = new Date(current);
    const dow = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(start);
      dt.setDate(start.getDate() + i);
      return { date: ymd(dt), dt };
    });
  }, [current]);

  function prevPeriod() {
    setCurrent((c) => {
      const d = new Date(c);
      if (view === 'month') d.setMonth(d.getMonth() - 1);
      else d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function nextPeriod() {
    setCurrent((c) => {
      const d = new Date(c);
      if (view === 'month') d.setMonth(d.getMonth() + 1);
      else d.setDate(d.getDate() + 7);
      return d;
    });
  }

  function goToday() { setCurrent(new Date(today.getFullYear(), today.getMonth(), 1)); }

  function handleDayClick(date: string) {
    const dayItems = itemsForDay(items, date);
    setSelectedDay(date);
    setDayPanelOpen(true);
    onDayClick?.(date, dayItems);
  }

  const todayStr = ymd(today);

  /* ── Label do período ── */
  const periodLabel = view === 'month'
    ? `${MONTHS_PT[current.getMonth()]} ${current.getFullYear()}`
    : (() => {
        const start = weekDays[0].dt;
        const end   = weekDays[6].dt;
        if (start.getMonth() === end.getMonth())
          return `${start.getDate()}–${end.getDate()} ${MONTHS_PT[start.getMonth()]} ${start.getFullYear()}`;
        return `${start.getDate()} ${MONTHS_PT[start.getMonth()]} – ${end.getDate()} ${MONTHS_PT[end.getMonth()]}`;
      })();

  /* ── Painel de dia ── */
  const selectedItems = selectedDay ? itemsForDay(items, selectedDay) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Toolbar */}
      <div className="toolbar" style={{ borderBottom: '1px solid var(--line-1)', padding: '10px 0', gap: 8 }}>
        <div className="segmented">
          <button className={`segmented-btn${view === 'month' ? ' active' : ''}`} onClick={() => setView('month')}>Mês</button>
          <button className={`segmented-btn${view === 'week' ? ' active' : ''}`} onClick={() => setView('week')}>Semana</button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={prevPeriod}><ChevronLeft size={14} /></button>
        <button className="btn btn-ghost btn-sm" onClick={nextPeriod}><ChevronRight size={14} /></button>
        <span className="mono" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)' }}>{periodLabel}</span>
        <button className="btn btn-secondary btn-sm" onClick={goToday} style={{ marginLeft: 'auto' }}>Hoje</button>
      </div>

      {/* Grade Mês */}
      {view === 'month' && (
        <div style={{ padding: '0 0 24px', overflowX: 'auto' }}>
          {/* Cabeçalho dias da semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))', borderBottom: '1px solid var(--line-1)', minWidth: 840 }}>
            {WEEKDAYS.map((d) => (
              <div key={d} className="mono" style={{ padding: '9px 8px', fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))', minWidth: 840 }}>
            {monthDays.map((cell, idx) => {
              if (!cell.date) return <div key={`empty-${idx}`} style={{ minHeight: 110, borderRight: '1px solid var(--line-2)', borderBottom: '1px solid var(--line-2)', background: 'var(--surface-2)' }} />;
              const dayItems = itemsForDay(items, cell.date);
              const isToday = cell.date === todayStr;
              const isSelected = cell.date === selectedDay;
              return (
                <div
                  key={cell.date}
                  onClick={() => handleDayClick(cell.date!)}
                  style={{
                    minHeight: 110,
                    borderRight: '1px solid var(--line-2)',
                    borderBottom: '1px solid var(--line-2)',
                    padding: '6px 6px 4px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(3,78,162,0.04)' : 'var(--surface)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isSelected ? 'rgba(3,78,162,0.04)' : 'var(--surface)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 5 }}>
                    <span className="mono" style={{
                      fontSize: '0.74rem', fontWeight: isToday ? 700 : 500,
                      color: isToday ? '#fff' : 'var(--text-2)',
                      background: isToday ? 'var(--blue)' : 'transparent',
                      borderRadius: '50%', width: 24, height: 24,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{cell.day}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {dayItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        onClick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
                        style={{
                          borderLeft: `3px solid ${item.color}`,
                          paddingLeft: 5,
                          paddingRight: 4,
                          paddingTop: 3,
                          paddingBottom: 3,
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: 'var(--text)',
                          background: `${item.color}12`,
                          borderRadius: '0 3px 3px 0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          lineHeight: 1.5,
                        }}
                      >{item.title}</div>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', paddingLeft: 5 }}>+{dayItems.length - 3} mais</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grade Semana */}
      {view === 'week' && (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))', minWidth: 910, minHeight: 400 }}>
            {weekDays.map(({ date, dt }) => {
              const dayItems = itemsForDay(items, date);
              const isToday = date === todayStr;
              return (
                <div key={date} style={{ borderRight: '1px solid var(--line-2)', minHeight: 400 }}>
                  <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid var(--line-2)', textAlign: 'center' }}>
                    <div className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{WEEKDAYS[dt.getDay()]}</div>
                    <div className="mono" style={{
                      fontSize: '1.1rem', fontWeight: 600,
                      color: isToday ? '#fff' : 'var(--text)',
                      background: isToday ? 'var(--blue)' : 'transparent',
                      borderRadius: '50%', width: 34, height: 34,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '4px auto 0',
                    }}>{dt.getDate()}</div>
                  </div>
                  <div style={{ padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {dayItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onItemClick?.(item)}
                        style={{
                          borderLeft: `3px solid ${item.color}`,
                          padding: '6px 8px 6px 8px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          color: 'var(--text)',
                          background: `${item.color}12`,
                          borderRadius: '0 3px 3px 0',
                          cursor: 'pointer',
                          lineHeight: 1.4,
                        }}
                      >
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                        {item.label && <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: 2 }}>{item.label}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Painel de dia selecionado */}
      {dayPanelOpen && selectedDay && (
        <div style={{ borderTop: '2px solid var(--line-1)', padding: '14px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: '0.845rem', color: 'var(--text)' }}>
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <button className="btn btn-ghost btn-xs" onClick={() => setDayPanelOpen(false)}>✕</button>
          </div>
          {selectedItems.length === 0
            ? <p style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Nenhum item neste dia.</p>
            : selectedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onItemClick?.(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0', borderBottom: '1px solid var(--line-2)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 3, height: 32, background: item.color, borderRadius: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text)' }}>{item.title}</div>
                  {item.label && <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>{item.label}</div>}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Legenda */}
      {legend && legend.length > 0 && (
        <div className="dist-legend" style={{ paddingTop: 12 }}>
          {legend.map((l) => (
            <div key={l.label} className="dist-legend-item">
              <div className="dist-legend-dot" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
