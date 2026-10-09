/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EvaluacionAntropometrica, PacienteClinico } from '../types/index.ts';
import type { AnthropometryDraftForm, BodyCompositionBIA } from '../types/coreBodyNutrition.ts';
import type { NutritionSessionDraft } from '../store/useAppStore.ts';
import { buildLiveReportSnapshot, hasBiaValues, type LiveReportInputs } from './nutritionReportLive.ts';

const PATIENT = {
  id: 'p1',
  tenant_id: 't1',
  first_name: 'Ana',
  last_name: 'Pérez',
  gender: 'female',
  birth_date: '1990-05-17',
  height_cm: 168,
} as PacienteClinico;

const range = (value: number) => ({ value, minNormal: 0, maxNormal: 100, unit: 'kg', status: 'Normal' as const });
const bia = (weight: number): BodyCompositionBIA =>
  ({
    id: 'bia-p1',
    patientId: 'p1',
    date: '2026-10-01',
    deviceModel: 'Withings Body Scan',
    sourceMode: 'manual_entry',
    lastSyncTimestamp: '',
    pesoKg: range(weight),
    masaMuscularEsqueleticaKg: range(30),
    masaGrasaKg: range(15),
    porcentajeGrasaCorporal: range(24),
    segmental: {
      brazoIzq: { muscleKg: 0, fatKg: 0 },
      brazoDer: { muscleKg: 0, fatKg: 0 },
      tronco: { muscleKg: 0, fatKg: 0 },
      piernaIzq: { muscleKg: 0, fatKg: 0 },
      piernaDer: { muscleKg: 0, fatKg: 0 },
    },
    otherIndicators: {
      aguaCorporalTotalL: range(30),
      proteinaKg: range(10),
      mineralesKg: range(3),
      grasaVisceralNivel: range(5),
    },
    evaluatorNotes: '',
  }) as BodyCompositionBIA;

const SOMATOTYPE = { category: 'Mesomorfo', endomorfia: 3, mesomorfia: 5, ectomorfia: 2, interpretation: 'Predominio muscular' } as const;

const form = (over: Partial<AnthropometryDraftForm> = {}): Partial<AnthropometryDraftForm> => ({
  skinfolds: { triceps: 12 } as never,
  perimeters: { cintura: 72, cadera: 98 } as never,
  diameters: { biacromial: 41.7 } as never,
  equation: 'faulkner_4',
  ...over,
});

const base = (over: Partial<LiveReportInputs> = {}): LiveReportInputs => ({
  evaluations: [],
  plans: [],
  patient: PATIENT,
  tenantId: 't1',
  nutritionistId: 'n1',
  nutritionistName: 'Lic. Prueba',
  isakForm: null,
  nutritionDraft: null,
  ...over,
});

const draft = (over: Partial<NutritionSessionDraft> = {}): NutritionSessionDraft => ({
  patientId: 'p1',
  updatedAt: '2026-10-09T10:00:00Z',
  ...over,
});

