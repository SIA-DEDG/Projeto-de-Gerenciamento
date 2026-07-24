const TOKEN_KEY = 'sia_token';
const USER_KEY = 'sia_user';

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

// Pode redefinir senhas de outros (Gerente, Diretor e Admin)
export function canResetPasswords(role: string | undefined): boolean {
  return hasMinRole(role, 'Gerente');
}

export function isGabinete(directoriaName: string | null | undefined): boolean {
  if (!directoriaName) return false;
  return directoriaName?.toLowerCase() === 'gabinete';
}
export interface StoredUser {
  user_id: string;
  name: string;
  role: string;
  username: string;
  email?: string | null;
  job_title?: string | null;
  permissions?: Record<string, boolean>;
  must_change_password: boolean;
  directoria_id: string | null;
  directoria_name: string | null;
  directoria_color: string | null;
}

// Pode aprovar/recusar faltas (Gerente, Diretor e Admin ou Gabinete)
export function canApproveFaltas(user: StoredUser | undefined | null): boolean {
  if (!user) return false;
  return hasMinRole(user?.role, 'Gerente') || isGabinete(user?.directoria_name);
}

// Super-Admin é role='Admin' sem diretoria vinculada. Aceita tanto o StoredUser
// da sessão quanto um UserPublic da API (ambos têm role + directoria_id).
export function isSuperAdmin(user: { role: string; directoria_id: string | null } | null): boolean {
  return user?.role === 'Admin' && !user?.directoria_id;
}

// Pode criar/editar projetos e eventos (Funcionario e acima — Estagiário não)
export function canManageProjects(role: string | undefined): boolean {
  return hasMinRole(role, 'Funcionario');
}

export function isAdmin(role: string | undefined): boolean {
  return role === 'Admin';
}

// remember=true → localStorage (persiste); false → sessionStorage (limpa ao fechar aba)
export function setAuth(token: string, user: StoredUser, remember = false): void {
  const keep = remember ? localStorage : sessionStorage;
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

export function hasPermission(user: StoredUser | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  return user.permissions?.[permission] === true;
}