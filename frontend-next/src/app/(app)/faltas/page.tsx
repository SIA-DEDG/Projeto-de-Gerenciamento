'use client';

import { useState, useEffect, useRef } from 'react';
import MonthCalendar, { CalendarItem } from '@/components/MonthCalendar';
import {
  fetchAbsences,
  createAbsence,
  deleteAbsence,
  fetchUsers,
  type Absence,
  type UserPublic,
} from '@/lib/api';
import { getUser, canSeeAllAbsences } from '@/lib/auth';

const REASONS = ['Doença', 'Evento', 'Aula', 'Férias', 'Outros'];

const REASON_COLORS: Record<string, { color: string; bg: string }> = {
  'Doença':  { color: '#b91c1c', bg: '#fee2e2' },
  'Evento':  { color: '#1d4ed8', bg: '#dbeafe' },
  'Aula':    { color: '#15803d', bg: '#dcfce7' },
  'Férias':  { color: '#9333ea', bg: '#f3e8ff' },
  'Outros':  { color: '#92400e', bg: '#fef3c7' },
};

function reasonColor(reason: string) {
  return REASON_COLORS[reason] ?? { color: '#475569', bg: '#f1f5f9' };
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

const MONTH_NAMES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function currentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth(); // 0-based
  const first = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const last = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from: first, to: last, label: MONTH_NAMES_PT[monthIndex] };
}

