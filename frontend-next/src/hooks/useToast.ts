import { useState } from 'react';

export interface Toast {
  id: number;
  type: 'success' | 'error';
  title: string;
  message: string;
  leaving: boolean;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function addToast(type: 'success' | 'error', title: string, message: string) {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message, leaving: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 220);
    }, 3800);
  }

  function dismissToast(id: number) {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 220);
  }

  return { toasts, addToast, dismissToast };
}
