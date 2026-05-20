import { useEffect } from 'react';

/**
 * Chama `refetch` sempre que o usuário voltar para esta aba/página.
 * Resolve o problema de dados stale após mutações feitas em outra rota.
 */
export function useRefetchOnFocus(refetch: () => void) {
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') refetch();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refetch]);
}
