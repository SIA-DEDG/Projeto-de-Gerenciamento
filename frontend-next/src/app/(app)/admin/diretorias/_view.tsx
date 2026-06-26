'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Power, Users, X, Check } from 'lucide-react';
import {
  fetchDiretorias, createDirectoria, updateDirectoria, deleteDirectoria,
  toggleDirectoriaActive, moveUserToDirectoria, removeUserFromDirectoria,
  fetchDirectoriaMembers, fetchAllUsers,
  type Directoria, type UserPublic,
} from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import ConfirmModal from '@/components/ConfirmModal';
import PageHeader from '@/components/PageHeader';

const PRESET_COLORS = [
  '#034EA2', '#1B8A4B', '#b42318', '#A87A00', '#7C3AED', '#0891B2', '#DB2777', '#64748B',
];

interface DirectoriaModalProps {
  initial?: Directoria | null;
  onClose: () => void;
  onSaved: (d: Directoria) => void;
}

function DirectoriaModal({ initial, onClose, onSaved }: DirectoriaModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [color, setColor] = useState(initial?.color ?? '#034EA2');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function autoSlug(v: string) {
    return v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  async function handleSave() {
    if (!name.trim()) { setErr('Nome obrigatório.'); return; }
    if (!slug.trim()) { setErr('Slug obrigatório.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = { name: name.trim(), slug: slug.trim(), description: description.trim() || null, color };
      const saved = initial
        ? await updateDirectoria(initial.id, payload)
        : await createDirectoria(payload);
      onSaved(saved);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally { setSaving(false); }
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 3, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--line-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{initial ? 'Editar diretoria' : 'Nova diretoria'}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, border: '1px solid var(--border)', background: 'var(--surface-2)', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}><X size={14} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Nome */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Nome</label>
            <input value={name} onChange={e => { setName(e.target.value); if (!initial) setSlug(autoSlug(e.target.value)); }}
              placeholder="Ex: Engenharia de Software"
              style={{ width: '100%', padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          {/* Slug */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Slug <span style={{ color: 'var(--text-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(identificador único, sem espaços)</span></label>
            <input value={slug} onChange={e => setSlug(autoSlug(e.target.value))} placeholder="ex: engenharia-software"
              disabled={!!initial}
              style={{ width: '100%', padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.88rem', background: initial ? 'var(--surface-2)' : 'var(--surface)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', opacity: initial ? 0.6 : 1 }} />
          </div>
          {/* Descrição */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Descrição (opcional)</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrição da diretoria"
              style={{ width: '100%', padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          {/* Cor */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Cor de identificação</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }}>
                  {color === c && <Check size={12} color="#fff" />}
                </button>
              ))}
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                style={{ width: 28, height: 28, padding: 0, border: '1px solid var(--border)', borderRadius: '50%', cursor: 'pointer', background: 'none' }} />
            </div>
          </div>

          {err && <div style={{ color: '#b42318', fontSize: '0.82rem', padding: '8px 10px', background: '#fef2f2', borderRadius: 3 }}>{err}</div>}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line-1)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 16px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.84rem', fontFamily: 'inherit' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '7px 18px', border: 'none', borderRadius: 3, background: '#034EA2', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.84rem', fontWeight: 600, fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface MembersModalProps {
  directoria: Directoria;
  onClose: () => void;
}

function MembersModal({ directoria, onClose }: MembersModalProps) {
  const [members, setMembers] = useState<UserPublic[]>([]);
  const [unassigned, setUnassigned] = useState<UserPublic[]>([]);
  const [moving, setMoving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const ROLE_LABELS: Record<string, string> = { Estagiario: 'ESTAGIÁRIO', Funcionario: 'FUNCIONÁRIO', Tecnico: 'TÉCNICO', Coordenador: 'COORDENADOR', Gerente: 'GERENTE', Diretor: 'DIRETOR', Admin: 'ADMIN' };

  const reload = () => {
    setLoading(true);
    Promise.all([fetchDirectoriaMembers(directoria.id), fetchAllUsers()])
      .then(([m, all]) => {
        setMembers(m);
        setUnassigned(all.filter(u => !u.directoria_id && u.role !== 'Admin'));
      }).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [directoria.id]);

  async function handleAssign(u: UserPublic) {
    setMoving(u.id);
    try {
      await moveUserToDirectoria(directoria.id, u.id);
      setUnassigned(prev => prev.filter(x => x.id !== u.id));
      setMembers(prev => [...prev, { ...u, directoria_id: directoria.id, directoria_name: directoria.name }]);
    } catch { /* silent */ } finally { setMoving(null); }
  }

  async function handleRemove(u: UserPublic) {
    setMoving(u.id);
    try {
      await removeUserFromDirectoria(u.id);
      setMembers(prev => prev.filter(x => x.id !== u.id));
      setUnassigned(prev => [...prev, { ...u, directoria_id: null, directoria_name: null }]);
    } catch { /* silent */ } finally { setMoving(null); }
  }

  function UserRow({ u, side }: { u: UserPublic; side: 'left' | 'right' }) {
    const busy = moving === u.id;
    const color = side === 'right' ? (directoria.color ?? '#034EA2') : '#94a3b8';
    return (
      <div
        onClick={() => { if (!busy) { side === 'left' ? handleAssign(u) : handleRemove(u); } }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--line-2)', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.5 : 1, transition: 'background 0.1s' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.66rem', fontWeight: 700, flexShrink: 0 }}>
          {u.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
          <div className="mono" style={{ fontSize: '0.61rem', color: 'var(--text-3)', letterSpacing: '0.3px' }}>{ROLE_LABELS[u.role] ?? u.role}</div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(7,47,99,0.18)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 3, width: '100%', maxWidth: 640, height: '68vh', maxHeight: 520, boxShadow: '0 2px 4px rgba(0,0,0,0.06), 0 16px 48px rgba(3,78,162,0.14)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: directoria.color ?? '#034EA2' }} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{directoria.name}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>· Clique para mover o usuário</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, border: '1px solid var(--border)', background: 'var(--surface-2)', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}><X size={13} /></button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>Carregando…</div>
        ) : (
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

            {/* Esquerda — sem diretoria */}
            <div style={{ flex: 1, borderRight: '1px solid var(--line-1)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ padding: '9px 16px', borderBottom: '1px solid var(--line-2)', background: 'var(--surface-2)', flexShrink: 0 }}>
                <span className="mono" style={{ fontSize: '0.61rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase' }}>Sem diretoria</span>
                <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-3)' }}>{unassigned.length}</span>
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {unassigned.length === 0
                  ? <div style={{ padding: '24px 16px', fontSize: '0.82rem', color: 'var(--text-3)', textAlign: 'center' }}>Nenhum usuário sem diretoria</div>
                  : unassigned.map(u => <UserRow key={u.id} u={u} side="left" />)
                }
              </div>
            </div>

            {/* Direita — membros */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ padding: '9px 16px', borderBottom: '1px solid var(--line-2)', background: 'var(--surface-2)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: directoria.color ?? '#034EA2' }} />
                <span className="mono" style={{ fontSize: '0.61rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase' }}>{directoria.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{members.length}</span>
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {members.length === 0
                  ? <div style={{ padding: '24px 16px', fontSize: '0.82rem', color: 'var(--text-3)', textAlign: 'center' }}>Nenhum membro</div>
                  : members.map(m => <UserRow key={m.id} u={m} side="right" />)
                }
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDiretoriasView() {
  const [diretorias, setDiretorias] = useState<Directoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; dir?: Directoria } | null>(null);
  const [membersModal, setMembersModal] = useState<Directoria | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Directoria | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Directoria | null>(null);
  const { toasts, addToast, dismissToast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setDiretorias(await fetchDiretorias()); }
    catch { addToast('error', 'Erro', 'Não foi possível carregar as diretorias.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  function handleSaved(d: Directoria) {
    setDiretorias(prev => {
      const idx = prev.findIndex(x => x.id === d.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = d; return next; }
      return [d, ...prev];
    });
    setModal(null);
    addToast('success', modal?.mode === 'edit' ? 'Atualizada' : 'Criada', `Diretoria "${d.name}" salva.`);
  }

  async function handleDelete(dir: Directoria) {
    setDeleteTarget(null);
    try {
      await deleteDirectoria(dir.id);
      setDiretorias(prev => prev.filter(d => d.id !== dir.id));
      addToast('success', 'Excluída', `Diretoria "${dir.name}" foi excluída.`);
    } catch (e: unknown) {
      addToast('error', 'Erro', e instanceof Error ? e.message : 'Não foi possível excluir.');
    }
  }

  async function handleToggle(dir: Directoria) {
    try {
      const updated = await toggleDirectoriaActive(dir.id, !dir.active);
      setDiretorias(prev => prev.map(d => d.id === updated.id ? updated : d));
      addToast('success', updated.active ? 'Ativada' : 'Desativada', `Diretoria "${updated.name}" ${updated.active ? 'ativada' : 'desativada'}.`);
    } catch { addToast('error', 'Erro', 'Não foi possível alterar o status.'); }
    setToggleTarget(null);
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin · Sistema"
        title="Diretorias"
        tabBarRight={
          <button
            onClick={() => setModal({ mode: 'create' })}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 40, border: 'none', borderBottom: '2px solid transparent', background: 'transparent', color: 'var(--blue)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={14} /> Nova diretoria
          </button>
        }
      />

      <div className="ssel" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {loading ? (
          <div style={{ color: 'var(--text-3)', textAlign: 'center', paddingTop: 48 }}>Carregando…</div>
        ) : diretorias.length === 0 ? (
          <div style={{ color: 'var(--text-3)', textAlign: 'center', paddingTop: 48, fontSize: '0.9rem' }}>Nenhuma diretoria cadastrada.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 660 }}>
            {diretorias.map(dir => (
              <div key={dir.id} style={{ background: 'var(--surface)', border: '1px solid var(--line-1)', borderRadius: 3, overflow: 'hidden', opacity: dir.active ? 1 : 0.5, display: 'flex' }}>
                {/* Faixa de cor lateral */}
                <div style={{ width: 4, flexShrink: 0, background: dir.color ?? '#6b7280' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', flex: 1 }}>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.97rem', color: 'var(--text)', letterSpacing: '-0.1px' }}>{dir.name}</span>
                      {!dir.active && <span className="mono" style={{ fontSize: '0.6rem', color: '#b42318', background: '#fef2f2', padding: '2px 7px', borderRadius: 3, fontWeight: 700, letterSpacing: '0.5px' }}>INATIVA</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontWeight: 600 }}>{dir.member_count ?? 0} membro(s)</span>
                      {dir.description && <><span style={{ color: 'var(--line-1)' }}>·</span><span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{dir.description}</span></>}
                    </div>
                  </div>
                  {/* Ações */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setMembersModal(dir)} title="Gerenciar membros"
                      style={{ width: 32, height: 32, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#034EA2'; (e.currentTarget as HTMLButtonElement).style.color = '#034EA2'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; }}>
                      <Users size={14} />
                    </button>
                    <button onClick={() => setModal({ mode: 'edit', dir })} title="Editar"
                      style={{ width: 32, height: 32, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#034EA2'; (e.currentTarget as HTMLButtonElement).style.color = '#034EA2'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setToggleTarget(dir)} title={dir.active ? 'Desativar' : 'Ativar'}
                      style={{ width: 32, height: 32, border: `1px solid ${dir.active ? 'rgba(180,35,24,0.3)' : 'rgba(27,138,75,0.3)'}`, borderRadius: 3, background: dir.active ? 'rgba(180,35,24,0.07)' : 'rgba(27,138,75,0.07)', color: dir.active ? '#b42318' : '#1B8A4B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Power size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(dir)} title="Excluir diretoria"
                      style={{ width: 32, height: 32, border: '1px solid rgba(180,35,24,0.3)', borderRadius: 3, background: 'rgba(180,35,24,0.05)', color: '#b42318', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <DirectoriaModal
          initial={modal.mode === 'edit' ? modal.dir : null}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {membersModal && (
        <MembersModal
          directoria={membersModal}
          onClose={() => setMembersModal(null)}
        />
      )}
      <ConfirmModal
        open={!!toggleTarget}
        title={toggleTarget?.active ? 'Desativar diretoria' : 'Ativar diretoria'}
        message={toggleTarget?.active
          ? `Desativar "${toggleTarget?.name}"? Os membros perderão acesso ao sistema.`
          : `Reativar "${toggleTarget?.name}"?`
        }
        confirmLabel={toggleTarget?.active ? 'Desativar' : 'Ativar'}
        danger={toggleTarget?.active}
        onConfirm={() => toggleTarget && handleToggle(toggleTarget)}
        onClose={() => setToggleTarget(null)}
      />
      <ConfirmModal
        open={!!deleteTarget}
        title="Excluir diretoria"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita. A diretoria precisa estar sem membros.`}
        confirmLabel="Excluir"
        danger
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
