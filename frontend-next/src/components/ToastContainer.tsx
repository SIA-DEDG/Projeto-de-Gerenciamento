'use client';

import { Check, X } from 'lucide-react';
import type { Toast } from '@/hooks/useToast';

interface Props {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}${toast.leaving ? ' toast-leaving' : ''}`}>
          {toast.type === 'success'
            ? <Check className="toast-icon" size={16} strokeWidth={2.5} />
            : <X className="toast-icon" size={16} strokeWidth={2.5} />
          }
          <div className="toast-body">
            <div className="toast-title">{toast.title}</div>
            {toast.message && <div className="toast-message">{toast.message}</div>}
          </div>
          <button className="toast-close" onClick={() => onDismiss(toast.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
