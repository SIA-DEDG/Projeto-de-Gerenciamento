'use client';

import { useState, useEffect } from 'react';
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

const BAR_COLORS = ['#034ea2', '#007932', '#fdb913', '#ef4123', '#023a7a', '#005a24', '#c0341d'];

export default function DashboardsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks()
      .then(setTasks)
      .finally(() => setLoading(false));
  }, []);

  const pending = tasks.filter((task) => task.status_group === 'pending').length;
  const inProgress = tasks.filter((task) => task.status_group === 'in_progress').length;
  const done = tasks.filter((task) => task.status_group === 'done').length;
  const total = tasks.length;

  const categoryMap: Record<string, number> = {};
  tasks.forEach((task) => {
    const key = task.category || 'Sem Categoria';
    categoryMap[key] = (categoryMap[key] ?? 0) + 1;
  });
  const sortedCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
  const catLabels = sortedCategories.map(([cat]) => cat);
  const catData = sortedCategories.map(([, count]) => count);

  const doughnutData = {
    labels: ['Pendentes', 'Em Andamento', 'Concluídos'],
    datasets: [
      {
        data: [pending, inProgress, done],
        backgroundColor: ['#DFE1E6', '#DEEBFF', '#E3FCEF'],
        borderColor: ['#B3BAC5', '#4C9AFF', '#57D9A3'],
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  const barData = {
    labels: catLabels,
    datasets: [
      {
        label: 'Atividades',
        data: catData,
        backgroundColor: BAR_COLORS.slice(0, catLabels.length),
        borderRadius: 6,
        borderSkipped: false as const,
        barThickness: 32,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { family: "'Inter', sans-serif", size: 12, weight: 500 },
        },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    scales: {
      x: {
        beginAtZero: true,
        ticks: { stepSize: 1, font: { family: "'Inter', sans-serif", size: 11 } },
        grid: { color: 'rgba(0,0,0,0.04)' },
      },
      y: {
        ticks: { font: { family: "'Inter', sans-serif", size: 12, weight: 500 } },
        grid: { display: false },
      },
    },
    plugins: { legend: { display: false } },
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <h1>Dashboards</h1>
        </div>
        <div className="topbar-right">
          <div className="topbar-search">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Pesquisar atividades..." readOnly />
          </div>
        </div>
      </header>

      <div className="page-content">
        {loading ? (
          <div className="loading-state">Carregando métricas...</div>
        ) : (
          <>
            <div className="dashboard-header">
              <h2>Visão Geral do Portfólio</h2>
              <p className="subtitle">Acompanhamento de status e métricas-chave dos projetos da SIA.</p>
            </div>

            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon metric-icon-pending" />
                <div className="metric-info">
                  <h3>Pendentes</h3>
                  <div className="metric-value">{pending}</div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon metric-icon-progress" />
                <div className="metric-info">
                  <h3>Em Andamento</h3>
                  <div className="metric-value">{inProgress}</div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon metric-icon-done" />
                <div className="metric-info">
                  <h3>Concluídos</h3>
                  <div className="metric-value">{done}</div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon metric-icon-total" />
                <div className="metric-info">
                  <h3>Total de Atividades</h3>
                  <div className="metric-value">{total}</div>
                </div>
              </div>
            </div>

            <div className="charts-container">
              <div className="chart-card">
                <h3>Distribuição de Status</h3>
                <div className="chart-wrapper">
                  {total > 0 ? (
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                  ) : (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '100px' }}>
                      Nenhuma atividade cadastrada.
                    </p>
                  )}
                </div>
              </div>

              <div className="chart-card">
                <h3>Atividades por Projeto</h3>
                <div className="chart-wrapper">
                  {catLabels.length > 0 ? (
                    <Bar data={barData} options={barOptions} />
                  ) : (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '100px' }}>
                      Nenhuma atividade cadastrada.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
