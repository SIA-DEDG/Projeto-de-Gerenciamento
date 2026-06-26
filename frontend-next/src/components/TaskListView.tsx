'use client';

import { statusGroupLabel, STATUS_COLORS, PRIORITY_COLORS, taskDeadlineDisplay } from '@/lib/utils';
import type { Task, Project } from '@/types';

interface TaskListViewProps {
  tasks: Task[];
  projects: Project[];
  onTaskClick: (task: Task) => void;
  emptyMessage?: string;
}

const GRID_COLUMNS = '18px 1fr 150px 96px 130px 96px';
const LIST_HEADERS = ['Atividade', 'Projeto', 'Prioridade', 'Status', 'Prazo'];

export default function TaskListView({
  tasks,
  projects,
  onTaskClick,
  emptyMessage = 'Nenhuma atividade encontrada.',
}: TaskListViewProps) {
  return (
    <div className="ssel" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {/* Cabeçalho fixo */}
      <div style={{
        display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: 18,
        padding: '13px 32px', borderBottom: '1px solid var(--line-1)',
        position: 'sticky', top: 0, background: 'var(--surface)',
      }}>
        <span />
        {LIST_HEADERS.map((heading, i) => (
          <span
            key={heading}
            className="mono"
            style={{
              fontSize: '0.64rem', fontWeight: 500, letterSpacing: '1px',
              textTransform: 'uppercase', color: 'var(--text-3)',
              ...(i === LIST_HEADERS.length - 1 ? { textAlign: 'right' as const } : {}),
            }}
          >
            {heading}
          </span>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state"><p>{emptyMessage}</p></div>
      ) : (
        tasks.map((task) => {
          const projectName = projects.find((p) => p.id === task.project_id)?.name ?? '—';
          const statusColor = STATUS_COLORS[task.status_group] ?? 'var(--text-3)';
          const priorityColor = PRIORITY_COLORS[task.priority] ?? 'var(--text-2)';
          const deadline = taskDeadlineDisplay(task.deadline, task.status_group);

          return (
            <div
              key={task.id}
              onClick={() => onTaskClick(task)}
              style={{
                display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: 18,
                padding: '15px 32px', alignItems: 'center',
                borderBottom: '1px solid var(--line-2)', cursor: 'pointer',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-2)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '')}
            >
              {/* Barra de status lateral */}
              <span style={{ width: 2, height: 30, background: statusColor, display: 'block' }} />

              {/* Título + categoria */}
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {task.activity}
                </div>
                <div className="mono" style={{
                  fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase',
                  letterSpacing: '0.8px', color: 'var(--text-3)', marginTop: 2,
                }}>
                  {task.category}
                </div>
              </div>

              <span style={{
                fontSize: '0.8rem', color: 'var(--text-2)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {projectName}
              </span>

              <span className="mono" style={{
                fontSize: '0.68rem', fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: '0.5px', color: priorityColor,
              }}>
                {task.priority}
              </span>

              <span className="mono" style={{
                fontSize: '0.68rem', fontWeight: 500,
                letterSpacing: '0.5px', color: statusColor,
              }}>
                {statusGroupLabel(task.status_group)}
              </span>

              <span className="mono" style={{
                fontSize: '0.72rem', fontWeight: 400,
                color: deadline.color, textAlign: 'right',
              }}>
                {deadline.text}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
