'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, PointElement, LineElement, Filler,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { fetchTasks, fetchProjects, fetchArchivedTasks } from '@/lib/api';
import type { Task, Project } from '@/types';
import PageHeader from '@/components/PageHeader';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

const STATUS_COLORS = {
  pending: '#9aa1ac',
  in_progress: '#034ea2',
  review: '#e0a92e',
  done: '#1b8a4b',
  overdue: '#b42318',
};

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoWeek(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((date.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function last8Weeks(): string[] {
  const weeks: string[] = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 86400000);
    weeks.push(isoWeek(d.toISOString().slice(0, 10)));
  }
  return [...new Set(weeks)].slice(-8);
}

function weeksForMonth(yearMonth: string): string[] {
  const [year, month] = yearMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const weeks = new Set<string>();
  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    weeks.add(isoWeek(dateStr));
  }
  return [...weeks].sort();
}

function weekLabel(isoWeekStr: string): string {
  const [, weekNumber] = isoWeekStr.split('-W');
  return `Sem ${weekNumber}`;
}

function formatMonthYear(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} de ${year}`;
}

function stepMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// ── Mini bar ──────────────────────────────────────────────────────────────────

function MiniBar({ done, active, total, color = 'var(--blue)' }: { done: number; active: number; total: number; color?: string }) {
  if (total === 0) return <div style={{ height: 5, background: 'var(--line-2)', borderRadius: 2 }} />;
  return (
    <div style={{ display: 'flex', height: 5, borderRadius: 2, overflow: 'hidden', background: 'var(--line-2)' }}>
      <div style={{ flex: done, background: STATUS_COLORS.done, transition: 'flex .3s' }} />
      <div style={{ flex: active, background: color, transition: 'flex .3s' }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYearMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth); // '' = Geral

  useEffect(() => {
    Promise.all([fetchTasks(), fetchProjects(), fetchArchivedTasks()])
      .then(([activeTasks, loadedProjects, archived]) => {
        setTasks(activeTasks);
        setProjects(loadedProjects);
        setArchivedTasks(archived);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Filtro por mês ────────────────────────────────────────────────────────
  const filteredActiveTasks = useMemo(
    () => (selectedMonth ? tasks.filter(t => t.created_at?.startsWith(selectedMonth)) : tasks),
    [tasks, selectedMonth],
  );
  const filteredArchivedTasks = useMemo(
    () => (selectedMonth ? archivedTasks.filter(t => t.created_at?.startsWith(selectedMonth)) : archivedTasks),
    [archivedTasks, selectedMonth],
  );
  const filteredAllTasks = useMemo(
    () => [...filteredActiveTasks, ...filteredArchivedTasks],
    [filteredActiveTasks, filteredArchivedTasks],
  );

  function prevMonth() {
    setSelectedMonth(prev => (prev ? stepMonth(prev, -1) : currentYearMonth));
  }
  function nextMonth() {
    if (!selectedMonth) { setSelectedMonth(currentYearMonth); return; }
    const next = stepMonth(selectedMonth, 1);
    if (next <= currentYearMonth) setSelectedMonth(next);
  }
  const canGoNext = !selectedMonth || selectedMonth < currentYearMonth;

  const today = new Date().toISOString().split('T')[0];
  const weekFromToday = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const total = filteredAllTasks.length;
  const pending = useMemo(() => filteredActiveTasks.filter(t => t.status_group === 'pending').length, [filteredActiveTasks]);
  const inProgress = useMemo(() => filteredActiveTasks.filter(t => t.status_group === 'in_progress').length, [filteredActiveTasks]);
  const done = useMemo(() => filteredActiveTasks.filter(t => t.status_group === 'done').length, [filteredActiveTasks]);
  const overdue = useMemo(() => filteredActiveTasks.filter(t => t.status_group !== 'done' && t.deadline && t.deadline < today).length, [filteredActiveTasks, today]);
  const dueWeek = useMemo(() => filteredActiveTasks.filter(t => t.status_group !== 'done' && t.deadline && t.deadline >= today && t.deadline <= weekFromToday).length, [filteredActiveTasks, today, weekFromToday]);
  const completionPercentage = total > 0 ? Math.round(((done + filteredArchivedTasks.length) / total) * 100) : 0;

  // ── Progressão ────────────────────────────────────────────────────────────
  const chartWeeks = useMemo(
    () => (selectedMonth ? weeksForMonth(selectedMonth) : last8Weeks()),
    [selectedMonth],
  );

  const weeklyCreated = useMemo(() => {
    const weekCountMap: Record<string, number> = {};
    chartWeeks.forEach(weekKey => (weekCountMap[weekKey] = 0));
    filteredAllTasks.forEach(t => {
      if (t.created_at) {
        const weekKey = isoWeek(t.created_at.slice(0, 10));
        if (weekCountMap[weekKey] !== undefined) weekCountMap[weekKey]++;
      }
    });
    return chartWeeks.map(weekKey => weekCountMap[weekKey] ?? 0);
  }, [filteredAllTasks, chartWeeks]);

  const weeklyDone = useMemo(() => {
    const weekCountMap: Record<string, number> = {};
    chartWeeks.forEach(weekKey => (weekCountMap[weekKey] = 0));
    filteredAllTasks.filter(t => t.status_group === 'done' && t.date).forEach(t => {
      const weekKey = isoWeek(t.date.slice(0, 10));
      if (weekCountMap[weekKey] !== undefined) weekCountMap[weekKey]++;
    });
    return chartWeeks.map(weekKey => weekCountMap[weekKey] ?? 0);
  }, [filteredAllTasks, chartWeeks]);

  const progressaoData = {
    labels: chartWeeks.map(weekLabel),
    datasets: [
      {
        label: 'Concluídas',
        data: weeklyDone,
        borderColor: STATUS_COLORS.done,
        backgroundColor: 'rgba(27,138,75,0.1)',
        fill: true, tension: 0.35, pointRadius: 3,
        pointBackgroundColor: STATUS_COLORS.done, borderWidth: 2,
      },
      {
        label: 'Criadas',
        data: weeklyCreated,
        borderColor: STATUS_COLORS.pending,
        backgroundColor: 'transparent',
        fill: false, tension: 0.35, pointRadius: 3,
        pointBackgroundColor: STATUS_COLORS.pending, borderWidth: 1.5,
        borderDash: [4, 3],
      },
    ],
  };
  const progressaoOpts = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      x: { grid: { color: 'var(--line-2)' }, ticks: { font: { family: 'IBM Plex Mono', size: 10 }, color: '#9aa1ac' } },
      y: { beginAtZero: true, grid: { color: 'var(--line-2)' }, ticks: { font: { family: 'IBM Plex Mono', size: 10 }, color: '#9aa1ac', stepSize: 1 } },
    },
    plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false } },
  };

  // ── Saúde dos prazos ─────────────────────────────────────────────────────
  const withDeadline = useMemo(() => filteredActiveTasks.filter(t => t.deadline), [filteredActiveTasks]);
  const onTime = useMemo(() => withDeadline.filter(t => t.status_group === 'done' || t.deadline! >= today).length, [withDeadline, today]);
  const healthPct = withDeadline.length > 0 ? Math.round((onTime / withDeadline.length) * 100) : 100;

  // ── Prioridade ────────────────────────────────────────────────────────────
  const prioData = useMemo(() => {
    const groups = { Alta: { open: 0, done: 0 }, Média: { open: 0, done: 0 }, Baixa: { open: 0, done: 0 } } as Record<string, { open: number; done: number }>;
    filteredAllTasks.forEach(t => {
      const p = t.priority ?? 'Baixa';
      if (!groups[p]) groups[p] = { open: 0, done: 0 };
      if (t.status_group === 'done') groups[p].done++; else groups[p].open++;
    });
    return Object.entries(groups).map(([prio, v]) => ({ prio, ...v, total: v.open + v.done }));
  }, [filteredAllTasks]);

  // ── Por categoria ─────────────────────────────────────────────────────────
  const catData = useMemo(() => {
    const categoryCountMap: Record<string, number> = {};
    filteredAllTasks.forEach(t => { const categoryName = t.category || 'Sem categoria'; categoryCountMap[categoryName] = (categoryCountMap[categoryName] ?? 0) + 1; });
    return Object.entries(categoryCountMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filteredAllTasks]);
  const maxCat = catData[0]?.[1] ?? 1;

  // ── Desempenho da equipe ──────────────────────────────────────────────────
  const teamData = useMemo(() => {
    const memberStatsMap: Record<string, { total: number; done: number }> = {};
    filteredAllTasks.forEach(t => {
      const name = t.responsible || 'Sem responsável';
      if (!memberStatsMap[name]) memberStatsMap[name] = { total: 0, done: 0 };
      memberStatsMap[name].total++;
      if (t.status_group === 'done') memberStatsMap[name].done++;
    });
    return Object.entries(memberStatsMap).sort((a, b) => b[1].total - a[1].total).slice(0, 7)
      .map(([name, stats]) => ({ name, ...stats, completionPercentage: stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0 }));
  }, [filteredAllTasks]);

  // ── Por projeto ───────────────────────────────────────────────────────────
  const projData = useMemo(() => {
    const projectStatsMap: Record<string, { total: number; done: number }> = {};
    filteredAllTasks.forEach(t => {
      const proj = projects.find(p => p.id === t.project_id);
      const key = proj?.name ?? 'Sem projeto';
      if (!projectStatsMap[key]) projectStatsMap[key] = { total: 0, done: 0 };
      projectStatsMap[key].total++;
      if (t.status_group === 'done') projectStatsMap[key].done++;
    });
    return Object.entries(projectStatsMap).sort((a, b) => b[1].total - a[1].total).slice(0, 6);
  }, [filteredAllTasks, projects]);
  const maxProj = projData[0]?.[1].total ?? 1;

  // ── Prazos próximos / do mês ──────────────────────────────────────────────
  const upcoming = useMemo(() => {
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10);
      return filteredActiveTasks
        .filter(t => t.deadline && t.deadline >= monthStart && t.deadline <= monthEnd)
        .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
        .slice(0, 5);
    }
    return tasks
      .filter(t => t.status_group !== 'done' && t.deadline && t.deadline >= today)
      .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
      .slice(0, 5);
  }, [filteredActiveTasks, tasks, selectedMonth, today]);

  // ── Donut ─────────────────────────────────────────────────────────────────
  const review = filteredActiveTasks.filter(t => t.status_group === 'review').length;

  const donutData = {
    labels: ['Pendente', 'Em Andamento', 'Em Revisão', 'Concluído', 'Arquivada'],
    datasets: [{ data: [pending, inProgress, review, done, filteredArchivedTasks.length], backgroundColor: [STATUS_COLORS.pending, STATUS_COLORS.in_progress, STATUS_COLORS.review, STATUS_COLORS.done, '#6b7280'], borderWidth: 0, hoverOffset: 4 }],
  };
  const donutOpts = { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } };

  if (loading) return <div className="loading-state">Carregando métricas…</div>;

  const progressaoSubtitle = selectedMonth
    ? `Concluídas × criadas · ${formatMonthYear(selectedMonth)}`
    : 'Concluídas × criadas · todos os períodos';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>

      {/* ── Page header ── */}
      <PageHeader
        eyebrow="Visão geral · Desempenho da equipe"
        title="Dashboards"
        right={<span className="mono" style={{ fontSize: '0.66rem', color: 'var(--text-3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{total} ATIVIDADES · {filteredArchivedTasks.length} ARQUIVADAS</span>}
      />

      {/* ── Seletor de mês ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 32px', borderBottom: '1px solid var(--line-1)', height: 46 }}>
        <button
          onClick={() => setSelectedMonth('')}
          className="mono"
          style={{ height: 26, padding: '0 10px', border: !selectedMonth ? '1px solid var(--blue)' : '1px solid var(--border)', borderRadius: 3, background: !selectedMonth ? 'var(--primary-light)' : 'transparent', color: !selectedMonth ? 'var(--blue)' : 'var(--text-3)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
        >
          Geral
        </button>

        <div style={{ width: 1, height: 18, background: 'var(--line-1)', flexShrink: 0 }} />

        <button
          onClick={prevMonth}
          disabled={!selectedMonth}
          title="Mês anterior"
          style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: 3, background: 'transparent', color: selectedMonth ? 'var(--text-2)' : 'var(--text-3)', cursor: selectedMonth ? 'pointer' : 'not-allowed', flexShrink: 0, opacity: selectedMonth ? 1 : 0.4 }}
          onMouseEnter={e => { if (selectedMonth) (e.currentTarget.style.borderColor = 'var(--blue)'); }}
          onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border)'); }}
        >
          <ChevronLeft size={13} />
        </button>

        <div style={{ minWidth: 188, textAlign: 'center' }}>
          {selectedMonth
            ? <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.2px' }}>{formatMonthYear(selectedMonth)}</span>
            : <span style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>Todos os períodos</span>
          }
        </div>

        <button
          onClick={nextMonth}
          disabled={!canGoNext}
          title="Próximo mês"
          style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: 3, background: 'transparent', color: canGoNext ? 'var(--text-2)' : 'var(--text-3)', cursor: canGoNext ? 'pointer' : 'not-allowed', flexShrink: 0, opacity: canGoNext ? 1 : 0.4 }}
          onMouseEnter={e => { if (canGoNext) (e.currentTarget.style.borderColor = 'var(--blue)'); }}
          onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border)'); }}
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* ── KPI strip (4 stats) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid var(--line-1)' }}>
        {[
          { label: 'Pendentes', value: pending, color: STATUS_COLORS.pending },
          { label: 'Em Andamento', value: inProgress, color: STATUS_COLORS.in_progress },
          { label: 'Atrasadas', value: overdue, color: STATUS_COLORS.overdue },
        ].map(kpi => (
          <div key={kpi.label} style={{ padding: '18px 20px', borderRight: '1px solid var(--line-1)' }}>
            <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{kpi.label}</div>
            <div className="mono" style={{ fontSize: '2rem', fontWeight: 500, color: kpi.color, letterSpacing: '-1px', lineHeight: 1 }}>{kpi.value}</div>
            {kpi.label === 'Atrasadas' && !selectedMonth && <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>{dueWeek} com prazo esta semana</div>}
          </div>
        ))}

        {/* Card combinado: Concluídas + Arquivadas */}
        <div style={{ padding: '18px 20px' }}>
          <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Concluídas</div>
          <div className="mono" style={{ fontSize: '2rem', fontWeight: 500, color: STATUS_COLORS.done, letterSpacing: '-1px', lineHeight: 1 }}>
            {done + filteredArchivedTasks.length}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
              <span style={{ color: STATUS_COLORS.done, fontWeight: 600 }}>{done}</span> ativas
            </span>
            <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>·</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
              <span style={{ color: '#6b7280', fontWeight: 600 }}>{filteredArchivedTasks.length}</span> arquivadas
            </span>
          </div>
        </div>
      </div>

      {/* ── Progressão de atividades ── */}
      <div style={{ padding: '26px 32px', borderBottom: '1px solid var(--line-1)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>Progressão de atividades</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>{progressaoSubtitle}</div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[{ color: STATUS_COLORS.done, label: 'Concluídas' }, { color: STATUS_COLORS.pending, label: 'Criadas', dashed: true }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke={l.color} strokeWidth="2" strokeDasharray={l.dashed ? '4 3' : 'none'} /></svg>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: 180 }}>
          <Line data={progressaoData} options={progressaoOpts} />
        </div>
      </div>

      {/* ── 3-column section ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--line-1)' }}>

        {/* Saúde dos prazos */}
        <div style={{ padding: '22px 28px', borderRight: '1px solid var(--line-1)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Saúde dos prazos</div>
          <div className="mono" style={{ fontSize: '2.2rem', fontWeight: 500, color: healthPct >= 80 ? STATUS_COLORS.done : healthPct >= 60 ? STATUS_COLORS.review : STATUS_COLORS.overdue, letterSpacing: '-1px', marginBottom: 10 }}>
            {healthPct}%
          </div>
          <div style={{ display: 'flex', height: 5, borderRadius: 2, overflow: 'hidden', background: 'var(--line-2)', marginBottom: 12 }}>
            <div style={{ flex: onTime, background: STATUS_COLORS.done }} />
            <div style={{ flex: withDeadline.length - onTime, background: STATUS_COLORS.overdue }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              { label: 'No prazo', value: onTime, color: STATUS_COLORS.done },
              { label: 'Atrasadas', value: withDeadline.length - onTime, color: STATUS_COLORS.overdue },
              { label: 'Sem prazo', value: filteredActiveTasks.length - withDeadline.length, color: STATUS_COLORS.pending },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', flex: 1 }}>{l.label}</span>
                <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{l.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Carga por prioridade */}
        <div style={{ padding: '22px 28px', borderRight: '1px solid var(--line-1)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Carga por prioridade</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {prioData.map(({ prio, open, done: doneCount, total: totalCount }) => {
              const prioColor = prio === 'Alta' ? STATUS_COLORS.overdue : prio === 'Média' ? '#A87A00' : STATUS_COLORS.done;
              return (
                <div key={prio}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                    <span className="mono" style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', color: prioColor, letterSpacing: '0.5px' }}>{prio}</span>
                    <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>{totalCount}</span>
                  </div>
                  <MiniBar done={doneCount} active={open} total={totalCount} color={prioColor} />
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
              {[
                { color: STATUS_COLORS.pending, label: 'Pendente', count: pending },
                { color: STATUS_COLORS.in_progress, label: 'Em andamento', count: inProgress },
                { color: STATUS_COLORS.review, label: 'Em revisão', count: review },
                { color: STATUS_COLORS.done, label: 'Concluídas', count: done },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 3, borderRadius: 1, background: l.color, display: 'block' }} />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{l.label} <span className="mono" style={{ color: 'var(--text-2)' }}>({l.count})</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Por categoria */}
        <div style={{ padding: '22px 28px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Por categoria</div>
          {catData.length === 0
            ? <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Sem dados</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {catData.map(([cat, count]) => (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{cat}</span>
                      <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{count}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--line-2)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: STATUS_COLORS.in_progress, width: `${(count / maxCat) * 100}%`, transition: 'width .3s' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* ── 2-column section: Equipe + Donut ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', borderBottom: '1px solid var(--line-1)' }}>

        {/* Desempenho da equipe */}
        <div style={{ padding: '22px 28px', borderRight: '1px solid var(--line-1)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Desempenho da equipe</div>
          {teamData.length === 0
            ? <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Sem dados</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {teamData.map((member, i) => (
                  <div key={member.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#034ea2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 600, flexShrink: 0 }}>
                      {member.name.split(' ').map((word: string) => word[0]).slice(0, 2).join('')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</span>
                        <span className="mono" style={{ fontSize: '0.68rem', color: member.completionPercentage >= 70 ? STATUS_COLORS.done : 'var(--text-3)', flexShrink: 0, marginLeft: 8 }}>{member.completionPercentage}%</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--line-2)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: member.completionPercentage >= 70 ? STATUS_COLORS.done : STATUS_COLORS.in_progress, width: `${member.completionPercentage}%`, transition: 'width .3s' }} />
                      </div>
                    </div>
                    <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-3)', flexShrink: 0, width: 28, textAlign: 'right' }}>{member.total}</span>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* Distribuição por status */}
        <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', alignSelf: 'flex-start' }}>Distribuição por status</div>
          {total > 0 ? (
            <>
              <div style={{ position: 'relative', width: 148, height: 148 }}>
                <Doughnut data={donutData} options={donutOpts} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="mono" style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.5px' }}>{total}</span>
                  <span className="mono" style={{ fontSize: '0.58rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>total</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%' }}>
                {[
                  { label: 'Pendente', value: pending, color: STATUS_COLORS.pending },
                  { label: 'Em Andamento', value: inProgress, color: STATUS_COLORS.in_progress },
                  { label: 'Em Revisão', value: review, color: STATUS_COLORS.review },
                  { label: 'Concluído', value: done, color: STATUS_COLORS.done },
                  { label: 'Arquivada', value: filteredArchivedTasks.length, color: '#6b7280' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', flex: 1 }}>{l.label}</span>
                    <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{l.value}</span>
                    <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-3)', width: 32, textAlign: 'right' }}>{total > 0 ? Math.round((l.value / total) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Sem dados</div>
          )}
        </div>
      </div>

      {/* ── 2-column section: Projetos + Prazos ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--line-1)' }}>

        {/* Atividades por projeto */}
        <div style={{ padding: '22px 28px', borderRight: '1px solid var(--line-1)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Atividades por projeto</div>
          {projData.length === 0
            ? <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Sem projetos</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {projData.map(([name, { total: totalCount, done: doneCount }]) => (
                  <div key={name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{name}</span>
                      <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{doneCount}/{totalCount}</span>
                    </div>
                    <MiniBar done={doneCount} active={totalCount - doneCount} total={totalCount} />
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* Prazos próximos / do mês */}
        <div style={{ padding: '22px 28px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
            {selectedMonth ? `Prazos em ${formatMonthYear(selectedMonth)}` : 'Prazos próximos'}
          </div>
          {upcoming.length === 0
            ? <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Nenhum prazo{selectedMonth ? ' neste mês' : ' próximo'}</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {upcoming.map(t => {
                  const [, month, day] = (t.deadline ?? '').split('-');
                  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  const daysDiff = Math.ceil((new Date(t.deadline!).getTime() - new Date(today).getTime()) / 86400000);
                  const urgencyColor = daysDiff < 0 ? STATUS_COLORS.overdue : daysDiff <= 1 ? STATUS_COLORS.overdue : daysDiff <= 3 ? '#A87A00' : 'var(--text-3)';
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line-2)' }}>
                      <div style={{ textAlign: 'center', minWidth: 38, flexShrink: 0 }}>
                        <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 600, color: urgencyColor, lineHeight: 1 }}>{day}</div>
                        <div className="mono" style={{ fontSize: '0.56rem', textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.5px' }}>{monthNames[parseInt(month) - 1]}</div>
                      </div>
                      <div style={{ width: 1, height: 36, background: 'var(--line-1)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.activity}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 2 }}>{t.responsible}</div>
                      </div>
                      <span className="mono" style={{ fontSize: '0.62rem', fontWeight: 600, color: urgencyColor, flexShrink: 0 }}>
                        {daysDiff < 0 ? `${Math.abs(daysDiff)}d atrás` : daysDiff === 0 ? 'hoje' : daysDiff === 1 ? 'amanhã' : `${daysDiff}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
