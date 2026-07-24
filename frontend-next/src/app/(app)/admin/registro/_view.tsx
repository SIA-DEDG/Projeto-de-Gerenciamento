'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, FileDown, Lock, RefreshCw, Trash2, UserPlus } from 'lucide-react';
import { deleteUser, fetchAllUsers, fetchDiretorias, fetchPermissionConfig, registerUser, type Directoria, type PermissionConfig, type PermissionState } from '@/lib/api';
import { getUser, isSuperAdmin } from '@/lib/auth';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
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

const ROLE_COPY: Record<string, string> = {
  Estagiario: 'Entrada operacional com poucas acoes liberadas.',
  Funcionario: 'Rotina padrao de atividades, eventos e faltas.',
  Tecnico: 'Execucao tecnica com mais autonomia operacional.',
  Coordenador: 'Coordena entregas e acompanha indicadores.',
  Gerente: 'Administra equipe, faltas e operacao da diretoria.',
  Diretor: 'Autoridade maxima da diretoria.',
  Admin: 'Controle administrativo do sistema.',
};

const ROLE_HIERARCHY = ['Estagiario', 'Funcionario', 'Tecnico', 'Coordenador', 'Gerente', 'Diretor', 'Admin'];

type Step = 1 | 2 | 3 | 4;

interface PasswordEntry {
  user_id: string;
  name: string;
  username: string;
  role: string;
  temp_password: string;
  created_at: string;
}

function roleLevel(role: string) { return ROLE_HIERARCHY.indexOf(role); }
function loadHistory(): PasswordEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('sia_password_history') ?? '[]'); } catch { return []; }
}
function saveHistory(entries: PasswordEntry[]) { localStorage.setItem('sia_password_history', JSON.stringify(entries)); }
function toUsername(name: string) {
  return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean).join('.');
}
function emptyPermissions(): PermissionState { return {}; }

