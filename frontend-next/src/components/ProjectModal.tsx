'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import type { UserPublic } from '@/lib/api';
import type { Project } from '@/types';
import type { ActivityAttachment, ActivityLink } from './ActivityModal';
import AttachmentsEditor, { emptyAttachmentDraft, attachmentDraftDirty, attachmentDraftPayload, type AttachmentDraft } from './AttachmentsEditor';
import CollapsibleGroup from './CollapsibleGroup';
import OtherDiretoriaPicker from './OtherDiretoriaPicker';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import { getUser } from '@/lib/auth';
import { mergeUsersById, normalizeSearch } from '@/lib/utils';

interface Props {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onSave: (data: Omit<Project, 'id'> & {
    attachmentsToAdd?: ActivityAttachment[];
    linksToAdd?: ActivityLink[];
    removedAttachmentIndices?: number[];
  }) => void;
  users?: UserPublic[];
  // Só o dono (ou Admin/Diretor) pode alterar a lista de responsáveis.
  canManageResponsibles?: boolean;
}

const EMPTY: Omit<Project, 'id'> = {
  name: '',
  category: '',
  owner: '',
  owner_id: null,
  deadline: '',
  executive_status: 'planejamento',
  objective: '',
  scope: '',
  summary: '',
  responsible_ids: [],
};

// ── Status executivo: rótulo ↔ código ──────────────────────────────────────────
const STATUS_LABELS = ['Planejamento', 'Execução', 'Validação', 'Concluído'];
const LABEL_TO_CODE: Record<string, string> = {
  'Planejamento': 'planejamento', 'Execução': 'execucao', 'Validação': 'validacao', 'Concluído': 'concluido',
};
const CODE_TO_LABEL: Record<string, string> = {
  planejamento: 'Planejamento', execucao: 'Execução', validacao: 'Validação', concluido: 'Concluído',
};

// ── Label helper ────────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mono" style={{ fontSize: '0.66rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
      {children}
    </div>
  );
}

