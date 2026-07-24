import { ROLE_HIERARCHY, type Role, isValidRole } from './roles';

export type PermissionState = Record<string, boolean>;

export interface PermissionItem {
  key: string;
  label: string;
  description: string;
}

export interface PermissionModule {
  key: string;
  label: string;
  permissions: PermissionItem[];
}

export const PERMISSION_CATALOG: PermissionModule[] = [
  {
    key: 'users',
    label: 'Usuarios',
    permissions: [
      { key: 'users.view', label: 'Visualizar usuarios', description: 'Acessa a lista de usuarios permitidos.' },
      { key: 'users.create', label: 'Criar usuarios', description: 'Cadastra novos colaboradores.' },
      { key: 'users.edit_profile', label: 'Editar dados', description: 'Altera nome, email, cargo e diretoria permitida.' },
      { key: 'users.delete', label: 'Excluir usuarios', description: 'Remove usuarios dentro da hierarquia permitida.' },
      { key: 'users.reset_password', label: 'Redefinir senha', description: 'Gera ou define nova senha para outro usuario.' },
      { key: 'users.manage_access', label: 'Editar acesso', description: 'Altera perfil de acesso e permissoes individuais.' },
    ],
  },
  {
    key: 'projects',
    label: 'Projetos',
    permissions: [
      { key: 'projects.view', label: 'Visualizar projetos', description: 'Acessa projetos da area permitida.' },
      { key: 'projects.create', label: 'Criar projetos', description: 'Abre novos projetos.' },
      { key: 'projects.edit', label: 'Editar projetos', description: 'Atualiza dados e responsaveis.' },
      { key: 'projects.delete', label: 'Excluir projetos', description: 'Remove projetos.' },
      { key: 'projects.import', label: 'Importar projetos', description: 'Usa importacao por planilha.' },
    ],
  },
  {
    key: 'tasks',
    label: 'Atividades',
    permissions: [
      { key: 'tasks.view', label: 'Visualizar atividades', description: 'Acessa quadros e listas de atividades.' },
      { key: 'tasks.create', label: 'Criar atividades', description: 'Registra novas atividades.' },
      { key: 'tasks.edit', label: 'Editar atividades', description: 'Atualiza status, prazo e responsaveis.' },
      { key: 'tasks.delete', label: 'Excluir atividades', description: 'Remove atividades.' },
      { key: 'tasks.archive', label: 'Arquivar atividades', description: 'Arquiva ou restaura atividades concluidas.' },
      { key: 'tasks.import', label: 'Importar atividades', description: 'Usa importacao por planilha.' },
    ],
  },
  {
    key: 'events',
    label: 'Eventos',
    permissions: [
      { key: 'events.view', label: 'Visualizar eventos', description: 'Acessa agenda e reunioes.' },
      { key: 'events.create', label: 'Criar eventos', description: 'Agenda novos eventos.' },
      { key: 'events.edit', label: 'Editar eventos', description: 'Atualiza eventos, atas e anexos.' },
      { key: 'events.delete', label: 'Excluir eventos', description: 'Remove eventos.' },
    ],
  },
  {
    key: 'absences',
    label: 'Faltas',
    permissions: [
      { key: 'absences.view', label: 'Visualizar faltas', description: 'Consulta afastamentos permitidos.' },
      { key: 'absences.create', label: 'Criar faltas', description: 'Registra faltas e afastamentos.' },
      { key: 'absences.edit', label: 'Editar faltas', description: 'Atualiza justificativas e periodos.' },
      { key: 'absences.delete', label: 'Excluir faltas', description: 'Remove registros de falta.' },
      { key: 'absences.approve', label: 'Aprovar faltas', description: 'Aprova ou recusa solicitacoes.' },
      { key: 'absences.view_all', label: 'Ver todas as faltas', description: 'Consulta faltas da diretoria permitida.' },
    ],
  },
  {
    key: 'admin',
    label: 'Administracao',
    permissions: [
      { key: 'diretorias.view', label: 'Visualizar diretorias', description: 'Consulta diretorias e membros.' },
      { key: 'diretorias.manage', label: 'Gerenciar diretorias', description: 'Cria, edita, ativa e remove diretorias.' },
      { key: 'dashboards.view', label: 'Ver dashboards', description: 'Acessa indicadores e paineis.' },
      { key: 'logs.view', label: 'Ver logs', description: 'Consulta trilha de auditoria.' },
      { key: 'logs.clear', label: 'Limpar logs', description: 'Remove registros da trilha de auditoria.' },
      { key: 'settings.manage_directoria', label: 'Configurar diretoria', description: 'Ajusta configuracoes da diretoria.' },
      { key: 'settings.manage_permission_presets', label: 'Configurar presets', description: 'Edita permissoes padrao por perfil.' },
      { key: 'feedback.manage', label: 'Gerenciar feedback', description: 'Responde, modera e altera status de feedbacks.' },
    ],
  },
];

