'use client';

import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '@/lib/localStorage';
import type { Settings } from '@/types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [s, setS] = useState<Settings>({
    notificationProfile: 'completo',
    alertChannel: 'email',
    refreshInterval: '15',
    emailEnabled: true,
  });

  useEffect(() => {
    if (open) setS(getSettings());
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveSettings(s);
    onClose();
    alert('Configurações salvas com sucesso.');
  }

  return (
    <div
      className="settings-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="settings-modal-card">
        <div className="settings-modal-head">
          <h3>Configurações do Sistema</h3>
          <button type="button" className="settings-close-btn" onClick={onClose}>&times;</button>
        </div>
        <p className="settings-modal-subtitle">Defina padrões operacionais do ambiente e preferências da equipe.</p>

        <form className="settings-form-grid" onSubmit={handleSubmit}>
          <label className="settings-label">
            Perfil de Notificação
            <select value={s.notificationProfile} onChange={(e) => setS({ ...s, notificationProfile: e.target.value })}>
              <option value="completo">Completo</option>
              <option value="somente_critico">Somente crítico</option>
              <option value="silencioso">Silencioso</option>
            </select>
          </label>
          <label className="settings-label">
            Canal de Alertas
            <select value={s.alertChannel} onChange={(e) => setS({ ...s, alertChannel: e.target.value })}>
              <option value="email">Email</option>
              <option value="in_app">No sistema</option>
              <option value="email_e_sistema">Email + sistema</option>
            </select>
          </label>
          <label className="settings-label">
            Atualização Automática
            <select value={s.refreshInterval} onChange={(e) => setS({ ...s, refreshInterval: e.target.value })}>
              <option value="5">A cada 5 minutos</option>
              <option value="15">A cada 15 minutos</option>
              <option value="30">A cada 30 minutos</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={s.emailEnabled}
              onChange={(e) => setS({ ...s, emailEnabled: e.target.checked })}
            />
            <span>Habilitar notificações por email</span>
          </label>
          <div className="settings-form-actions">
            <button type="submit" className="btn-primary">Salvar Alterações</button>
          </div>
        </form>
      </div>
    </div>
  );
}
