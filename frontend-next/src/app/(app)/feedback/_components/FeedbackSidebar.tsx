'use client';

import { Bug, Lightbulb, Check } from 'lucide-react';
import { type FeedbackItem } from '@/lib/api';
import { SEVERITIES, type TypeFilter, type StatusFilter, type SeverityFilter, inp } from './types';
import { Search } from 'lucide-react';

interface NavItemProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function NavItem({ active, onClick, children }: NavItemProps) {
  return (
    <button onClick={onClick}
      style={{
        width: '100%',
        background: active ? 'rgba(3,78,162,0.08)' : 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '7px 12px',
        borderRadius: 6,
        textAlign: 'left',
        fontFamily: 'inherit',
        fontSize: '0.84rem',
        color: active ? 'var(--primary)' : 'var(--text-primary)',
        fontWeight: active ? 700 : 400,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'background 0.15s',
      }}>
      {children}
    </button>
  );
}

interface Props {
  items: FeedbackItem[];
  search: string;
  setSearch: (v: string) => void;
  typeFilter: TypeFilter;
  setTypeFilter: (v: TypeFilter) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  severityFilter: SeverityFilter;
  setSeverityFilter: (v: SeverityFilter) => void;
  myOnly: boolean;
  setMyOnly: (v: boolean) => void;
  currentUserId: string;
}

export default function FeedbackSidebar({
  items, search, setSearch,
  typeFilter, setTypeFilter,
  statusFilter, setStatusFilter,
  severityFilter, setSeverityFilter,
  myOnly, setMyOnly,
  currentUserId,
}: Props) {
  const bugs        = items.filter(i => i.tipo === 'bug').length;
  const sugestoes   = items.filter(i => i.tipo === 'melhoria').length;
  const respondidas = items.filter(i => i.status === 'respondida').length;
  const pendentes   = items.filter(i => i.status === 'pendente' || !i.status).length;
  const mine        = items.filter(i => i.usuario_id === currentUserId).length;

  const sectionLabel: React.CSSProperties = {
    margin: '0 0 6px',
    fontSize: '0.68rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    padding: '0 12px',
  };

  return (
    <aside style={{
      width: 240,
      flexShrink: 0,
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border-light)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    }}>
      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Pesquisa */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Pesquisar…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inp, paddingLeft: 32, fontSize: '0.82rem' }} />
        </div>

        {/* TIPO */}
        <div>
          <p style={sectionLabel}>Tipo</p>
          <NavItem active={typeFilter === 'todos' && !myOnly} onClick={() => { setTypeFilter('todos'); setMyOnly(false); }}>
            <span>Todos</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{items.length}</span>
          </NavItem>
          <NavItem active={typeFilter === 'bug' && !myOnly} onClick={() => { setTypeFilter('bug'); setMyOnly(false); }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Bug size={13} />Bugs</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{bugs}</span>
          </NavItem>
          <NavItem active={typeFilter === 'melhoria' && !myOnly} onClick={() => { setTypeFilter('melhoria'); setMyOnly(false); }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Lightbulb size={13} />Sugestões</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{sugestoes}</span>
          </NavItem>
        </div>

        {/* STATUS */}
        <div>
          <p style={sectionLabel}>Status</p>
          <NavItem active={statusFilter === 'todos' && !myOnly} onClick={() => { setStatusFilter('todos'); setMyOnly(false); }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check size={13} />Todos os status</span>
          </NavItem>
          <NavItem active={statusFilter === 'respondidas' && !myOnly} onClick={() => { setStatusFilter('respondidas'); setMyOnly(false); }}>
            <span>Respondidas</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{respondidas}</span>
          </NavItem>
          <NavItem active={statusFilter === 'pendentes' && !myOnly} onClick={() => { setStatusFilter('pendentes'); setMyOnly(false); }}>
            <span>Pendentes</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{pendentes}</span>
          </NavItem>
        </div>

        {/* SEVERIDADE — chips */}
        <div>
          <p style={sectionLabel}>Severidade</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 12px' }}>
            {SEVERITIES.map(s => {
              const active = severityFilter === s.value;
              return (
                <button key={s.value}
                  onClick={() => setSeverityFilter(active ? 'todos' : s.value)}
                  style={{
                    padding: '4px 11px', borderRadius: 20, fontSize: '0.73rem', fontWeight: active ? 700 : 500,
                    background: active ? 'rgba(3,78,162,0.1)' : 'var(--bg-subtle)',
                    border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border-light)'}`,
                    color: active ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  }}>
                  {s.value}
                </button>
              );
            })}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: 0 }} />

        {/* Minhas publicações */}
        <button
          onClick={() => setMyOnly(!myOnly)}
          style={{
            width: '100%', background: myOnly ? 'rgba(3,78,162,0.08)' : 'none', border: 'none', cursor: 'pointer',
            padding: '7px 12px', borderRadius: 6, textAlign: 'left', fontFamily: 'inherit',
            fontSize: '0.84rem', color: myOnly ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: myOnly ? 700 : 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'background 0.15s',
          }}>
          <span>Minhas publicações {!myOnly && '→'}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{mine}</span>
        </button>
      </div>
    </aside>
  );
}
