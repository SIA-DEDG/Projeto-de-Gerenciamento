'use client';

import { useRef, useState } from 'react';
import { Paperclip, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import type { TaskAttachment } from '@/types';
import ConfirmModal from './ConfirmModal';

// Anexos "staged" (ainda não persistidos) editados dentro de um modal.
export interface AttachmentDraft {
  files: { name: string; type: string; size: number; data: string }[]; // arquivos novos (base64)
  links: { name: string; url: string }[];                               // links novos
  removed: number[];                                                    // índices de anexos EXISTENTES a remover
  linkInput: { name: string; url: string };                            // link sendo digitado (ainda não adicionado)
}

export const emptyAttachmentDraft = (): AttachmentDraft => ({ files: [], links: [], removed: [], linkInput: { name: '', url: '' } });

// Há algo staged? Usado pelos guards de "alterações não salvas".
export const attachmentDraftDirty = (d: AttachmentDraft): boolean =>
  d.files.length > 0 || d.links.length > 0 || d.removed.length > 0 ||
  d.linkInput.name.trim() !== '' || d.linkInput.url.trim() !== '';

// Payload no formato que os helpers de persistência (add/remove) esperam.
// Dobra um link que foi digitado mas não adicionado com o "+" (evita perder link ao salvar).
export const attachmentDraftPayload = (d: AttachmentDraft): {
  attachmentsToAdd?: { name: string; type: string; size: number; data: string }[];
  linksToAdd?: { name: string; url: string }[];
  removedAttachmentIndices?: number[];
} => {
  const pendingUrl = d.linkInput.url.trim();
  const links = pendingUrl ? [...d.links, { name: d.linkInput.name.trim() || pendingUrl, url: pendingUrl }] : d.links;
  return {
    attachmentsToAdd: d.files.length > 0 ? d.files : undefined,
    linksToAdd: links.length > 0 ? links : undefined,
    removedAttachmentIndices: d.removed.length > 0 ? d.removed : undefined,
  };
};

interface Props {
  existing?: TaskAttachment[];       // anexos já salvos (mostrados com opção de remover)
  value: AttachmentDraft;
  onChange: (v: AttachmentDraft) => void;
}

const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', border: '1px solid var(--line-1)', borderRadius: 3, background: 'var(--surface-2)' };
const nameStyle: React.CSSProperties = { flex: 1, minWidth: 0, fontSize: '0.8rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const removeStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', flexShrink: 0, padding: 2 };
const badgeNovo = <span className="mono" style={{ fontSize: '0.56rem', color: 'var(--blue)', flexShrink: 0, textTransform: 'uppercase' }}>novo</span>;

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" title="Remover" onClick={onClick} style={removeStyle}
      onMouseEnter={e => (e.currentTarget.style.color = '#b42318')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
      <Trash2 size={13} />
    </button>
  );
}

/**
 * Editor padronizado de anexos (arquivos + links) para modais de criação/edição.
 * Componente controlado: o `value` (draft) vive no pai, para que os guards de
 * alterações não salvas consigam detectar mudanças de anexo via `attachmentDraftDirty`.
 * Remoção de anexos existentes acontece só aqui (no modal de edição).
 */
export default function AttachmentsEditor({ existing = [], value, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  // Confirmação ao remover um anexo JÁ SALVO (mesmo estilo do guard "sair sem salvar").
  const [pendingRemove, setPendingRemove] = useState<{ i: number; name: string } | null>(null);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = ((ev.target?.result as string).split(',')[1]) ?? '';
        onChange({ ...value, files: [...value.files, { name: file.name, type: file.type, size: file.size, data }] });
      };
      reader.readAsDataURL(file);
    });
  }

  function addLink() {
    const url = value.linkInput.url.trim();
    if (!url) return;
    onChange({ ...value, links: [...value.links, { name: value.linkInput.name.trim() || url, url }], linkInput: { name: '', url: '' } });
  }

  const hasList = existing.some((_, i) => !value.removed.includes(i)) || value.files.length > 0 || value.links.length > 0;

  return (
    <>
    <div>
      <input ref={fileRef} type="file" multiple style={{ display: 'none' }}
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />

      <div style={{ marginBottom: 10 }}>
        <button type="button" onClick={() => fileRef.current?.click()}
          style={{ display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' }}>
          <Paperclip size={13} />Anexar arquivo
        </button>
      </div>

      {/* Separador de seção: Links … Adicionar */}
      <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
        <span>Links</span>
        <span>Adicionar</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input value={value.linkInput.name} onChange={(e) => onChange({ ...value, linkInput: { ...value.linkInput, name: e.target.value } })} placeholder="Nome do link"
          style={{ flex: 1, padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.82rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
        <input value={value.linkInput.url} onChange={(e) => onChange({ ...value, linkInput: { ...value.linkInput, url: e.target.value } })} placeholder="https://..."
          style={{ flex: 2, padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.82rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
        <button type="button" onClick={addLink}
          style={{ padding: '8px 12px', border: 'none', borderRadius: 3, background: 'var(--blue)', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
          <Plus size={13} />
        </button>
      </div>

      {hasList && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {existing.map((a, i) => value.removed.includes(i) ? null : (
            <div key={`ex${i}`} style={rowStyle}>
              {a.type === 'link' ? <LinkIcon size={13} color="var(--blue)" style={{ flexShrink: 0 }} /> : <Paperclip size={13} color="var(--text-3)" style={{ flexShrink: 0 }} />}
              <span style={nameStyle}>{a.name}</span>
              <RemoveBtn onClick={() => setPendingRemove({ i, name: a.name })} />
            </div>
          ))}
          {value.files.map((f, i) => (
            <div key={`nf${i}`} style={rowStyle}>
              <Paperclip size={13} color="var(--text-3)" style={{ flexShrink: 0 }} />
              <span style={nameStyle}>{f.name}</span>
              {badgeNovo}
              <RemoveBtn onClick={() => onChange({ ...value, files: value.files.filter((_, j) => j !== i) })} />
            </div>
          ))}
          {value.links.map((l, i) => (
            <div key={`nl${i}`} style={rowStyle}>
              <LinkIcon size={13} color="var(--blue)" style={{ flexShrink: 0 }} />
              <span style={nameStyle}>{l.name}</span>
              {badgeNovo}
              <RemoveBtn onClick={() => onChange({ ...value, links: value.links.filter((_, j) => j !== i) })} />
            </div>
          ))}
        </div>
      )}
    </div>
    <ConfirmModal
      open={!!pendingRemove}
      title="Remover anexo?"
      message={pendingRemove ? `"${pendingRemove.name}" será removido ao salvar as alterações.` : undefined}
      confirmLabel="Remover"
      cancelLabel="Cancelar"
      danger
      zIndex={2000}
      onConfirm={() => { if (pendingRemove) onChange({ ...value, removed: [...value.removed, pendingRemove.i] }); setPendingRemove(null); }}
      onClose={() => setPendingRemove(null)}
    />
    </>
  );
}
