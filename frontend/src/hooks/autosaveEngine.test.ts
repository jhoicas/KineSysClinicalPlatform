/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AutosaveEngine,
  changedKeys,
  deepEqual,
  type AutosaveState,
  type AutosaveTimers,
} from './autosaveEngine.ts';

interface Form {
  nombre: string;
  notas: string;
  medidas: number[];
}

const BASE: Form = { nombre: 'Ana', notas: '', medidas: [1, 2] };

/** Reloj manual: los timers solo corren cuando el test llama a `advance`. */
function createClock() {
  let now = 0;
  let nextId = 1;
  const pending = new Map<number, { at: number; run: () => void }>();

  const timers: AutosaveTimers = {
    set: (run, ms) => {
      const id = nextId++;
      pending.set(id, { at: now + ms, run });
      return id;
    },
    clear: (handle) => {
      if (typeof handle === 'number') pending.delete(handle);
    },
  };

  const advance = async (ms: number) => {
    now += ms;
    for (;;) {
      const due = [...pending.entries()].filter(([, t]) => t.at <= now).sort((a, b) => a[1].at - b[1].at);
      if (due.length === 0) break;
      const [id, timer] = due[0];
      pending.delete(id);
      timer.run();
      await settle();
    }
  };

  return { timers, advance, pendingCount: () => pending.size };
}

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
}

function deferred(): Deferred {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup(onSave: (changes: Partial<Form>, snapshot: Form) => Promise<void>, retryDelaysMs: number[] = []) {
  const clock = createClock();
  const states: AutosaveState[] = [];
  const engine = new AutosaveEngine<Form>({
    debounceMs: 500,
    retryDelaysMs,
    timers: clock.timers,
    onSave,
    onStateChange: (state) => states.push(state),
  });
  return { engine, clock, states, last: () => states[states.length - 1] };
}

describe('deepEqual / changedKeys', () => {
  it('compara estructuras anidadas por valor', () => {
    assert.equal(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }), true);
    assert.equal(deepEqual({ a: [1, 2] }, { a: [1, 3] }), false);
    assert.equal(deepEqual(null, {}), false);
    assert.equal(deepEqual([], {}), false);
    assert.equal(deepEqual(NaN, NaN), true);
  });

  it('solo reporta las claves que cambiaron', () => {
    assert.deepEqual(changedKeys(BASE, { ...BASE, notas: 'x' }), ['notas']);
    assert.deepEqual(changedKeys(BASE, { ...BASE, medidas: [1, 2] }), []);
  });
});