// ── Segmented control ────────────────────────────────────────────────────────────
function Segmented({ options, value, onChange }: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden' }}>
      {options.map((opt, i) => {
        const active = value === opt;
        return (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            style={{
              flex: 1, padding: '9px 6px', fontSize: '0.78rem',
              fontWeight: active ? 600 : 500, fontFamily: 'inherit', cursor: 'pointer',
              border: 'none', borderRight: i < options.length - 1 ? '1px solid var(--border)' : 'none',
              background: active ? 'var(--blue)' : 'var(--surface)',
              color: active ? '#fff' : 'var(--text-2)',
              transition: 'background 0.12s, color 0.12s',
            }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────────
export default function ProjectModal({ open, project, onClose, onSave, users = [], canManageResponsibles = true }: Props) {
  const [form, setForm] = useState<Omit<Project, 'id'>>(EMPTY);
  const [showResp, setShowResp] = useState(false); // lista de colaboradores recolhida por padrão
  const [collabQuery, setCollabQuery] = useState(''); // busca por digitação na lista de colaboradores
  const [noDeadline, setNoDeadline] = useState(false);
  const [attDraft, setAttDraft] = useState<AttachmentDraft>(emptyAttachmentDraft());
  // Membros de outra diretoria trazidos pelo "Envolver outra diretoria" (compartilhamento).
  const [extraUsers, setExtraUsers] = useState<UserPublic[]>([]);

  const myId = getUser()?.user_id ?? null;

  // Semeia com owner + colaboradores JÁ salvos (o projeto carrega nomes + ids), para que
  // membros de OUTRA diretoria apareçam (marcados) ao reabrir, mesmo sem re-"envolver" a
  // diretoria deles — senão parecem ter sumido embora continuem salvos.
  const seededMembers = useMemo<UserPublic[]>(() => {
    if (!project) return [];
    const seed = (id?: string | null, name?: string | null): UserPublic | null =>
      id ? { id, name: name ?? '(usuário)', username: '', role: '', must_change_password: false, created_at: '', directoria_id: null, directoria_name: null, directoria_color: null } : null;
    const ids = project.responsible_ids ?? [];
    const names = project.responsibles ?? [];
    const list = ids.map((id, i) => seed(id, names[i])).filter((u): u is UserPublic => !!u);
    const owner = seed(project.owner_id, project.owner);
    return owner ? [owner, ...list] : list;
  }, [project]);

  // Usuários selecionáveis = envolvidos já salvos + própria diretoria + diretoria envolvida.
  // Os reais (com role/diretoria) prevalecem sobre os "seed" (só id+nome).
  const availableUsers = useMemo(
    () => mergeUsersById(mergeUsersById(seededMembers, users), extraUsers),
    [seededMembers, users, extraUsers],
  );

  // Diretorias EXTERNAS já envolvidas no projeto (dono + colaboradores de fora da minha
  // diretoria) — para o seletor abrir já ligado e marcado ao editar.
  const involvedDiretoriaIds = useMemo<string[]>(() => {
    if (!project) return [];
    const own = getUser()?.directoria_id ?? null;
    const ids = new Set<string>();
    if (project.owner_diretoria_id && project.owner_diretoria_id !== own) ids.add(project.owner_diretoria_id);
    (project.responsible_diretoria_ids ?? []).forEach((d) => { if (d && d !== own) ids.add(d); });
    return [...ids];
  }, [project]);

  useEffect(() => {
    if (!open) return;
    setAttDraft(emptyAttachmentDraft());
    setExtraUsers([]);
    if (project) {
      const { id, ...rest } = project;
      void id;
      setForm({ ...EMPTY, ...rest, responsible_ids: rest.responsible_ids ?? [], deadline: rest.deadline ? rest.deadline.slice(0, 10) : '' });
      setNoDeadline(!rest.deadline);
    } else {
      // Novo projeto: o responsável padrão é quem está criando; os demais membros da
      // diretoria entram como colaboradores (o responsável não entra na lista — já é membro).
      setForm({ ...EMPTY, owner_id: myId, responsible_ids: users.filter(u => u.id !== myId).map(u => u.id) });
      setNoDeadline(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project]);

  const { requestClose, guard } = useUnsavedGuard(onClose);

  if (!open) return null;

  const isEdit = !!project;
  const existingAtts = project?.attachments ?? [];

  // Compara o form atual com o estado pristino (mesma transformação do init) para saber
  // se há alterações não salvas ao tentar fechar.
  const pristine: Omit<Project, 'id'> = (() => {
    if (!project) return { ...EMPTY, owner_id: myId, responsible_ids: users.filter(u => u.id !== myId).map(u => u.id) };
    const { id, ...rest } = project; void id;
    return { ...EMPTY, ...rest, responsible_ids: rest.responsible_ids ?? [], deadline: rest.deadline ? rest.deadline.slice(0, 10) : '' };
  })();
  const dirty = JSON.stringify(form) !== JSON.stringify(pristine) || attachmentDraftDirty(attDraft);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      deadline: noDeadline ? '' : form.deadline,
      ...attachmentDraftPayload(attDraft),
    });
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 13px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

  const focusBlue = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = 'inset 0 0 0 1px var(--blue)'; },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; },
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={() => requestClose(dirty)} style={{ position: 'fixed', inset: 0, background: 'rgba(7,22,45,0.32)', zIndex: 60 }} />

      {/* Drawer */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 700, maxWidth: '94%', background: 'var(--surface)', overflowY: 'auto', zIndex: 61, borderLeft: '1px solid var(--line-1)', animation: 'drawin .24s cubic-bezier(.4,0,.2,1) both', display: 'flex', flexDirection: 'column' }}>

        {/* Stripe Gov-PI */}
        {/* Faixa Gov-PI comentada a pedido: <div style={{ height: 4, flexShrink: 0, background: 'linear-gradient(90deg,var(--blue-fixed) 0 40%,#E0A92E 40% 55%,#b42318 55% 75%,#1B8A4B 75%)' }} /> */}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--line-1)', flexShrink: 0, position: 'sticky', top: 4, background: 'var(--surface)', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: 'var(--blue-fixed)', flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-2)' }}>
              {isEdit ? 'Editar projeto' : 'Novo projeto'}
            </span>
          </div>
          <button type="button" onClick={() => requestClose(dirty)}
            style={{ width: 30, height: 30, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '24px 28px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Nome */}
            <div>
              <Label>Nome do projeto <span style={{ color: 'rgb(255, 0, 0)' }}>*</span></Label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Modernização do Portal SIA" required style={inp} {...focusBlue} />
            </div>

            {/* Grid: Categoria | Responsável */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <Label>Categoria</Label>
                <input value={form.category ?? ''} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ex: Comunicação" style={inp} {...focusBlue} />
              </div>
              <div>
                <Label>Responsável</Label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={form.owner_id ?? ''}
                    disabled={!canManageResponsibles}
                    onChange={e => {
                      const newOwner = e.target.value || null;
                      // O responsável não fica na lista de colaboradores (já é membro por ser o responsável).
                      setForm(f => ({ ...f, owner_id: newOwner, responsible_ids: (f.responsible_ids ?? []).filter(id => id !== newOwner) }));
                    }}
                    style={{ ...inp, padding: '11px 32px 11px 13px', appearance: 'none', cursor: canManageResponsibles ? 'pointer' : 'not-allowed' }}
                  >
                    {/* Mantém o responsável atual visível mesmo se não estiver na lista filtrada de usuários */}
                    {form.owner_id && !availableUsers.some(u => u.id === form.owner_id) && (
                      <option value={form.owner_id}>{form.owner || '—'}</option>
                    )}
                    {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)' }} />
                </div>
              </div>
            </div>

            {/* Colaboradores — equipe com acesso de edição ao projeto, além do responsável (colapsável) */}
            <div>
              <button type="button" onClick={() => setShowResp(v => !v)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 3, padding: '10px 13px', cursor: 'pointer', fontFamily: 'inherit', marginBottom: showResp ? 8 : 0 }}>
                <span className="mono" style={{ fontSize: '0.66rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#fff' }}>
                  Colaboradores · {form.responsible_ids?.length ?? 0}
                </span>
                {showResp ? <ChevronUp size={14} color="#fff" /> : <ChevronDown size={14} color="#fff" />}
              </button>
              {showResp && (
                <>
                  {!canManageResponsibles && (
                    <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: 6 }}>
                      Apenas o responsável do projeto pode alterar os colaboradores.
                    </div>
                  )}
                  {canManageResponsibles && (
                    <div style={{ marginBottom: 8 }}>
                      <OtherDiretoriaPicker onMembersChange={setExtraUsers} initialSelectedIds={involvedDiretoriaIds} />
                    </div>
                  )}
                  {/* Busca por digitação — filtra a lista pelo nome (ignora acentos/maiúsculas). */}
                  <input
                    value={collabQuery}
                    onChange={e => setCollabQuery(e.target.value)}
                    placeholder="Buscar por nome…"
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.84rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8, background: 'var(--surface)', color: 'var(--text)' }}
                  />
                  <div style={{ border: '1px solid var(--border)', borderRadius: 3, maxHeight: 200, overflowY: 'auto' }}>
                    {(() => {
                      const collaborators = availableUsers.filter(u => u.id !== form.owner_id);
                      const shown = collaborators.filter(u => normalizeSearch(u.name).includes(normalizeSearch(collabQuery)));
                      if (collaborators.length === 0) return <div style={{ padding: '10px 12px', color: 'var(--text-3)', fontSize: '0.85rem' }}>Nenhum outro usuário na diretoria</div>;
                      if (shown.length === 0) return <div style={{ padding: '10px 12px', color: 'var(--text-3)', fontSize: '0.85rem' }}>Nenhum resultado para “{collabQuery}”</div>;
                      return shown.map(u => {
                      const checked = form.responsible_ids?.includes(u.id) ?? false;
                      return (
                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: canManageResponsibles ? 'pointer' : 'default', fontSize: '0.86rem', borderBottom: '1px solid var(--line-2)' }}>
                          <input type="checkbox" disabled={!canManageResponsibles} checked={checked}
                            onChange={() => {
                              const cur = form.responsible_ids ?? [];
                              setForm({ ...form, responsible_ids: checked ? cur.filter(id => id !== u.id) : [...cur, u.id] });
                            }}
                            style={{ accentColor: 'var(--blue)', width: 14, height: 14, cursor: canManageResponsibles ? 'pointer' : 'default' }} />
                          {u.name}
                          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-3)' }}>{u.role}</span>
                        </label>
                      );
                      });
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Status executivo */}
            <div>
              <Label>Status executivo</Label>
              <Segmented
                options={STATUS_LABELS}
                value={CODE_TO_LABEL[form.executive_status ?? 'planejamento'] ?? 'Planejamento'}
                onChange={v => setForm({ ...form, executive_status: LABEL_TO_CODE[v] })}
              />
            </div>

            {/* Prazo final */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Label>Prazo final</Label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-2)', cursor: 'pointer', marginBottom: 6 }}>
                  <input type="checkbox" checked={noDeadline} onChange={e => { setNoDeadline(e.target.checked); if (e.target.checked) setForm({ ...form, deadline: '' }); }} style={{ accentColor: 'var(--blue)', cursor: 'pointer', width: 14, height: 14 }} />
                  Indeterminado
                </label>
              </div>
              <input type="date" value={form.deadline ?? ''} disabled={noDeadline} onChange={e => setForm({ ...form, deadline: e.target.value })} style={{ ...inp, opacity: noDeadline ? 0.4 : 1, cursor: noDeadline ? 'not-allowed' : 'text' }} {...focusBlue} />
            </div>

            {/* Objetivo */}
            <div>
              <Label>Objetivo</Label>
              <textarea rows={2} value={form.objective ?? ''} onChange={e => setForm({ ...form, objective: e.target.value })} placeholder="Descreva o objetivo principal do projeto..." style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} {...focusBlue} />
            </div>

            {/* Escopo */}
            <div>
              <Label>Escopo e entregáveis</Label>
              <textarea rows={3} value={form.scope ?? ''} onChange={e => setForm({ ...form, scope: e.target.value })} placeholder="Liste escopo, entregáveis e critérios de aceite..." style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} {...focusBlue} />
            </div>

            {/* Resumo */}
            <div>
              <Label>Resumo executivo</Label>
              <textarea rows={3} value={form.summary ?? ''} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="Contexto geral para leitura da alta gestão..." style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} {...focusBlue} />
            </div>

            {/* Arquivos e links do projeto — anexar ao criar/editar; remover existentes só aqui */}
            <CollapsibleGroup label="Arquivos e links do projeto" count={existingAtts.length} defaultOpen={false}>
              <AttachmentsEditor existing={existingAtts} value={attDraft} onChange={setAttDraft} />
            </CollapsibleGroup>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button type="submit" style={{ flex: 1, padding: 12, border: 'none', borderRadius: 3, background: 'var(--blue)', color: '#fff', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-h)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--blue)')}>
                {isEdit ? 'Salvar alterações' : 'Criar projeto'}
              </button>
              <button type="button" onClick={() => requestClose(dirty)} style={{ padding: '12px 18px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text)', fontSize: '0.84rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </div>

      {guard}
    </>
  );
}
