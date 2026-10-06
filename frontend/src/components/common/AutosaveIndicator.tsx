import React from 'react';
import type { AutosaveStatus } from '../../hooks/useAutosave';

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  error: Error | null;
  onRetry: () => void;
  className?: string;
}

const timeFormatter = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });

/** Estado del autoguardado. Solo presentación: no contiene lógica de guardado. */
export const AutosaveIndicator: React.FC<AutosaveIndicatorProps> = ({
  status,
  lastSavedAt,
  error,
  onRetry,
  className = '',
}) => {
  let icon = 'cloud_done';
  let tone = 'text-on-surface-variant';
  let label = 'Los cambios se guardan automáticamente';

  if (status === 'dirty') {
    icon = 'edit_note';
    label = 'Cambios sin guardar…';
  } else if (status === 'saving') {
    icon = 'sync';
    tone = 'text-primary';
    label = 'Guardando…';
  } else if (status === 'saved') {
    icon = 'cloud_done';
    tone = 'text-primary';
    label = lastSavedAt ? `Guardado automáticamente a las ${timeFormatter.format(lastSavedAt)}` : 'Guardado';
  } else if (status === 'error') {
    icon = 'cloud_off';
    tone = 'text-error';
    label = 'No se pudo guardar';
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 text-xs font-semibold ${tone} ${className}`}
    >
      <span className={`material-symbols-outlined text-base ${status === 'saving' ? 'animate-spin' : ''}`}>
        {icon}
      </span>
      <span title={status === 'error' ? error?.message : undefined}>{label}</span>
      {status === 'error' && (
        <button type="button" onClick={onRetry} className="underline underline-offset-2 font-bold">
          Reintentar
        </button>
      )}
    </div>
  );
};
