import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import KanbanCard from '../KanbanCard';
import type { Task } from '@/types';

// ── Mock @dnd-kit/core so useDraggable works without DndContext ───────────────
jest.mock('@dnd-kit/core', () => ({
  useDraggable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    isDragging: false,
  })),
}));

// ── Fixture ───────────────────────────────────────────────────────────────────

const baseTask: Task = {
  id:                    'abc12345-0000-0000-0000-000000000001',
  activity:              'Implementar login',
  category:              'TI',
  responsible_id:        null,
  responsible:           'João Silva',
  status:                'Pendente',
  status_group:          'pending',
  badge_color:           'blue',
  priority:              'Alta',
  date:                  '2024-06-01',
  created_at:            '2024-06-01',
  description:           undefined,
  project_id:            null,
  co_responsibles:       null,
  external_collaborators: null,
  deadline:              null,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('KanbanCard', () => {
  describe('rendering', () => {
    it('renders the task activity title', () => {
      render(<KanbanCard task={baseTask} onView={jest.fn()} onDelete={jest.fn()} />);
      expect(screen.getByText('Implementar login')).toBeInTheDocument();
    });

    it('shows the SIA task id', () => {
      render(<KanbanCard task={baseTask} onView={jest.fn()} onDelete={jest.fn()} />);
      expect(screen.getByText(/SIA-abc12345/)).toBeInTheDocument();
    });

    it('shows the task date', () => {
      render(<KanbanCard task={baseTask} onView={jest.fn()} onDelete={jest.fn()} />);
      expect(screen.getByText('2024-06-01')).toBeInTheDocument();
    });

    it('shows the priority chip', () => {
      render(<KanbanCard task={baseTask} onView={jest.fn()} onDelete={jest.fn()} />);
      expect(screen.getByText('Alta')).toBeInTheDocument();
    });

    it('omits the date section when task has no date', () => {
      const task = { ...baseTask, date: '' };
      render(<KanbanCard task={task} onView={jest.fn()} onDelete={jest.fn()} />);
      expect(screen.queryByText('2024-06-01')).not.toBeInTheDocument();
    });
  });

  describe('avatars', () => {
    it('shows avatar for the responsible user', () => {
      render(<KanbanCard task={baseTask} onView={jest.fn()} onDelete={jest.fn()} />);
      expect(screen.getByTitle('João Silva')).toBeInTheDocument();
    });

    it('shows initials JS for João Silva', () => {
      render(<KanbanCard task={baseTask} onView={jest.fn()} onDelete={jest.fn()} />);
      expect(screen.getByTitle('João Silva').textContent).toBe('JS');
    });

    it('shows stacked avatars for co-responsibles', () => {
      const task = {
        ...baseTask,
        co_responsibles: JSON.stringify(['Maria Costa', 'Pedro Lima']),
      };
      render(<KanbanCard task={task} onView={jest.fn()} onDelete={jest.fn()} />);
      expect(screen.getByTitle('João Silva')).toBeInTheDocument();
      expect(screen.getByTitle('Maria Costa')).toBeInTheDocument();
      expect(screen.getByTitle('Pedro Lima')).toBeInTheDocument();
    });

    it('shows +N badge when co-responsibles exceed MAX_AVATARS (3 total)', () => {
      // responsible + 3 co-responsibles = 4 avatars total → shows first 3, badge +1
      const task = {
        ...baseTask,
        co_responsibles: JSON.stringify(['Maria Costa', 'Pedro Lima', 'Ana Santos']),
      };
      render(<KanbanCard task={task} onView={jest.fn()} onDelete={jest.fn()} />);

      // Badge shows "+1" text and its title lists the overflow name(s)
      const badge = screen.getByText('+1');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('title', 'Ana Santos');

      // Visible avatars: João Silva, Maria Costa, Pedro Lima (not Ana Santos individually)
      expect(screen.getByTitle('João Silva')).toBeInTheDocument();
      expect(screen.getByTitle('Maria Costa')).toBeInTheDocument();
      expect(screen.getByTitle('Pedro Lima')).toBeInTheDocument();
    });

    it('does not show overflow badge when exactly MAX_AVATARS are present', () => {
      const task = {
        ...baseTask,
        co_responsibles: JSON.stringify(['Maria Costa', 'Pedro Lima']),
      };
      render(<KanbanCard task={task} onView={jest.fn()} onDelete={jest.fn()} />);
      expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument();
    });

    it('handles malformed co_responsibles JSON gracefully', () => {
      const task = { ...baseTask, co_responsibles: 'not-json' };
      render(<KanbanCard task={task} onView={jest.fn()} onDelete={jest.fn()} />);
      // Only responsible avatar shown; no crash
      expect(screen.getByTitle('João Silva')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onView with the task when card content is clicked', () => {
      const onView = jest.fn();
      render(<KanbanCard task={baseTask} onView={onView} onDelete={jest.fn()} />);

      fireEvent.click(screen.getByText('Implementar login'));

      expect(onView).toHaveBeenCalledTimes(1);
      expect(onView).toHaveBeenCalledWith(baseTask);
    });

    it('calls onDelete with task id when delete button is clicked', () => {
      const onDelete = jest.fn();
      render(<KanbanCard task={baseTask} onView={jest.fn()} onDelete={onDelete} />);

      fireEvent.click(screen.getByTitle('Excluir'));

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(baseTask.id);
    });

    it('does not call onView when delete button is clicked', () => {
      const onView  = jest.fn();
      const onDelete = jest.fn();
      render(<KanbanCard task={baseTask} onView={onView} onDelete={onDelete} />);

      fireEvent.click(screen.getByTitle('Excluir'));

      expect(onView).not.toHaveBeenCalled();
    });
  });
});
