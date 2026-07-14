'use client';

import { useRef, useState } from 'react';
import { FileUp, Download, X, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Project, Task } from '@/types';
import { importTasks, createProject, addTaskLink, getImportTemplateUrl } from '@/lib/api';
import type { UserPublic } from '@/lib/api';
import { getUser } from '@/lib/auth';

const SEM_PROJETO_NAME = 'Sem Projeto';

interface ParsedRow {
  category: string;
  activity: string;
  description: string;
  responsible_id: string | null;
  responsible_name: string;         // texto bruto da célula, só para exibição no preview
  responsible_recognized: boolean;  // bateu com um usuário cadastrado no sistema
  co_responsible_ids: string[];
  co_responsible_names: string[];   // só os reconhecidos, só para exibição no preview
  status: string;
  priority: string;
  created_at: string;               // Início da Atividade
  project_id: string | null;
  external_collaborators: string | null;
  deadline: string | null;
  link_name: string | null;
  link_url: string | null;
}

interface Props {
  open: boolean;
  projects: Project[];
  users: UserPublic[];
  onClose: () => void;
  onImported: (tasks: Task[]) => void;
  onProjectsCreated?: (projects: Project[]) => void;
  onToast?: (type: 'success' | 'error', title: string, message: string) => void;
}

// Remove acentos e normaliza para comparação sem distinção de case/acento
function normalizeStr(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

// Normaliza um cabeçalho de coluna para comparação (maiúsculas, sem acento/espaço/símbolo)
function normalizeHeader(s: unknown): string {
  return String(s ?? '')
    .normalize('NFD').replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

// Mapeia o texto normalizado do cabeçalho para a chave lógica da coluna. Cobre o
// "Modelo Padrão Atividades.xlsx": PROJETO | ATIVIDADE | DESCRIÇÃO DA ATIVIDADE |
// RESPONSÁVEL | CO-RESPONSÁVEL | COLABORAÇÃO EXTERNA | PRIORIDADE | DATA | PRAZO |
// LINKS (NOME) | LINKS (LINK) | STATUS
const HEADER_MAP: Record<string, string> = {
  PROJETO: 'project',
  ATIVIDADE: 'activity',
  DESCRICAODAATIVIDADE: 'description',
  DESCRICAO: 'description',
  RESPONSAVEL: 'responsible',
  CORESPONSAVEL: 'coResponsible',
  COLABORACAOEXTERNA: 'externalCollab',
  PRIORIDADE: 'priority',
  DATA: 'startDate',
  PRAZO: 'deadline',
  LINKSNOME: 'linkName',
  LINKSLINK: 'linkUrl',
  STATUS: 'status',
};

function buildColumnMap(headerRow: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.forEach((cell, idx) => {
    const key = HEADER_MAP[normalizeHeader(cell)];
    if (key && map[key] === undefined) map[key] = idx;
  });
  return map;
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

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
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

// Encontra a linha de cabeçalho real comparando células exatas (evita match em títulos como "PLANILHA DE ATIVIDADES").
// Retorna -1 quando a aba não tem cabeçalho reconhecível (ex.: aba "Avisos e Instruções").
function findHeaderRow(rows: unknown[][]): number {
  const EXACT_HEADERS = ['ATIVIDADE', 'PROJETO', 'RESPONSAVEL', 'RESPONSÁVEL', 'STATUS', 'PRAZO', 'PRIORIDADE'];
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const cells = rows[i].map((c) =>
      String(c ?? '').toUpperCase().trim().normalize('NFD').replace(/\p{M}/gu, '')
    );
    const matches = EXACT_HEADERS.filter((h) => cells.includes(h));
    if (matches.length >= 2) return i;
  }
  return -1;
}

// O modelo padrão tem uma aba de instruções antes da aba de dados ("Gestão de
// Atividades"). Procura, entre todas as abas, a primeira com cabeçalho reconhecível;
// se nenhuma tiver, cai para a 2ª aba (ou a 1ª, se só houver uma).
function findDataSheet(wb: XLSX.WorkBook): { raw: unknown[][]; headerIdx: number } {
  for (const name of wb.SheetNames) {
    const raw: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
    const headerIdx = findHeaderRow(raw);
    if (headerIdx !== -1) return { raw, headerIdx };
  }
  const fallbackName = wb.SheetNames[1] ?? wb.SheetNames[0];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[fallbackName], { header: 1, defval: '' });
  return { raw, headerIdx: 1 };
}

function parseSheet(file: File, projects: Project[], users: UserPublic[]): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        const { raw, headerIdx } = findDataSheet(wb);
        const columnMap = buildColumnMap(raw[headerIdx] ?? []);
        const dataRows = raw.slice(headerIdx + 1).filter((r) =>
          r.some((c) => String(c ?? '').trim() !== '')
        );

        const projectByNorm = new Map(projects.map((p) => [normalizeStr(p.name), p.id]));
        const userByNorm = new Map(users.map((u) => [normalizeStr(u.name), { id: u.id, name: u.name }]));

        const get = (row: unknown[], key: string): string => {
          const idx = columnMap[key];
          return idx === undefined ? '' : String(row[idx] ?? '').trim();
        };
        const getRaw = (row: unknown[], key: string): unknown => {
          const idx = columnMap[key];
          return idx === undefined ? undefined : row[idx];
        };

        const today = new Date().toISOString().split('T')[0];

        const parsed: ParsedRow[] = dataRows.map((row) => {
          const projectName = get(row, 'project');
          const activity = get(row, 'activity');
          const description = get(row, 'description');
          const responsavelRaw = get(row, 'responsible');
          const coResponsavelRaw = get(row, 'coResponsible');
          const extraCollab = get(row, 'externalCollab') || null;
          const linkName = get(row, 'linkName') || null;
          const linkUrl = get(row, 'linkUrl') || null;

          const project_id = projectByNorm.get(normalizeStr(projectName)) ?? null;

          // RESPONSÁVEL agora é dropdown de seleção única: o nome deve bater EXATAMENTE
          // com um usuário cadastrado, senão não é reconhecido na importação (regra 1/5
          // da aba "Avisos e Instruções").
          const systemUser = responsavelRaw ? userByNorm.get(normalizeStr(responsavelRaw)) : undefined;
          const responsible_id = systemUser?.id ?? null;
          const responsible_recognized = !!systemUser;

          // CO-RESPONSÁVEL: múltiplos nomes separados por vírgula (regra 6/7); nomes que
          // não batem com nenhum usuário cadastrado são ignorados.
          const co_responsible_ids: string[] = [];
          const co_responsible_names: string[] = [];
          for (const name of coResponsavelRaw.split(',').map((s) => s.trim()).filter(Boolean)) {
            const su = userByNorm.get(normalizeStr(name));
            if (su) {
              co_responsible_ids.push(su.id);
              co_responsible_names.push(su.name);
            }
          }

          // DATA (início da atividade): se vazia, usa a data da importação (regra 2).
          const startDateRaw = getRaw(row, 'startDate');
          const startDate = startDateRaw ? parseDate(startDateRaw) : today;

          // PRAZO: se vazio, até 7 dias após a data de início (regra 2).
          const deadlineRaw = getRaw(row, 'deadline');
          const deadline = deadlineRaw ? parseDate(deadlineRaw) : addDays(startDate, 7);

          // PRIORIDADE: padrão Média (regra 3).
          const prioRaw = get(row, 'priority').toLowerCase();
          const priority = prioRaw.includes('alta') ? 'Alta' : prioRaw.includes('baixa') ? 'Baixa' : 'Média';

          // STATUS: padrão Pendente (regra 3).
          const status = parseStatus(getRaw(row, 'status'));

          return {
            category: projectName || 'Sem categoria',
            activity: activity || '(sem título)',
            description,
            responsible_id,
            responsible_name: responsavelRaw,
            responsible_recognized,
            co_responsible_ids,
            co_responsible_names,
            status,
            priority,
            created_at: startDate,
            project_id,
            external_collaborators: extraCollab,
            deadline,
            link_name: linkName,
            link_url: linkUrl,
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

export default function ImportModal({ open, projects, users, onClose, onImported, onProjectsCreated, onToast }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [error, setError] = useState('');
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Projetos que o usuário optou por criar de verdade durante o preview (em vez de
  // deixar cair no "Sem Projeto" compartilhado) — chave = nome normalizado.
  const [resolvedProjects, setResolvedProjects] = useState<Map<string, Project>>(new Map());
  const [creatingNorm, setCreatingNorm] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCollabIds, setNewProjectCollabIds] = useState<string[]>([]);
  const [creatingBusy, setCreatingBusy] = useState(false);

  const myId = getUser()?.user_id ?? null;

  if (!open) return null;

  // Nomes de projeto da planilha que não existem no sistema e ainda não foram
  // criados manualmente nesta sessão de import — cairão no "Sem Projeto" se o
  // usuário não clicar em "Criar projeto" para cada um.
  const pendingProjectNames = (() => {
    const seen = new Map<string, string>(); // norm → nome original
    for (const r of rows) {
      if (r.project_id || !r.category || r.category === 'Sem categoria') continue;
      const norm = normalizeStr(r.category);
      if (!resolvedProjects.has(norm) && !seen.has(norm)) seen.set(norm, r.category);
    }
    return [...seen.entries()];
  })();

  function openCreator(norm: string, name: string) {
    setCreatingNorm(norm);
    setNewProjectName(name);
    setNewProjectCollabIds(users.filter((u) => u.id !== myId).map((u) => u.id));
  }

  function closeCreator() {
    setCreatingNorm(null);
    setNewProjectName('');
    setNewProjectCollabIds([]);
  }

  async function submitCreator(norm: string) {
    const name = newProjectName.trim();
    if (!name) return;
    setCreatingBusy(true);
    try {
      const created = await createProject({ name, responsibleIds: newProjectCollabIds });
      setResolvedProjects((prev) => new Map(prev).set(norm, created));
      onProjectsCreated?.([created]);
      closeCreator();
    } catch (e: unknown) {
      onToast?.('error', 'Erro ao criar projeto', e instanceof Error ? e.message : String(e));
    } finally {
      setCreatingBusy(false);
    }
  }

  async function handleDownloadTemplate() {
    setDownloadingTemplate(true);
    try {
      const url = await getImportTemplateUrl();
      window.open(url, '_blank');
    } catch (e: unknown) {
      onToast?.('error', 'Erro ao baixar modelo', e instanceof Error ? e.message : String(e));
    } finally {
      setDownloadingTemplate(false);
    }
  }

  async function handleFile(file: File) {
    setError('');
    try {
      const parsed = await parseSheet(file, projects, users);
      setRows(parsed);
      setFileName(file.name);
      setStep('preview');
      setResolvedProjects(new Map());
      closeCreator();
    } catch (e: unknown) {
      setError(`Erro ao ler a planilha: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Roda a importação em segundo plano — o modal já foi fechado e o usuário pode
  // continuar navegando; o resultado chega via toast quando terminar.
  async function runImport(importRows: ParsedRow[], importedFileName: string, resolved: Map<string, Project>) {
    try {
      const projectByNorm = new Map(projects.map((p) => [normalizeStr(p.name), p.id]));
      for (const [norm, proj] of resolved) projectByNorm.set(norm, proj.id);

      // Linhas cujo projeto não existe e não foi criado manualmente no preview caem
      // todas no mesmo projeto "Sem Projeto" (criado uma única vez, sob demanda),
      // com quem está importando como responsável (padrão do backend ao omitir ownerId).
      let semProjetoId: string | null = null;
      async function resolveSemProjeto(): Promise<string> {
        if (semProjetoId) return semProjetoId;
        const existing = projects.find((p) => normalizeStr(p.name) === normalizeStr(SEM_PROJETO_NAME));
        if (existing) { semProjetoId = existing.id; return semProjetoId; }
        const created = await createProject({ name: SEM_PROJETO_NAME });
        onProjectsCreated?.([created]);
        semProjetoId = created.id;
        return semProjetoId;
      }

      const linkedRows: ParsedRow[] = [];
      for (const row of importRows) {
        let projectId = row.project_id;
        if (!projectId && row.category && row.category !== 'Sem categoria') {
          projectId = projectByNorm.get(normalizeStr(row.category)) ?? null;
          if (!projectId) projectId = await resolveSemProjeto();
        }
        linkedRows.push({ ...row, project_id: projectId });
      }

      // Importa as atividades (omite campos só usados no preview)
      const created = await importTasks(
        linkedRows.map(({ responsible_name: _n, responsible_recognized: _r, co_responsible_names: _cn, link_name: _ln, link_url: _lu, ...rest }) => ({
          ...rest,
          co_responsible_ids: rest.co_responsible_ids.length > 0 ? rest.co_responsible_ids : null,
        })),
      );

      // Cria os links (LINKS NOME/LINK) das atividades que trouxeram um
      await Promise.all(
        linkedRows.map((row, i) => {
          const task = created[i];
          if (task && row.link_name && row.link_url) {
            return addTaskLink(task.id, row.link_name, row.link_url).catch(() => null);
          }
          return null;
        }),
      );

      onImported(created);
      onToast?.('success', 'Importação concluída', `${created.length} atividade${created.length !== 1 ? 's' : ''} de "${importedFileName}" importada${created.length !== 1 ? 's' : ''} com sucesso.`);
    } catch (e: unknown) {
      onToast?.('error', 'Erro ao importar planilha', e instanceof Error ? e.message : String(e));
    }
  }

  function handleImport() {
    const importRows = rows;
    const importedFileName = fileName;
    const resolved = resolvedProjects;
    onToast?.('success', 'Importação iniciada', `Importando ${importRows.length} atividade${importRows.length !== 1 ? 's' : ''} em segundo plano...`);
    void runImport(importRows, importedFileName, resolved);
    handleClose();
  }

  function handleClose() {
    setRows([]);
    setFileName('');
    setStep('upload');
    setError('');
    setResolvedProjects(new Map());
    closeCreator();
    onClose();
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="modal-card modal-card-lg" style={{ width: 'min(920px, 100%)' }}>
        {/* Header */}
        <div className="modal-header">
          <span className="modal-title">Importar Planilha</span>
          <button type="button" className="modal-close" onClick={handleClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {error && (
            <div style={{ padding: '9px 12px', background: 'rgba(180,35,24,0.08)', border: '1px solid rgba(180,35,24,0.18)', borderRadius: 'var(--radius)', color: 'var(--red)', fontSize: '0.82rem' }}>
              {error}
            </div>
          )}

          {/* STEP: upload */}
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
                {downloadingTemplate ? 'Baixando...' : 'Baixar modelo padrão da planilha'}
              </button>
            </>
          )}

          {/* STEP: preview */}
          {step === 'preview' && (
            <>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-2)' }}>
                <strong style={{ color: 'var(--text)' }}>{fileName}</strong> — {rows.length} atividade{rows.length !== 1 ? 's' : ''} encontrada{rows.length !== 1 ? 's' : ''}
              </div>

              {pendingProjectNames.length > 0 && (
                <div style={{ border: '1px solid var(--line-1)', borderRadius: 'var(--radius)', background: 'var(--surface-2)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>
                    Projetos não encontrados no sistema ({pendingProjectNames.length})
                  </div>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-2)', lineHeight: 1.5, margin: 0 }}>
                    Por padrão, as atividades desses projetos serão importadas em um projeto único chamado
                    {' '}<strong>&ldquo;{SEM_PROJETO_NAME}&rdquo;</strong> (com quem está importando como responsável).
                    Se quiser, crie o projeto de verdade agora — outros detalhes (objetivo, prazo, escopo...) você completa depois na aba Projetos.
                  </p>
                  {pendingProjectNames.map(([norm, name]) => (
                    <div key={norm} style={{ border: '1px solid var(--line-1)', borderRadius: 'var(--radius)', background: 'var(--surface)', padding: '8px 10px' }}>
                      {creatingNorm === norm ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <input
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="Nome do projeto"
                            style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                          />
                          <div>
                            <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 4 }}>
                              Colaboradores
                            </div>
                            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', maxHeight: 140, overflowY: 'auto' }}>
                              {users.filter((u) => u.id !== myId).length === 0 && (
                                <div style={{ padding: '8px 10px', fontSize: '0.8rem', color: 'var(--text-3)' }}>Nenhum outro usuário na diretoria</div>
                              )}
                              {users.filter((u) => u.id !== myId).map((u) => {
                                const checked = newProjectCollabIds.includes(u.id);
                                return (
                                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', fontSize: '0.82rem', borderBottom: '1px solid var(--line-2)' }}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => setNewProjectCollabIds((cur) => checked ? cur.filter((id) => id !== u.id) : [...cur, u.id])}
                                      style={{ accentColor: 'var(--blue)', width: 13, height: 13, cursor: 'pointer' }}
                                    />
                                    {u.name}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary btn-xs" onClick={closeCreator} disabled={creatingBusy}>Cancelar</button>
                            <button type="button" className="btn btn-primary btn-xs" onClick={() => submitCreator(norm)} disabled={creatingBusy || !newProjectName.trim()}>
                              {creatingBusy ? 'Criando…' : 'Criar projeto'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ fontSize: '0.84rem', color: 'var(--text)', fontWeight: 600 }}>{name}</span>
                          <button type="button" className="btn btn-ghost btn-xs" onClick={() => openCreator(norm, name)} style={{ color: 'var(--blue)', flexShrink: 0 }}>
                            <Plus size={12} /> Criar projeto
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto', border: '1px solid var(--line-1)', borderRadius: 'var(--radius)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)', position: 'sticky', top: 0 }}>
                      {['Projeto/Categoria', 'Atividade', 'Descrição', 'Responsável', 'Co-responsáveis', 'Colab. externa', 'Início', 'Prazo', 'Status', 'Prioridade', 'Link', 'Projeto vinculado'].map((h) => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-2)', borderBottom: '1px solid var(--line-1)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--line-2)' }}>
                        <td style={{ padding: '7px 10px', color: 'var(--text)', fontWeight: 600 }}>{r.category}</td>
                        <td style={{ padding: '7px 10px', color: 'var(--text)' }}>{r.activity}</td>
                        <td style={{ padding: '7px 10px', color: 'var(--text-2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.description}>{r.description || '—'}</td>
                        <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                          {r.responsible_name
                            ? (r.responsible_recognized
                              ? <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{r.responsible_name}</span>
                              : <span style={{ color: 'var(--red)', fontWeight: 600 }} title="Nome não encontrado no cadastro de usuários">⚠ {r.responsible_name}</span>)
                            : <span style={{ color: 'var(--text-3)' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '7px 10px' }}>
                          {r.co_responsible_names.length > 0
                            ? <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{r.co_responsible_names.join(', ')}</span>
                            : <span style={{ color: 'var(--text-3)' }}>—</span>}
                        </td>
                        <td style={{ padding: '7px 10px' }}>
                          {r.external_collaborators
                            ? <span style={{ color: 'var(--gold-t)', fontWeight: 600 }}>{r.external_collaborators}</span>
                            : <span style={{ color: 'var(--text-3)' }}>—</span>
                          }
                        </td>
                        <td className="mono" style={{ padding: '7px 10px', whiteSpace: 'nowrap', color: 'var(--text-2)' }}>{r.created_at}</td>
                        <td className="mono" style={{ padding: '7px 10px', whiteSpace: 'nowrap', color: 'var(--text-2)' }}>{r.deadline ?? '—'}</td>
                        <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{r.status}</span>
                        </td>
                        <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontWeight: 600, fontSize: '0.78rem',
                            color: r.priority === 'Alta' ? 'var(--red)' : r.priority === 'Baixa' ? 'var(--green-t)' : 'var(--gold-t)',
                          }}>
                            {r.priority}
                          </span>
                        </td>
                        <td style={{ padding: '7px 10px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.link_name && r.link_url
                            ? <span title={r.link_url} style={{ color: 'var(--blue)' }}>{r.link_name}</span>
                            : <span style={{ color: 'var(--text-3)' }}>—</span>}
                        </td>
                        <td style={{ padding: '7px 10px' }}>
                          {(() => {
                            if (r.project_id) {
                              return <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{projects.find((p) => p.id === r.project_id)?.name}</span>;
                            }
                            if (!r.category || r.category === 'Sem categoria') {
                              return <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>sem projeto</span>;
                            }
                            const resolved = resolvedProjects.get(normalizeStr(r.category));
                            if (resolved) {
                              return <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{resolved.name}</span>;
                            }
                            return <span style={{ color: 'var(--gold-t)', fontWeight: 600 }} title={`Será importado em "${SEM_PROJETO_NAME}"`}>{SEM_PROJETO_NAME}</span>;
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                Responsáveis em <strong style={{ color: 'var(--blue)' }}>azul</strong> foram identificados como usuários do sistema.
                Em <strong style={{ color: 'var(--red)' }}>vermelho</strong>, o nome não bateu com nenhum usuário cadastrado e a atividade será importada sem responsável.
                Projetos em <strong style={{ color: 'var(--gold-t)' }}>{SEM_PROJETO_NAME}</strong> não existem no sistema e cairão nesse projeto único — use o painel acima para criar algum de verdade antes de importar.
              </p>
            </>
          )}
        </div>

        {step === 'preview' && (
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setStep('upload')}>← Trocar arquivo</button>
            <button type="button" className="btn btn-primary" onClick={handleImport}>
              Importar {rows.length} atividade{rows.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