describe('AutosaveEngine', () => {
  it('no guarda nada si el formulario no cambió', async () => {
    const calls: Partial<Form>[] = [];
    const { engine, clock } = setup(async (changes) => void calls.push(changes));
    engine.reset(BASE);
    engine.update({ ...BASE });
    await clock.advance(1000);
    assert.equal(calls.length, 0);
  });

  it('agrupa pulsaciones en un solo guardado tras 500 ms y envía solo el campo modificado', async () => {
    const calls: Partial<Form>[] = [];
    const { engine, clock, last } = setup(async (changes) => void calls.push(changes));
    engine.reset(BASE);

    engine.update({ ...BASE, notas: 'd' });
    await clock.advance(300);
    engine.update({ ...BASE, notas: 'do' });
    await clock.advance(300);
    engine.update({ ...BASE, notas: 'dol' });
    assert.equal(calls.length, 0, 'el debounce se reinicia con cada cambio');
    assert.equal(last().status, 'dirty');

    await clock.advance(500);
    assert.deepEqual(calls, [{ notas: 'dol' }]);
    assert.equal(last().status, 'saved');
    assert.ok(last().lastSavedAt instanceof Date);
  });

  it('flush guarda de inmediato (onBlur) y cancela el debounce pendiente', async () => {
    const calls: Partial<Form>[] = [];
    const { engine, clock } = setup(async (changes) => void calls.push(changes));
    engine.reset(BASE);

    engine.update({ ...BASE, nombre: 'Beatriz' });
    await engine.flush();
    assert.deepEqual(calls, [{ nombre: 'Beatriz' }]);
    assert.equal(clock.pendingCount(), 0);

    await clock.advance(1000);
    assert.equal(calls.length, 1, 'no se vuelve a guardar lo ya persistido');
  });

  it('serializa los guardados: nunca hay dos en vuelo y no pierde cambios intermedios', async () => {
    const gates: Deferred[] = [];
    const calls: Partial<Form>[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const { engine, clock, last } = setup(async (changes) => {
      calls.push(changes);
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      const gate = deferred();
      gates.push(gate);
      await gate.promise;
      inFlight -= 1;
    });
    engine.reset(BASE);

    engine.update({ ...BASE, notas: 'a' });
    await clock.advance(500);
    assert.equal(calls.length, 1);
    assert.equal(last().status, 'saving');

    engine.update({ ...BASE, notas: 'ab', nombre: 'Carla' });
    await clock.advance(500);
    assert.equal(calls.length, 1, 'el segundo guardado espera al primero');

    gates[0].resolve();
    await settle();
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1], { nombre: 'Carla', notas: 'ab' });
    gates[1].resolve();
    await settle();

    assert.equal(maxInFlight, 1);
    assert.equal(last().status, 'saved');
  });

  it('el primer guardado crea y los siguientes actualizan, sin duplicar el registro', async () => {
    let recordId: string | null = null;
    let creations = 0;
    const updates: Partial<Form>[] = [];
    const { engine, clock } = setup(async (changes) => {
      if (!recordId) {
        creations += 1;
        await settle();
        recordId = 'row-1';
        return;
      }
      updates.push(changes);
    });
    engine.reset(BASE);

    engine.update({ ...BASE, notas: 'uno' });
    await clock.advance(500);
    engine.update({ ...BASE, notas: 'dos' });
    await clock.advance(500);

    assert.equal(creations, 1);
    assert.deepEqual(updates, [{ notas: 'dos' }]);
  });

  it('un error conserva los cambios pendientes y se recupera con retry manual', async () => {
    let fail = true;
    const calls: Partial<Form>[] = [];
    const { engine, clock, last } = setup(async (changes) => {
      calls.push(changes);
      if (fail) throw new Error('network down');
    });
    engine.reset(BASE);

    engine.update({ ...BASE, notas: 'importante' });
    await clock.advance(500);
    assert.equal(last().status, 'error');
    assert.equal(last().error?.message, 'network down');
    assert.equal(engine.hasPending(), true);

    fail = false;
    await engine.flush();
    assert.deepEqual(calls[calls.length - 1], { notas: 'importante' });
    assert.equal(last().status, 'saved');
    assert.equal(last().error, null);
  });

  it('reintenta automáticamente con backoff tras un error', async () => {
    let attempts = 0;
    const { engine, clock, last } = setup(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('timeout');
    }, [2000, 5000]);
    engine.reset(BASE);

    engine.update({ ...BASE, notas: 'x' });
    await clock.advance(500);
    assert.equal(attempts, 1);
    await clock.advance(2000);
    assert.equal(attempts, 2);
    await clock.advance(5000);
    assert.equal(attempts, 3);
    assert.equal(last().status, 'saved');
  });

  it('al cambiar de contexto el scope anterior termina de guardar sin mezclar datos', async () => {
    const calls: { patient: string; changes: Partial<Form> }[] = [];
    const clock = createClock();
    const engine = new AutosaveEngine<Form>({
      debounceMs: 500,
      timers: clock.timers,
      onStateChange: () => undefined,
    });

    engine.setOnSave(async (changes) => void calls.push({ patient: 'A', changes }));
    engine.reset(BASE);
    engine.update({ ...BASE, notas: 'de A' });

    // Cambio de paciente: primero se libera A (flush) y luego se instala el onSave de B.
    const released = engine.release();
    engine.setOnSave(async (changes) => void calls.push({ patient: 'B', changes }));
    engine.reset({ ...BASE, nombre: 'Bruno' });
    await released;

    engine.update({ ...BASE, nombre: 'Bruno', notas: 'de B' });
    await clock.advance(500);

    assert.deepEqual(calls, [
      { patient: 'A', changes: { notas: 'de A' } },
      { patient: 'B', changes: { notas: 'de B' } },
    ]);
  });

  it('un guardado de un contexto cerrado no altera el estado del contexto nuevo', async () => {
    const gate = deferred();
    const { engine, clock, last } = setup(async () => gate.promise);
    engine.reset(BASE);
    engine.update({ ...BASE, notas: 'A' });
    await clock.advance(500);
    assert.equal(last().status, 'saving');

    engine.reset({ ...BASE, nombre: 'Otro' });
    assert.equal(last().status, 'idle');
    gate.resolve();
    await settle();
    assert.equal(last().status, 'idle', 'el estado del scope nuevo no cambia');
    assert.equal(last().lastSavedAt, null);
  });

  it('inhabilitado (solo lectura) no guarda ni programa timers', async () => {
    const calls: Partial<Form>[] = [];
    const { engine, clock } = setup(async (changes) => void calls.push(changes));
    engine.reset(BASE);
    engine.setEnabled(false);
    engine.update({ ...BASE, notas: 'x' });
    await clock.advance(1000);
    await engine.flush();
    assert.equal(calls.length, 0);
    assert.equal(clock.pendingCount(), 0);
  });

  it('sin reset previo ignora los cambios (p. ej. mientras carga el paciente)', async () => {
    const calls: Partial<Form>[] = [];
    const { engine, clock } = setup(async (changes) => void calls.push(changes));
    engine.update({ ...BASE, notas: 'x' });
    await clock.advance(1000);
    assert.equal(calls.length, 0);
  });

  it('markSaved descarta lo pendiente y los reintentos sin enviarlo', async () => {
    let attempts = 0;
    const { engine, clock, last } = setup(async () => {
      attempts += 1;
      throw new Error('offline');
    }, [2000]);
    engine.reset(BASE);

    engine.update({ ...BASE, notas: 'x' });
    await clock.advance(500);
    assert.equal(attempts, 1);
    assert.equal(last().status, 'error');

    engine.markSaved({ ...BASE, notas: 'x' });
    assert.equal(last().status, 'idle');
    await clock.advance(10000);
    assert.equal(attempts, 1, 'el reintento programado fue cancelado');
    assert.equal(clock.pendingCount(), 0);
  });

  it('un scope con onSave propio no usa el onSave global aunque cambie después', async () => {
    const calls: string[] = [];
    const { engine, clock } = setup(async () => void calls.push('global'));

    engine.reset(BASE, async () => void calls.push('del-scope'));
    engine.setOnSave(async () => void calls.push('global-nuevo'));
    engine.update({ ...BASE, notas: 'x' });
    await clock.advance(500);

    engine.update({ ...BASE, notas: 'xy' });
    await engine.flush();
    assert.deepEqual(calls, ['del-scope', 'del-scope']);
  });
});
