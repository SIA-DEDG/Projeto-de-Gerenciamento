'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { fetchTasks } from '@/lib/api';
import type { Task } from '@/types';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const PRIORITY_COLORS: Record<string, string> = { alta: '#ef4444', média: '#f97316', media: '#f97316', baixa: '#22c55e' };

function KpiCard({ label, value, sub, color, icon, accent }: {
  label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode; accent?: boolean;
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: `1px solid ${accent ? color + '44' : 'var(--border-light)'}`,
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: accent ? `0 2px 12px ${color}22` : '0 1px 4px rgba(3,78,162,0.05)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '14px 14px 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: accent ? color : 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, value)}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  );
}

export default function DashboardsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTasks().then(setTasks).finally(() => setLoading(false)); }, []);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const in7 = new Date(today); in7.setDate(today.getDate() + 7);
  const in7Str = in7.toISOString().split('T')[0];

  const pending    = useMemo(() => tasks.filter(t => t.status_group === 'pending').length, [tasks]);
  const inProgress = useMemo(() => tasks.filter(t => t.status_group === 'in_progress').length, [tasks]);
  const done       = useMemo(() => tasks.filter(t => t.status_group === 'done').length, [tasks]);
  const total      = tasks.length;

  const overdue       = useMemo(() => tasks.filter(t => t.status_group !== 'done' && t.deadline && t.deadline < todayStr).length, [tasks, todayStr]);
  const dueThisWeek   = useMemo(() => tasks.filter(t => t.status_group !== 'done' && t.deadline && t.deadline >= todayStr && t.deadline <= in7Str).length, [tasks, todayStr, in7Str]);
  const highPriority  = useMemo(() => tasks.filter(t => t.status_group !== 'done' && t.priority?.toLowerCase() === 'alta').length, [tasks]);
  const completionPct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Distribuição de status
  const doughnutData = {
    labels: ['Pendentes', 'Em Andamento', 'Concluídos'],
    datasets: [{
      data: [pending, inProgress, done],
      backgroundColor: ['#fef9c3', '#dbeafe', '#dcfce7'],
      borderColor: ['#eab308', '#3b82f6', '#22c55e'],
      borderWidth: 2,
      hoverOffset: 8,
    }],
  };
  const doughnutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { padding: 18, usePointStyle: true, pointStyleWidth: 10, font: { family: 'Montserrat', size: 12 } },
      },
    },
  };

  // Tarefas por responsável (top 8)
  const respMap = useMemo(() => {
    const m: Record<string, { total: number; done: number; overdue: number }> = {};
    tasks.forEach(t => {
      const name = t.responsible || 'Sem responsável';
      if (!m[name]) m[name] = { total: 0, done: 0, overdue: 0 };
      m[name].total++;
      if (t.status_group === 'done') m[name].done++;
      if (t.status_group !== 'done' && t.deadline && t.deadline < todayStr) m[name].overdue++;
    });
    return m;
  }, [tasks, todayStr]);

  const topResp = Object.entries(respMap).sort((a, b) => b[1].total - a[1].total).slice(0, 8);
  const respBarData = {
    labels: topResp.map(([name]) => name),
    datasets: [
      { label: 'Concluídas', data: topResp.map(([, v]) => v.done), backgroundColor: '#22c55e', borderRadius: 4, stack: 'a' },
      { label: 'Em andamento', data: topResp.map(([, v]) => v.total - v.done - v.overdue), backgroundColor: '#3b82f6', borderRadius: 4, stack: 'a' },
      { label: 'Atrasadas', data: topResp.map(([, v]) => v.overdue), backgroundColor: '#ef4444', borderRadius: 4, stack: 'a' },
    ],
  };
  const respBarOptions = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const,
    scales: {
      x: { beginAtZero: true, stacked: true, ticks: { stepSize: 1, font: { family: 'Montserrat', size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
      y: { stacked: true, ticks: { font: { family: 'Montserrat', size: 12 } }, grid: { display: false } },
    },
    plugins: {
      legend: { position: 'top' as const, labels: { usePointStyle: true, pointStyleWidth: 8, font: { family: 'Montserrat', size: 11 }, padding: 16 } },
    },
  };

  // Distribuição de prioridade
  const prioMap = useMemo(() => {
    const m: Record<string, number> = {};
    tasks.filter(t => t.status_group !== 'done').forEach(t => {
      const p = t.priority || 'Sem prioridade';
      m[p] = (m[p] ?? 0) + 1;
    });
    return m;
  }, [tasks]);
  const prioEntries = Object.entries(prioMap).sort((a, b) => b[1] - a[1]);
  const prioBarData = {
    labels: prioEntries.map(([p]) => p),
    datasets: [{
      label: 'Atividades',
      data: prioEntries.map(([, v]) => v),
      backgroundColor: prioEntries.map(([p]) => PRIORITY_COLORS[p.toLowerCase()] ?? '#94a3b8'),
      borderRadius: 6, barThickness: 36,
    }],
  };
  const prioBarOptions = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      x: { ticks: { font: { family: 'Montserrat', size: 12 } }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Montserrat', size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
    },
    plugins: { legend: { display: false } },
  };

  if (loading) {
    return (
      <>
        <header className="topbar"><div className="topbar-left"><h1>Dashboards</h1></div></header>
        <div className="page-content"><div className="loading-state">Carregando métricas...</div></div>
      </>
    );
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-left"><h1>Dashboards</h1></div>
      </header>

      <div className="page-content" style={{ overflowY: 'auto' }}>
        <div className="dashboard-header">
          <h2>Visão Geral do Portfólio</h2>
          <p className="subtitle">Acompanhamento de status e desempenho da equipe.</p>
        </div>

        {/* KPI Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, padding: '0 32px 14px' }}>
          <KpiCard label="Pendentes" value={pending} color="#eab308"
            sub={highPriority > 0 ? `${highPriority} de alta prioridade` : 'Nenhuma alta prioridade'}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} />
          <KpiCard label="Em Andamento" value={inProgress} color="#3b82f6"
            sub={total > 0 ? `${Math.round((inProgress / total) * 100)}% do total` : '—'}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>} />
          <KpiCard label="Concluídos" value={done} color="#22c55e"
            sub={`Taxa de conclusão: ${completionPct}%`}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>} />
          <KpiCard label="Atrasadas" value={overdue} color="#ef4444" accent={overdue > 0}
            sub={overdue > 0 ? 'Requer atenção imediata' : 'Tudo em dia'}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>} />
        </div>

        {/* KPI Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, padding: '0 32px 24px' }}>
          {/* Completion rate card */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border-light)', padding: '18px 20px', boxShadow: '0 1px 4px rgba(3,78,162,0.05)', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#22c55e', borderRadius: '14px 14px 0 0' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Taxa de Conclusão</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: completionPct >= 70 ? '#22c55e' : completionPct >= 40 ? '#f97316' : '#ef4444', letterSpacing: '-1px', lineHeight: 1 }}>{completionPct}%</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{done}/{total}</span>
            </div>
            <ProgressBar value={completionPct} color={completionPct >= 70 ? '#22c55e' : completionPct >= 40 ? '#f97316' : '#ef4444'} />
          </div>

          {/* Due this week */}
          <KpiCard label="Prazo esta semana" value={dueThisWeek} color="#8b5cf6"
            sub={dueThisWeek > 0 ? 'Atividades com prazo em 7 dias' : 'Nenhuma com prazo próximo'}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} />

          {/* High priority */}
          <KpiCard label="Alta Prioridade" value={highPriority} color="#f97316" accent={highPriority > 0}
            sub="Pendentes ou em andamento"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>} />

          {/* Total */}
          <KpiCard label="Total de Atividades" value={total} color="#034ea2"
            sub={`${pending + inProgress} ativas`}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>} />
        </div>

        {/* Charts row 1 */}
        <div className="charts-container">
          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>Distribuição de Status</h3>
            </div>
            <div className="chart-wrapper">
              {total > 0 ? <Doughnut data={doughnutData} options={doughnutOptions} /> : <p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 100 }}>Nenhuma atividade.</p>}
            </div>
          </div>

          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>Distribuição por Prioridade</h3>
              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>ativas</span>
            </div>
            <div className="chart-wrapper" style={{ height: 220 }}>
              {prioEntries.length > 0 ? <Bar data={prioBarData} options={prioBarOptions} /> : <p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 80 }}>Nenhuma atividade.</p>}
            </div>
          </div>
        </div>

        {/* Chart row 2 — full width */}
        <div style={{ padding: '0 32px 32px' }}>
          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>Carga de Trabalho por Responsável</h3>
              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>top {topResp.length}</span>
            </div>
            <div className="chart-wrapper" style={{ height: Math.max(220, topResp.length * 44) }}>
              {topResp.length > 0 ? <Bar data={respBarData} options={respBarOptions} /> : <p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 80 }}>Nenhuma atividade com responsável.</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
