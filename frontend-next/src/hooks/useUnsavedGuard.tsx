'use client';

import { useState } from 'react';
import ConfirmModal from '@/components/ConfirmModal';

/**
 * Guarda de "alterações não salvas": mostra um popup de confirmação ao tentar fechar
 * um modal de criação/edição quando há dados preenchidos que seriam perdidos.
 *
 * Uso:
 *   const { requestClose, guard } = useUnsavedGuard(onClose);
 *   // troque os gatilhos de fechar (X, backdrop, Cancelar) por () => requestClose(dirty)
 *   // renderize {guard} junto ao modal
 *
 * O `dirty` é calculado pelo próprio modal (normalmente comparando o estado atual do
 * formulário com o estado inicial), pois cada modal tem uma forma diferente.
 */
export function useUnsavedGuard(onClose: () => void) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  function requestClose(dirty: boolean) {
    if (dirty) setConfirmOpen(true);
    else onClose();
  }

  const guard = (
    <ConfirmModal
      open={confirmOpen}
      title="Tem certeza que quer sair?"
      message="Você vai perder tudo que preencheu até agora."
      confirmLabel="Sair"
      cancelLabel="Continuar"
      danger
      zIndex={2000}
      onConfirm={onClose}
      onClose={() => setConfirmOpen(false)}
    />
  );

  return { requestClose, guard };
}
