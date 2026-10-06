import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AutosaveEngine,
  type AutosaveSaveFn,
  type AutosaveState,
} from './autosaveEngine';

export type { AutosaveState, AutosaveStatus } from './autosaveEngine';

export const AUTOSAVE_DEBOUNCE_MS = 500;

const INITIAL_STATE: AutosaveState = { status: 'idle', error: null, lastSavedAt: null };

export interface UseAutosaveOptions<T extends object> {
  /** Valor actual del formulario (debe ser un objeto nuevo en cada cambio). */
  value: T;
  /** Persiste solo `changes` (campos modificados); `snapshot` es el formulario completo. */
  onSave: AutosaveSaveFn<T>;
  /**
   * Identifica el contexto de edición (p. ej. el id del paciente). Al cambiar,
   * los cambios pendientes del contexto anterior se guardan antes de continuar
   * y el autoguardado queda inerte hasta llamar a `reset`.
   */
  scopeKey: string | null;
  /** false = solo lectura: no se guarda nada. */
  enabled?: boolean;
  debounceMs?: number;
}

export interface UseAutosaveResult<T extends object> extends AutosaveState {
  isDirty: boolean;
  /** Guarda de inmediato lo pendiente. Úsalo en onBlur. */
  flush: () => Promise<void>;
  /**
   * Declara `snapshot` como el estado ya persistido del contexto actual. Llamar
   * después de cargar los datos del servidor, con el mismo valor que se pone en
   * el formulario. Con `onSave` el contexto queda ligado a esa función de guardado.
   */
  reset: (snapshot: T, onSave?: AutosaveSaveFn<T>) => void;
  /** Marca `snapshot` como persistido y descarta lo pendiente sin enviarlo. */
  markSaved: (snapshot: T) => void;
}

/**
 * Autoguardado parcial de formularios: debounce de 500 ms, guardado inmediato
 * en blur/ocultar pestaña, guardados serializados y envío solo de los campos
 * modificados. La lógica vive en `AutosaveEngine`; este hook solo la enlaza
 * con el ciclo de vida de React.
 */
export function useAutosave<T extends object>({
  value,
  onSave,
  scopeKey,
  enabled = true,
  debounceMs = AUTOSAVE_DEBOUNCE_MS,
}: UseAutosaveOptions<T>): UseAutosaveResult<T> {
  const [state, setState] = useState<AutosaveState>(INITIAL_STATE);

  const engineRef = useRef<AutosaveEngine<T> | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new AutosaveEngine<T>({ debounceMs, onStateChange: setState, onSave });
  }
  const engine = engineRef.current;

  // Al cambiar de contexto (o desmontar) se envían los cambios pendientes con el
  // onSave del contexto anterior. Este efecto va antes que la sincronización de
  // onSave: React ejecuta todos los cleanups antes de los efectos nuevos.
  useEffect(() => {
    return () => {
      void engine.release();
    };
  }, [engine, scopeKey]);

  useEffect(() => {
    engine.setOnSave(onSave);
  });

  useEffect(() => {
    engine.setEnabled(enabled);
  }, [engine, enabled]);

  useEffect(() => {
    engine.update(value);
  }, [engine, value]);

  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') void engine.flush();
    };
    const flushNow = () => void engine.flush();
    const warnIfPending = (event: BeforeUnloadEvent) => {
      if (!engine.hasPending()) return;
      event.preventDefault();
      event.returnValue = '';
    };

    document.addEventListener('visibilitychange', flushWhenHidden);
    window.addEventListener('pagehide', flushNow);
    window.addEventListener('beforeunload', warnIfPending);
    return () => {
      document.removeEventListener('visibilitychange', flushWhenHidden);
      window.removeEventListener('pagehide', flushNow);
      window.removeEventListener('beforeunload', warnIfPending);
    };
  }, [engine]);

  const flush = useCallback(() => engine.flush(), [engine]);
  const reset = useCallback(
    (snapshot: T, scopedOnSave?: AutosaveSaveFn<T>) => engine.reset(snapshot, scopedOnSave),
    [engine],
  );
  const markSaved = useCallback((snapshot: T) => engine.markSaved(snapshot), [engine]);

  return {
    ...state,
    isDirty: state.status === 'dirty' || state.status === 'saving' || state.status === 'error',
    flush,
    reset,
    markSaved,
  };
}
