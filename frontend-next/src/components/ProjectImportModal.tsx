'use client';

import { useRef, useState } from 'react';
import { FileUp, Download, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Project } from '@/types';
import { importProjects, addProjectLink, getProjectImportTemplateUrl } from '@/lib/api';
import type { UserPublic, ProjectWritePayload } from '@/lib/api';

interface ParsedProjectRow {
  name: string;
  category: string | null;
  deadline: string | null;
  executive_status: string | null;
  objective: string | null;
  scope: string | null;
  summary: string | null;
  collab_ids: string[];
  collab_names: string[];    // só os reconhecidos, para exibição
  link_name: string | null;
  link_url: string | null;
}

interface Props {
  open: boolean;
  users: UserPublic[];
  onClose: () => void;
  onImported: (projects: Project[]) => void;
  onToast?: (type: 'success' | 'error', title: string, message: string) => void;
}

// Remove acentos e normaliza para comparação sem distinção de case/acento
function normalizeStr(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

// Normaliza um cabeçalho de coluna (maiúsculas, sem acento/espaço/símbolo)
function normalizeHeader(s: unknown): string {
  return String(s ?? '')
    .normalize('NFD').replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

// Cabeçalho normalizado → chave lógica. Cobre o "Modelo_Planilha_Projetos.xlsx" (aba
// "Projetos"): NOME DO PROJETO | CATEGORIA | COLABORADOR(ES) | STATUS EXECUTIVO |
// PRAZO FINAL | OBJETIVO | ESCOPO E ENTREGÁVEIS | RESUMO EXECUTIVO | LINKS(NOME) | LINKS
// (mantém também os aliases curtos, caso alguém use cabeçalhos simplificados).
// OBS.: o responsável (owner) do projeto é SEMPRE quem importa — não há coluna para isso.
const HEADER_MAP: Record<string, string> = {
  NOMEDOPROJETO: 'name',
  NOME: 'name',
  PROJETO: 'name',
  CATEGORIA: 'category',
  COLABORADORES: 'collaborators',
  COLABORADOR: 'collaborators',
  STATUSEXECUTIVO: 'executiveStatus',
  STATUS: 'executiveStatus',
  PRAZOFINAL: 'deadline',
  PRAZO: 'deadline',
  OBJETIVO: 'objective',
  ESCOPOEENTREGAVEIS: 'scope',
  ESCOPO: 'scope',
  RESUMOEXECUTIVO: 'summary',
  RESUMO: 'summary',
  LINKSNOME: 'linkName',
  LINKS: 'linkUrl',
  LINK: 'linkUrl',
};

// Código interno → rótulo exibido (só para o preview; o banco guarda o código).
const CODE_TO_LABEL: Record<string, string> = {
  planejamento: 'Planejamento', execucao: 'Execução', validacao: 'Validação', concluido: 'Concluído',
};

function buildColumnMap(headerRow: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.forEach((cell, idx) => {
    const key = HEADER_MAP[normalizeHeader(cell)];
    if (key && map[key] === undefined) map[key] = idx;
  });
  return map;
}

// O banco guarda o status executivo como CÓDIGO (planejamento/execucao/validacao/
// concluido), não como o rótulo exibido. Converte o texto da planilha para o código;
// vazio → 'planejamento' (status padrão do projeto), valor não reconhecido → texto cru.
function parseExecutiveStatus(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return 'planejamento';
  const norm = raw.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  if (norm === 'planejamento' || norm === 'planejado') return 'planejamento';
  if (norm === 'execucao' || norm === 'em execucao' || norm === 'em andamento' || norm === 'andamento') return 'execucao';
  if (norm === 'validacao' || norm === 'em validacao' || norm === 'homologacao') return 'validacao';
  if (norm === 'concluido' || norm === 'concluida' || norm === 'finalizado' || norm === 'feito') return 'concluido';
  return raw;
}

// Converte data do Excel: string "22/05/2026", número serial ou "YYYY-MM-DD".
function parseDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  const str = String(value).trim();
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return null;
}

// Encontra a linha de cabeçalho real (evita casar em títulos como "PLANILHA DE PROJETOS").
// Retorna -1 quando a aba não tem cabeçalho reconhecível.
function findHeaderRow(rows: unknown[][]): number {
  const EXACT = ['NOME', 'PROJETO', 'RESPONSAVEL', 'RESPONSÁVEL', 'CATEGORIA', 'PRAZO', 'OBJETIVO', 'ESCOPO'];
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const cells = rows[i].map((c) => String(c ?? '').toUpperCase().trim().normalize('NFD').replace(/\p{M}/gu, ''));
    if (EXACT.filter((h) => cells.includes(h)).length >= 2) return i;
  }
  return -1;
}

