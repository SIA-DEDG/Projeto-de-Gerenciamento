'use client';

import { useEffect, useState } from 'react';
import { fetchDiretorias, fetchDirectoriaMembers, type Directoria, type UserPublic } from '@/lib/api';
import { getUser } from '@/lib/auth';

/**
 * "Envolver outra diretoria": por padrão os seletores mostram só a própria diretoria.
 * Ao marcar e escolher uma diretoria, seus membros ficam disponíveis para seleção como
 * responsável/colaborador — é assim que se compartilha um projeto/atividade entre diretorias.
 * Devolve os membros da diretoria escolhida via `onMembersChange` (ou [] quando desligado).
 */
export default function OtherDiretoriaPicker({ onMembersChange }: {
  onMembersChange: (users: UserPublic[]) => void;
}) {
  const ownDiretoriaId = getUser()?.directoria_id ?? null;
  const [enabled, setEnabled] = useState(false);
  const [diretorias, setDiretorias] = useState<Directoria[]>([]);
  const [selectedId, setSelectedId] = useState('');

  // Carrega a lista de diretorias (menos a própria) só quando o usuário liga a opção.
  useEffect(() => {
    if (!enabled || diretorias.length > 0) return;
    fetchDiretorias()
      .then((ds) => setDiretorias(ds.filter((d) => d.id !== ownDiretoriaId)))
      .catch(() => { /* silencioso */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Busca os membros da diretoria escolhida (ou limpa).
  useEffect(() => {
    if (!enabled || !selectedId) { onMembersChange([]); return; }
    let cancelled = false;
    fetchDirectoriaMembers(selectedId)
      .then((members) => { if (!cancelled) onMembersChange(members); })
      .catch(() => onMembersChange([]));
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, selectedId]);

  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-2)', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => { setEnabled(e.target.checked); if (!e.target.checked) { setSelectedId(''); onMembersChange([]); } }}
          style={{ accentColor: 'var(--blue)', width: 14, height: 14, cursor: 'pointer' }}
        />
        Envolver outra diretoria
      </label>
      {enabled && (
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ marginTop: 8, width: '100%', padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'inherit', cursor: 'pointer' }}
        >
          <option value="">— Selecione a diretoria —</option>
          {diretorias.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      )}
    </div>
  );
}
