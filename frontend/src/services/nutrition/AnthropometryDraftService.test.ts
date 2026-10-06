/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AnthropometryDraftForm } from '../../types/coreBodyNutrition.ts';
import {
  createAnthropometryDraftSaver,
  type AnthropometryDraftApi,
  type AnthropometryDraftRow,
} from './AnthropometryDraftService.ts';

const FORM = {
  skinfolds: { triceps: 10, subescapular: 0, biceps: 0, crestaIliaca: 0, supraespinal: 0, abdominal: 0, muslo: 0, pierna: 0 },
  perimeters: { brazoRelajado: 0, brazoContraido: 0, cintura: 0, cadera: 0, muslo: 0, pierna: 0 },
  diameters: { biacromial: 0, humero: 0, femur: 0 },
  equation: 'faulkner_4',
  somatotypeCategory: 'Mesomorfo',
  generalNotes: '',
} as AnthropometryDraftForm;

const PARAMS = { tenantId: 't1', patientId: 'p1', nutritionistId: 'n1' };

function fakeApi(overrides: Partial<AnthropometryDraftApi> = {}) {
  const log: string[] = [];
  const api: AnthropometryDraftApi = {
    getDraft: async () => {
      log.push('get');
      return null;
    },
    createDraft: async (_t, _p, _n, form) => {
      log.push(`create:${form.generalNotes}`);
      return { id: 'draft-1', data: form };
    },
    patchDraft: async (id, changes) => {
      log.push(`patch:${id}:${Object.keys(changes).join(',')}`);
    },
    completeDraft: async (id) => {
      log.push(`complete:${id}`);
    },
    isUniqueViolation: (error) => (error as { code?: string })?.code === '23505',
    ...overrides,
  };
  return { api, log };
}

describe('AnthropometryDraftSaver', () => {
  it('crea el borrador con el estado completo en el primer guardado y luego parchea solo lo modificado', async () => {
    const { api, log } = fakeApi();
    const saver = createAnthropometryDraftSaver(PARAMS, api);

    await saver.save({ generalNotes: 'a' }, { ...FORM, generalNotes: 'a' });
    await saver.save({ generalNotes: 'ab' }, { ...FORM, generalNotes: 'ab' });

    assert.deepEqual(log, ['create:a', 'patch:draft-1:generalNotes']);
  });

  it('parchea directamente si ya existía un borrador al abrir al paciente', async () => {
    const { api, log } = fakeApi();
    const existing: AnthropometryDraftRow = { id: 'draft-9', data: { generalNotes: 'previo' } };
    const saver = createAnthropometryDraftSaver({ ...PARAMS, initialDraft: existing }, api);

    assert.deepEqual(saver.getData(), { generalNotes: 'previo' });
    await saver.save({ equation: 'durnin_womersley' as AnthropometryDraftForm['equation'] }, FORM);

    assert.deepEqual(log, ['patch:draft-9:equation']);
  });

  it('si otra sesión ya creó el borrador (23505) lo adopta y lo actualiza con el estado completo', async () => {
    const { api, log } = fakeApi({
      createDraft: async () => {
        throw { code: '23505' };
      },
      getDraft: async () => ({ id: 'draft-remoto', data: {} }),
    });
    const saver = createAnthropometryDraftSaver(PARAMS, api);

    await saver.save({ generalNotes: 'x' }, { ...FORM, generalNotes: 'x' });
    await saver.save({ generalNotes: 'xy' }, { ...FORM, generalNotes: 'xy' });

    assert.deepEqual(log, [
      'patch:draft-remoto:skinfolds,perimeters,diameters,equation,somatotypeCategory,generalNotes',
      'patch:draft-remoto:generalNotes',
    ]);
  });

  it('propaga errores que no son de unicidad para que el autoguardado reintente', async () => {
    const { api } = fakeApi({
      createDraft: async () => {
        throw new Error('network');
      },
    });
    const saver = createAnthropometryDraftSaver(PARAMS, api);

    await assert.rejects(saver.save({ generalNotes: 'x' }, FORM), /network/);
  });

  it('getData refleja los cambios apenas se piden, antes de que termine la red', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const { api } = fakeApi({ patchDraft: async () => gate });
    const saver = createAnthropometryDraftSaver({ ...PARAMS, initialDraft: { id: 'd', data: {} } }, api);

    const pending = saver.save({ generalNotes: 'en vuelo' }, FORM);
    assert.deepEqual(saver.getData(), { generalNotes: 'en vuelo' });
    release();
    await pending;
  });

  it('complete convierte el borrador en definitivo y deja el saver sin borrador', async () => {
    const { api, log } = fakeApi();
    const saver = createAnthropometryDraftSaver({ ...PARAMS, initialDraft: { id: 'd1', data: { generalNotes: 'x' } } }, api);

    assert.equal(await saver.complete({ data: {} }), true);
    assert.deepEqual(log, ['complete:d1']);
    assert.equal(saver.getData(), null);
    assert.equal(await saver.complete({ data: {} }), false, 'sin borrador el llamador debe insertar');
  });
});
