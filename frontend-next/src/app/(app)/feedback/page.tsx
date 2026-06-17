'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { fetchFeedbacks, toggleFeedbackUpvote, setFeedbackStatus, deleteFeedback, type FeedbackItem } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { CircleQuestionMark, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import ToastContainer from '@/components/ToastContainer';
import ConfirmModal from '@/components/ConfirmModal';
import FormModal from './_components/FormModal';
import RespostaModal from './_components/RespostaModal';
import FeedbackCard from './_components/FeedbackCard';
import FeedbackSidebar from './_components/FeedbackSidebar';
import { type TypeFilter, type StatusFilter, type SeverityFilter, type Sort } from './_components/types';

export default function FeedbackPage() {
  const user = getUser();
  const isAdmin = user?.role === 'Admin';
  const currentUserId = user?.user_id ?? '';
  const currentUserName = user?.name ?? user?.username ?? 'Anônimo';
  const { toasts, addToast, dismissToast } = useToast();

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('todos');
  const [myOnly, setMyOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('votos');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<FeedbackItem | null>(null);
  const [respondTarget, setRespondTarget] = useState<FeedbackItem | null>(null);
  const [upvoting, setUpvoting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeedbackItem | null>(null);
  const [page, setPage] = useState(1);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeletePending, setBulkDeletePending] = useState(false);

  const PAGE_SIZE = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await fetchFeedbacks()); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setPage(1); }, [typeFilter, statusFilter, severityFilter, myOnly, search, sort]);

  async function handleUpvote(id: string) {
    if (upvoting) return;
    setUpvoting(id);
    try {
      const updated = await toggleFeedbackUpvote(id);
      setItems(prev => prev.map(it => it.id === id ? updated : it));
    } catch {
      addToast('error', 'Erro', 'Não foi possível registrar o voto.');
    } finally { setUpvoting(null); }
  }

  function handleCreated(item: FeedbackItem) {
    setItems(prev => [item, ...prev]);
    addToast('success', 'Publicado!', 'Sua publicação foi registrada.');
  }

  function handleUpdated(updated: FeedbackItem) {
    setItems(prev => prev.map(it => it.id === updated.id ? updated : it));
    addToast('success', 'Atualizado!', 'Sua publicação foi atualizada.');
  }

  function handleResponded(updated: FeedbackItem) {
    setItems(prev => prev.map(it => it.id === updated.id ? updated : it));
  }

  function handleDelete(item: FeedbackItem) {
    setDeleteTarget(item);
  }

  async function performDelete(item: FeedbackItem) {
    setDeleteTarget(null);
    try {
      await deleteFeedback(item.id);
      setItems(prev => prev.filter(it => it.id !== item.id));
      addToast('success', 'Excluído', 'Publicação removida.');
    } catch {
      addToast('error', 'Erro', 'Não foi possível excluir.');
    }
  }

  function handleToggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    setSelectedIds(new Set(visible.map(it => it.id)));
  }

  function handleCancelSelect() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  async function performBulkDelete() {
    const ids = [...selectedIds];
    setBulkDeletePending(false);
    setSelectionMode(false);
    setSelectedIds(new Set());
    await Promise.allSettled(ids.map(id => deleteFeedback(id)));
    setItems(prev => prev.filter(it => !ids.includes(it.id)));
    addToast('success', 'Excluídos', `${ids.length} publicação(ões) removida(s).`);
  }

  async function handleStatusChange(id: string, status: 'pendente' | 'respondida') {
    try {
      const updated = await setFeedbackStatus(id, status);
      setItems(prev => prev.map(it => it.id === id ? updated : it));
    } catch {
      addToast('error', 'Erro', 'Não foi possível alterar o status.');
    }
  }

  const visible = items
    .filter(it => {
      if (myOnly && it.usuario_id !== currentUserId) return false;
      if (!myOnly && typeFilter !== 'todos' && it.tipo !== typeFilter) return false;
      if (!myOnly && statusFilter === 'respondidas' && it.status !== 'respondida') return false;
      if (!myOnly && statusFilter === 'pendentes' && it.status === 'respondida') return false;
      if (severityFilter !== 'todos' && it.severidade !== severityFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!it.titulo.toLowerCase().includes(q) && !it.descricao.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === 'votos') return b.upvotes - a.upvotes;
      return b.created_at.localeCompare(a.created_at);
    });

  const totalPages = Math.ceil(visible.length / PAGE_SIZE);
  const paginated = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const sortBtn = (value: Sort, label: string) => (
    <button
      onClick={() => setSort(value)}
      style={{
        padding: '6px 16px',
        borderRadius: 20,
        border: `1.5px solid ${sort === value ? 'var(--primary)' : 'var(--border-light)'}`,
        background: sort === value ? 'var(--primary)' : 'var(--bg-card)',
        color: sort === value ? '#fff' : 'var(--text-secondary)',
        fontWeight: sort === value ? 700 : 500,
        fontSize: '0.82rem',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.15s',
      }}>
      {label}
    </button>
  );

  return (
    <>
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-left">
          <h1>Feedback & Sugestões</h1>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>
        <FeedbackSidebar
          items={items}
          search={search} setSearch={setSearch}
          typeFilter={typeFilter} setTypeFilter={setTypeFilter}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          severityFilter={severityFilter} setSeverityFilter={setSeverityFilter}
          myOnly={myOnly} setMyOnly={setMyOnly}
          currentUserId={currentUserId}
        />

        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-app)', padding: '24px 28px' }}>
          {/* Feed header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {myOnly ? 'Minhas publicações' : 'Feed de Sugestões'}
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {loading ? 'Carregando…' : `${visible.length} publicaç${visible.length === 1 ? 'ão' : 'ões'} encontrada${visible.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {!selectionMode && sortBtn('votos', 'Populares')}
              {!selectionMode && sortBtn('recentes', 'Recentes')}
              <button
                onClick={() => { setSelectionMode(s => !s); setSelectedIds(new Set()); }}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600,
                  border: `1.5px solid ${selectionMode ? 'var(--primary)' : 'var(--border-light)'}`,
                  background: selectionMode ? 'var(--primary-light)' : 'var(--bg-card)',
                  color: selectionMode ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                {selectionMode ? 'Cancelar' : 'Selecionar'}
              </button>
            </div>
          </div>

          {/* Cards */}
          {loading ? (
            <div style={{ padding: '64px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Carregando…
            </div>
          ) : visible.length === 0 ? (
            <div style={{ padding: '72px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <CircleQuestionMark size={48} color="var(--border-light)" />
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>Nenhuma publicação encontrada.</p>
              <button onClick={() => setShowForm(true)}
                style={{ padding: '8px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Nova publicação
              </button>
            </div>
          ) : (
            <>
              {paginated.map(item => (
                <FeedbackCard
                  key={item.id}
                  item={item}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  isAdmin={isAdmin}
                  onUpvote={handleUpvote}
                  onEdit={it => setEditTarget(it)}
                  onDelete={handleDelete}
                  onRespond={setRespondTarget}
                  onStatusChange={handleStatusChange}
                  upvoting={upvoting}
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24, paddingBottom: 8 }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      width: 34, height: 34, borderRadius: 6, border: '1.5px solid var(--border-light)',
                      background: 'var(--bg-card)', color: 'var(--text-secondary)',
                      cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
                    }}
                  >
                    <ChevronLeft width={14} height={14} />
                  </button>

                  {(() => {
                    const pageNums: (number | '…')[] = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pageNums.push(i);
                    } else {
                      pageNums.push(1);
                      if (page > 3) pageNums.push('…');
                      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pageNums.push(i);
                      if (page < totalPages - 2) pageNums.push('…');
                      pageNums.push(totalPages);
                    }
                    return pageNums.map((n, i) => n === '…' ? (
                      <span key={`ellipsis-${i}`} style={{ width: 34, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>…</span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n as number)}
                        style={{
                          width: 34, height: 34, borderRadius: 6, fontFamily: 'inherit',
                          border: `1.5px solid ${n === page ? 'var(--primary)' : 'var(--border-light)'}`,
                          background: n === page ? 'var(--primary)' : 'var(--bg-card)',
                          color: n === page ? '#fff' : 'var(--text-secondary)',
                          fontWeight: n === page ? 700 : 500, fontSize: '0.85rem',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {n}
                      </button>
                    ));
                  })()}

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      width: 34, height: 34, borderRadius: 6, border: '1.5px solid var(--border-light)',
                      background: 'var(--bg-card)', color: 'var(--text-secondary)',
                      cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
                    }}
                  >
                    <ChevronRight width={14} height={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {showForm && (
        <FormModal onClose={() => setShowForm(false)} onCreated={handleCreated} />
      )}
      {editTarget && (
        <FormModal
          editItem={editTarget}
          onClose={() => setEditTarget(null)}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
        />
      )}
      {respondTarget && (
        <RespostaModal
          item={respondTarget}
          onClose={() => setRespondTarget(null)}
          onSaved={updated => { handleResponded(updated); addToast('success', 'Resposta salva', ''); }}
        />
      )}
      {selectionMode && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#fff', border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)', padding: '8px 12px',
          boxShadow: '0 4px 24px rgba(3,78,162,0.13), 0 1px 4px rgba(3,78,162,0.07)',
          zIndex: 200, whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, marginRight: 4 }}>
            {selectedIds.size} selecionado(s)
          </span>
          <div style={{ width: 1, height: 18, background: 'var(--border-light)', margin: '0 4px' }} />
          <button
            onClick={handleSelectAll}
            style={{
              padding: '5px 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)', background: 'var(--bg-subtle)',
              color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-light)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
          >
            Selecionar todos
          </button>
          <div style={{ width: 1, height: 18, background: 'var(--border-light)', margin: '0 4px' }} />
          <button
            onClick={() => { if (selectedIds.size > 0) setBulkDeletePending(true); }}
            disabled={selectedIds.size === 0}
            style={{
              padding: '5px 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)',
              background: selectedIds.size > 0 ? 'rgba(239,65,35,0.07)' : 'transparent',
              color: selectedIds.size > 0 ? '#ef4123' : 'var(--text-muted)',
              fontSize: '0.78rem', fontWeight: 600,
              cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { if (selectedIds.size > 0) e.currentTarget.style.background = 'rgba(239,65,35,0.14)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = selectedIds.size > 0 ? 'rgba(239,65,35,0.07)' : 'transparent'; }}
          >
            Excluir
          </button>
          <div style={{ width: 1, height: 18, background: 'var(--border-light)', margin: '0 4px' }} />
          <button
            onClick={handleCancelSelect}
            style={{
              padding: '5px 10px', borderRadius: 'var(--radius-sm)',
              border: '1px solid transparent', background: 'transparent',
              color: 'var(--text-muted)', fontSize: '0.78rem',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* FAB */}
      {!selectionMode && (
        <button
          onClick={() => setShowForm(true)}
          title="Nova publicação"
          style={{
            position: 'fixed', bottom: 32, right: 32, zIndex: 900,
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--primary)', color: '#fff', border: 'none',
            boxShadow: '0 4px 16px rgba(3,78,162,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Plus width={24} height={24} />
        </button>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Excluir publicação"
        message={`Deseja excluir "${deleteTarget?.titulo}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={() => deleteTarget && performDelete(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      />
      <ConfirmModal
        open={bulkDeletePending}
        title={`Excluir ${selectedIds.size} publicação(ões)`}
        message="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        danger
        onConfirm={performBulkDelete}
        onClose={() => setBulkDeletePending(false)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
