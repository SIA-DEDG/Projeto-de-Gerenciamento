'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Edit3, Lock, RefreshCw, Search, Trash2, X } from 'lucide-react';
import {
  adminResetUserPassword,
  deleteUser,
  fetchPermissionConfig,
  fetchDiretorias,
  fetchUsers,
  updateUserAccess,
  type Directoria,
  type PermissionConfig,
  type PermissionState,
  type UserPublic,
} from '@/lib/api';
import { getUser, hasPermission, isSuperAdmin } from '@/lib/auth';
import ConfirmModal from '@/components/ConfirmModal';
import PageHeader from '@/components/PageHeader';
import PermissionMatrix from '@/components/PermissionMatrix';

const ROLE_LABELS: Record<string, string> = {
  Estagiario: 'Estagiario(a)',
  Funcionario: 'Funcionario(a)',
  Tecnico: 'Tecnico(a)',
  Coordenador: 'Coordenador(a)',
  Gerente: 'Gerente',
  Diretor: 'Diretor(a)',
  Admin: 'Administrador(a)',
};
const ROLE_HIERARCHY = ['Estagiario', 'Funcionario', 'Tecnico', 'Coordenador', 'Gerente', 'Diretor', 'Admin'];
const COLORS = ['var(--blue)', '#157F3C', '#A87A00', '#B42318', '#0E7490', '#7C3AED'];

function roleLevel(role: string) { return ROLE_HIERARCHY.indexOf(role); }
function initials(name: string) { return name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase(); }
function avatarColor(name: string) { let hash = 0; for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0; return COLORS[Math.abs(hash) % COLORS.length]; }
function canManage(viewer: ReturnType<typeof getUser>, target: UserPublic) {
  if (!viewer || viewer.user_id === target.id) return false;
  if (isSuperAdmin(viewer)) return true;
  if (target.role === 'Admin') return false;
  if (viewer.role === 'Admin') return viewer.directoria_id === target.directoria_id;
  if (viewer.directoria_id !== target.directoria_id) return false;
  if (viewer.role === 'Diretor') return roleLevel(target.role) <= roleLevel('Gerente');
  if (viewer.role === 'Gerente') return roleLevel(target.role) <= roleLevel('Coordenador');
  return false;
}
function availableRoles(viewer: ReturnType<typeof getUser>, config: PermissionConfig | null) {
  const roles = config?.roles ?? ROLE_HIERARCHY;
  if (isSuperAdmin(viewer)) return roles;
  if (viewer?.role === 'Admin') return roles.filter((role) => role !== 'Admin');
  if (viewer?.role === 'Diretor') return roles.filter((role) => roleLevel(role) <= roleLevel('Gerente'));
  if (viewer?.role === 'Gerente') return roles.filter((role) => roleLevel(role) <= roleLevel('Coordenador'));
  return [];
}

function ResetPasswordModal({ user, onClose, onSuccess }: { user: UserPublic; onClose: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('As senhas nao conferem.'); return; }
    setSaving(true);
    try { await adminResetUserPassword(user.id, password); onSuccess(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erro ao redefinir senha.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[450]">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-[rgba(7,22,45,.32)]" />
      <form onSubmit={submit} className="absolute right-0 top-0 flex h-full w-[440px] max-w-[94vw] flex-col border-l border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-5"><div><div className="font-mono text-[11px] font-semibold uppercase tracking-[1px] text-primary">Redefinir senha</div><div className="mt-1 text-sm font-semibold text-text">{user.name}</div></div><button type="button" onClick={onClose} className="rounded border border-border p-2 text-text-3"><X size={15} /></button></div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {error && <div className="rounded border border-red/20 bg-red/10 px-4 py-3 text-sm text-red">{error}</div>}
          <label className="block text-sm font-medium text-text">Nova senha<input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary" /></label>
          <label className="block text-sm font-medium text-text">Confirmar senha<input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-2 w-full rounded border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary" /></label>
          <div className="rounded border border-gold/30 bg-[rgba(224,169,46,.08)] px-4 py-3 text-xs leading-5 text-gold">O usuario sera deslogado e precisara trocar a senha no proximo login.</div>
        </div>
        <div className="flex gap-3 border-t border-line px-6 py-4"><button type="submit" disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving && <RefreshCw size={14} className="animate-spin" />}Salvar senha</button><button type="button" onClick={onClose} className="rounded border border-border px-4 py-2.5 text-sm font-semibold text-text">Cancelar</button></div>
      </form>
    </div>
  );
}

