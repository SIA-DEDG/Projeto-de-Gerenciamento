'use client';

import { useState, useRef } from 'react';
import { Bug, Lightbulb, HelpCircle } from 'lucide-react';
import { submitFeedback, updateFeedback, type FeedbackItem } from '@/lib/api';
import { emitTasksChanged } from '@/lib/taskEvents';
import { SEVERITIES, type FeedbackType, type Severity, inp } from './types';

interface Props {
  onClose: () => void;
  onCreated: (item: FeedbackItem) => void;
  editItem?: FeedbackItem;
  onUpdated?: (updated: FeedbackItem) => void;
}

export default function FormModal({ onClose, onCreated, editItem, onUpdated }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  // 'melhoria' é legado; normaliza para 'sugestao' (taxonomia atual: sugestao/bug/duvida).
  const initialTipo: FeedbackType = editItem?.tipo === 'melhoria' ? 'sugestao' : ((editItem?.tipo as FeedbackType) ?? 'sugestao');
  const [tipo, setTipo] = useState<FeedbackType>(initialTipo);
  const [titulo, setTitulo] = useState(editItem?.titulo ?? '');
  const [descricao, setDescricao] = useState(editItem?.descricao ?? '');
  const [severidade, setSeveridade] = useState<Severity>((editItem?.severidade as Severity) ?? 'Média');
  const [images, setImages] = useState<{ name: string; dataUrl: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function readFiles(files: FileList | File[]) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const r = new FileReader();
      r.onload = ev => setImages(prev =>
        prev.length >= 5 ? prev : [...prev, { name: file.name, dataUrl: ev.target?.result as string }]
      );
      r.readAsDataURL(file);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) { setErr('Informe o título.'); return; }
    if (!descricao.trim()) { setErr('Informe a descrição.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = {
        tipo, titulo: titulo.trim(), descricao: descricao.trim(),
        severidade: tipo === 'bug' ? severidade : null,
        imagens: images.map(i => i.dataUrl),
      };
      if (editItem) {
        const updated = await updateFeedback(editItem.id, payload);
        onUpdated?.(updated);
      } else {
        const created = await submitFeedback(payload);
        onCreated(created);
        emitTasksChanged();
      }
      onClose();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Erro ao enviar.');
    } finally { setSaving(false); }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(3,78,162,0.22)', backdropFilter: 'blur(2px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div style={{ background: 'var(--surface)', borderRadius: 3, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(3,78,162,0.18), 0 4px 16px rgba(0,0,0,0.10)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'modal-pop-in-flex 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
        <div style={{ height: 5, flexShrink: 0, background: 'linear-gradient(to right, var(--blue) 40%, #fdb913 40% 55%, #ef4123 55% 75%, #007932 75%)' }} />
        <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid var(--line-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 4 }}>
              {editItem ? 'Editar publicação' : 'Nova publicação'}
            </div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'inherit' }}>
              {editItem ? editItem.titulo : 'Preencha os dados abaixo'}
            </h2>
          </div>
          <button onClick={onClose} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-3)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>✕</button>
        </div>

        <form id="feedback-form" onSubmit={handleSubmit} noValidate style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>
          {/* Tipo */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#57606a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tipo</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { value: 'sugestao' as FeedbackType, label: 'Sugestão', Icon: Lightbulb },
                { value: 'bug' as FeedbackType, label: 'Problema', Icon: Bug },
                { value: 'duvida' as FeedbackType, label: 'Dúvida', Icon: HelpCircle },
              ] as const).map(opt => {
                const active = tipo === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => setTipo(opt.value)}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 3, border: `1.5px solid ${active ? 'var(--primary)' : '#d8dee4'}`, background: active ? '#dbeafe' : '#f6f8fa', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: active ? 700 : 500, color: active ? '#1d4ed8' : '#57606a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    <opt.Icon size={15} />{opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#57606a', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Título <span style={{ color: '#cf222e' }}>*</span>
            </label>
            <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder={tipo === 'bug' ? 'Ex: Botão de salvar não funciona na tela X' : 'Ex: Adicionar filtro por data'}
              style={inp} />
          </div>

          {/* Severidade (só bugs) */}
          {tipo === 'bug' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#57606a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Severidade</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {SEVERITIES.map(s => {
                  const active = severidade === s.value;
                  return (
                    <button key={s.value} type="button" onClick={() => setSeveridade(s.value)}
                      style={{ flex: 1, padding: '6px 8px', borderRadius: 3, border: `1.5px solid ${active ? s.color : 'var(--border)'}`, background: active ? `${s.color}14` : 'var(--surface-2)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: active ? 700 : 500, color: active ? s.color : 'var(--text-2)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      {s.value}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Descrição */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#57606a', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Descrição <span style={{ color: '#cf222e' }}>*</span>
            </label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={5}
              placeholder={tipo === 'bug' ? 'Inclua todos os detalhes para reproduzir o problema.' : 'Descreva o problema e como esta sugestão o resolve.'}
              style={{ ...inp, resize: 'vertical', minHeight: 100, lineHeight: 1.6 }} />
          </div>

          {/* Imagens */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#57606a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Capturas ({images.length}/5)
            </label>
            {images.length < 5 && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); readFiles(e.dataTransfer.files); }}
                onClick={() => fileRef.current?.click()}
                style={{ border: `2px dashed ${dragOver ? 'var(--primary)' : '#d8dee4'}`, borderRadius: 3, padding: '14px', textAlign: 'center', cursor: 'pointer', background: dragOver ? '#eff6ff' : '#f6f8fa', fontSize: '0.82rem', color: dragOver ? 'var(--primary)' : '#6e7781', marginBottom: images.length ? 8 : 0 }}>
                {dragOver ? 'Solte aqui' : 'Clique ou arraste imagens'}
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple
              onChange={e => { if (e.target.files) readFiles(e.target.files); if (fileRef.current) fileRef.current.value = ''; }}
              style={{ display: 'none' }} />
            {images.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {images.map((img, i) => (
                  <div key={i} style={{ position: 'relative', width: 60, height: 60, borderRadius: 3, overflow: 'hidden', border: '1px solid #d8dee4' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.dataUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => setImages(p => p.filter((_, idx) => idx !== i))}
                      style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {err && (
            <div style={{ color: '#cf222e', background: '#ffebe9', padding: '9px 12px', borderRadius: 3, fontSize: '0.82rem', border: '1px solid #ffcecb' }}>{err}</div>
          )}

        </form>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--line-1)', background: 'var(--surface-2)', flexShrink: 0 }}>
          <button type="button" onClick={onClose}
            style={{ padding: '6px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-2)' }}>
            Cancelar
          </button>
          <button type="submit" form="feedback-form" disabled={saving}
            style={{ padding: '6px 18px', background: saving ? 'var(--text-3)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: 3, fontSize: '0.8rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? (editItem ? 'Salvando…' : 'Publicando…') : (editItem ? 'Salvar' : 'Publicar')}
          </button>
        </div>
      </div>
    </div>
  );
}
