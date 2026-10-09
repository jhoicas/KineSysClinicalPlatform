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
