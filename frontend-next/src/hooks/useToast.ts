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

  function addToast(type: 'success' | 'error', title: string, message: string, duration = 3800) {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, title, message, leaving: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 220);
    }, duration);
  }

  function dismissToast(id: number) {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 220);
  }

  return { toasts, addToast, dismissToast };
}
