'use client';

import { useRef } from 'react';
import type { Evidence } from '@/types';

interface Props {
  open: boolean;
  taskId: string;
  taskTitle: string;
  evidence: Evidence[];
  onClose: () => void;
  onChange: (taskId: string, evidence: Evidence[]) => void;
}

const TYPE_OPTIONS = ['Documento', 'Imagem', 'Vídeo', 'Áudio', 'Planilha', 'Apresentação', 'Outro'];

export default function EvidenceModal({ open, taskId, taskTitle, evidence, onClose, onChange }: Props) {
  const typeRef = useRef<HTMLSelectElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  if (!open) return null;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const newEvidence: Evidence = {
      type: typeRef.current?.value ?? 'Documento',
      fileName: file.name,
      note: noteRef.current?.value.trim() ?? '',
      createdAt: new Date().toLocaleString('pt-BR'),
    };
    onChange(taskId, [...evidence, newEvidence]);
    if (fileRef.current) fileRef.current.value = '';
    if (noteRef.current) noteRef.current.value = '';
  }

  function handleDelete(index: number) {
    onChange(taskId, evidence.filter((_, i) => i !== index));
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card modal-card-lg">
        <div className="modal-head">
          <h3>Evidências da Entrega</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Atividade: {taskTitle}
        </p>

        <form className="modal-form" onSubmit={handleAdd}>
          <label className="modal-field">
            Tipo da Evidência
            <select ref={typeRef} defaultValue="Documento">
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="modal-field">
            Arquivo da Evidência
            <input
              ref={fileRef}
              type="file"
              required
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.avi,.mp3,.wav,.zip,.rar,.txt,.json,.xml"
            />
          </label>
          <label className="modal-field">
            Observação
            <textarea ref={noteRef} rows={2} placeholder="Opcional: detalhe o que o arquivo comprova." />
          </label>
          <div className="modal-actions">
            <button type="submit" className="btn-primary">Salvar Evidência</button>
          </div>
        </form>

        {evidence.length > 0 && (
          <>
            <div className="settings-divider" style={{ margin: '16px 0' }} />
            <div className="evidence-list">
              {evidence.map((ev, i) => (
                <div key={i} className="evidence-item">
                  <div>
                    <strong style={{ fontSize: '0.88rem' }}>{ev.fileName}</strong>
                    <div className="evidence-meta">{ev.type} · {ev.createdAt}</div>
                    {ev.note && <div className="evidence-note">{ev.note}</div>}
                  </div>
                  <button type="button" className="evidence-delete" onClick={() => handleDelete(i)}>
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {evidence.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '8px' }}>
            Nenhuma evidência cadastrada.
          </p>
        )}
      </div>
    </div>
  );
}