export default function FaltasPage() {
  const currentUser = getUser();
  const seeAll      = canSeeAllAbsences(currentUser?.role);

  const [absences, setAbsences]   = useState<Absence[]>([]);
  const [users, setUsers]         = useState<UserPublic[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);

  // form
  const [selectedUserId, setSelectedUserId] = useState('');
  const [reason, setReason]                 = useState('Doença');
  const [justification, setJustification]   = useState('');
  const [fileName, setFileName]   = useState<string | null>(null);
  const [fileData, setFileData]   = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [formErr, setFormErr]     = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      // fetchAbsences já retorna filtrado pelo backend (só as próprias para roles restritas)
      const [fetchedAbsences, allUsers] = await Promise.all([fetchAbsences(), fetchUsers()]);
      setAbsences(fetchedAbsences);
      setUsers(allUsers.filter((user) => user.role !== 'Admin'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFileName(selectedFile.name);
    const reader = new FileReader();
    reader.onload = (loadEvent) => setFileData((loadEvent.target?.result as string).split(',')[1] ?? null);
    reader.readAsDataURL(selectedFile);
  }

  async function handleSave() {
    const userId = seeAll ? selectedUserId : (currentUser?.user_id ?? '');
    if (!userId || !startDate || !endDate) {
      setFormErr('Preencha nome, data de início e data de fim.');
      return;
    }
    if (startDate > endDate) {
      setFormErr('Data de início não pode ser posterior à data de fim.');
      return;
    }
    setFormErr('');
    setSaving(true);
    try {
      const created = await createAbsence({
        user_id: userId || null,
        reason,
        justification: justification || null,
        file_name: fileName,
        file_data: fileData,
        start_date: startDate,
        end_date: endDate,
      });
      setAbsences((prev) => [created, ...prev]);
      resetForm();
      setShowModal(false);
    } catch (err: unknown) {
      setFormErr(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setSelectedUserId(''); setReason('Doença'); setJustification('');
    setFileName(null); setFileData(null); setStartDate(''); setEndDate('');
    setFormErr('');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteAbsence(id);
      setAbsences((prev) => prev.filter((absence) => absence.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  // Stats cards — count absences per user in current month
  const { from, to, label: monthLabel } = currentMonthRange();
  const statsByUser: Record<string, number> = {};
  for (const a of absences) {
    if (a.start_date >= from && a.start_date <= to) {
      statsByUser[a.employee_name] = (statsByUser[a.employee_name] ?? 0) + 1;
    }
  }

  const calItems: CalendarItem[] = absences.map((absence) => {
    const rc = reasonColor(absence.reason);
    return {
      id: absence.id,
      label: absence.employee_name,
      start_date: absence.start_date,
      end_date: absence.end_date,
      color: rc.color,
      bg: rc.bg,
      subtitle: absence.reason,
    };
  });

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Justificativas de Falta</h1>
        </div>
      </div>
      <div style={{ padding: '32px 28px' }}>

      {/* Stats cards — todos os usuários para Admin/Diretor/Gerente, só o próprio para demais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        {(seeAll ? users : users.filter((u) => u.id === currentUser?.user_id)).map((user) => (
          <div key={user.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border-light)', padding: '14px 16px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user.name}>{user.name}</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {statsByUser[user.name] ?? 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>falta{(statsByUser[user.name] ?? 0) !== 1 ? 's' : ''} em {monthLabel}</div>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div style={{ marginBottom: 28 }}>
        <MonthCalendar items={calItems} title="Calendário de Ausências" />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
        {REASONS.map((reason) => {
          const rc = reasonColor(reason);
          return (
            <div key={reason} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: rc.bg, border: `2px solid ${rc.color}`, display: 'inline-block' }} />
              {reason}
            </div>
          );
        })}
      </div>

      {/* Absences list */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Registros
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>
        ) : absences.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma justificativa registrada.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                {['Funcionário', 'Motivo', 'Período', 'Arquivo', 'Ações'].map((h) => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.78rem', borderBottom: '1px solid var(--border-light)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {absences.map((absence, rowIndex) => {
                const rc = reasonColor(absence.reason);
                return (
                  <tr key={absence.id} style={{ borderBottom: rowIndex < absences.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{absence.employee_name}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: rc.bg, color: rc.color, borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>{absence.reason}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                      {formatDate(absence.start_date)} → {formatDate(absence.end_date)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {absence.file_name ? (
                        <span style={{ fontSize: '0.78rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          {absence.file_name}
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        onClick={() => handleDelete(absence.id)}
                        disabled={deleting === absence.id}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '3px 6px', borderRadius: 5, fontSize: '0.78rem' }}
                        title="Excluir"
                      >
                        {deleting === absence.id ? '...' : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Nova Justificativa de Falta</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Employee name */}
              <div>
                <label style={labelStyle}>Funcionário *</label>
                {seeAll ? (
                  <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} style={inputStyle}>
                    <option value="">Selecione...</option>
                    {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={currentUser?.name ?? ''}
                    disabled
                    style={{ ...inputStyle, background: 'var(--bg-subtle)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                  />
                )}
              </div>
              {/* Reason */}
              <div>
                <label style={labelStyle}>Motivo da Falta *</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle}>
                  {REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              </div>
              {/* Justification */}
              <div>
                <label style={labelStyle}>Justificativa</label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={3}
                  placeholder="Descreva a justificativa..."
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                />
              </div>
              {/* File upload */}
              <div>
                <label style={labelStyle}>Anexar Arquivo (ex: atestado)</label>
                <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, padding: '8px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d48806" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span style={{ fontSize: '0.78rem', color: '#ad6800', fontWeight: 500 }}>Em desenvolvimento — o envio de arquivos ainda não está disponível.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.45, pointerEvents: 'none' }}>
                  <input ref={fileRef} type="file" onChange={handleFile} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" style={{ display: 'none' }} id="falta-file" />
                  <label htmlFor="falta-file" style={{ cursor: 'not-allowed', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 6, padding: '6px 14px', fontSize: '0.83rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Escolher arquivo
                  </label>
                  {fileName && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{fileName}</span>}
                </div>
              </div>
              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Data de Início *</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Data de Fim *</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
                </div>
              </div>
              {formErr && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: 0 }}>{formErr}</p>}
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ ...cancelBtn }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={{ ...saveBtn }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => { resetForm(); setShowModal(true); }}
        title="Nova Justificativa"
        style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 900,
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--primary)', color: '#fff', border: 'none',
          boxShadow: '0 4px 16px rgba(3,78,162,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '1.6rem', lineHeight: 1,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>
    </>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 };
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid var(--border-light)', borderRadius: 7, padding: '8px 11px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box', background: '#fff', color: 'var(--text-primary)' };
const cancelBtn: React.CSSProperties = { background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 7, padding: '8px 18px', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 500, color: 'var(--text-secondary)' };
const saveBtn: React.CSSProperties = { background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 22px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' };
