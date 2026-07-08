import type { JwtPayload } from '../../middleware/auth.middleware';

export type Membership = { ownerId: string | null; responsibleIds: string[] };

// Admin, Diretor e Gerente têm poder total sobre qualquer projeto (editar, excluir,
// trocar responsável e gerenciar colaboradores) — fallback por cargo, inclusive para
// projetos sem dono. NÃO os torna membros/colaboradores: só contam como colaborador
// ou responsável quem for explicitamente adicionado (ver isProjectMember).
const isPriv = (role: string) => role === 'Admin' || role === 'Diretor' || role === 'Gerente';

export const isProjectOwner = (m: Membership, u: JwtPayload): boolean =>
  !!m.ownerId && m.ownerId === u.sub;

export const isProjectMember = (m: Membership, u: JwtPayload): boolean =>
  isProjectOwner(m, u) || m.responsibleIds.includes(u.sub);

// Criar atividades / anexar arquivos e links — SOMENTE quem faz parte (inclusive Estagiário).
// Cargo privilegiado NÃO entra aqui: Diretor/Gerente/Admin só "usam" o projeto se forem
// membros; o poder por cargo é reservado à alteração interna (editar/excluir/gerenciar).
export const canUseProject = (m: Membership, u: JwtPayload): boolean =>
  isProjectMember(m, u);

// Editar os dados do projeto — cargo privilegiado, o dono/responsável (inclusive
// Estagiário quando é o responsável do projeto) ou colaborador não-Estagiário.
// Aceita as duas grafias ('Estagiario' sem acento é a usada no banco; 'Estagiário' legado).
const isEstagiario = (role: string) => role === 'Estagiario' || role === 'Estagiário';
export const canEditProject = (m: Membership, u: JwtPayload): boolean =>
  isPriv(u.role) || isProjectOwner(m, u) || (isProjectMember(m, u) && !isEstagiario(u.role));

// Excluir o projeto e adicionar/remover responsáveis — dono ou cargo privilegiado.
export const canManageProject = (m: Membership, u: JwtPayload): boolean =>
  isProjectOwner(m, u) || isPriv(u.role);
