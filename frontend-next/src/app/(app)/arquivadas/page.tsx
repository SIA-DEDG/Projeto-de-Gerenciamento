'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Archive, Search, Trash2, RotateCcw } from 'lucide-react';
import { fetchArchivedTasks, unarchiveTask, deleteTask } from '@/lib/api';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import type { Task } from '@/types';

const PRIORITY_COLOR: Record<string, string> = {
  Alta: '#ef4444',
  Média: '#f59e0b',
  Baixa: '#22c55e',
};

export default function ArquivadasPage() {
  const { toasts, addToast, dismissToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message?: string; onConfirm: () => void } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchArchivedTasks();
      setTasks(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar atividades arquivadas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(t =>
      t.activity.toLowerCase().includes(q) ||
      t.responsible.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }, [tasks, search]);

  async function handleUnarchive(task: Task) {
    setActionLoading(task.id);
    try {
      await unarchiveTask(task.id);
      setTasks(prev => prev.filter(t => t.id !== task.id));
      addToast('success', 'Restaurada', `"${task.activity}" foi restaurada ao quadro.`);
    } catch {
      addToast('error', 'Erro', 'Não foi possível restaurar a atividade.');
    } finally {
      setActionLoading(null);
    }
  }

  function handleDelete(task: Task) {
    setConfirmDialog({
      title: 'Excluir atividade',
      message: `"${task.activity}" será excluída permanentemente. Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setActionLoading(task.id);
        try {
          await deleteTask(task.id);
          setTasks(prev => prev.filter(t => t.id !== task.id));
          addToast('success', 'Excluída', `"${task.activity}" foi excluída.`);
        } catch {
          addToast('error', 'Erro', 'Não foi possível excluir a atividade.');
        } finally {
          setActionLoading(null);
        }
      },
    });
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Arquivadas</h1>
        </div>
        <div className="topbar-right">
          <div className="topbar-search">
            <Search width={14} />
            <input
              type="text"
              placeholder="Pesquisar arquivadas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>
        {loading ? (
          <div className="loading-state">Carregando atividades arquivadas...</div>
        ) : error ? (
          <div className="loading-state" style={{ color: '#BF2600' }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '64px 0', color: 'var(--text-muted)' }}>
            <Archive size={40} strokeWidth={1.5} style={{ opacity: 0.4 }} />
            <span style={{ fontSize: '0.9rem' }}>
              {search ? 'Nenhuma atividade encontrada para esta busca.' : 'Nenhuma atividade arquivada.'}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ marginBottom: 12, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {filtered.length} atividade{filtered.length !== 1 ? 's' : ''} arquivada{filtered.length !== 1 ? 's' : ''}
            </div>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              {filtered.map((task, idx) => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-light)' : 'none',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <Archive size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.6 }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.activity}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>{task.category}</span>
                      {task.responsible && <span>· {task.responsible}</span>}
                      {task.deadline && <span>· Prazo: {task.deadline}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {task.priority && (
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700,
                        color: PRIORITY_COLOR[task.priority] ?? 'var(--text-muted)',
                        background: `${PRIORITY_COLOR[task.priority] ?? '#94a3b8'}18`,
                        borderRadius: 4, padding: '2px 7px',
                      }}>
                        {task.priority}
                      </span>
                    )}
                    <button
                      onClick={() => handleUnarchive(task)}
                      disabled={actionLoading === task.id}
                      title="Restaurar"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '5px 10px', borderRadius: 6,
                        border: '1px solid var(--border-light)',
                        background: 'var(--primary-light)', color: 'var(--primary)',
                        fontSize: '0.75rem', fontWeight: 600,
                        cursor: actionLoading === task.id ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-glow)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--primary-light)')}
                    >
                      <RotateCcw size={11} strokeWidth={2} />
                      Restaurar
                    </button>
                    <button
                      onClick={() => handleDelete(task)}
                      disabled={actionLoading === task.id}
                      title="Excluir permanentemente"
                      style={{
                        display: 'flex', alignItems: 'center',
                        padding: '5px', borderRadius: 6,
                        border: 'none', background: '#fff5f5', color: '#ef4444',
                        cursor: actionLoading === task.id ? 'not-allowed' : 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff5f5')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
