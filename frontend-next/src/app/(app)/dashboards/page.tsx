'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { fetchTasks } from '@/lib/api';
import type { Task } from '@/types';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const S_COLORS: Record<string, string> = {
  pending:    'var(--s-pending)',
  in_progress:'var(--s-progress)',
  review:     'var(--s-review)',
  done:       'var(--s-done)',
};

const CHART_COLORS = {
  pending: '#9aa1ac',
  in_progress: '#034ea2',
  review: '#e0a92e',
  done: '#1b8a4b',
  overdue: '#b42318',
};

export default function DashboardsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTasks().then(setTasks).finally(() => setLoading(false)); }, []);

  const today = new Date().toISOString().split('T')[0];
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const pending    = useMemo(() => tasks.filter((t) => t.status_group === 'pending').length, [tasks]);
  const inProgress = useMemo(() => tasks.filter((t) => t.status_group === 'in_progress').length, [tasks]);
  const review     = useMemo(() => tasks.filter((t) => t.status_group === 'review').length, [tasks]);
  const done       = useMemo(() => tasks.filter((t) => t.status_group === 'done').length, [tasks]);
  const total = tasks.length;
  const overdue = useMemo(() => tasks.filter((t) => t.status_group !== 'done' && t.deadline && t.deadline < today).length, [tasks, today]);
  const dueThisWeek = useMemo(() => tasks.filter((t) => t.status_group !== 'done' && t.deadline && t.deadline >= today && t.deadline <= in7).length, [tasks, today, in7]);
  const completionPct = total > 0 ? Math.round((done / total) * 100) : 0;

  const respMap = useMemo(() => {
    const m: Record<string, { total: number; done: number; overdue: number }> = {};
    tasks.forEach((t) => {
      const name = t.responsible || 'Sem responsável';
      if (!m[name]) m[name] = { total: 0, done: 0, overdue: 0 };
      m[name].total++;
      if (t.status_group === 'done') m[name].done++;
      if (t.status_group !== 'done' && t.deadline && t.deadline < today) m[name].overdue++;
    });
    return m;
  }, [tasks, today]);

  const topResp = Object.entries(respMap).sort((a, b) => b[1].total - a[1].total).slice(0, 8);

  const doughnutData = {
    labels: ['Pendente', 'Em Andamento', 'Em Revisão', 'Concluído'],
    datasets: [{ data: [pending, inProgress, review, done], backgroundColor: [CHART_COLORS.pending, CHART_COLORS.in_progress, CHART_COLORS.review, CHART_COLORS.done], borderWidth: 0, hoverOffset: 6 }],
  };
  const doughnutOptions = { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } };

  const respBarData = {
    labels: topResp.map(([name]) => name),
    datasets: [
      { label: 'Concluídas', data: topResp.map(([, v]) => v.done), backgroundColor: CHART_COLORS.done, borderRadius: 2, stack: 'a' },
      { label: 'Ativas', data: topResp.map(([, v]) => v.total - v.done - v.overdue), backgroundColor: CHART_COLORS.in_progress, borderRadius: 2, stack: 'a' },
      { label: 'Atrasadas', data: topResp.map(([, v]) => v.overdue), backgroundColor: CHART_COLORS.overdue, borderRadius: 2, stack: 'a' },
    ],
  };
  const respBarOptions = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const,
    scales: { x: { beginAtZero: true, stacked: true, ticks: { font: { family: 'IBM Plex Mono', size: 10 } }, grid: { color: 'var(--line-2)' } }, y: { stacked: true, ticks: { font: { family: 'Montserrat', size: 11 } }, grid: { display: false } } },
    plugins: { legend: { display: false } },
  };

  if (loading) return <div className="loading-state">Carregando métricas…</div>;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left"><h1 style={{ fontSize: '1rem', fontWeight: 700 }}>Dashboards</h1></div>
      </div>

      <div className="page-scroll" style={{ overflowY: 'auto' }}>
        <div className="dashboard-body">
          {/* Eyebrow + título */}
          <div style={{ paddingTop: 8 }}>
            <div className="page-eyebrow">Visão geral</div>
            <div className="page-title" style={{ fontSize: '1.3rem' }}>Portfólio de Atividades</div>
            <div className="page-title-rule" />
          </div>

          {/* Faixa de KPIs */}
          <div className="kpi-strip">
            {[
              { label: 'Pendentes',    value: pending,    group: 'pending' },
              { label: 'Em Andamento', value: inProgress, group: 'in_progress' },
              { label: 'Em Revisão',   value: review,     group: 'review' },
              { label: 'Concluídas',   value: done,       group: 'done', className: 'green' },
              { label: 'Atrasadas',    value: overdue,    group: 'done', className: 'red' },
            ].map((kpi) => (
              <div key={kpi.label} className="kpi-item">
                <span className="kpi-label">{kpi.label}</span>
                <span className={`kpi-value ${kpi.className ?? ''}`}>{kpi.value}</span>
                {kpi.label === 'Concluídas' && <span className="kpi-sub">Taxa: {completionPct}%</span>}
                {kpi.label === 'Atrasadas' && <span className="kpi-sub">{dueThisWeek} com prazo esta semana</span>}
              </div>
            ))}
          </div>

          {/* Barra de distribuição */}
          {total > 0 && (
            <div>
              <div className="dist-bar">
                {[
                  { group: 'pending', value: pending, color: CHART_COLORS.pending },
                  { group: 'in_progress', value: inProgress, color: CHART_COLORS.in_progress },
                  { group: 'review', value: review, color: CHART_COLORS.review },
                  { group: 'done', value: done, color: CHART_COLORS.done },
                ].filter((s) => s.value > 0).map((s) => (
                  <div key={s.group} className="dist-segment" style={{ flex: s.value, background: s.color }} title={`${s.value} (${Math.round((s.value / total) * 100)}%)`} />
                ))}
              </div>
              <div className="dist-legend">
                {[
                  { label: 'Pendente', color: CHART_COLORS.pending, value: pending },
                  { label: 'Em Andamento', color: CHART_COLORS.in_progress, value: inProgress },
                  { label: 'Em Revisão', color: CHART_COLORS.review, value: review },
                  { label: 'Concluído', color: CHART_COLORS.done, value: done },
                ].map((l) => (
                  <div key={l.label} className="dist-legend-item">
                    <div className="dist-legend-dot" style={{ background: l.color }} />
                    {l.label} <span style={{ color: 'var(--text-3)' }}>({l.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gráficos */}
          <div className="chart-section">
            <div className="chart-card">
              <div className="chart-card-title">Distribuição por Status</div>
              <div className="chart-wrap">
                {total > 0
                  ? <Doughnut data={doughnutData} options={doughnutOptions} />
                  : <div className="empty-state"><p>Nenhuma atividade.</p></div>}
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-card-title">Carga por Responsável</div>
              {topResp.length > 0 && (
                <div className="dist-legend" style={{ marginBottom: 12 }}>
                  {[{ label: 'Concluídas', color: CHART_COLORS.done }, { label: 'Ativas', color: CHART_COLORS.in_progress }, { label: 'Atrasadas', color: CHART_COLORS.overdue }].map((l) => (
                    <div key={l.label} className="dist-legend-item"><div className="dist-legend-dot" style={{ background: l.color }} />{l.label}</div>
                  ))}
                </div>
              )}
              <div className="chart-wrap" style={{ height: Math.max(200, topResp.length * 40) }}>
                {topResp.length > 0
                  ? <Bar data={respBarData} options={respBarOptions} />
                  : <div className="empty-state"><p>Nenhuma atividade com responsável.</p></div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
