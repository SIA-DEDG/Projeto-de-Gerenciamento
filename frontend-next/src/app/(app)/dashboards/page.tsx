'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, PointElement, LineElement, Filler,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { fetchTasks, fetchProjects } from '@/lib/api';
import type { Task, Project } from '@/types';
import PageHeader from '@/components/PageHeader';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

const C = {
  pending:    '#9aa1ac',
  in_progress:'#034ea2',
  review:     '#e0a92e',
  done:       '#1b8a4b',
  overdue:    '#b42318',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const w = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(w).padStart(2, '0')}`;
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

function weekLabel(w: string): string {
  const [, wk] = w.split('-W');
  return `Sem ${wk}`;
}

// ── Mini bar (usado em seções do dashboard) ───────────────────────────────────

function MiniBar({ done, active, total, color = '#034EA2' }: { done: number; active: number; total: number; color?: string }) {
  if (total === 0) return <div style={{ height: 5, background: 'var(--line-2)', borderRadius: 2 }} />;
  return (
    <div style={{ display: 'flex', height: 5, borderRadius: 2, overflow: 'hidden', background: 'var(--line-2)' }}>
      <div style={{ flex: done, background: C.done, transition: 'flex .3s' }} />
      <div style={{ flex: active, background: color, transition: 'flex .3s' }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardsPage() {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([fetchTasks(), fetchProjects()])
      .then(([t, p]) => { setTasks(t); setProjects(p); })
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const in7   = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const total      = tasks.length;
  const pending    = useMemo(() => tasks.filter(t => t.status_group === 'pending').length,     [tasks]);
  const inProgress = useMemo(() => tasks.filter(t => t.status_group === 'in_progress').length, [tasks]);
  const done       = useMemo(() => tasks.filter(t => t.status_group === 'done').length,        [tasks]);
  const overdue    = useMemo(() => tasks.filter(t => t.status_group !== 'done' && t.deadline && t.deadline < today).length, [tasks, today]);
  const dueWeek    = useMemo(() => tasks.filter(t => t.status_group !== 'done' && t.deadline && t.deadline >= today && t.deadline <= in7).length, [tasks, today, in7]);
  const pct        = total > 0 ? Math.round((done / total) * 100) : 0;

  // ── Progressão (8 semanas) ────────────────────────────────────────────────
  const weeks = useMemo(() => last8Weeks(), []);
  const weeklyCreated = useMemo(() => {
    const m: Record<string, number> = {};
    weeks.forEach(w => (m[w] = 0));
    tasks.forEach(t => { if (t.created_at) { const w = isoWeek(t.created_at.slice(0, 10)); if (m[w] !== undefined) m[w]++; } });
    return weeks.map(w => m[w] ?? 0);
  }, [tasks, weeks]);

  const weeklyDone = useMemo(() => {
    const m: Record<string, number> = {};
    weeks.forEach(w => (m[w] = 0));
    tasks.filter(t => t.status_group === 'done' && t.date).forEach(t => {
      const w = isoWeek(t.date.slice(0, 10));
      if (m[w] !== undefined) m[w]++;
    });
    return weeks.map(w => m[w] ?? 0);
  }, [tasks, weeks]);

  const progressaoData = {
    labels: weeks.map(weekLabel),
    datasets: [
      {
        label: 'Concluídas',
        data: weeklyDone,
        borderColor: C.done,
        backgroundColor: 'rgba(27,138,75,0.1)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: C.done,
        borderWidth: 2,
      },
      {
        label: 'Criadas',
        data: weeklyCreated,
        borderColor: C.pending,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: C.pending,
        borderWidth: 1.5,
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
  const withDeadline  = useMemo(() => tasks.filter(t => t.deadline), [tasks]);
  const onTime        = useMemo(() => withDeadline.filter(t => t.status_group === 'done' || t.deadline! >= today).length, [withDeadline, today]);
  const healthPct     = withDeadline.length > 0 ? Math.round((onTime / withDeadline.length) * 100) : 100;

  // ── Prioridade ────────────────────────────────────────────────────────────
  const prioData = useMemo(() => {
    const groups = { Alta: { open: 0, done: 0 }, Média: { open: 0, done: 0 }, Baixa: { open: 0, done: 0 } } as Record<string, { open: number; done: number }>;
    tasks.forEach(t => {
      const p = t.priority ?? 'Baixa';
      if (!groups[p]) groups[p] = { open: 0, done: 0 };
      if (t.status_group === 'done') groups[p].done++; else groups[p].open++;
    });
    return Object.entries(groups).map(([prio, v]) => ({ prio, ...v, total: v.open + v.done }));
  }, [tasks]);

  // ── Por categoria ─────────────────────────────────────────────────────────
  const catData = useMemo(() => {
    const m: Record<string, number> = {};
    tasks.forEach(t => { const c = t.category || 'Sem categoria'; m[c] = (m[c] ?? 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [tasks]);
  const maxCat = catData[0]?.[1] ?? 1;

  // ── Desempenho da equipe ──────────────────────────────────────────────────
  const teamData = useMemo(() => {
    const m: Record<string, { total: number; done: number }> = {};
    tasks.forEach(t => {
      const name = t.responsible || 'Sem responsável';
      if (!m[name]) m[name] = { total: 0, done: 0 };
      m[name].total++;
      if (t.status_group === 'done') m[name].done++;
    });
    return Object.entries(m).sort((a, b) => b[1].total - a[1].total).slice(0, 7)
      .map(([name, v]) => ({ name, ...v, pct: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0 }));
  }, [tasks]);

  // ── Por projeto ───────────────────────────────────────────────────────────
  const projData = useMemo(() => {
    const m: Record<string, { total: number; done: number }> = {};
    tasks.forEach(t => {
      const proj = projects.find(p => p.id === t.project_id);
      const key = proj?.name ?? 'Sem projeto';
      if (!m[key]) m[key] = { total: 0, done: 0 };
      m[key].total++;
      if (t.status_group === 'done') m[key].done++;
    });
    return Object.entries(m).sort((a, b) => b[1].total - a[1].total).slice(0, 6);
  }, [tasks, projects]);
  const maxProj = projData[0]?.[1].total ?? 1;

  // ── Prazos próximos ───────────────────────────────────────────────────────
  const upcoming = useMemo(() =>
    tasks
      .filter(t => t.status_group !== 'done' && t.deadline && t.deadline >= today)
      .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
      .slice(0, 5),
    [tasks, today],
  );

  // ── Donut ─────────────────────────────────────────────────────────────────
  const donutData = {
    labels: ['Pendente', 'Em Andamento', 'Em Revisão', 'Concluído'],
    datasets: [{ data: [pending, inProgress, tasks.filter(t => t.status_group === 'review').length, done], backgroundColor: [C.pending, C.in_progress, C.review, C.done], borderWidth: 0, hoverOffset: 4 }],
  };
  const donutOpts = { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } };

  if (loading) return <div className="loading-state">Carregando métricas…</div>;

  const review = tasks.filter(t => t.status_group === 'review').length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>

      {/* ── Page header ── */}
      <PageHeader
        eyebrow="Visão geral · Desempenho da equipe"
        title="Dashboards"
        right={<span className="mono" style={{ fontSize: '0.66rem', color: 'var(--text-3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{total} ATIVIDADES</span>}
      />

      {/* ── KPI strip (4 stats) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid var(--line-1)', borderBottom: '1px solid var(--line-1)', marginTop: 20 }}>
        {[
          { label: 'Pendentes',    value: pending,    color: C.pending },
          { label: 'Em Andamento', value: inProgress, color: C.in_progress },
          { label: 'Concluídas',   value: done,       color: C.done },
          { label: 'Atrasadas',    value: overdue,    color: C.overdue },
        ].map((kpi, i) => (
          <div key={kpi.label} style={{ padding: '18px 24px', borderRight: i < 3 ? '1px solid var(--line-1)' : 'none' }}>
            <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{kpi.label}</div>
            <div className="mono" style={{ fontSize: '2rem', fontWeight: 500, color: kpi.color, letterSpacing: '-1px', lineHeight: 1 }}>{kpi.value}</div>
            {kpi.label === 'Concluídas' && <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>{pct}% de conclusão</div>}
            {kpi.label === 'Atrasadas' && <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>{dueWeek} com prazo esta semana</div>}
          </div>
        ))}
      </div>

      {/* ── Progressão de atividades ── */}
      <div style={{ padding: '26px 32px', borderBottom: '1px solid var(--line-1)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>Progressão de atividades</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>Concluídas × criadas · últimas 8 semanas</div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[{ color: C.done, label: 'Concluídas' }, { color: C.pending, label: 'Criadas', dashed: true }].map(l => (
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
          <div className="mono" style={{ fontSize: '2.2rem', fontWeight: 500, color: healthPct >= 80 ? C.done : healthPct >= 60 ? C.review : C.overdue, letterSpacing: '-1px', marginBottom: 10 }}>
            {healthPct}%
          </div>
          <div style={{ display: 'flex', height: 5, borderRadius: 2, overflow: 'hidden', background: 'var(--line-2)', marginBottom: 12 }}>
            <div style={{ flex: onTime, background: C.done }} />
            <div style={{ flex: withDeadline.length - onTime, background: C.overdue }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              { label: 'No prazo', value: onTime, color: C.done },
              { label: 'Atrasadas', value: withDeadline.length - onTime, color: C.overdue },
              { label: 'Sem prazo', value: tasks.length - withDeadline.length, color: C.pending },
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
            {prioData.map(({ prio, open, done: d, total: tot }) => {
              const prioColor = prio === 'Alta' ? C.overdue : prio === 'Média' ? '#A87A00' : C.done;
              return (
                <div key={prio}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                    <span className="mono" style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', color: prioColor, letterSpacing: '0.5px' }}>{prio}</span>
                    <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>{tot}</span>
                  </div>
                  <MiniBar done={d} active={open} total={tot} color={prioColor} />
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              {[{ color: C.done, label: 'Concluídas' }, { color: C.in_progress, label: 'Ativas' }].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 3, borderRadius: 1, background: l.color, display: 'block' }} />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{l.label}</span>
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
                      <div style={{ height: '100%', background: C.in_progress, width: `${(count / maxCat) * 100}%`, transition: 'width .3s' }} />
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
                {teamData.map((m, i) => (
                  <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#034EA2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 600, flexShrink: 0 }}>
                      {m.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                        <span className="mono" style={{ fontSize: '0.68rem', color: m.pct >= 70 ? C.done : 'var(--text-3)', flexShrink: 0, marginLeft: 8 }}>{m.pct}%</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--line-2)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: m.pct >= 70 ? C.done : C.in_progress, width: `${m.pct}%`, transition: 'width .3s' }} />
                      </div>
                    </div>
                    <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-3)', flexShrink: 0, width: 28, textAlign: 'right' }}>{m.total}</span>
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
                  { label: 'Pendente',    value: pending,    color: C.pending },
                  { label: 'Em Andamento', value: inProgress, color: C.in_progress },
                  { label: 'Em Revisão',  value: review,     color: C.review },
                  { label: 'Concluído',   value: done,        color: C.done },
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

      {/* ── 2-column section: Projetos + Prazos próximos ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--line-1)' }}>

        {/* Atividades por projeto */}
        <div style={{ padding: '22px 28px', borderRight: '1px solid var(--line-1)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Atividades por projeto</div>
          {projData.length === 0
            ? <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Sem projetos</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {projData.map(([name, { total: tot, done: d }]) => (
                  <div key={name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{name}</span>
                      <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{d}/{tot}</span>
                    </div>
                    <MiniBar done={d} active={tot - d} total={tot} />
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* Prazos próximos */}
        <div style={{ padding: '22px 28px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Prazos próximos</div>
          {upcoming.length === 0
            ? <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Nenhum prazo próximo</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {upcoming.map((t) => {
                  const [y, m, d] = (t.deadline ?? '').split('-');
                  const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
                  const daysDiff = Math.ceil((new Date(t.deadline!).getTime() - new Date(today).getTime()) / 86400000);
                  const urgencyColor = daysDiff <= 1 ? C.overdue : daysDiff <= 3 ? '#A87A00' : 'var(--text-3)';
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line-2)' }}>
                      <div style={{ textAlign: 'center', minWidth: 38, flexShrink: 0 }}>
                        <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 600, color: urgencyColor, lineHeight: 1 }}>{d}</div>
                        <div className="mono" style={{ fontSize: '0.56rem', textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.5px' }}>{monthNames[parseInt(m) - 1]}</div>
                      </div>
                      <div style={{ width: 1, height: 36, background: 'var(--line-1)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.activity}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 2 }}>{t.responsible}</div>
                      </div>
                      <span className="mono" style={{ fontSize: '0.62rem', fontWeight: 600, color: urgencyColor, flexShrink: 0 }}>
                        {daysDiff === 0 ? 'hoje' : daysDiff === 1 ? 'amanhã' : `${daysDiff}d`}
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