// Procura entre todas as abas a primeira com cabeçalho reconhecível; se nenhuma tiver,
// cai para a 1ª aba com cabeçalho na linha 0.
function findDataSheet(wb: XLSX.WorkBook): { raw: unknown[][]; headerIdx: number } {
  for (const name of wb.SheetNames) {
    const raw: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
    const headerIdx = findHeaderRow(raw);
    if (headerIdx !== -1) return { raw, headerIdx };
  }
  const raw: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
  return { raw, headerIdx: 0 };
}

function parseSheet(file: File, users: UserPublic[]): Promise<ParsedProjectRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        const { raw, headerIdx } = findDataSheet(wb);
        const columnMap = buildColumnMap(raw[headerIdx] ?? []);
        const dataRows = raw.slice(headerIdx + 1).filter((r) => r.some((c) => String(c ?? '').trim() !== ''));

        const userByNorm = new Map(users.map((u) => [normalizeStr(u.name), { id: u.id, name: u.name }]));

        const get = (row: unknown[], key: string): string => {
          const idx = columnMap[key];
          return idx === undefined ? '' : String(row[idx] ?? '').trim();
        };
        const getRaw = (row: unknown[], key: string): unknown => {
          const idx = columnMap[key];
          return idx === undefined ? undefined : row[idx];
        };

        const parsed: ParsedProjectRow[] = dataRows.map((row) => {
          const name = get(row, 'name');

          // COLABORADORES: múltiplos nomes separados por vírgula; ignora não reconhecidos.
          // Se nenhum for reconhecido, o backend adiciona todos os membros da diretoria (padrão).
          const collab_ids: string[] = [];
          const collab_names: string[] = [];
          for (const nm of get(row, 'collaborators').split(',').map((s) => s.trim()).filter(Boolean)) {
            const su = userByNorm.get(normalizeStr(nm));
            if (su) { collab_ids.push(su.id); collab_names.push(su.name); }
          }

          return {
            name,
            category: get(row, 'category') || null,
            deadline: parseDate(getRaw(row, 'deadline')),
            executive_status: parseExecutiveStatus(getRaw(row, 'executiveStatus')),
            objective: get(row, 'objective') || null,
            scope: get(row, 'scope') || null,
            summary: get(row, 'summary') || null,
            collab_ids,
            collab_names,
            link_name: get(row, 'linkName') || null,
            link_url: get(row, 'linkUrl') || null,
          };
        }).filter((r) => r.name); // linha sem NOME é descartada

        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

