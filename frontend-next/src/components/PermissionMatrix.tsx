'use client';

import { Check, Lock, ShieldCheck } from 'lucide-react';
import type { PermissionModule, PermissionState } from '@/lib/api';

interface PermissionMatrixProps {
  catalog: PermissionModule[];
  value: PermissionState;
  onChange?: (next: PermissionState) => void;
  readOnly?: boolean;
  title?: string;
  compact?: boolean;
  lockedModules?: string[];
}

export default function PermissionMatrix({
  catalog,
  value,
  onChange,
  readOnly = false,
  title,
  compact = false,
  lockedModules = [],
}: PermissionMatrixProps) {
  const locked = new Set(lockedModules);

  function toggle(key: string, moduleKey: string) {
    if (readOnly || locked.has(moduleKey) || !onChange) return;
    onChange({ ...value, [key]: !value[key] });
  }

  function setModule(module: PermissionModule, enabled: boolean) {
    if (readOnly || locked.has(module.key) || !onChange) return;
    const next = { ...value };
    module.permissions.forEach((permission) => { next[permission.key] = enabled; });
    onChange(next);
  }

  function setAll(enabled: boolean) {
    if (readOnly || !onChange) return;
    const next = { ...value };
    catalog
      .filter((module) => !locked.has(module.key))
      .forEach((module) => {
        module.permissions.forEach((permission) => { next[permission.key] = enabled; });
      });
    onChange(next);
  }

  const total = catalog.reduce((sum, module) => sum + module.permissions.length, 0);
  const active = catalog.reduce((sum, module) => sum + module.permissions.filter((permission) => value[permission.key]).length, 0);

  return (
    <div className="space-y-4">
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[1px] text-primary">{title}</div>
            <div className="mt-1 text-xs text-text-3">{active} de {total} permissões ativas</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!readOnly && onChange && (
              <>
                <button type="button" onClick={() => setAll(true)} className="rounded border border-primary px-3 py-2 text-xs font-semibold text-primary transition hover:bg-surface-2">
                  Selecionar tudo
                </button>
                <button type="button" onClick={() => setAll(false)} className="rounded border border-border px-3 py-2 text-xs font-semibold text-text-2 transition hover:bg-surface-2">
                  Remover tudo
                </button>
              </>
            )}
            <div className="inline-flex h-9 items-center gap-2 rounded border border-border bg-surface px-3 text-xs font-semibold text-text-2">
              <ShieldCheck size={14} /> {Math.round((active / Math.max(total, 1)) * 100)}%
            </div>
          </div>
        </div>
      )}

      <div className={compact ? 'grid gap-3' : 'grid gap-4 lg:grid-cols-2'}>
        {catalog.map((module) => {
          const enabled = module.permissions.filter((permission) => value[permission.key]).length;
          const moduleLocked = readOnly || locked.has(module.key);

          return (
            <section key={module.key} className="overflow-hidden rounded border border-border bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-text">{module.label}</div>
                  <div className="mt-0.5 font-mono text-[11px] font-semibold text-text-3">{enabled}/{module.permissions.length}</div>
                </div>
                {locked.has(module.key) ? (
                  <span className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-text-3">
                    <Lock size={12} /> Apenas Admin
                  </span>
                ) : !readOnly && onChange ? (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setModule(module, true)} className="rounded border border-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-surface">
                      Selecionar tudo
                    </button>
                    <button type="button" onClick={() => setModule(module, false)} className="rounded border border-border px-2.5 py-1.5 text-[11px] font-semibold text-text-2 transition hover:bg-surface">
                      Remover tudo
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="divide-y divide-line">
                {module.permissions.map((permission) => {
                  const checked = value[permission.key] === true;
                  return (
                    <button
                      key={permission.key}
                      type="button"
                      onClick={() => toggle(permission.key, module.key)}
                      disabled={moduleLocked}
                      className={`grid w-full grid-cols-[32px_1fr] gap-3 px-4 py-3 text-left transition ${moduleLocked ? 'cursor-default' : 'hover:bg-surface-2'} ${checked ? 'bg-surface-2' : 'bg-surface'}`}
                    >
                      <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded border ${checked ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-transparent'}`}>
                        {moduleLocked && !checked ? <Lock size={12} className="text-text-3" /> : <Check size={13} strokeWidth={2.6} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-text">{permission.label}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-text-3">{permission.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}