function AccessDrawer({ user, config, roles, diretorias, canEditDirectoria, canEditAdministration, onClose, onSaved }: { user: UserPublic; config: PermissionConfig; roles: string[]; diretorias: Directoria[]; canEditDirectoria: boolean; canEditAdministration: boolean; onClose: () => void; onSaved: (user: UserPublic) => void }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? '');
  const [jobTitle, setJobTitle] = useState(user.job_title ?? '');
  const [role, setRole] = useState(user.role);
  const [directoriaId, setDirectoriaId] = useState(user.directoria_id ?? '');
  const [permissions, setPermissions] = useState<PermissionState>(user.permissions ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function changeRole(nextRole: string) {
    setRole(nextRole);
    setPermissions(config.presets[nextRole] ?? {});
  }

  async function save() {
    setError('');
    if (canEditDirectoria && role !== 'Admin' && !directoriaId) {
      setError('Selecione uma diretoria para esse perfil.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateUserAccess(user.id, {
        name: name.trim(),
        email: email.trim() || null,
        job_title: jobTitle.trim() || null,
        directoria_id: canEditDirectoria ? (directoriaId || null) : undefined,
        role,
        permissions,
      });
      onSaved(updated);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erro ao salvar acesso.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[430]">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-[rgba(7,22,45,.32)]" />
      <aside className="absolute right-0 top-0 flex h-full w-[760px] max-w-[96vw] flex-col border-l border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-5"><div><div className="font-mono text-[11px] font-semibold uppercase tracking-[1px] text-primary">Editar acesso</div><div className="mt-1 text-base font-semibold text-text">{user.name}</div><div className="font-mono text-xs text-text-3">@{user.username}</div></div><button type="button" onClick={onClose} className="rounded border border-border p-2 text-text-3"><X size={15} /></button></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {error && <div className="mb-5 rounded border border-red/20 bg-red/10 px-4 py-3 text-sm text-red">{error}</div>}
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-sm font-medium text-text">Nome<input value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary" /></label>
            <label className="block text-sm font-medium text-text">Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary" /></label>
            <label className="block text-sm font-medium text-text">Cargo<input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="mt-2 w-full rounded border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="Coordenador de Dados" /></label>
          </div>
          <div className="mt-6">
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[1px] text-primary">Perfil de acesso</div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {roles.map((item) => <button key={item} type="button" onClick={() => changeRole(item)} className={`rounded border p-3 text-left text-sm font-semibold ${role === item ? 'border-primary bg-[color-mix(in_srgb,var(--blue)_7%,var(--surface))] text-primary' : 'border-border bg-surface text-text hover:bg-surface-2'}`}>{ROLE_LABELS[item] ?? item}</button>)}
            </div>
          </div>
          {canEditDirectoria && (
            <div className="mt-6">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[1px] text-primary">Diretoria</div>
              <p className="mt-2 text-xs text-text-3">Obrigatória para todos os perfis, exceto Admin global.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {role === 'Admin' && <button type="button" onClick={() => setDirectoriaId('')} className={`rounded border p-3 text-left text-sm font-semibold ${!directoriaId ? 'border-primary bg-surface-2 text-primary' : 'border-border bg-surface text-text'}`}>Sistema global</button>}
                {diretorias.map((item) => <button key={item.id} type="button" onClick={() => setDirectoriaId(item.id)} className={`rounded border p-3 text-left text-sm font-semibold ${directoriaId === item.id ? 'border-primary bg-surface-2 text-primary' : 'border-border bg-surface text-text'}`}>{item.name}</button>)}
              </div>
            </div>
          )}
          <div className="mt-6"><PermissionMatrix catalog={config.catalog} value={permissions} onChange={setPermissions} lockedModules={canEditAdministration ? [] : ['admin']} title="Permissões do usuário" compact /></div>
        </div>
        <div className="flex gap-3 border-t border-line px-6 py-4"><button type="button" onClick={save} disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}Salvar e deslogar usuario</button><button type="button" onClick={onClose} className="rounded border border-border px-4 py-2.5 text-sm font-semibold text-text">Cancelar</button></div>
      </aside>
    </div>
  );
}

