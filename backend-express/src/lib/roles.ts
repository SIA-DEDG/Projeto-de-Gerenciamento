// Hierarquia de roles do sistema — espelha ROLE_HIERARCHY do frontend (lib/auth.ts).
export const ROLE_HIERARCHY = [
  'Estagiario', 'Funcionario', 'Tecnico', 'Coordenador', 'Gerente', 'Diretor', 'Admin',
] as const;

export type Role = typeof ROLE_HIERARCHY[number];

export function isValidRole(role: string): role is Role {
  return (ROLE_HIERARCHY as readonly string[]).includes(role);
}

// Só Admin pode atribuir Diretor ou Admin (evita que um Gerente/Diretor se
// autopromova ou promova outro usuário acima do próprio nível via API).
export function canAssignRole(requesterRole: string, targetRole: string): boolean {
  if (requesterRole === 'Admin') return true;
  return targetRole !== 'Admin' && targetRole !== 'Diretor';
}
