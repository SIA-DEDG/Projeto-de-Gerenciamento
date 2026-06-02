const TOKEN_KEY = 'sia_token';
const USER_KEY  = 'sia_user';

// Hierarquia de roles — índice maior = mais permissões
export const ROLE_HIERARCHY = [
  'Estagiario', 'Funcionario', 'Tecnico', 'Coordenador', 'Gerente', 'Diretor', 'Admin',
] as const;

function roleLevel(role: string | undefined): number {
  return ROLE_HIERARCHY.indexOf((role ?? '') as typeof ROLE_HIERARCHY[number]);
}

export function hasMinRole(userRole: string | undefined, minRole: string): boolean {
  return roleLevel(userRole) >= roleLevel(minRole);
}

// Pode ver TODAS as faltas (Admin, Diretor e Gerente)
export function canSeeAllAbsences(role: string | undefined): boolean {
  return role === 'Admin' || role === 'Diretor' || role === 'Gerente';
}

// Pode cadastrar e gerenciar usuários — alterar role, excluir (Gerente e acima)
export function canManageUsers(role: string | undefined): boolean {
  return hasMinRole(role, 'Gerente');
}

// Pode redefinir senhas de outros (apenas Admin)
export function canResetPasswords(role: string | undefined): boolean {
  return role === 'Admin';
}

export interface StoredUser {
  user_id:              string;
  name:                 string;
  role:                 string;
  username:             string;
  must_change_password: boolean;
  department_id?:       string | null;
}

export function isAdmin(role: string | undefined): boolean {
  return role === 'Admin';
}

// remember=true → localStorage (persiste); false → sessionStorage (limpa ao fechar aba)
export function setAuth(token: string, user: StoredUser, remember = false): void {
  const keep  = remember ? localStorage  : sessionStorage;
  const clear = remember ? sessionStorage : localStorage;
  keep.setItem(TOKEN_KEY, token);
  keep.setItem(USER_KEY, JSON.stringify(user));
  clear.removeItem(TOKEN_KEY);
  clear.removeItem(USER_KEY);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
}

export function getUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function isRemembered(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(TOKEN_KEY);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
