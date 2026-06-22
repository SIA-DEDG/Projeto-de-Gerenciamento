﻿'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Archive, Search, RotateCcw } from 'lucide-react';
import { fetchArchivedTasks, unarchiveTask, deleteTask } from '@/lib/api';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import type { Task } from '@/types';
import PageHeader from '@/components/PageHeader';

const PRIO_COLOR: Record<string, string> = {
  Alta:  '#b42318',
  Média: '#A87A00',
  Baixa: '#157F3C',
};

const STATUS_COLOR: Record<string, string> = {
  pending:     '#9aa1ac',
  in_progress: '#034EA2',
  review:      '#E0A92E',
  done:        '#1B8A4B',
};

const STATUS_LABEL: Record<string, string> = {
  pending:     'Pendente',
  in_progress: 'Em Andamento',
  review:      'Em Revisão',
  done:        'Concluído',
};

export default function ArquivadasPage() {
  const { toasts, addToast, dismissToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<{ title: string; message?: string; onConfirm: () => void } | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTasks(await fetchArchivedTasks()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(t => t.activity.toLowerCase().includes(q) || t.responsible.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  }, [tasks, search]);

  async function handleRestore(task: Task) {
    setActing(task.id);
    try {
      await unarchiveTask(task.id);
      setTasks(prev => prev.filter(t => t.id !== task.id));
      addToast('success', 'Restaurada', `"${task.activity}" voltou ao quadro.`);
    } catch { addToast('error', 'Erro', 'Não foi possível restaurar.'); }
    finally { setActing(null); }
  }

  return (
    <>
      <PageHeader
        eyebrow="Atividades concluídas e arquivadas"
        title="Arquivadas"
        right={
          <div className="topbar-search">
            <Search size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            <input type="text" placeholder="Pesquisar arquivadas..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        }
      />

      {loading ? (
        <div className="loading-state">Carregando atividades arquivadas…</div>
      ) : filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '80px 32px', textAlign: 'center' }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
            <Archive size={24} strokeWidth={1.6} />
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginTop: 0 }}>
            {search ? 'Nenhum resultado' : 'Nenhuma atividade arquivada'}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.6, maxWidth: '38ch' }}>
            {search ? 'Tente outra busca.' : <>Conclua uma atividade e use <span style={{ fontWeight: 500, color: 'var(--text)' }}>Arquivar</span> no quadro ou no detalhe para guardá-la aqui.</>}
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Contagem */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 32px', borderBottom: '1px solid var(--line-1)' }}>
            <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)', letterSpacing: '0.5px' }}>
              {filtered.length} ATIVIDADES ARQUIVADAS
            </span>
          </div>

          {/* Cabeçalho da tabela */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 190px 130px 150px 120px', gap: 24, padding: '13px 32px', borderBottom: '1px solid var(--line-1)', background: 'var(--surface-2)' }}>
            {['Atividade', 'Projeto', 'Status', 'Criado em', 'Ação'].map(h => (
              <span key={h} className="mono" style={{ fontSize: '0.64rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</span>
            ))}
          </div>

          {/* Linhas */}
          {filtered.map(task => (
            <div key={task.id}
              style={{ display: 'grid', gridTemplateColumns: '1fr 190px 130px 150px 120px', gap: 24, alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid var(--line-2)', cursor: 'default', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
              {/* Atividade */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span className="mono" style={{ fontSize: '0.6rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)' }}>{task.category}</span>
                  <span style={{ color: 'var(--border)' }}>·</span>
                  <span className="mono" style={{ fontSize: '0.6rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: PRIO_COLOR[task.priority] ?? 'var(--text-3)' }}>{task.priority}</span>
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{task.activity}</span>
              </div>

              {/* Projeto */}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.category || '—'}
              </span>

              {/* Status */}
              <span className="mono" style={{ fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: STATUS_COLOR[task.status_group] ?? 'var(--text-3)' }}>
                {STATUS_LABEL[task.status_group] ?? task.status}
              </span>

              {/* Data */}
              <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-3)', letterSpacing: '0.3px' }}>{task.created_at?.slice(0, 10) ?? '—'}</span>

              {/* Ação */}
              <div>
                <button onClick={() => handleRestore(task)} disabled={acting === task.id}
                  className="mono"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.66rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: acting === task.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'color 0.12s, border-color 0.12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#034EA2'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#034EA2'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}>
                  <RotateCcw size={12} />
                  Restaurar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal open={!!confirm} title={confirm?.title ?? ''} message={confirm?.message} confirmLabel="Excluir" danger onConfirm={() => confirm?.onConfirm()} onClose={() => setConfirm(null)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
