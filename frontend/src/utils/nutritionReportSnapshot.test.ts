import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { EvaluacionAntropometrica, PlanNutricional } from '../types';
import type { AnthropometryAssessment } from '../types/coreBodyNutrition';
import { coreBodyAnthroToKinesys } from './coreBodyAdapters';
import { selectNutritionSnapshot } from './nutritionReportSnapshot';

const ev = (o: Partial<EvaluacionAntropometrica>) =>
  ({ id: 'x', evaluation_date: '2026-01-01', created_at: '2026-01-01T00:00:00Z', ...o }) as EvaluacionAntropometrica;
const plan = (o: Partial<PlanNutricional>) =>
  ({ id: 'p', status: 'active', created_at: '2026-01-01T00:00:00Z', ...o }) as PlanNutricional;

test('un pesaje Withings más reciente no tapa el último ISAK', () => {
  const isak = ev({ id: 'isak', source: 'isak_manual', created_at: '2026-02-01T00:00:00Z' });
  const withings = ev({ id: 'w', source: 'withings_scale', created_at: '2026-03-01T00:00:00Z' });
  const s = selectNutritionSnapshot([withings, isak], []);
  assert.equal(s.isak?.id, 'isak');
  assert.equal(s.withings?.id, 'w');
});

test('registros ISAK legados sin source cuentan como ISAK', () => {
  const s = selectNutritionSnapshot([ev({ id: 'old' })], []);
  assert.equal(s.isak?.id, 'old');
  assert.equal(s.withings, null);
});

test('plan activo: ignora archivados', () => {
  const s = selectNutritionSnapshot(
    [],
    [
      plan({ id: 'new-archived', status: 'archived', created_at: '2026-05-01T00:00:00Z' }),
      plan({ id: 'act', status: 'active', created_at: '2026-04-01T00:00:00Z' }),
    ],
  );
  assert.equal(s.plan?.id, 'act');
});

test('ISAK se persiste completo: cresta ilíaca, diámetros, somatotipo y ecuación', () => {
  const a = {
    id: 'a', patientId: 'p', date: '2026-01-01', evaluator: 'E', evaluatorCertification: 'L3', evaluationNumber: '1/2',
    skinfolds: { triceps: 1, subescapular: 2, biceps: 3, crestaIliaca: 4, supraespinal: 5, abdominal: 6, muslo: 7, pierna: 8 },
    activeEquation: 'faulkner_4', estimatedBodyFatPct: 15, fatStatus: 'Rango saludable',
    perimeters: { brazoRelajado: 30, brazoContraido: 32, cintura: 80, cadera: 95, muslo: 55, pierna: 36 },
    derivedIndices: { cinturaCaderaRatio: 0.84, cinturaCaderaStatus: 'Normal', cinturaTallaRatio: 0.45, cinturaTallaStatus: 'Normal', relacionBrazo: 1.07, relacionBrazoStatus: 'Normal' },
    perimetersInterpretation: 'ok',
    diameters: { biacromial: 38, humero: 6.5, femur: 9.4 },
    somatotype: { category: 'Mesomorfo', endomorfia: 3, mesomorfia: 5, ectomorfia: 2, interpretation: 'i' },
    generalObservations: 'n',
  } as AnthropometryAssessment;
  const r = coreBodyAnthroToKinesys(a, { tenantId: 't', nutritionistId: 'n', age: 30, gender: 'male', weightKg: 75, heightCm: 178 });
  assert.equal(r.skinfold_iliac_crest_mm, 4);
  assert.equal(r.skinfold_suprailiac_mm, 5);
  assert.equal(r.diameter_femur_cm, 9.4);
  assert.equal(r.somatotype_mesomorphy, 5);
  assert.equal(r.isak_equation, 'faulkner_4');
  assert.equal(r.source, 'isak_manual');
  assert.ok(r.bmr_kcal > 0);
});

test('borrador ISAK en curso: el informe toma pliegues, perímetros, diámetros y somatotipo guardados', async () => {
  const { isakDraftToKinesys, hasIsakMeasurements } = await import('./coreBodyAdapters');
  const form = {
    skinfolds: { triceps: 10, subescapular: 11, biceps: 5, crestaIliaca: 12, supraespinal: 8, abdominal: 14, pecho: 7, muslo: 15, pierna: 9 },
    perimeters: { brazoRelajado: 30, brazoContraido: 32, cintura: 80, cadera: 100, muslo: 55, pierna: 36, cuello: 38 },
    diameters: { biacromial: 40, humero: 7, femur: 9.5 },
    equation: 'faulkner_4' as const,
    somatotypeCategory: 'Mesomorfo' as const,
    generalNotes: '',
    somatotype: { category: 'Meso-Endomorfo' as const, endomorfia: 3, mesomorfia: 5, ectomorfia: 2, interpretation: 'x' },
  };
  assert.equal(hasIsakMeasurements(form), true);
  assert.equal(hasIsakMeasurements({ ...form, skinfolds: {} as never, perimeters: {} as never, diameters: {} as never }), false);

  const d = isakDraftToKinesys(form, { id: 'd', tenantId: 't', nutritionistId: 'n', patientId: 'p', age: 30, gender: 'male', weightKg: 75, heightCm: 178 });
  assert.equal(d.skinfold_chest_mm, 7);
  assert.equal(d.skinfold_calf_mm, 9);
  assert.equal(d.neck_cm, 38);
  assert.equal(d.relaxed_arm_cm, 30);
  assert.equal(d.diameter_femur_cm, 9.5);
  assert.equal(d.somatotype_category, 'Meso-Endomorfo');
  assert.equal(d.somatotype_mesomorphy, 5);

  const s = selectNutritionSnapshot([ev({ id: 'old', source: 'isak_manual' })], [], d);
  assert.equal(s.isak?.id, 'd');
});