export default function UsuariosPage() {
  const viewer = getUser();
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [config, setConfig] = useState<PermissionConfig | null>(null);
  const [diretorias, setDiretorias] = useState<Directoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<UserPublic | null>(null);
  const [resetting, setResetting] = useState<UserPublic | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserPublic | null>(null);

  useEffect(() => {
    Promise.all([
      fetchUsers(),
      fetchPermissionConfig(),
      isSuperAdmin(viewer) ? fetchDiretorias() : Promise.resolve([] as Directoria[]),
    ])
      .then(([userList, permissionConfig, directoriaList]) => {
        setUsers(userList);
        setConfig(permissionConfig);
        setDiretorias(directoriaList.filter((item) => item.active));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erro ao carregar usuarios'))
      .finally(() => setLoading(false));
  }, []);

  const roles = useMemo(() => availableRoles(viewer, config), [viewer, config]);
  const filtered = users.filter(user => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [user.name, user.username, user.email ?? '', user.job_title ?? '', user.directoria_name ?? ''].some((value) => value.toLowerCase().includes(q));
  });

  async function remove(user: UserPublic) {
    try { await deleteUser(user.id); setUsers(prev => prev.filter(item => item.id !== user.id)); setSuccess('Usuario removido.'); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erro ao excluir usuario.'); }
  }

  return (
    <>
      <PageHeader eyebrow="Controle de acesso" title="Gerenciar usuarios" right={<div className="flex items-center gap-2 rounded border border-border bg-surface px-3 py-2"><Search size={14} className="text-text-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuario..." className="w-52 bg-transparent text-sm text-text outline-none" /></div>} />
      {(success || error) && <div className="px-8 pt-4">{success && <div className="rounded border border-green/30 bg-green/10 px-4 py-3 text-sm text-green">{success}</div>}{error && <div className="rounded border border-red/20 bg-red/10 px-4 py-3 text-sm text-red">{error}</div>}</div>}
      <div className="mt-6 min-h-0 flex-1 overflow-y-auto border-t border-line">
        {loading ? <div className="px-8 py-10 text-sm text-text-3">Carregando usuarios...</div> : filtered.length === 0 ? <div className="px-8 py-10 text-sm text-text-3">Nenhum usuario encontrado.</div> : <div className="divide-y divide-line">
          {filtered.map(user => {
            const manageable = canManage(viewer, user);
            const canEdit = manageable && hasPermission(viewer, 'users.manage_access');
            const canReset = manageable && hasPermission(viewer, 'users.reset_password');
            const canDelete = manageable && hasPermission(viewer, 'users.delete');
            return <div key={user.id} className="grid gap-4 px-8 py-4 hover:bg-surface-2 md:grid-cols-[1.4fr_1fr_150px_120px] md:items-center">
              <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold text-white" style={{ background: avatarColor(user.name) }}>{initials(user.name)}</div><div className="min-w-0"><div className="truncate text-sm font-semibold text-text">{user.name} {viewer?.user_id === user.id && <span className="ml-2 rounded bg-[color-mix(in_srgb,var(--blue)_9%,var(--surface))] px-2 py-0.5 font-mono text-[10px] uppercase text-primary">Voce</span>}</div><div className="truncate font-mono text-xs text-text-3">@{user.username}{user.email ? ` · ${user.email}` : ''}</div></div></div>
              <div className="min-w-0"><div className="truncate text-sm text-text">{user.job_title || 'Cargo nao informado'}</div><div className="truncate text-xs text-text-3">{user.directoria_name ?? 'Sem diretoria'}</div></div>
              <div className="text-xs font-semibold text-primary">{ROLE_LABELS[user.role] ?? user.role}</div>
              <div className="flex justify-end gap-2">{canEdit && <button type="button" title="Editar acesso" onClick={() => setEditing(user)} className="rounded border border-border p-2 text-text-3 hover:border-primary hover:text-primary"><Edit3 size={14} /></button>}{canReset && <button type="button" title="Redefinir senha" onClick={() => setResetting(user)} className="rounded border border-border p-2 text-text-3 hover:border-primary hover:text-primary"><Lock size={14} /></button>}{canDelete && <button type="button" title="Excluir" onClick={() => setConfirmDelete(user)} className="rounded border border-border p-2 text-text-3 hover:border-red hover:text-red"><Trash2 size={14} /></button>}</div>
            </div>;
          })}
        </div>}
      </div>
      {editing && config && <AccessDrawer user={editing} config={config} roles={roles} diretorias={diretorias} canEditDirectoria={isSuperAdmin(viewer)} canEditAdministration={viewer?.role === 'Admin'} onClose={() => setEditing(null)} onSaved={(updated) => { setUsers(prev => prev.map(user => user.id === updated.id ? updated : user)); setEditing(null); setSuccess('Acesso atualizado. O usuario sera deslogado na proxima requisicao.'); }} />}
      {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} onSuccess={() => { setResetting(null); setSuccess('Senha redefinida. O usuario sera deslogado e devera trocar a senha.'); }} />}
      <ConfirmModal open={!!confirmDelete} title="Excluir usuario" message={`Excluir permanentemente "${confirmDelete?.name}"?`} confirmLabel="Excluir" danger onConfirm={() => { if (confirmDelete) remove(confirmDelete); setConfirmDelete(null); }} onClose={() => setConfirmDelete(null)} />
    </>
  );
}