export default function RegistroPage() {
  const { toasts, addToast, dismissToast } = useToast();
  const currentUser = getUser();
  const superAdmin = isSuperAdmin(currentUser);
  const [config, setConfig] = useState<PermissionConfig | null>(null);
  const [configError, setConfigError] = useState('');
  const [tab, setTab] = useState<'form' | 'senhas'>('form');
  const [step, setStep] = useState<Step>(1);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [role, setRole] = useState('');
  const [directorias, setDiretorias] = useState<Directoria[]>([]);
  const [directoriaId, setDirectoriaId] = useState('');
  const [permissions, setPermissions] = useState<PermissionState>(emptyPermissions);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<PasswordEntry[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [copiedComunicado, setCopiedComunicado] = useState(false);
  const [success, setSuccess] = useState<PasswordEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PasswordEntry | null>(null);

  const availableRoles = useMemo(() => {
    const roles = config?.roles ?? ROLE_HIERARCHY;
    if (isSuperAdmin(currentUser)) return roles;
    if (currentUser?.role === 'Admin') return roles.filter((r) => r !== 'Admin');
    if (currentUser?.role === 'Diretor') return roles.filter((r) => roleLevel(r) <= roleLevel('Gerente'));
    if (currentUser?.role === 'Gerente') return roles.filter((r) => roleLevel(r) <= roleLevel('Coordenador'));
    return [];
  }, [config?.roles, currentUser]);

  useEffect(() => {
    fetchPermissionConfig().then(setConfig).catch((err: unknown) => setConfigError(err instanceof Error ? err.message : 'Erro ao carregar permissões'));
    if (superAdmin) {
      fetchDiretorias()
        .then((items) => setDiretorias(items.filter((item) => item.active)))
        .catch((err: unknown) => setConfigError(err instanceof Error ? err.message : 'Erro ao carregar diretorias'));
    }
  }, [superAdmin]);

  useEffect(() => {
    if (!usernameTouched && fullName) setUsername(toUsername(fullName));
    if (!fullName) { setUsername(''); setUsernameTouched(false); }
  }, [fullName, usernameTouched]);

  useEffect(() => {
    const stored = loadHistory();
    if (stored.length === 0) { setHistory([]); return; }
    fetchAllUsers().then(users => {
      const pending = stored.filter(e => {
        const found = users.find(u => u.id === e.user_id);
        return !found || found.must_change_password === true;
      });
      if (pending.length !== stored.length) saveHistory(pending);
      setHistory(pending);
    }).catch(() => setHistory(stored));
  }, []);

  function selectRole(nextRole: string) {
    setRole(nextRole);
    setPermissions(config?.presets[nextRole] ?? emptyPermissions());
    setError('');
  }

  function validateStep(nextStep: Step) {
    setError('');
    if (nextStep > 1 && (!fullName.trim() || !username.trim())) { setError('Preencha nome e usuario.'); return false; }
    if (nextStep > 2 && !role) { setError('Escolha o perfil de acesso.'); return false; }
    if (nextStep > 2 && superAdmin && role !== 'Admin' && !directoriaId) { setError('Escolha a diretoria do colaborador.'); return false; }
    return true;
  }

  function go(nextStep: Step) {
    if (!validateStep(nextStep)) return;
    setStep(nextStep);
  }

  async function handleSubmit() {
    if (!validateStep(4) || !role) return;
    setLoading(true);
    setError('');
    try {
      const data = await registerUser({
        name: fullName.trim(),
        username: username.trim(),
        email: email.trim() || null,
        job_title: jobTitle.trim() || null,
        directoria_id: superAdmin ? (directoriaId || null) : undefined,
        role,
        permissions,
      });
      const entry: PasswordEntry = {
        user_id: data.user_id,
        name: data.name,
        username: data.username,
        role: data.role,
        temp_password: data.temp_password,
        created_at: new Date().toISOString(),
      };
      const updated = [entry, ...loadHistory()];
      saveHistory(updated);
      setHistory(updated);
      setSuccess(entry);
      setFullName(''); setUsername(''); setEmail(''); setJobTitle(''); setUsernameTouched(false); setRole(''); setDirectoriaId(''); setPermissions(emptyPermissions()); setStep(1);
      addToast('success', 'Usuario criado', `${entry.name} foi cadastrado.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuario.');
    } finally { setLoading(false); }
  }

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id); setTimeout(() => setCopied(null), 2000);
  }

  function comunicado(entries: PasswordEntry[]) {
    const credenciais = entries.map(e => `${e.name}\nUsuario: ${e.username}\nSenha provisoria: ${e.temp_password}`).join('\n\n');
    return `Segue as credenciais de acesso para a ferramenta de gestao:\n\n${credenciais}\n\nPrimeiro acesso: https://vyntra-livid.vercel.app\n\nApos o login, sera necessario trocar a senha provisoria.`;
  }

  async function handleCopiarComunicado() {
    await navigator.clipboard.writeText(comunicado(history));
    setCopiedComunicado(true);
    setTimeout(() => setCopiedComunicado(false), 2500);
  }

  async function removeEntry(entry: PasswordEntry) {
    try {
      await deleteUser(entry.user_id);
      const updated = history.filter(h => h.user_id !== entry.user_id);
      saveHistory(updated); setHistory(updated);
      if (success?.user_id === entry.user_id) setSuccess(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir usuario.');
    }
  }

  const activePermissions = Object.values(permissions).filter(Boolean).length;
  const steps = ['Dados', 'Perfil', 'Permissoes', 'Revisao'];
  const selectedDirectoria = directorias.find((item) => item.id === directoriaId);
  const directoriaLabel = superAdmin
    ? (directoriaId ? selectedDirectoria?.name ?? 'Diretoria selecionada' : role === 'Admin' ? 'Sistema global' : 'Não selecionada')
    : currentUser?.directoria_name ?? 'Sem diretoria';

  return (
    <>
      <PageHeader eyebrow="Controle de acesso" title="Cadastrar usuario" />

      <div className="flex items-center gap-5 px-8 pt-5">
        <button type="button" onClick={() => setTab('form')} className={`border-b-2 pb-1 text-sm ${tab === 'form' ? 'border-primary text-text font-semibold' : 'border-transparent text-text-3'}`}>Cadastrar</button>
        <button type="button" onClick={() => setTab('senhas')} className={`border-b-2 pb-1 text-sm ${tab === 'senhas' ? 'border-primary text-text font-semibold' : 'border-transparent text-text-3'}`}>Senhas pendentes {history.length > 0 && <span className="ml-2 rounded bg-[rgba(224,169,46,.14)] px-2 py-0.5 font-mono text-[11px] text-gold">{history.length}</span>}</button>
      </div>

      {tab === 'form' && (
        <div className="grid min-h-0 flex-1 grid-cols-1 border-t border-line mt-5 lg:grid-cols-[340px_1fr]">
          <aside className="border-b border-line bg-surface-2 px-8 py-7 lg:border-b-0 lg:border-r">
            <div className="space-y-3">
              {steps.map((label, index) => {
                const number = index + 1 as Step;
                const active = step === number;
                const done = step > number;
                return (
                  <button key={label} type="button" onClick={() => go(number)} className={`flex w-full items-center gap-3 rounded border px-4 py-3 text-left ${active ? 'border-primary bg-surface text-primary' : done ? 'border-green/30 bg-surface text-green' : 'border-border bg-surface text-text-3'}`}>
                    <span className={`flex h-7 w-7 items-center justify-center rounded font-mono text-xs font-semibold ${active ? 'bg-primary text-white' : done ? 'bg-green text-white' : 'bg-surface-2 text-text-3'}`}>{done ? <Check size={14} /> : number}</span>
                    <span className="text-sm font-semibold">{label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-8 rounded border border-border bg-surface p-4">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[1px] text-text-3">Resumo</div>
              <div className="mt-3 space-y-2 text-sm text-text-2">
                <div>{fullName || 'Nome ainda nao informado'}</div>
                <div className="font-mono text-xs">@{username || 'usuario'}</div>
                <div>{jobTitle || 'Cargo/função livre'}</div>
                <div>{role ? ROLE_LABELS[role] : 'Sem perfil de acesso'}</div>
                <div>{directoriaLabel}</div>
                <div>{activePermissions} permissoes ativas</div>
              </div>
            </div>
          </aside>

          <main className="min-h-0 overflow-y-auto px-8 py-7">
            {success && (
              <div className="mb-6 rounded border border-green/30 bg-green/10 p-4 text-green">
                <div className="flex items-center gap-2 text-sm font-semibold"><Check size={15} /> Colaborador criado</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <code className="rounded border border-green/20 bg-white px-3 py-2 font-mono text-sm font-bold tracking-wider text-green">{success.temp_password}</code>
                  <button type="button" onClick={() => handleCopy(success.temp_password, 'success')} className="rounded bg-green px-3 py-2 text-xs font-semibold text-white">{copied === 'success' ? 'Copiado' : 'Copiar senha'}</button>
                </div>
              </div>
            )}

            {(error || configError) && <div className="mb-5 rounded border border-red/20 bg-red/10 px-4 py-3 text-sm text-red">{error || configError}</div>}

            {step === 1 && (
              <section className="max-w-3xl">
                <div className="font-mono text-[11px] font-semibold uppercase tracking-[1px] text-primary">01 Dados do colaborador</div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-text">Nome completo<input autoFocus value={fullName} onChange={e => setFullName(e.target.value)} className="mt-2 w-full rounded border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="Joao Silva" /></label>
                  <label className="block text-sm font-medium text-text">Usuario<div className="mt-2 flex rounded border border-border bg-surface focus-within:border-primary"><span className="px-3 py-2.5 font-mono text-sm text-text-3">@</span><input value={username} onChange={e => { setUsername(e.target.value); setUsernameTouched(true); }} className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 text-sm outline-none" placeholder="joao.silva" /></div></label>
                  <label className="block text-sm font-medium text-text">Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="nome@empresa.gov.br" /></label>
                  <label className="block text-sm font-medium text-text">Cargo ou funcao<input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="mt-2 w-full rounded border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="Gerente de Governanca Digital" /></label>
                </div>
                <button type="button" onClick={() => go(2)} className="mt-6 rounded bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">Continuar</button>
              </section>
            )}

            {step === 2 && (
              <section>
                <div className="font-mono text-[11px] font-semibold uppercase tracking-[1px] text-primary">02 Perfil de acesso</div>
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {availableRoles.map((item) => {
                    const active = role === item;
                    return <button key={item} type="button" onClick={() => selectRole(item)} className={`rounded border p-4 text-left transition ${active ? 'border-primary bg-[color-mix(in_srgb,var(--blue)_7%,var(--surface))]' : 'border-border bg-surface hover:bg-surface-2'}`}><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-text">{ROLE_LABELS[item] ?? item}</span>{active && <Check size={16} className="text-primary" />}</div><p className="mt-2 text-xs leading-5 text-text-3">{ROLE_COPY[item]}</p></button>;
                  })}
                </div>

                {superAdmin && role && (
                  <div className="mt-7">
                    <div className="font-mono text-[11px] font-semibold uppercase tracking-[1px] text-primary">Vinculação organizacional</div>
                    <p className="mt-2 text-xs leading-5 text-text-3">A diretoria define o escopo da hierarquia e quais superiores poderão gerenciar este usuário.</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {role === 'Admin' && (
                        <button type="button" onClick={() => setDirectoriaId('')} className={`rounded border p-4 text-left ${!directoriaId ? 'border-primary bg-surface-2' : 'border-border bg-surface hover:bg-surface-2'}`}>
                          <div className="text-sm font-semibold text-text">Sistema global</div>
                          <div className="mt-1 text-xs text-text-3">Admin sem vínculo com diretoria.</div>
                        </button>
                      )}
                      {directorias.map((item) => (
                        <button key={item.id} type="button" onClick={() => setDirectoriaId(item.id)} className={`rounded border p-4 text-left ${directoriaId === item.id ? 'border-primary bg-surface-2' : 'border-border bg-surface hover:bg-surface-2'}`}>
                          <div className="flex items-center gap-2 text-sm font-semibold text-text"><span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color || 'var(--blue)' }} />{item.name}</div>
                          <div className="mt-1 text-xs text-text-3">{item.description || 'Diretoria ativa'}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex gap-3"><button type="button" onClick={() => go(1)} className="rounded border border-border px-5 py-2.5 text-sm font-semibold text-text">Voltar</button><button type="button" onClick={() => go(3)} className="rounded bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">Configurar permissões</button></div>
              </section>
            )}

            {step === 3 && config && (
              <section>
                <PermissionMatrix catalog={config.catalog} value={permissions} onChange={setPermissions} lockedModules={currentUser?.role === 'Admin' ? [] : ['admin']} title="03 Permissões individuais" />
                <div className="mt-6 flex gap-3"><button type="button" onClick={() => go(2)} className="rounded border border-border px-5 py-2.5 text-sm font-semibold text-text">Voltar</button><button type="button" onClick={() => go(4)} className="rounded bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">Revisar acesso</button></div>
              </section>
            )}

            {step === 4 && (
              <section className="max-w-3xl">
                <div className="font-mono text-[11px] font-semibold uppercase tracking-[1px] text-primary">04 Revisao</div>
                <div className="mt-5 overflow-hidden rounded border border-border bg-surface">
                  {[['Nome', fullName], ['Usuario', `@${username}`], ['Email', email || 'Nao informado'], ['Cargo', jobTitle || 'Nao informado'], ['Diretoria', directoriaLabel], ['Perfil de acesso', ROLE_LABELS[role] ?? role], ['Permissoes ativas', String(activePermissions)]].map(([label, value]) => <div key={label} className="grid grid-cols-[180px_1fr] border-b border-line px-4 py-3 last:border-b-0"><span className="font-mono text-[11px] uppercase tracking-[1px] text-text-3">{label}</span><span className="text-sm font-medium text-text">{value}</span></div>)}
                </div>
                <div className="mt-6 flex gap-3"><button type="button" onClick={() => go(3)} className="rounded border border-border px-5 py-2.5 text-sm font-semibold text-text">Voltar</button><button type="button" onClick={handleSubmit} disabled={loading} className="inline-flex items-center gap-2 rounded bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60">{loading ? <RefreshCw size={15} className="animate-spin" /> : <UserPlus size={15} />} Criar colaborador</button></div>
              </section>
            )}
          </main>
        </div>
      )}

      {tab === 'senhas' && (
        <div className="flex-1 overflow-y-auto px-8 py-7">
          <div className="overflow-hidden rounded border border-border bg-surface">
            <div className="flex items-center gap-3 border-b border-line bg-surface-2 px-5 py-4"><Lock size={16} className="text-gold" /><div className="flex-1 text-sm font-semibold text-text">Senhas temporarias aguardando entrega</div>{history.length > 0 && <button type="button" onClick={handleCopiarComunicado} className="inline-flex items-center gap-2 rounded border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-2">{copiedComunicado ? <Check size={13} /> : <FileDown size={13} />}{copiedComunicado ? 'Copiado' : 'Copiar comunicado'}</button>}</div>
            {history.length === 0 ? <div className="px-5 py-10 text-center text-sm text-text-3">Nenhuma senha temporaria pendente.</div> : <div className="divide-y divide-line">{history.map(entry => <div key={entry.user_id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_150px_220px_90px] md:items-center"><div><div className="text-sm font-semibold text-text">{entry.name}</div><div className="font-mono text-xs text-text-3">@{entry.username}</div></div><div className="text-xs font-semibold text-primary">{ROLE_LABELS[entry.role] ?? entry.role}</div><div className="flex items-center gap-2"><code className="min-w-0 flex-1 rounded border border-gold/30 bg-[rgba(224,169,46,.08)] px-3 py-1.5 font-mono text-xs font-bold text-gold">{entry.temp_password}</code><button type="button" onClick={() => handleCopy(entry.temp_password, entry.user_id)} className="rounded border border-border p-2 text-text-3">{copied === entry.user_id ? <Check size={13} /> : <Copy size={13} />}</button></div><button type="button" onClick={() => setConfirmDelete(entry)} className="inline-flex items-center justify-center gap-1 rounded border border-border px-3 py-2 text-xs font-semibold text-text-2"><Trash2 size={12} />Remover</button></div>)}</div>}
          </div>
        </div>
      )}

      <ConfirmModal open={!!confirmDelete} title={`Excluir conta de "${confirmDelete?.name}"`} message={`O usuario @${confirmDelete?.username} sera removido permanentemente.`} confirmLabel="Excluir conta" danger onConfirm={() => { if (confirmDelete) removeEntry(confirmDelete); setConfirmDelete(null); }} onClose={() => setConfirmDelete(null)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}