describe('buildLiveReportSnapshot', () => {
  it('ISAK y BIA vivos del store llegan juntos al informe', () => {
    const s = buildLiveReportSnapshot(
      base({ nutritionDraft: draft({ isakDraft: form({ somatotype: SOMATOTYPE, estimatedBodyFatPct: 24 }), biaSnapshot: bia(62) as never }) }),
    );
    assert.equal(s.isak?.diameter_biacromial_cm, 41.7);
    assert.equal(s.isak?.waist_cm, 72);
    assert.equal(s.isak?.somatotype_category, 'Mesomorfo');
    assert.equal(s.isak?.body_fat_percentage, 24);
    assert.equal(s.withings?.weight_kg, 62);
  });

  it('regresión: el formulario viejo en memoria (sin derivados) no oculta los derivados del store al clic', () => {
    // Estado de React publicado al teclear: aún sin somatotipo ni % grasa (llegan después, de forma asíncrona).
    const stale = { patientId: 'p1', form: form(), updatedAt: '2026-10-09T09:59:00Z' };
    // Store en vivo: el módulo republicó el mismo formulario con los derivados ya calculados.
    const live = draft({ isakDraft: form({ somatotype: SOMATOTYPE, estimatedBodyFatPct: 24, fatStatus: 'Rango saludable' }) });

    const s = buildLiveReportSnapshot(base({ isakForm: stale, nutritionDraft: live }));
    assert.equal(s.isak?.somatotype_category, 'Mesomorfo', 'somatotipo del store');
    assert.equal(s.isak?.somatotype_mesomorphy, 5);
    assert.equal(s.isak?.body_fat_percentage, 24, '% de grasa del store');
    assert.equal(s.isak?.diameter_biacromial_cm, 41.7, 'medidas intactas');
  });

  it('el valor tecleado más reciente del store gana sobre el del estado en memoria', () => {
    const stale = { patientId: 'p1', form: form({ perimeters: { cintura: 70 } as never }), updatedAt: '2026-10-09T09:59:00Z' };
    const live = draft({ isakDraft: form({ perimeters: { cintura: 75 } as never }) });
    // El borrador en memoria es la fuente primaria; si el store trae una medida distinta, solo completa lo que falte.
    const s = buildLiveReportSnapshot(base({ isakForm: stale, nutritionDraft: live }));
    assert.equal(s.isak?.waist_cm, 70);
    // Sin borrador en memoria (p. ej. tras un remontaje) rige el store.
    assert.equal(buildLiveReportSnapshot(base({ nutritionDraft: live })).isak?.waist_cm, 75);
  });

  it('actualizar la BIA no altera lo capturado en ISAK', () => {
    const isakOnly = buildLiveReportSnapshot(base({ nutritionDraft: draft({ isakDraft: form() }) }));
    const withBia = buildLiveReportSnapshot(base({ nutritionDraft: draft({ isakDraft: form(), biaSnapshot: bia(65) as never }) }));
    assert.equal(withBia.isak?.skinfold_triceps_mm, isakOnly.isak?.skinfold_triceps_mm);
    assert.equal(withBia.isak?.diameter_biacromial_cm, isakOnly.isak?.diameter_biacromial_cm);
    assert.equal(withBia.withings?.weight_kg, 65);
  });

  it('ignora el estado del store de otro paciente y no revienta sin paciente', () => {
    const other = draft({ patientId: 'otro', isakDraft: form(), biaSnapshot: bia(80) as never });
    const s = buildLiveReportSnapshot(base({ nutritionDraft: other }));
    assert.equal(s.isak, null);
    assert.equal(s.withings, null);

    const none = buildLiveReportSnapshot(base({ patient: null, nutritionDraft: draft({ isakDraft: form() }) }));
    assert.equal(none.isak, null);
  });

  it('usa el espejo por grupos del store cuando no hay formulario completo', () => {
    const s = buildLiveReportSnapshot(
      base({ nutritionDraft: draft({ isakSkinfolds: { triceps: 9 }, isakPerimeters: { cintura: 71 }, isakDiameters: { femur: 9.2 } }) }),
    );
    assert.equal(s.isak?.skinfold_triceps_mm, 9);
    assert.equal(s.isak?.diameter_femur_cm, 9.2);
  });

  it('prefiere la ISAK en curso a la persistida; sin ella rige la persistida', () => {
    const persisted = { id: 'old', source: 'isak_manual', waist_cm: 70, skinfold_triceps_mm: 8, created_at: '2026-01-01T00:00:00Z', evaluation_date: '2026-01-01' } as EvaluacionAntropometrica;
    const live = buildLiveReportSnapshot(base({ evaluations: [persisted], nutritionDraft: draft({ isakDraft: form() }) }));
    assert.equal(live.isak?.waist_cm, 72);
    assert.equal(buildLiveReportSnapshot(base({ evaluations: [persisted] })).isak?.waist_cm, 70);
  });
});

describe('hasBiaValues', () => {
  it('detecta capturas con y sin valores', () => {
    assert.equal(hasBiaValues(bia(62)), true);
    const empty = bia(0);
    for (const key of ['masaMuscularEsqueleticaKg', 'masaGrasaKg', 'porcentajeGrasaCorporal'] as const) empty[key] = range(0);
    for (const key of ['aguaCorporalTotalL', 'proteinaKg', 'mineralesKg', 'grasaVisceralNivel'] as const) {
      empty.otherIndicators[key] = range(0);
    }
    assert.equal(hasBiaValues(empty), false);
  });
});