test('la captura BIA del store llega a la Sección 2 aunque no haya fila persistida', () => {
  const draftWithings = ev({
    id: 'bia-draft',
    source: 'withings_manual',
    weight_kg: 80,
    body_fat_percentage: 20,
    muscle_mass_kg: 35,
    created_at: '2026-03-01T00:00:00Z',
  });
  const s = selectNutritionSnapshot([], [], null, { draftWithings, profile: { heightCm: 180, age: 30, gender: 'male' } });
  assert.equal(s.withings?.weight_kg, 80);
  assert.equal(s.withings?.height_cm, 180);
  assert.equal(s.withings?.bmi, 24.7);
  assert.equal(s.withings?.fat_mass_kg, 16);
  assert.equal(s.withings?.bmr_kcal, 1780);
});

test('peso/estatura/IMC/TMB se recalculan en ISAK con datos del perfil y la BIA', () => {
  const isak = ev({ id: 'isak', source: 'isak_manual', weight_kg: 1, height_cm: 0, bmi: 0, body_fat_percentage: 0, fat_mass_kg: 12 });
  const withings = ev({ id: 'w', source: 'withings_scale', weight_kg: 60, created_at: '2026-03-01T00:00:00Z' });
  const s = selectNutritionSnapshot([isak, withings], [], null, { profile: { heightCm: 165, age: 28, gender: 'female' } });
  assert.equal(s.isak?.weight_kg, 60);
  assert.equal(s.isak?.bmi, 22);
  assert.equal(s.isak?.body_fat_percentage, 20);
  assert.equal(s.isak?.bmr_kcal, Math.round(10 * 60 + 6.25 * 165 - 5 * 28 - 161));
});

// ─── Coexistencia ISAK + BIA en el snapshot ───────────────────────────────────

const isakCtx = { id: 'd', tenantId: 't', nutritionistId: 'n', patientId: 'p', age: 30, gender: 'male' as const, weightKg: 75, heightCm: 178 };
const biaRecord = (o: Partial<EvaluacionAntropometrica> = {}) =>
  ev({ id: 'bia-draft', source: 'withings_manual', weight_kg: 80, body_fat_percentage: 20, muscle_mass_kg: 35, created_at: '2026-03-01T00:00:00Z', ...o });

test('hasIsakMeasurements: borrador anidado, registro plano y registro solo-BIA', async () => {
  const { hasIsakMeasurements, isakDraftToKinesys } = await import('./coreBodyAdapters');
  assert.equal(hasIsakMeasurements(null), false);
  assert.equal(hasIsakMeasurements({ perimeters: { cintura: 80 } as never }), true);
  assert.equal(hasIsakMeasurements({ skinfolds: { triceps: 0 } as never, diameters: {} as never }), false);

  const flatIsak = isakDraftToKinesys({ diameters: { biacromial: 38, humero: 0, femur: 0 } }, isakCtx);
  assert.equal(hasIsakMeasurements(flatIsak), true, 'registro plano ISAK con un diámetro');
  assert.equal(hasIsakMeasurements(biaRecord()), false, 'una medición BIA no cuenta como ISAK');
  assert.equal(hasIsakMeasurements(ev({ source: 'isak_manual', skinfold_chest_mm: 7 })), true);
});

test('guardar/actualizar la BIA no oculta ni vacía el ISAK del snapshot', async () => {
  const { isakDraftToKinesys } = await import('./coreBodyAdapters');
  const draftIsak = isakDraftToKinesys(
    { skinfolds: { triceps: 10, subescapular: 11 } as never, perimeters: { cintura: 80, cadera: 100 } as never, diameters: { femur: 9.5 } as never,
      somatotype: { category: 'Mesomorfo', endomorfia: 3, mesomorfia: 5, ectomorfia: 2, interpretation: 'x' } },
    isakCtx,
  );

  const before = selectNutritionSnapshot([], [], draftIsak, { draftWithings: null });
  const afterBia = selectNutritionSnapshot([], [], draftIsak, { draftWithings: biaRecord() });
  const afterNewerBia = selectNutritionSnapshot([], [], draftIsak, { draftWithings: biaRecord({ id: 'bia-2', weight_kg: 81, created_at: '2026-12-01T00:00:00Z' }) });

  for (const s of [afterBia, afterNewerBia]) {
    assert.ok(s.isak, 'el ISAK sigue presente');
    assert.equal(s.isak?.skinfold_triceps_mm, 10);
    assert.equal(s.isak?.waist_cm, 80);
    assert.equal(s.isak?.diameter_femur_cm, 9.5);
    assert.equal(s.isak?.somatotype_category, 'Mesomorfo');
    assert.ok(s.withings, 'la BIA también');
  }
  assert.equal(afterBia.isak?.skinfold_triceps_mm, before.isak?.skinfold_triceps_mm);
  assert.equal(afterNewerBia.withings?.weight_kg, 81);
});

