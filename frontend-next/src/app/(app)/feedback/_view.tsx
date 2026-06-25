'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { fetchFeedbacks, toggleFeedbackUpvote, setFeedbackStatus, deleteFeedback, submitFeedback, type FeedbackItem } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { Plus, ChevronLeft, ChevronRight, X, Send, Filter } from 'lucide-react';
import ToastContainer from '@/components/ToastContainer';
import ConfirmModal from '@/components/ConfirmModal';
import FormModal from './_components/FormModal';
import RespostaModal from './_components/RespostaModal';
import FeedbackCard from './_components/FeedbackCard';
import FeedbackSidebar from './_components/FeedbackSidebar';
import { type TypeFilter, type StatusFilter, type SeverityFilter, type Sort } from './_components/types';
import PageHeader from '@/components/PageHeader';

export default function FeedbackPage() {
  const user = getUser();
  const isAdmin = user?.role === 'Admin';
  const currentUserId = user?.user_id ?? '';
  const currentUserName = user?.name ?? user?.username ?? 'Anônimo';
  const { toasts, addToast, dismissToast } = useToast();

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('todos');
  const [myOnly, setMyOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('votos');
  const [showForm, setShowForm] = useState(false);

  // inline form state
  const [fbTipo, setFbTipo] = useState<'sugestao' | 'bug' | 'duvida'>('sugestao');
  const [fbAssunto, setFbAssunto] = useState('');
  const [fbDesc, setFbDesc] = useState('');
  const [fbSaving, setFbSaving] = useState(false);

  const [editTarget, setEditTarget] = useState<FeedbackItem | null>(null);
  const [respondTarget, setRespondTarget] = useState<FeedbackItem | null>(null);
  const [upvoting, setUpvoting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeedbackItem | null>(null);
  const [page, setPage] = useState(1);
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

  async function performBulkDelete() {
    const ids = [...selectedIds];
    setBulkDeletePending(false);
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

  async function handleInlineSubmit() {
    if (!fbAssunto.trim()) { addToast('error', 'Campos obrigatórios', 'Informe o assunto.'); return; }
    if (!fbDesc.trim()) { addToast('error', 'Campos obrigatórios', 'Informe a descrição.'); return; }
    setFbSaving(true);
    try {
      const created = await submitFeedback({
        tipo: fbTipo,
        titulo: fbAssunto.trim(),
        descricao: fbDesc.trim(),
        severidade: null,
        imagens: [],
      });
      handleCreated(created);
      setFbAssunto('');
      setFbDesc('');
      setShowForm(false);
    } catch {
      addToast('error', 'Erro', 'Não foi possível enviar o feedback.');
    } finally {
      setFbSaving(false);
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

  return (
    <>
      <PageHeader eyebrow="Sistema · Comunicação" title="Feedback & Sugestões" />

      {/* 3-column layout */}
      <div style={{ height: '100%', display: 'flex', overflow: 'hidden', flex: 1, minHeight: 0 }}>

        {/* LEFT: sidebar (retractable) */}
        {filtersOpen && (
          <FeedbackSidebar
            items={items}
            search={search} setSearch={setSearch}
            typeFilter={typeFilter} setTypeFilter={setTypeFilter}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            severityFilter={severityFilter} setSeverityFilter={setSeverityFilter}
            myOnly={myOnly} setMyOnly={setMyOnly}
            currentUserId={currentUserId}
          />
        )}

        {/* CENTER: main feed */}
        <div className="ssel" style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: 'var(--surface-2)' }}>
          {/* Sticky header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--line-1)', position: 'sticky', top: 0, zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                onClick={() => setFiltersOpen(v => !v)}
                title="Mostrar/ocultar filtros"
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 3,
                  border: `1.5px solid ${filtersOpen ? '#034EA2' : 'var(--border)'}`,
                  background: filtersOpen ? '#034EA20d' : 'var(--surface)',
                  color: filtersOpen ? '#034EA2' : 'var(--text-2)',
                  fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <Filter size={14} />
                Filtros
              </button>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>
                  {myOnly ? 'Minhas publicações' : 'Feed de Sugestões'}
                </span>
                <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginLeft: 10, letterSpacing: '0.3px' }}>
                  {visible.length} publicações
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setSort('votos')} className="mono"
                style={{ padding: '5px 13px', borderRadius: 20, border: `1.5px solid ${sort === 'votos' ? '#034EA2' : 'var(--border)'}`, background: sort === 'votos' ? '#034EA2' : 'var(--surface)', color: sort === 'votos' ? '#fff' : 'var(--text-2)', fontSize: '0.72rem', fontWeight: sort === 'votos' ? 600 : 500, cursor: 'pointer', letterSpacing: '0.5px', fontFamily: 'inherit' }}>
                POPULARES
              </button>
              <button onClick={() => setSort('recentes')} className="mono"
                style={{ padding: '5px 13px', borderRadius: 20, border: `1.5px solid ${sort === 'recentes' ? '#034EA2' : 'var(--border)'}`, background: sort === 'recentes' ? '#034EA2' : 'var(--surface)', color: sort === 'recentes' ? '#fff' : 'var(--text-2)', fontSize: '0.72rem', fontWeight: sort === 'recentes' ? 600 : 500, cursor: 'pointer', letterSpacing: '0.5px', fontFamily: 'inherit' }}>
                RECENTES
              </button>
              <div style={{ width: 1, height: 22, background: 'var(--line-1)', margin: '0 2px' }} />
              <button
                onClick={() => setShowForm(s => !s)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 3, border: 'none', background: '#034EA2', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#023e82')}
                onMouseLeave={e => (e.currentTarget.style.background = '#034EA2')}
              >
                <Plus size={14} />
                Novo feedback
              </button>
            </div>
          </div>

          {/* Feed cards */}
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? (
              <div style={{ padding: '64px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.9rem' }}>Carregando…</div>
            ) : paginated.length === 0 ? (
              <div style={{ padding: '64px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>Nenhuma publicação encontrada.</div>
            ) : paginated.map(item => (
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
                isSelected={selectedIds.has(item.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '16px 24px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                style={{ width: 30, height: 30, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: page <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page <= 1 ? 0.4 : 1 }}>
                <ChevronLeft size={14} />
              </button>
              <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)', minWidth: 80, textAlign: 'center' }}>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                style={{ width: 30, height: 30, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page >= totalPages ? 0.4 : 1 }}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: inline form panel */}
        {showForm && (
          <div className="ssel" style={{ width: 276, flexShrink: 0, borderLeft: '1px solid var(--line-1)', overflowY: 'auto', background: 'var(--surface)', padding: '20px 20px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>Enviar feedback</div>
              <button onClick={() => setShowForm(false)}
                style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
                <X size={14} strokeWidth={2} />
              </button>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-3)', lineHeight: 1.5, margin: '0 0 18px' }}>
              Relate um bug, sugestão ou dúvida para a equipe.
            </p>

            <label className="mono" style={{ display: 'block', fontSize: '0.63rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>Tipo</label>
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
              {(['sugestao', 'bug', 'duvida'] as const).map((t, i) => {
                const labels = { sugestao: 'Sugestão', bug: 'Problema', duvida: 'Dúvida' };
                const active = fbTipo === t;
                return (
                  <button key={t} onClick={() => setFbTipo(t)}
                    style={{ padding: '8px 0', fontSize: '0.82rem', fontWeight: active ? 600 : 500, border: 'none', borderRight: i < 2 ? '1px solid var(--border)' : 'none', background: active ? '#034EA2' : 'var(--surface)', color: active ? '#fff' : 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', flex: 1 }}>
                    {labels[t]}
                  </button>
                );
              })}
            </div>

            <label className="mono" style={{ display: 'block', fontSize: '0.63rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>Assunto</label>
            <input value={fbAssunto} onChange={e => setFbAssunto(e.target.value)} placeholder="Resuma em poucas palavras"
              style={{ width: '100%', padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.84rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box', marginBottom: 14, fontFamily: 'inherit' }}
              onFocus={e => { e.target.style.borderColor = '#034EA2'; e.target.style.boxShadow = 'inset 0 0 0 1px #034EA2'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />

            <label className="mono" style={{ display: 'block', fontSize: '0.63rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>Descrição</label>
            <textarea value={fbDesc} onChange={e => setFbDesc(e.target.value)} placeholder="Descreva com detalhes..."
              style={{ width: '100%', minHeight: 110, resize: 'vertical', padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.84rem', lineHeight: 1.55, background: 'var(--surface)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box', marginBottom: 16, fontFamily: 'inherit' }}
              onFocus={e => { e.target.style.borderColor = '#034EA2'; e.target.style.boxShadow = 'inset 0 0 0 1px #034EA2'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />

            <button
              onClick={handleInlineSubmit}
              disabled={fbSaving}
              style={{ width: '100%', padding: 10, border: 'none', borderRadius: 3, background: fbSaving ? 'var(--text-3)' : '#034EA2', color: '#fff', fontSize: '0.84rem', fontWeight: 600, cursor: fbSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit' }}
              onMouseEnter={e => { if (!fbSaving) e.currentTarget.style.background = '#023e82'; }}
              onMouseLeave={e => { if (!fbSaving) e.currentTarget.style.background = '#034EA2'; }}>
              <Send size={14} strokeWidth={2} />
              {fbSaving ? 'Publicando…' : 'Publicar'}
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
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

      {/* Bulk delete toolbar */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '8px 12px',
          boxShadow: '0 4px 24px rgba(3,78,162,0.13)',
          zIndex: 200, whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', fontWeight: 700, marginRight: 4 }}>
            {selectedIds.size} selecionado(s)
          </span>
          <div style={{ width: 1, height: 18, background: 'var(--line-1)', margin: '0 4px' }} />
          <button
            onClick={() => setBulkDeletePending(true)}
            style={{ padding: '5px 12px', borderRadius: 3, border: '1px solid rgba(239,65,35,0.3)', background: 'rgba(239,65,35,0.07)', color: '#ef4123', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Excluir
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ padding: '5px 10px', borderRadius: 3, border: '1px solid transparent', background: 'transparent', color: 'var(--text-3)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Cancelar
          </button>
        </div>
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
