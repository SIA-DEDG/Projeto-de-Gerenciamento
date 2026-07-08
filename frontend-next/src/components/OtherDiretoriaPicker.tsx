'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { fetchDiretorias, fetchDirectoriaMembers, type Directoria, type UserPublic } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { mergeUsersById } from '@/lib/utils';

/**
 * "Envolver outra diretoria": por padrão os seletores mostram só a própria diretoria.
 * Ao marcar e escolher UMA OU MAIS diretorias, os membros de TODAS elas ficam
 * disponíveis (somados, sem duplicar) para seleção como responsável/co-responsável —
 * é assim que se compartilha um projeto/atividade entre diretorias.
 * Devolve a união dos membros das diretorias escolhidas via `onMembersChange`
 * (ou [] quando desligado / nenhuma escolhida).
 *
 * `initialSelectedIds`: diretorias externas JÁ envolvidas no item em edição — ao abrir,
 * o seletor inicia ligado e com elas marcadas, refletindo o estado salvo (senão parece
 * que a opção está desativada e que é preciso reativar/reescolher).
 */
export default function OtherDiretoriaPicker({ onMembersChange, initialSelectedIds = [] }: {
  onMembersChange: (users: UserPublic[]) => void;
  initialSelectedIds?: string[];
}) {
  const ownDiretoriaId = getUser()?.directoria_id ?? null;
  const [enabled, setEnabled] = useState(initialSelectedIds.length > 0);
  const [diretorias, setDiretorias] = useState<Directoria[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Cache diretoriaId -> membros, para não refazer o fetch ao remarcar a mesma diretoria.
  const membersCache = useRef<Map<string, UserPublic[]>>(new Map());

  // As diretorias externas requeridas pelo item (ex.: as do projeto da atividade) podem
  // chegar/mudar DEPOIS da montagem (o project_id é definido no efeito de abertura, ou o
  // usuário troca o projeto). Ao surgir uma nova, liga o seletor e a acrescenta — sem
  // apagar o que o usuário marcou manualmente.
  const initialKey = initialSelectedIds.join(',');
  useEffect(() => {
    if (initialSelectedIds.length === 0) return;
    setEnabled(true);
    setSelectedIds((prev) => {
      const merged = [...prev];
      let changed = false;
      for (const id of initialSelectedIds) if (!merged.includes(id)) { merged.push(id); changed = true; }
      return changed ? merged : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  // Carrega a lista de diretorias (menos a própria) só quando o usuário liga a opção.
  useEffect(() => {
    if (!enabled || diretorias.length > 0) return;
    fetchDiretorias()
      .then((ds) => setDiretorias(ds.filter((d) => d.id !== ownDiretoriaId)))
      .catch(() => { /* silencioso */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Fecha o dropdown ao clicar fora.
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Busca (com cache) os membros de todas as diretorias escolhidas, soma sem duplicar
  // e propaga. Vazio quando desligado ou sem seleção.
  useEffect(() => {
    if (!enabled || selectedIds.length === 0) { onMembersChange([]); return; }
    let cancelled = false;
    Promise.all(selectedIds.map(async (id) => {
      const cached = membersCache.current.get(id);
      if (cached) return cached;
      const members = await fetchDirectoriaMembers(id).catch(() => [] as UserPublic[]);
      membersCache.current.set(id, members);
      return members;
    })).then((lists) => {
      if (cancelled) return;
      const combined = lists.reduce<UserPublic[]>((acc, l) => mergeUsersById(acc, l), []);
      onMembersChange(combined);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, selectedIds]);

  function toggle(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const selectedDiretorias = diretorias.filter((d) => selectedIds.includes(d.id));

  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-2)', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => { setEnabled(e.target.checked); if (!e.target.checked) { setSelectedIds([]); setOpen(false); onMembersChange([]); } }}
          style={{ accentColor: 'var(--blue)', width: 14, height: 14, cursor: 'pointer' }}
        />
        Envolver outra diretoria
      </label>

      {enabled && (
        <div ref={ref} style={{ position: 'relative', marginTop: 8 }}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            style={{
              width: '100%', textAlign: 'left', padding: '8px 10px',
              border: '1px solid var(--border)', borderRadius: 3,
              background: 'var(--surface)', color: 'var(--text)', fontSize: '0.85rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              flexWrap: 'wrap', minHeight: 36, fontFamily: 'inherit',
            }}
          >
            {selectedDiretorias.length === 0 ? (
              <span style={{ color: 'var(--text-3)' }}>Selecione a(s) diretoria(s)</span>
            ) : (
              selectedDiretorias.map((d) => (
                <span key={d.id} style={{
                  background: '#e8f0fe', color: '#0052cc', borderRadius: 4,
                  padding: '2px 6px', fontSize: '0.78rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {d.name}
                  <span onClick={(e) => { e.stopPropagation(); toggle(d.id); }} style={{ cursor: 'pointer', lineHeight: 1 }}>×</span>
                </span>
              ))
            )}
            <ChevronDown size={12} style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--text-3)', transform: open ? 'rotate(180deg)' : undefined }} />
          </button>

          {open && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 3,
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)', maxHeight: 180, overflowY: 'auto', marginTop: 2,
            }}>
              {diretorias.length === 0 ? (
                <div style={{ padding: '10px 12px', color: 'var(--text-3)', fontSize: '0.85rem' }}>Nenhuma outra diretoria</div>
              ) : diretorias.map((d) => (
                <label key={d.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem',
                  background: selectedIds.includes(d.id) ? '#f0f4ff' : 'transparent',
                }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(d.id)}
                    onChange={() => toggle(d.id)}
                    style={{ accentColor: '#0052cc', width: 14, height: 14, cursor: 'pointer' }}
                  />
                  {d.name}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
