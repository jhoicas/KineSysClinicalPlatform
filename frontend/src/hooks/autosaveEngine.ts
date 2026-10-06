/**
 * KineSys — Motor de autoguardado parcial (sin dependencias de React).
 *
 * Mantiene un "scope" por contexto de edición (p. ej. un paciente). Cada scope
 * conoce el último snapshot persistido y calcula, campo por campo, qué cambió.
 * Los guardados se serializan (nunca hay dos en vuelo para el mismo scope), de
 * modo que el primer guardado puede crear el registro y los siguientes lo
 * actualizan sin duplicarlo.
 *
 * Al cambiar de scope (`reset`/`release`) el scope anterior termina de enviar
 * sus cambios pendientes con el `onSave` que tenía, sin mezclar datos con el
 * nuevo contexto.
 */

export type AutosaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface AutosaveState {
  status: AutosaveStatus;
  error: Error | null;
  lastSavedAt: Date | null;
}

export type AutosaveSaveFn<T extends object> = (changes: Partial<T>, snapshot: T) => Promise<void>;

export interface AutosaveTimers {
  set: (callback: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
}

export interface AutosaveEngineOptions<T extends object> {
  debounceMs: number;
  onStateChange: (state: AutosaveState) => void;
  onSave?: AutosaveSaveFn<T>;
  /** Esperas (ms) entre reintentos automáticos tras un error de red. */
  retryDelaysMs?: readonly number[];
  timers?: AutosaveTimers;
}

const DEFAULT_RETRY_DELAYS_MS: readonly number[] = [2000, 5000, 10000];

const defaultTimers: AutosaveTimers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

interface Scope<T extends object> {
  persisted: T;
  latest: T;
  onSave: AutosaveSaveFn<T> | undefined;
  /** true = el scope usa un onSave propio que no se reemplaza al re-renderizar. */
  ownsOnSave: boolean;
  debounceTimer: unknown;
  retryTimer: unknown;
  retryCount: number;
  running: boolean;
  promise: Promise<void>;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord);
  if (aKeys.length !== Object.keys(bRecord).length) return false;
  return aKeys.every((key) => key in bRecord && deepEqual(aRecord[key], bRecord[key]));
}

/** Claves de primer nivel cuyo valor difiere entre `persisted` y `latest`. */
export function changedKeys<T extends object>(persisted: T, latest: T): (keyof T)[] {
  return (Object.keys(latest) as (keyof T)[]).filter((key) => !deepEqual(persisted[key], latest[key]));
}

function pick<T extends object>(source: T, keys: (keyof T)[]): Partial<T> {
  const picked: Partial<T> = {};
  for (const key of keys) picked[key] = source[key];
  return picked;
}

function toError(cause: unknown): Error {
  if (cause instanceof Error) return cause;
  if (typeof cause === 'object' && cause !== null && 'message' in cause) {
    return new Error(String((cause as { message: unknown }).message));
  }
  return new Error(String(cause));
}

export class AutosaveEngine<T extends object> {
  private readonly debounceMs: number;
  private readonly retryDelaysMs: readonly number[];
  private readonly timers: AutosaveTimers;
  private readonly onStateChange: (state: AutosaveState) => void;

  private onSave: AutosaveSaveFn<T> | undefined;
  private enabled = true;
  private scope: Scope<T> | null = null;
  private state: AutosaveState = { status: 'idle', error: null, lastSavedAt: null };

  constructor(options: AutosaveEngineOptions<T>) {
    this.debounceMs = options.debounceMs;
    this.retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
    this.timers = options.timers ?? defaultTimers;
    this.onStateChange = options.onStateChange;
    this.onSave = options.onSave;
  }

  getState(): AutosaveState {
    return this.state;
  }

  /** true mientras hay cambios sin persistir, un guardado en curso o un error sin resolver. */
  hasPending(): boolean {
    return this.scope !== null && this.state.status !== 'idle' && this.state.status !== 'saved';
  }

  setOnSave(onSave: AutosaveSaveFn<T>): void {
    this.onSave = onSave;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    const scope = this.scope;
    if (!scope) return;
    if (!enabled) {
      this.timers.clear(scope.debounceTimer);
      scope.debounceTimer = null;
      return;
    }
    this.update(scope.latest);
  }

  /**
   * Inicia un nuevo scope con `snapshot` como estado ya persistido. Los cambios
   * pendientes del scope anterior se siguen enviando por separado. Con `onSave`
   * el scope queda ligado a esa función (útil cuando el destino del guardado,
   * p. ej. el id del registro, es propio del scope); sin él usa el onSave global.
   */
  reset(snapshot: T, onSave?: AutosaveSaveFn<T>): void {
    void this.release();
    this.scope = {
      persisted: snapshot,
      latest: snapshot,
      onSave: onSave ?? this.onSave,
      ownsOnSave: onSave !== undefined,
      debounceTimer: null,
      retryTimer: null,
      retryCount: 0,
      running: false,
      promise: Promise.resolve(),
    };
    this.publish({ status: 'idle', error: null, lastSavedAt: null });
  }

