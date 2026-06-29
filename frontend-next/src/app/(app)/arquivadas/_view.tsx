﻿'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Archive, Search, RotateCcw, Trash2 } from 'lucide-react';
import { fetchArchivedTasks, unarchiveTask, deleteTask } from '@/lib/api';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import type { Task } from '@/types';
import PageHeader from '@/components/PageHeader';

const PRIO_COLOR: Record<string, string> = {
  Alta: '#b42318',
  Média: '#A87A00',
  Baixa: '#157F3C',
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#9aa1ac',
  in_progress: 'var(--blue)',
  review: '#E0A92E',
  done: '#1B8A4B',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  review: 'Em Revisão',
  done: 'Concluído',
};

export default function ArquivadasPage() {
  const { toasts, addToast, dismissToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('');
  const [confirm, setConfirm] = useState<{ title: string; message?: string; onConfirm: () => void; danger?: boolean } | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(tasks.map(t => t.category).filter(Boolean))].sort(), [tasks]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTasks(await fetchArchivedTasks()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeFilterCount = [filterStatus, filterPriority, filterCategory].filter(Boolean).length;

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!t.activity.toLowerCase().includes(q) && !t.responsible.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false;
      }
      if (filterStatus && t.status_group !== filterStatus) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterCategory && t.category !== filterCategory) return false;
      if (filterResponsible && t.responsible !== filterResponsible) return false;
      return true;
    });
  }, [tasks, search, filterStatus, filterPriority, filterCategory, filterResponsible]);

  async function handleRestore(task: Task) {
    setActing(task.id);
    try {
      await unarchiveTask(task.id);
      setTasks(prev => prev.filter(t => t.id !== task.id));
      addToast('success', 'Restaurada', `"${task.activity}" voltou ao quadro.`);
    } catch { addToast('error', 'Erro', 'Não foi possível restaurar.'); }
    finally { setActing(null); }
  }

  function handleDeleteConfirm(task: Task) {
    setConfirm({
      title: 'Excluir atividade arquivada',
      message: `Deseja excluir permanentemente "${task.activity}"? Esta ação não pode ser desfeita.`,
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        setActing(task.id);
        try {
          await deleteTask(task.id);
          setTasks(prev => prev.filter(t => t.id !== task.id));
          addToast('success', 'Excluída', 'Atividade removida permanentemente.');
        } catch { addToast('error', 'Erro', 'Não foi possível excluir.'); }
        finally { setActing(null); }
      },
    });
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
          {/* Filtros + contagem */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 32px', borderBottom: '1px solid var(--line-1)', flexWrap: 'wrap' }}>
            {/* Status */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ height: 28, padding: '0 8px', border: filterStatus ? '1px solid var(--blue)' : '1px solid var(--border)', borderRadius: 3, background: filterStatus ? 'var(--primary-light)' : 'var(--surface)', color: filterStatus ? 'var(--blue)' : 'var(--text-2)', fontSize: '0.74rem', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">Status</option>
              <option value="pending">Pendente</option>
              <option value="in_progress">Em Andamento</option>
              <option value="review">Em Revisão</option>
              <option value="done">Concluído</option>
            </select>

            {/* Prioridade */}
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              style={{ height: 28, padding: '0 8px', border: filterPriority ? '1px solid var(--blue)' : '1px solid var(--border)', borderRadius: 3, background: filterPriority ? 'var(--primary-light)' : 'var(--surface)', color: filterPriority ? 'var(--blue)' : 'var(--text-2)', fontSize: '0.74rem', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">Prioridade</option>
              <option value="Alta">Alta</option>
              <option value="Média">Média</option>
              <option value="Baixa">Baixa</option>
            </select>

            {/* Categoria */}
            {categories.length > 0 && (
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                style={{ height: 28, padding: '0 8px', border: filterCategory ? '1px solid var(--blue)' : '1px solid var(--border)', borderRadius: 3, background: filterCategory ? 'var(--primary-light)' : 'var(--surface)', color: filterCategory ? 'var(--blue)' : 'var(--text-2)', fontSize: '0.74rem', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}
              >
                <option value="">Categoria</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            )}

            {/* Resposável */}
            <select
              value={filterResponsible}
              onChange={e => setFilterResponsible(e.target.value)}
              style={{ height: 28, padding: '0 8px', border: filterResponsible ? '1px solid var(--blue)' : '1px solid var(--border)', borderRadius: 3, background: filterResponsible ? 'var(--primary-light)' : 'var(--surface)', color: filterResponsible ? 'var(--blue)' : 'var(--text-2)', fontSize: '0.74rem', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">Todos</option>
              {[...new Set(tasks.map(t => t.responsible).filter(Boolean))].sort().map(res => <option key={res} value={res}>{res}</option>)}
            </select>

            {/* Limpar filtros */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterCategory(''); }}
                style={{ height: 28, padding: '0 10px', border: 'none', borderRadius: 3, background: 'transparent', color: 'var(--text-3)', fontSize: '0.74rem', fontFamily: 'inherit', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
              >
                Limpar ({activeFilterCount})
              </button>
            )}

            <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)', letterSpacing: '0.5px', marginLeft: 'auto' }}>
              {filtered.length} ATIVIDADES ARQUIVADAS
            </span>
          </div>

          {/* Cabeçalho da tabela */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 190px 130px 150px 160px', gap: 24, padding: '13px 32px', borderBottom: '1px solid var(--line-1)' }}>
            {['Atividade', 'Projeto', 'Status', 'Criado em', 'Ações'].map(h => (
              <span key={h} className="mono" style={{ fontSize: '0.64rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</span>
            ))}
          </div>

          {/* Linhas */}
          {filtered.map(task => (
            <div key={task.id}
              style={{ display: 'grid', gridTemplateColumns: '1fr 190px 130px 150px 160px', gap: 24, alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid var(--line-2)', cursor: 'default', transition: 'background 0.1s' }}
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

              {/* Ações */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => handleRestore(task)} disabled={acting === task.id}
                  className="mono"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.66rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: acting === task.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--blue)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--blue)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}>
                  <RotateCcw size={11} />
                  Restaurar
                </button>
                <button onClick={() => handleDeleteConfirm(task)} disabled={acting === task.id}
                  title="Excluir permanentemente"
                  style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', border: '1px solid rgba(180,35,24,0.25)', borderRadius: 3, background: 'rgba(180,35,24,0.05)', color: '#b42318', cursor: acting === task.id ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.10)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.05)')}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal open={!!confirm} title={confirm?.title ?? ''} message={confirm?.message} confirmLabel="Excluir" danger={confirm?.danger} onConfirm={() => confirm?.onConfirm()} onClose={() => setConfirm(null)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