test('el espejo ISAK del store alimenta el informe cuando el borrador en memoria se perdió', async () => {
  const { isakStoreToDraftForm, isakDraftToKinesys } = await import('./coreBodyAdapters');
  const form = isakStoreToDraftForm({
    isakSkinfolds: { triceps: 12, subescapular: 13 },
    isakPerimeters: { cintura: 82, cadera: 99 },
    isakDiameters: { biacromial: 39 },
    isakSomatotype: { category: 'Ecto-Mesomorfo', endomorfia: 2, mesomorfia: 4, ectomorfia: 3, interpretation: 'y' },
    equation: 'faulkner_4',
  });
  assert.ok(form);
  const storeIsak = isakDraftToKinesys(form!, isakCtx);

  const s = selectNutritionSnapshot([], [], null, { storeIsak, draftWithings: biaRecord() });
  assert.equal(s.isak?.skinfold_triceps_mm, 12);
  assert.equal(s.isak?.waist_cm, 82);
  assert.equal(s.isak?.diameter_biacromial_cm, 39);
  assert.equal(s.isak?.somatotype_category, 'Ecto-Mesomorfo');
  assert.equal(s.withings?.weight_kg, 80);
});

test('isakStoreToDraftForm: devuelve null si el store no tiene medidas', async () => {
  const { isakStoreToDraftForm } = await import('./coreBodyAdapters');
  assert.equal(isakStoreToDraftForm(null), null);
  assert.equal(isakStoreToDraftForm({ isakSkinfolds: { triceps: 0 }, isakPerimeters: {}, isakDiameters: undefined }), null);
});

test('borrador en memoria + espejo del store se fusionan campo a campo (el borrador gana en solapes)', async () => {
  const { isakDraftToKinesys } = await import('./coreBodyAdapters');
  const draft = isakDraftToKinesys({ perimeters: { cintura: 80 } as never, skinfolds: { triceps: 10 } as never }, isakCtx);
  const store = isakDraftToKinesys(
    { skinfolds: { triceps: 99, subescapular: 14 } as never, diameters: { femur: 9.4 } as never, somatotype: { category: 'Mesomorfo', endomorfia: 3, mesomorfia: 5, ectomorfia: 2, interpretation: 'z' } },
    isakCtx,
  );
  const s = selectNutritionSnapshot([], [], draft, { storeIsak: store });
  assert.equal(s.isak?.waist_cm, 80, 'solo en el borrador');
  assert.equal(s.isak?.skinfold_triceps_mm, 10, 'el borrador gana en solapes');
  assert.equal(s.isak?.skinfold_subscapular_mm, 14, 'completado desde el store');
  assert.equal(s.isak?.diameter_femur_cm, 9.4, 'completado desde el store');
  assert.equal(s.isak?.somatotype_category, 'Mesomorfo');
});

test('un borrador/espejo vacío no oculta el ISAK persistido y uno vacío persistido no tapa a uno real', async () => {
  const { isakDraftToKinesys } = await import('./coreBodyAdapters');
  const emptyDraft = isakDraftToKinesys({}, isakCtx);
  const realOld = ev({ id: 'real', source: 'isak_manual', skinfold_triceps_mm: 9, waist_cm: 78, created_at: '2026-01-01T00:00:00Z' });
  const emptyNewer = ev({ id: 'empty', source: 'isak_manual', created_at: '2026-02-01T00:00:00Z' });

  const s = selectNutritionSnapshot([emptyNewer, realOld], [], emptyDraft, { storeIsak: emptyDraft });
  assert.equal(s.isak?.id, 'real');
});

test('sin ninguna medida ISAK en ninguna fuente, el bloque ISAK queda vacío (null)', () => {
  const s = selectNutritionSnapshot([ev({ id: 'w', source: 'withings_scale', weight_kg: 70 })], [], null, { draftWithings: biaRecord() });
  assert.equal(s.isak, null);
  assert.ok(s.withings);
});

test('la evaluación en curso gana a la persistida; sin evaluación en curso rige la persistida', async () => {
  const { isakDraftToKinesys } = await import('./coreBodyAdapters');
  const persisted = ev({ id: 'done', source: 'isak_manual', skinfold_triceps_mm: 8, waist_cm: 70 });
  const draft = isakDraftToKinesys({ perimeters: { cintura: 85 } as never }, isakCtx);

  assert.equal(selectNutritionSnapshot([persisted], [], draft).isak?.waist_cm, 85);
  assert.equal(selectNutritionSnapshot([persisted], [], null).isak?.waist_cm, 70);
});
