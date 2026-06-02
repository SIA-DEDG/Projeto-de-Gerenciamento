'use client';

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { Project, Task } from '@/types';
import { importTasks, createProject } from '@/lib/api';
import type { UserPublic } from '@/lib/api';

interface ParsedRow {
  category: string;
  activity: string;
  description: string;
  responsible_id: string | null;
  responsible_name: string;         // só para exibição no preview
  co_responsible_ids: string[];
  co_responsible_names: string[];   // só para exibição no preview
  status: string;
  priority: string;
  created_at: string;
  project_id: string | null;
  external_collaborators: string | null;
  deadline: string | null;
}

interface Props {
  open: boolean;
  projects: Project[];
  users: UserPublic[];
  onClose: () => void;
  onImported: (tasks: Task[]) => void;
  onProjectsCreated?: (projects: Project[]) => void;
}

// Remove acentos e normaliza para comparação sem distinção de case/acento
function normalizeStr(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

// Converte data do Excel: pode vir como string "22/05/2026" ou número serial
function parseDate(value: unknown): string {
  if (!value) return new Date().toISOString().split('T')[0];

  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }

  const str = String(value).trim();
  // DD/MM/YYYY → YYYY-MM-DD
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;

  // Já está em YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  return new Date().toISOString().split('T')[0];
}

// Normaliza o valor de status vindo da planilha para os valores canônicos do sistema
function parseStatus(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return 'Pendente';
  const norm = raw.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  if (norm === 'pendente') return 'Pendente';
  if (norm === 'em andamento' || norm === 'andamento') return 'Em Andamento';
  if (norm === 'concluido' || norm === 'concluida' || norm === 'finalizado' || norm === 'feito') return 'Concluído';
  if (norm === 'entrega') return 'Entrega';
  if (norm === 'homologacao' || norm === 'homologacao') return 'Homologação';
  if (norm === 'cancelado' || norm === 'cancelada') return 'Cancelado';
  return raw; // mantém o valor original para statuses customizados
}

// Encontra a linha de cabeçalho real comparando células exatas (evita match em títulos como "PLANILHA DE ATIVIDADES")
function findHeaderRow(rows: unknown[][]): number {
  const EXACT_HEADERS = ['ATIVIDADE', 'PROJETO', 'RESPONSAVEL', 'RESPONSÁVEL', 'STATUS', 'PRAZO', 'PRIORIDADE'];
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const cells = rows[i].map((c) =>
      String(c ?? '').toUpperCase().trim().normalize('NFD').replace(/\p{M}/gu, '')
    );
    const matches = EXACT_HEADERS.filter((h) => cells.includes(h));
    if (matches.length >= 2) return i;
  }
  return 1;
}

function parseSheet(file: File, projects: Project[], users: UserPublic[]): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const headerIdx = findHeaderRow(raw);
        const dataRows = raw.slice(headerIdx + 1).filter((r) =>
          r.some((c) => String(c ?? '').trim() !== '')
        );

        const projectByNorm = new Map(projects.map((p) => [normalizeStr(p.name), p.id]));
        const userByNorm = new Map(users.map((u) => [normalizeStr(u.name), { id: u.id, name: u.name }]));

        const parsed: ParsedRow[] = dataRows.map((row) => {
          // Colunas: A=Projeto B=Atividade C=Descrição D=Responsável E=Colab.externa F=Prioridade G=Prazo H=Status
          const projectName = String(row[0] ?? '').trim();
          const activity = String(row[1] ?? '').trim();
          const description = String(row[2] ?? '').trim();
          const responsavelRaw = String(row[3] ?? '').trim();
          const extraCollab = String(row[4] ?? '').trim() || null; // col E: Colaboração externa
          const deadlineRaw = row[6];                              // col G: Prazo

          const project_id = projectByNorm.get(normalizeStr(projectName)) ?? null;

          const responsavelParts = responsavelRaw.split(',').map((s) => s.trim()).filter(Boolean);
          const mainResponsavel = responsavelParts[0] ?? '';
          const coNames = responsavelParts.slice(1);

          const systemUser = mainResponsavel ? userByNorm.get(normalizeStr(mainResponsavel)) : undefined;
          const responsible_id = systemUser?.id ?? null;
          const responsible_name = systemUser?.name ?? '';
          const external_collaborators = (!systemUser && mainResponsavel) ? mainResponsavel : null;

          const co_responsible_ids: string[] = [];
          const co_responsible_names: string[] = [];
          for (const name of coNames) {
            const su = userByNorm.get(normalizeStr(name));
            if (su) {
              co_responsible_ids.push(su.id);
              co_responsible_names.push(su.name);
            } else {
              co_responsible_names.push(name);
            }
          }

          const defaultDeadline = (() => {
            const d = new Date(); d.setDate(d.getDate() + 7);
            return d.toISOString().split('T')[0];
          })();
          const deadlineParsed = deadlineRaw ? parseDate(deadlineRaw) : defaultDeadline;

          const prioRaw = String(row[5] ?? '').trim().toLowerCase(); // col F: Prioridade
          const priority = prioRaw.includes('alta') ? 'Alta'
            : prioRaw.includes('baixa') ? 'Baixa'
              : 'Média';

          const external_collaborators_final = [external_collaborators, extraCollab]
            .filter(Boolean).join(', ') || null;

          const status = parseStatus(row[7]); // col H: Status

          return {
            category: projectName || 'Sem categoria',
            activity: activity || '(sem título)',
            description,
            responsible_id,
            responsible_name,
            co_responsible_ids,
            co_responsible_names,
            status,
            priority,
            created_at: new Date().toISOString().split('T')[0],
            project_id,
            external_collaborators: external_collaborators_final,
            deadline: deadlineParsed,
          };
        }).filter((r) => r.activity !== '(sem título)' || r.responsible_id || r.external_collaborators);

        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