const allPermissionKeys = PERMISSION_CATALOG.flatMap((module) => module.permissions.map((permission) => permission.key));
export const ALL_PERMISSION_KEYS = new Set(allPermissionKeys);
export const ADMINISTRATION_PERMISSION_KEYS = new Set(
  PERMISSION_CATALOG.find((module) => module.key === 'admin')?.permissions.map((permission) => permission.key) ?? [],
);

function set(keys: string[]): PermissionState {
  return Object.fromEntries(keys.map((key) => [key, true]));
}

export const ROLE_PERMISSION_PRESETS: Record<Role, PermissionState> = {
  Estagiario: set(['users.view', 'diretorias.view', 'tasks.view', 'tasks.edit', 'events.view', 'absences.view', 'absences.create']),
  Funcionario: set(['users.view', 'diretorias.view', 'projects.view', 'tasks.view', 'tasks.create', 'tasks.edit', 'events.view', 'events.create', 'absences.view', 'absences.create']),
  Tecnico: set(['users.view', 'diretorias.view', 'projects.view', 'projects.edit', 'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.archive', 'events.view', 'events.create', 'absences.view', 'absences.create']),
  Coordenador: set(['users.view', 'diretorias.view', 'projects.view', 'projects.create', 'projects.edit', 'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.archive', 'events.view', 'events.create', 'events.edit', 'absences.view', 'absences.create', 'dashboards.view']),
  Gerente: set(['users.view', 'users.create', 'users.edit_profile', 'users.delete', 'users.reset_password', 'users.manage_access', 'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.import', 'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.archive', 'tasks.import', 'events.view', 'events.create', 'events.edit', 'events.delete', 'absences.view', 'absences.create', 'absences.edit', 'absences.delete', 'absences.approve', 'absences.view_all', 'diretorias.view', 'dashboards.view', 'logs.view', 'settings.manage_directoria', 'feedback.manage']),
  Diretor: set(['users.view', 'users.create', 'users.edit_profile', 'users.delete', 'users.reset_password', 'users.manage_access', 'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.import', 'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.archive', 'tasks.import', 'events.view', 'events.create', 'events.edit', 'events.delete', 'absences.view', 'absences.create', 'absences.edit', 'absences.delete', 'absences.approve', 'absences.view_all', 'diretorias.view', 'dashboards.view', 'logs.view', 'settings.manage_directoria', 'feedback.manage']),
  Admin: set(allPermissionKeys),
};

export function normalizePermissions(input: unknown): PermissionState {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out: PermissionState = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (ALL_PERMISSION_KEYS.has(key)) out[key] = value === true;
  }
  return out;
}

export function defaultPermissionsForRole(role: string): PermissionState {
  return isValidRole(role) ? { ...ROLE_PERMISSION_PRESETS[role] } : {};
}

export function permissionsForRequester(
  requesterRole: string,
  requested: unknown,
  roleBaseline: unknown,
): PermissionState {
  const normalized = normalizePermissions(requested);
  if (requesterRole === 'Admin') return normalized;

  const baseline = normalizePermissions(roleBaseline);
  for (const key of ADMINISTRATION_PERMISSION_KEYS) {
    normalized[key] = baseline[key] === true;
  }
  return normalized;
}

export function roleLevel(role: string): number {
  return ROLE_HIERARCHY.indexOf(role as Role);
}

export function canManageTargetRole(
  requester: { role: string; directoriaId: string | null },
  target: { role: string; directoriaId: string | null },
): boolean {
  if (requester.role === 'Admin' && requester.directoriaId === null) return true;
  if (target.role === 'Admin') return false;
  if (requester.role === 'Admin') return requester.directoriaId === null || requester.directoriaId === target.directoriaId;
  if (requester.directoriaId !== target.directoriaId) return false;
  if (requester.role === 'Diretor') return roleLevel(target.role) <= roleLevel('Gerente');
  if (requester.role === 'Gerente') return roleLevel(target.role) <= roleLevel('Coordenador');
  return false;
}

export function canAssignAccessRole(
  requester: { role: string; directoriaId: string | null },
  targetRole: string,
): boolean {
  if (!isValidRole(targetRole)) return false;
  if (requester.role === 'Admin' && requester.directoriaId === null) return true;
  if (targetRole === 'Admin') return false;
  if (requester.role === 'Admin') return true;
  if (requester.role === 'Diretor') return roleLevel(targetRole) <= roleLevel('Gerente');
  if (requester.role === 'Gerente') return roleLevel(targetRole) <= roleLevel('Coordenador');
  return false;
}