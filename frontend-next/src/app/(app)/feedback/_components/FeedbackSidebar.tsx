'use client';

import { Search, Check } from 'lucide-react';
import { type FeedbackItem } from '@/lib/api';
import { type TypeFilter, type StatusFilter, type SeverityFilter } from './types';

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

const SECTION_LABEL: React.CSSProperties = {
  fontSize: '0.62rem', fontWeight: 500, color: 'var(--text-3)',
  letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 8,
};

function FilterItem({ active, color, onClick, children }: {
  active: boolean; color: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '7px 9px', borderRadius: 3, fontSize: '0.82rem',
        cursor: 'pointer', border: 'none', textAlign: 'left', fontFamily: 'inherit',
        color: active ? color : 'var(--text-2)',
        background: active ? `${color}0d` : 'transparent',
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

export default function FeedbackSidebar({
  items, search, setSearch,
  typeFilter, setTypeFilter,
  statusFilter, setStatusFilter,
  severityFilter, setSeverityFilter,
  myOnly, setMyOnly,
  currentUserId,
}: Props) {
  const mine = items.filter(i => i.usuario_id === currentUserId).length;

  return (
    <aside style={{
      width: 224, flexShrink: 0,
      borderRight: '1px solid var(--line-1)',
      overflowY: 'auto', padding: '20px 0',
      background: 'var(--surface)',
    }}>

      {/* Pesquisa */}
      <div style={{ padding: '0 18px 16px', borderBottom: '1px solid var(--line-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', borderRadius: 3, padding: '7px 10px', background: 'var(--surface)' }}>
          <Search size={13} color="var(--text-3)" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'none', fontSize: '0.8rem', color: 'var(--text)', width: '100%', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* TIPO */}
      <div style={{ padding: '14px 18px 8px' }}>
        <div className="mono" style={SECTION_LABEL}>Tipo</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <FilterItem active={typeFilter === 'todos' && !myOnly} color="var(--blue)" onClick={() => { setTypeFilter('todos'); setMyOnly(false); }}>Todos</FilterItem>
          <FilterItem active={typeFilter === 'sugestao' && !myOnly} color="var(--blue)" onClick={() => { setTypeFilter('sugestao'); setMyOnly(false); }}>Sugestão</FilterItem>
          <FilterItem active={typeFilter === 'bug' && !myOnly} color="#b42318" onClick={() => { setTypeFilter('bug'); setMyOnly(false); }}>Bug</FilterItem>
          <FilterItem active={typeFilter === 'melhoria' && !myOnly} color="#1B8A4B" onClick={() => { setTypeFilter('melhoria'); setMyOnly(false); }}>Melhoria</FilterItem>
          <FilterItem active={typeFilter === 'duvida' && !myOnly} color="#A87A00" onClick={() => { setTypeFilter('duvida'); setMyOnly(false); }}>Dúvida</FilterItem>
        </div>
      </div>

      {/* STATUS */}
      <div style={{ padding: '14px 18px 8px', borderTop: '1px solid var(--line-2)' }}>
        <div className="mono" style={SECTION_LABEL}>Status</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <FilterItem active={statusFilter === 'todos' && !myOnly} color="var(--blue)" onClick={() => { setStatusFilter('todos'); setMyOnly(false); }}>Todos</FilterItem>
          <FilterItem active={statusFilter === 'pendentes' && !myOnly} color="#A87A00" onClick={() => { setStatusFilter('pendentes'); setMyOnly(false); }}>Pendentes</FilterItem>
          <FilterItem active={statusFilter === 'respondidas' && !myOnly} color="#1B8A4B" onClick={() => { setStatusFilter('respondidas'); setMyOnly(false); }}>Respondidas</FilterItem>
        </div>
      </div>

      {/* SEVERIDADE */}
      <div style={{ padding: '14px 18px 8px', borderTop: '1px solid var(--line-2)' }}>
        <div className="mono" style={SECTION_LABEL}>Severidade</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <FilterItem active={severityFilter === 'todos'} color="var(--blue)" onClick={() => setSeverityFilter('todos')}>Todos</FilterItem>
          <FilterItem active={severityFilter === 'Alta'} color="#b42318" onClick={() => setSeverityFilter(severityFilter === 'Alta' ? 'todos' : 'Alta')}>Alta</FilterItem>
          <FilterItem active={severityFilter === 'Média'} color="#A87A00" onClick={() => setSeverityFilter(severityFilter === 'Média' ? 'todos' : 'Média')}>Média</FilterItem>
          <FilterItem active={severityFilter === 'Baixa'} color="#1B8A4B" onClick={() => setSeverityFilter(severityFilter === 'Baixa' ? 'todos' : 'Baixa')}>Baixa</FilterItem>
        </div>
      </div>

      {/* Apenas minhas — checkbox style */}
      <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line-2)' }}>
        <div
          onClick={() => setMyOnly(!myOnly)}
          style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 3, cursor: 'pointer', background: myOnly ? 'var(--primary-light)' : 'transparent' }}
        >
          <div style={{
            width: 16, height: 16, borderRadius: 3, flexShrink: 0,
            border: `1.5px solid ${myOnly ? '#034EA2' : 'var(--border)'}`,
            background: myOnly ? '#034EA2' : 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {myOnly && <Check size={10} color="#fff" strokeWidth={3} />}
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
            Apenas minhas{mine > 0 ? ` (${mine})` : ''}
          </span>
        </div>
      </div>
    </aside>
  );
}