  /**
   * Declara `snapshot` como ya persistido y descarta lo pendiente (debounce y
   * reintentos) sin enviarlo. Úsalo cuando otra operación guardó el estado
   * completo, p. ej. al finalizar una evaluación.
   */
  markSaved(snapshot: T): void {
    const scope = this.scope;
    if (!scope) return;
    this.timers.clear(scope.debounceTimer);
    scope.debounceTimer = null;
    this.timers.clear(scope.retryTimer);
    scope.retryTimer = null;
    scope.retryCount = 0;
    scope.persisted = snapshot;
    scope.latest = snapshot;
    this.publish({ status: 'idle', error: null, lastSavedAt: null });
  }

  /**
   * Cierra el scope actual enviando sus cambios pendientes. El motor queda
   * inerte hasta el próximo `reset`.
   */
  release(): Promise<void> {
    const scope = this.scope;
    if (!scope) return Promise.resolve();
    this.scope = null;
    this.timers.clear(scope.debounceTimer);
    scope.debounceTimer = null;
    this.timers.clear(scope.retryTimer);
    scope.retryTimer = null;
    if (!this.enabled) return Promise.resolve();
    return this.drain(scope);
  }

  /** Registra el valor actual del formulario y programa el guardado con debounce. */
  update(value: T): void {
    const scope = this.scope;
    if (!scope) return;
    scope.latest = value;
    if (!this.enabled) return;
    if (!scope.ownsOnSave) scope.onSave = this.onSave;

    this.timers.clear(scope.debounceTimer);
    scope.debounceTimer = null;

    if (changedKeys(scope.persisted, value).length === 0) {
      if (this.state.status === 'dirty') {
        this.publish({ status: this.state.lastSavedAt ? 'saved' : 'idle', error: null });
      }
      return;
    }

    if (this.state.status !== 'saving') this.publish({ status: 'dirty', error: null });
    scope.debounceTimer = this.timers.set(() => {
      scope.debounceTimer = null;
      void this.drain(scope);
    }, this.debounceMs);
  }

  /** Guarda de inmediato lo pendiente (p. ej. en onBlur). */
  flush(): Promise<void> {
    const scope = this.scope;
    if (!scope || !this.enabled) return Promise.resolve();
    this.timers.clear(scope.debounceTimer);
    scope.debounceTimer = null;
    this.timers.clear(scope.retryTimer);
    scope.retryTimer = null;
    if (!scope.ownsOnSave) scope.onSave = this.onSave;
    return this.drain(scope);
  }

  private publish(patch: Partial<AutosaveState>, scope?: Scope<T>): void {
    if (scope && scope !== this.scope) return;
    this.state = { ...this.state, ...patch };
    this.onStateChange(this.state);
  }

  private drain(scope: Scope<T>): Promise<void> {
    if (scope.running) return scope.promise;
    scope.running = true;
    scope.promise = this.run(scope);
    return scope.promise;
  }

  private async run(scope: Scope<T>): Promise<void> {
    try {
      for (;;) {
        const keys = changedKeys(scope.persisted, scope.latest);
        if (keys.length === 0) {
          this.publish({ status: this.state.lastSavedAt ? 'saved' : 'idle', error: null }, scope);
          return;
        }
        if (!scope.onSave) return;

        const snapshot = scope.latest;
        const changes = pick(snapshot, keys);
        this.publish({ status: 'saving', error: null }, scope);

        try {
          await scope.onSave(changes, snapshot);
        } catch (cause) {
          const error = toError(cause);
          this.publish({ status: 'error', error }, scope);
          if (scope !== this.scope) console.error('Autosave: falló el guardado de un contexto cerrado', error);
          this.scheduleRetry(scope);
          return;
        }

        scope.persisted = { ...scope.persisted, ...changes };
        scope.retryCount = 0;
        this.publish({ lastSavedAt: new Date() }, scope);

        if (changedKeys(scope.persisted, scope.latest).length === 0) {
          this.publish({ status: 'saved', error: null }, scope);
          return;
        }
      }
    } finally {
      scope.running = false;
    }
  }

  private scheduleRetry(scope: Scope<T>): void {
    const delay = this.retryDelaysMs[scope.retryCount];
    if (delay === undefined) return;
    scope.retryCount += 1;
    this.timers.clear(scope.retryTimer);
    scope.retryTimer = this.timers.set(() => {
      scope.retryTimer = null;
      void this.drain(scope);
    }, delay);
  }
}
