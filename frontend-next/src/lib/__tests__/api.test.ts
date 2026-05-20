/**
 * API layer unit tests.
 *
 * Covers: request structure, error handling, cache invalidation.
 * The in-memory cache starts empty for each test file run (module isolation).
 */

import {
  fetchTasks,
  deleteTask,
  deleteProject,
  invalidateTasksCache,
  login,
  fetchUsers,
} from '../api';

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('../auth', () => ({
  getToken:  jest.fn(() => 'mock-bearer-token'),
  clearAuth: jest.fn(),
}));

jest.mock('../localStorage', () => ({
  getCategories:    jest.fn(() => []),
  addCategory:      jest.fn(),
  deleteCategory:   jest.fn(),
  getTeamMembers:   jest.fn(() => []),
  saveTeamMembers:  jest.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

function okJson(data: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(''),
  } as Response);
}

function noContent() {
  return Promise.resolve({ ok: true, status: 204 } as Response);
}

function errorResponse(status: number, body = 'Erro interno') {
  return Promise.resolve({
    ok: false,
    status,
    text: () => Promise.resolve(body),
    statusText: body,
  } as Response);
}

const rawTask = {
  id: 'task-001',
  category: 'TI',
  activity: 'Testar sistema',
  responsible_id: null,
  responsible: 'João Silva',
  status: 'Pendente',
  priority: 'Alta',
  created_at: '2024-06-01',
  description: null,
  project_id: null,
  co_responsibles: null,
  external_collaborators: null,
};

// ── Setup ─────────────────────────────────────────────────────────────────────

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock;
  // Reset in-memory cache before each test
  invalidateTasksCache();
  jest.clearAllMocks();
});

// ── login ─────────────────────────────────────────────────────────────────────

describe('login', () => {
  it('sends POST to /api/auth/login with username and password', async () => {
    fetchMock.mockResolvedValueOnce(
      okJson({ token: 'jwt', user_id: '1', name: 'Test', role: 'Admin', username: 'user_test', must_change_password: false }),
    );

    await login('user_test', 'secret123');

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/auth/login`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'user_test', password: 'secret123' }),
      }),
    );
  });

  it('throws with server message on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(401, 'Credenciais inválidas'));

    await expect(login('bad_user', 'wrong')).rejects.toThrow('Credenciais inválidas');
  });

  it('returns the parsed user payload on success', async () => {
    const payload = { token: 'jwt', user_id: 'u1', name: 'Ana', role: 'Admin', username: 'ana_silva', must_change_password: false };
    fetchMock.mockResolvedValueOnce(okJson(payload));

    const result = await login('ana_silva', 'pass');
    expect(result).toEqual(payload);
  });
});

// ── fetchTasks ────────────────────────────────────────────────────────────────

describe('fetchTasks', () => {
  it('sends GET /api/tasks with Authorization header', async () => {
    fetchMock.mockResolvedValueOnce(okJson([rawTask]));

    await fetchTasks();

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/tasks`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-bearer-token',
        }),
      }),
    );
  });

  it('enriches raw tasks with status_group, badge_color, date', async () => {
    fetchMock.mockResolvedValueOnce(okJson([rawTask]));

    const tasks = await fetchTasks();

    expect(tasks[0]).toMatchObject({
      id:           'task-001',
      status_group: 'pending',
      date:         '2024-06-01',
    });
    expect(tasks[0].badge_color).toBeDefined();
  });

  it('re-fetches after invalidateTasksCache', async () => {
    // Round 1 → returns task-001
    fetchMock.mockResolvedValueOnce(okJson([rawTask]));
    const first = await fetchTasks();
    expect(first[0].id).toBe('task-001');

    // Invalidate
    await invalidateTasksCache();

    // Round 2 → returns task-002
    fetchMock.mockResolvedValueOnce(okJson([{ ...rawTask, id: 'task-002' }]));
    const second = await fetchTasks();
    expect(second[0].id).toBe('task-002');
  });
});

// ── deleteTask ────────────────────────────────────────────────────────────────

describe('deleteTask', () => {
  it('sends DELETE to /api/tasks/:id', async () => {
    fetchMock.mockResolvedValueOnce(noContent());

    await deleteTask('task-abc');

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/tasks/task-abc`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

// ── deleteProject ─────────────────────────────────────────────────────────────

describe('deleteProject', () => {
  it('sends DELETE to /api/projects/:id', async () => {
    fetchMock.mockResolvedValueOnce(noContent());

    await deleteProject('proj-xyz');

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/projects/proj-xyz`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('invalidates the tasks cache so next fetchTasks re-fetches', async () => {
    // Populate tasks cache
    fetchMock.mockResolvedValueOnce(okJson([rawTask]));
    await fetchTasks();

    // deleteProject — also invalidates 'tasks'
    fetchMock.mockResolvedValueOnce(noContent());
    await deleteProject('proj-xyz');

    // Next fetchTasks should fetch fresh data (cache was cleared)
    fetchMock.mockResolvedValueOnce(okJson([{ ...rawTask, id: 'fresh-task' }]));
    const tasks = await fetchTasks();
    expect(tasks[0].id).toBe('fresh-task');
  });
});

// ── 401 handling ──────────────────────────────────────────────────────────────

describe('401 response', () => {
  it('throws and calls clearAuth on 401', async () => {
    const { clearAuth } = jest.requireMock('../auth');
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve(''),
      statusText: 'Unauthorized',
    } as Response);

    await expect(fetchUsers()).rejects.toThrow('Sessão expirada');
    expect(clearAuth).toHaveBeenCalled();
  });
});