export default function ProjectImportModal({ open, users, onClose, onImported, onToast }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedProjectRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [error, setError] = useState('');
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleDownloadTemplate() {
    setDownloadingTemplate(true);
    try {
      const url = await getProjectImportTemplateUrl();
      // A URL já vem com Content-Disposition: attachment. Um <a download> sintético
      // evita o bloqueio de popup que window.open sofre por ser chamado após o await.
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Modelo Padrão Projetos.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: unknown) {
      onToast?.('error', 'Erro ao baixar modelo', e instanceof Error ? e.message : String(e));
    } finally {
      setDownloadingTemplate(false);
    }
  }

  async function handleFile(file: File) {
    setError('');
    try {
      const parsed = await parseSheet(file, users);
      if (parsed.length === 0) {
        setError('Nenhum projeto encontrado na planilha (verifique a coluna NOME).');
        return;
      }
      setRows(parsed);
      setFileName(file.name);
      setStep('preview');
    } catch (e: unknown) {
      setError(`Erro ao ler a planilha: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function handleImport() {
    setSubmitting(true);
    try {
      const payload: ProjectWritePayload[] = rows.map((r) => ({
        name: r.name,
        category: r.category,
        deadline: r.deadline,
        executiveStatus: r.executive_status,
        objective: r.objective,
        scope: r.scope,
        summary: r.summary,
        // O responsável (owner) é SEMPRE quem importa: ownerId null faz o backend usar
        // req.user.sub (o importador) como dono do projeto.
        ownerId: null,
        // Lista vazia (não null) => projeto SEM colaboradores. Enviar null faria o backend
        // herdar toda a diretoria; enviar [] cria o projeto só com o responsável (você).
        responsibleIds: r.collab_ids,
      }));
      const created = await importProjects(payload);

      // Cria os links (LINKS(NOME)/LINKS) dos projetos que trouxeram um. O backend
      // devolve os projetos na mesma ordem enviada, então casamos pelo índice.
      await Promise.all(
        rows.map((r, i) => {
          const proj = created[i];
          if (proj && r.link_name && r.link_url) {
            return addProjectLink(proj.id, r.link_name, r.link_url).catch(() => null);
          }
          return null;
        }),
      );

      onImported(created);
      onToast?.('success', 'Importação concluída', `${created.length} projeto${created.length !== 1 ? 's' : ''} de "${fileName}" importado${created.length !== 1 ? 's' : ''} com sucesso.`);
      handleClose();
    } catch (e: unknown) {
      onToast?.('error', 'Erro ao importar projetos', e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setRows([]);
    setFileName('');
    setStep('upload');
    setError('');
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-card modal-card-lg" style={{ width: 'min(920px, 100%)' }}>
        <div className="modal-header">
          <span className="modal-title">Importar Projetos</span>
          <button type="button" className="modal-close" onClick={handleClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {error && (
            <div style={{ padding: '9px 12px', background: 'rgba(180,35,24,0.08)', border: '1px solid rgba(180,35,24,0.18)', borderRadius: 'var(--radius)', color: 'var(--red)', fontSize: '0.82rem' }}>
              {error}
            </div>
          )}

          {step === 'upload' && (
            <>
              <div
                style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface-2)', transition: 'border-color 0.12s' }}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--blue)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <FileUp size={36} color="var(--text-3)" strokeWidth={1.5} style={{ marginBottom: 12 }} />
                <p style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>Clique ou arraste o arquivo aqui</p>
                <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>.xlsx, .xls ou .csv</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                style={{ alignSelf: 'flex-start', color: 'var(--blue)', padding: '4px 2px' }}
              >
                <Download size={14} strokeWidth={2} />
                {downloadingTemplate ? 'Baixando...' : 'Baixar modelo padrão de projetos'}
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-2)' }}>
                <strong style={{ color: 'var(--text)' }}>{fileName}</strong> — {rows.length} projeto{rows.length !== 1 ? 's' : ''} encontrado{rows.length !== 1 ? 's' : ''}
              </div>

              <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto', border: '1px solid var(--line-1)', borderRadius: 'var(--radius)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)', position: 'sticky', top: 0 }}>
                      {['Nome', 'Categoria', 'Colaboradores', 'Prazo', 'Status executivo', 'Objetivo', 'Link'].map((h) => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-2)', borderBottom: '1px solid var(--line-1)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--line-2)' }}>
                        <td style={{ padding: '7px 10px', color: 'var(--text)', fontWeight: 600 }}>{r.name}</td>
                        <td style={{ padding: '7px 10px', color: 'var(--text-2)' }}>{r.category || '—'}</td>
                        <td style={{ padding: '7px 10px' }}>
                          {r.collab_names.length > 0
                            ? <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{r.collab_names.join(', ')}</span>
                            : <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }} title="Nenhum colaborador reconhecido — o projeto fica só com você como responsável">nenhum</span>}
                        </td>
                        <td className="mono" style={{ padding: '7px 10px', whiteSpace: 'nowrap', color: 'var(--text-2)' }}>{r.deadline ?? '—'}</td>
                        <td style={{ padding: '7px 10px', color: 'var(--text-2)' }}>{r.executive_status ? (CODE_TO_LABEL[r.executive_status] ?? r.executive_status) : '—'}</td>
                        <td style={{ padding: '7px 10px', color: 'var(--text-2)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.objective ?? ''}>{r.objective || '—'}</td>
                        <td style={{ padding: '7px 10px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.link_name && r.link_url
                            ? <span title={r.link_url} style={{ color: 'var(--blue)' }}>{r.link_name}</span>
                            : <span style={{ color: 'var(--text-3)' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                O <strong>responsável</strong> de cada projeto é sempre <strong>você</strong> (quem está importando).
                A coluna <strong>COLABORADOR(ES)</strong> aceita nomes separados por vírgula; nomes que não baterem com um usuário cadastrado são ignorados.
                Projetos sem colaboradores reconhecidos ficam <strong>sem colaborador</strong> (só com você como responsável).
                Sem <strong>PRAZO FINAL</strong>, o prazo fica <strong>indeterminado</strong>.
              </p>
            </>
          )}
        </div>

        {step === 'preview' && (
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setStep('upload')} disabled={submitting}>← Trocar arquivo</button>
            <button type="button" className="btn btn-primary" onClick={handleImport} disabled={submitting}>
              {submitting ? 'Importando…' : `Importar ${rows.length} projeto${rows.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
