import { setAuth, getToken, getUser, clearAuth, isAuthenticated } from '../auth';

const TOKEN_KEY = 'sia_token';
const USER_KEY  = 'sia_user';

const mockUser = {
  user_id: 'user-123',
  name: 'Test User',
  role: 'Admin',
  username: 'test_user',
  must_change_password: false,
};

function makeJwt(exp: number): string {
  const payload = Buffer.from(JSON.stringify({ sub: 'user-123', exp })).toString('base64');
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.fakesig`;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('setAuth', () => {
  it('stores token and user in localStorage when remember=true', () => {
    setAuth('tok-abc', mockUser, true);
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok-abc');
    expect(localStorage.getItem(USER_KEY)).toBe(JSON.stringify(mockUser));
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('stores token and user in sessionStorage when remember=false', () => {
    setAuth('tok-abc', mockUser, false);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('tok-abc');
    expect(sessionStorage.getItem(USER_KEY)).toBe(JSON.stringify(mockUser));
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('clears the opposite storage when switching from local to session', () => {
    localStorage.setItem(TOKEN_KEY, 'old-token');
    setAuth('new-token', mockUser, false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('new-token');
  });

  it('clears the opposite storage when switching from session to local', () => {
    sessionStorage.setItem(TOKEN_KEY, 'old-session-token');
    setAuth('new-local-token', mockUser, true);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new-local-token');
  });
});

describe('getToken', () => {
  it('returns null when nothing is stored', () => {
    expect(getToken()).toBeNull();
  });

  it('reads from sessionStorage', () => {
    sessionStorage.setItem(TOKEN_KEY, 'sess-token');
    expect(getToken()).toBe('sess-token');
  });

  it('falls back to localStorage when sessionStorage is empty', () => {
    localStorage.setItem(TOKEN_KEY, 'local-token');
    expect(getToken()).toBe('local-token');
  });

  it('prefers sessionStorage over localStorage', () => {
    sessionStorage.setItem(TOKEN_KEY, 'sess-token');
    localStorage.setItem(TOKEN_KEY, 'local-token');
    expect(getToken()).toBe('sess-token');
  });
});

describe('getUser', () => {
  it('returns null when nothing is stored', () => {
    expect(getUser()).toBeNull();
  });

  it('parses user from sessionStorage', () => {
    sessionStorage.setItem(USER_KEY, JSON.stringify(mockUser));
    expect(getUser()).toEqual(mockUser);
  });

  it('parses user from localStorage as fallback', () => {
    localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
    expect(getUser()).toEqual(mockUser);
  });

  it('returns null on invalid JSON without throwing', () => {
    sessionStorage.setItem(USER_KEY, 'not-valid-json{');
    expect(getUser()).toBeNull();
  });
});

describe('clearAuth', () => {
  it('removes token and user from both storages', () => {
    localStorage.setItem(TOKEN_KEY, 'a');
    localStorage.setItem(USER_KEY, 'b');
    sessionStorage.setItem(TOKEN_KEY, 'c');
    sessionStorage.setItem(USER_KEY, 'd');

    clearAuth();

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(USER_KEY)).toBeNull();
  });

  it('does not throw when storages are already empty', () => {
    expect(() => clearAuth()).not.toThrow();
  });
});

describe('isAuthenticated', () => {
  it('returns false when no token is stored', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('returns true for a valid non-expired token', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    sessionStorage.setItem(TOKEN_KEY, makeJwt(futureExp));
    expect(isAuthenticated()).toBe(true);
  });

  it('returns false for an expired token', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    sessionStorage.setItem(TOKEN_KEY, makeJwt(pastExp));
    expect(isAuthenticated()).toBe(false);
  });

  it('returns false for a malformed token', () => {
    sessionStorage.setItem(TOKEN_KEY, 'not-a-jwt');
    expect(isAuthenticated()).toBe(false);
  });
});