export default function ImportModal({ open, projects, users, onClose, onImported, onProjectsCreated }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [imported, setImported] = useState(0);
  const [error, setError] = useState('');

  if (!open) return null;

  async function handleFile(file: File) {
    setError('');
    try {
      const parsed = await parseSheet(file, projects, users);
      setRows(parsed);
      setFileName(file.name);
      setStep('preview');
    } catch (e: unknown) {
      setError(`Erro ao ler a planilha: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function handleImport() {
    setStep('importing');
    setError('');
    try {
      // 1. Descobre nomes únicos de projetos que ainda não existem
      const allProjects = [...projects];
      const projectByNorm = new Map(allProjects.map((p) => [normalizeStr(p.name), p.id]));

      const namesToCreate = new Map<string, string>(); // norm → nome original
      for (const row of rows) {
        if (!row.project_id) {
          const name = row.category.trim();
          const norm = normalizeStr(name);
          if (name && name !== 'Sem categoria' && !projectByNorm.has(norm) && !namesToCreate.has(norm)) {
            namesToCreate.set(norm, name);
          }
        }
      }

      // 2. Cria os projetos ausentes em paralelo
      const newProjects: Project[] = [];
      const createEntries = [...namesToCreate.entries()];
      if (createEntries.length > 0) {
        const created = await Promise.all(createEntries.map(([, name]) => createProject({ name })));
        for (let i = 0; i < createEntries.length; i++) {
          const [norm] = createEntries[i];
          newProjects.push(created[i]);
          allProjects.push(created[i]);
          projectByNorm.set(norm, created[i].id);
        }
      }

      // 3. Vincula project_id para as linhas que ainda não têm
      const linkedRows = rows.map((row) => ({
        ...row,
        project_id: row.project_id ?? projectByNorm.get(normalizeStr(row.category)) ?? null,
      }));

      // 4. Importa as atividades (omite campos só usados no preview)
      const created = await importTasks(
        linkedRows.map(({ responsible_name: _n, co_responsible_names: _cn, ...rest }) => ({
          ...rest,
          co_responsible_ids: rest.co_responsible_ids.length > 0 ? rest.co_responsible_ids : null,
        })),
      );
      setImported(created.length);
      setStep('done');
      onImported(created);
      if (newProjects.length > 0) onProjectsCreated?.(newProjects);
    } catch (e: unknown) {
      setError(`Erro ao importar: ${e instanceof Error ? e.message : e}`);
      setStep('preview');
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
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="modal-card" style={{ maxWidth: 760, width: '95vw' }}>
        {/* Header */}
        <div className="modal-head">
          <h3>Importar Planilha</h3>
          <button type="button" className="modal-close-btn" onClick={handleClose}>&times;</button>
        </div>

        {error && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#ffebe6', borderRadius: 4, color: '#de350b', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {/* STEP: upload */}
        {step === 'upload' && (
          <div
            style={{ border: '2px dashed #dfe1e6', borderRadius: 8, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: '#fafbfc' }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6b778c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <p style={{ color: '#344563', fontWeight: 600, marginBottom: 4 }}>Clique ou arraste o arquivo aqui</p>
            <p style={{ color: '#6b778c', fontSize: '0.82rem' }}>.xlsx, .xls ou .csv</p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        )}

        {/* STEP: preview */}
        {step === 'preview' && (
          <>
            <div style={{ marginBottom: 12, fontSize: '0.85rem', color: '#6b778c' }}>
              <strong style={{ color: '#172b4d' }}>{fileName}</strong> — {rows.length} atividade{rows.length !== 1 ? 's' : ''} encontrada{rows.length !== 1 ? 's' : ''}
            </div>

            <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto', border: '1px solid #dfe1e6', borderRadius: 4 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#f4f5f7', position: 'sticky', top: 0 }}>
                    {['Projeto/Categoria', 'Atividade', 'Descrição', 'Responsável / Ext.', 'Prazo', 'Status', 'Prioridade', 'Colab. externa', 'Projeto vinculado'].map((h) => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#42526e', borderBottom: '1px solid #dfe1e6', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f4f5f7' }}>
                      <td style={{ padding: '7px 10px', color: '#172b4d', fontWeight: 600 }}>{r.category}</td>
                      <td style={{ padding: '7px 10px' }}>{r.activity}</td>
                      <td style={{ padding: '7px 10px', color: '#6b778c', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.description}>{r.description || '—'}</td>
                      <td style={{ padding: '7px 10px' }}>
                        <div>
                          {r.responsible_id
                            ? <span style={{ color: '#0052cc', fontWeight: 600 }}>{r.responsible_name}</span>
                            : r.external_collaborators
                              ? <span style={{ color: '#ff991f', fontWeight: 600 }} title="Colaboração externa">⚠ {r.external_collaborators}</span>
                              : <span style={{ color: '#a5adba' }}>—</span>
                          }
                          {r.co_responsible_names.length > 0 && (
                            <div style={{ fontSize: '0.75rem', color: '#6b778c', marginTop: 2 }}>
                              + {r.co_responsible_names.join(', ')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{r.deadline ?? '—'}</td>
                      <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '0.78rem', color: '#42526e' }}>{r.status}</span>
                      </td>
                      <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontWeight: 600, fontSize: '0.78rem',
                          color: r.priority === 'Alta' ? '#ef4123' : r.priority === 'Baixa' ? '#007932' : '#c07800',
                        }}>
                          {r.priority}
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        {r.external_collaborators
                          ? <span style={{ color: '#ff991f', fontWeight: 600 }}>{r.external_collaborators}</span>
                          : <span style={{ color: '#a5adba' }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        {r.project_id
                          ? <span style={{ color: '#0052cc', fontWeight: 600 }}>{projects.find((p) => p.id === r.project_id)?.name}</span>
                          : r.category && r.category !== 'Sem categoria'
                            ? <span style={{ color: '#ff991f', fontWeight: 600 }}>+ será criado</span>
                            : <span style={{ color: '#a5adba', fontStyle: 'italic' }}>sem projeto</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#6b778c', marginTop: 8 }}>
              Responsáveis em <strong style={{ color: '#0052cc' }}>azul</strong> foram identificados como usuários do sistema.
              Em <strong style={{ color: '#ff991f' }}>laranja</strong> serão salvos como colaboração externa.
              Projetos marcados como <strong style={{ color: '#ff991f' }}>+ será criado</strong> serão criados na importação.
            </p>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn-secondary" onClick={() => setStep('upload')}>← Trocar arquivo</button>
              <button type="button" className="btn-primary" onClick={handleImport}>
                Importar {rows.length} atividade{rows.length !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}

        {/* STEP: importing */}
        {step === 'importing' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b778c' }}>
            <div style={{ fontSize: '0.95rem', marginBottom: 8 }}>Importando atividades...</div>
            <div style={{ fontSize: '0.8rem' }}>Aguarde um momento.</div>
          </div>
        )}

        {/* STEP: done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#36B37E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p style={{ fontWeight: 700, color: '#172b4d', fontSize: '1rem', marginBottom: 4 }}>
              {imported} atividade{imported !== 1 ? 's' : ''} importada{imported !== 1 ? 's' : ''}!
            </p>
            <p style={{ color: '#6b778c', fontSize: '0.85rem', marginBottom: 20 }}>As atividades já aparecem no board.</p>
            <button type="button" className="btn-primary" onClick={handleClose}>Fechar</button>
          </div>
        )}
      </div>
    </div>
  );
}
