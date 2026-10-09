import type { EvaluacionAntropometrica, PlanNutricional } from '../types';
import { mifflinStJeorBmr } from './coreBodyAdapters';

/**
 * Selección del dato vigente de cada bloque del informe nutricional.
 * Las evaluaciones ISAK y las mediciones Withings viven en la misma tabla; sin esta
 * separación, un pesaje nuevo de la báscula tapa la última evaluación ISAK.
 */
export interface NutritionReportSnapshot {
  isak: EvaluacionAntropometrica | null;
  withings: EvaluacionAntropometrica | null;
  plan: PlanNutricional | null;
}

/** Datos del perfil del paciente usados para completar peso, estatura y derivados. */
export interface SnapshotProfile {
  heightCm?: number | null;
  weightKg?: number | null;
  age?: number | null;
  gender?: 'male' | 'female' | 'other' | 'unknown' | null;
}

export interface SnapshotOptions {
  /** Evaluación ISAK en curso (guardado progresivo) ya aplanada al formato del informe. */
  draftIsak?: EvaluacionAntropometrica | null;
  /** Captura BIA/Withings vigente en el store (manual guardada o báscula) aplanada al formato del informe. */
  draftWithings?: EvaluacionAntropometrica | null;
  profile?: SnapshotProfile;
}

const WITHINGS_SOURCES = new Set(['withings_scale', 'WITHINGS', 'withings_manual']);

/** Un peso menor a esto es un valor por defecto/placeholder, no una medición real. */
const MIN_PLAUSIBLE_WEIGHT_KG = 2;
const MIN_PLAUSIBLE_HEIGHT_CM = 30;

export function isWithingsRecord(e: EvaluacionAntropometrica): boolean {
  return (
    WITHINGS_SOURCES.has(String(e.source ?? '')) ||
    String(e.device_model ?? '').toLowerCase().includes('withings')
  );
}

export function isIsakRecord(e: EvaluacionAntropometrica): boolean {
  return !isWithingsRecord(e);
}

function stamp(e: { evaluation_date?: string; created_at?: string }): number {
  const t = Date.parse(e.created_at || e.evaluation_date || '');
  return Number.isNaN(t) ? 0 : t;
}

function latest<T extends { evaluation_date?: string; created_at?: string }>(rows: T[]): T | null {
  return rows.reduce<T | null>((best, r) => (best === null || stamp(r) > stamp(best) ? r : best), null);
}

export function selectActivePlan(plans: PlanNutricional[]): PlanNutricional | null {
  const active = plans.filter((p) => p.status === 'active');
  return latest(active.length > 0 ? active : plans.filter((p) => p.status !== 'archived'));
}

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const pos = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const plausibleWeight = (v: unknown): number => (pos(v) >= MIN_PLAUSIBLE_WEIGHT_KG ? pos(v) : 0);
const plausibleHeight = (v: unknown): number => (pos(v) >= MIN_PLAUSIBLE_HEIGHT_CM ? pos(v) : 0);

/** True si la medición Withings/BIA trae al menos un valor de composición capturado. */
export function hasWithingsValues(e: EvaluacionAntropometrica | null | undefined): boolean {
  if (!e) return false;
  return [
    e.weight_kg,
    e.body_fat_percentage,
    e.fat_ratio_percent,
    e.fat_mass_kg,
    e.muscle_mass_kg,
    e.hydration_kg,
    e.protein_kg,
    e.bone_mass_kg,
    e.visceral_fat_index,
  ].some((v) => pos(v) > 0);
}

/**
 * Completa y recalcula de forma garantizada peso, estatura, IMC, % grasa, masas y TMB:
 *  - peso/estatura: el valor propio del registro; si falta, el del perfil/otra medición;
 *  - IMC = peso / estatura²; TMB = Mifflin-St Jeor;
 *  - % grasa: el registrado (ISAK/BIA) o, si falta, masa grasa / peso.
 */
function normalizeRecord(
  e: EvaluacionAntropometrica,
  fallback: { weightKg: number; heightCm: number; age: number; gender: 'male' | 'female' | 'other' },
): EvaluacionAntropometrica {
  const weight = plausibleWeight(e.weight_kg) || fallback.weightKg;
  const height = fallback.heightCm || plausibleHeight(e.height_cm);
  const age = pos(e.age) || fallback.age;
  const gender = e.gender === 'male' || e.gender === 'female' || e.gender === 'other' ? e.gender : fallback.gender;

  const bmi = weight > 0 && height > 0 ? round(weight / (height / 100) ** 2) : pos(e.bmi);

  let fatPct = pos(e.body_fat_percentage) || pos(e.fat_ratio_percent);
  const fatMassStored = pos(e.fat_mass_kg);
  if (!fatPct && fatMassStored > 0 && weight > 0) fatPct = round((fatMassStored / weight) * 100);
  const fatMass = fatMassStored || (fatPct > 0 && weight > 0 ? round((fatPct / 100) * weight) : 0);
  const fatFree = pos(e.fat_free_mass_kg) || (fatMass > 0 && weight > 0 ? round(weight - fatMass) : 0);

  const bmr = mifflinStJeorBmr(weight, height, age, gender) || pos(e.bmr_kcal);
  const tdee = bmr > 0 ? Math.round(bmr * (pos(e.activity_factor) || 1.375)) : pos(e.tdee_kcal);

  return {
    ...e,
    age,
    gender,
    weight_kg: weight,
    height_cm: height,
    bmi,
    body_fat_percentage: fatPct,
    fat_ratio_percent: e.fat_ratio_percent ?? (isWithingsRecord(e) ? fatPct : undefined),
    fat_mass_kg: fatMass,
    fat_free_mass_kg: fatFree,
    bmr_kcal: bmr,
    tdee_kcal: tdee,
  } as EvaluacionAntropometrica;
}

/**
 * `draftIsak`: evaluación ISAK en curso (guardado progresivo). Mientras tenga medidas capturadas,
 * es el dato vigente del bloque ISAK.
 * `draftWithings`: captura BIA del store (manual o báscula). Se integra cuando la fila persistida aún
 * no existe/recargó o es más antigua, de modo que lo ingresado siempre llegue a la Sección 2.
 */
export function selectNutritionSnapshot(
  evaluations: EvaluacionAntropometrica[],
  plans: PlanNutricional[],
  draftIsak: EvaluacionAntropometrica | null = null,
  options: Omit<SnapshotOptions, 'draftIsak'> = {},
): NutritionReportSnapshot {
  const { draftWithings = null, profile = {} } = options;

  const persistedWithings = latest(evaluations.filter(isWithingsRecord));
  const usableDraftWithings = hasWithingsValues(draftWithings) ? draftWithings : null;
  const rawWithings =
    usableDraftWithings && (!persistedWithings || stamp(usableDraftWithings) >= stamp(persistedWithings))
      ? usableDraftWithings
      : persistedWithings;
  const rawIsak = draftIsak ?? latest(evaluations.filter(isIsakRecord));

  // Peso/estatura de referencia: perfil → medición Withings → ISAK → última evaluación guardada.
  const anyEval = latest(evaluations);
  const weightKg =
    plausibleWeight(rawWithings?.weight_kg) ||
    plausibleWeight(profile.weightKg) ||
    plausibleWeight(rawIsak?.weight_kg) ||
    plausibleWeight(anyEval?.weight_kg);
  const heightCm =
    plausibleHeight(profile.heightCm) ||
    plausibleHeight(rawWithings?.height_cm) ||
    plausibleHeight(rawIsak?.height_cm) ||
    plausibleHeight(anyEval?.height_cm);
  const age = pos(profile.age) || pos(rawIsak?.age) || pos(rawWithings?.age);
  const gender: 'male' | 'female' | 'other' =
    profile.gender === 'female' || profile.gender === 'other' ? profile.gender : profile.gender === 'male' ? 'male' : rawIsak?.gender ?? rawWithings?.gender ?? 'male';
  const fallback = { weightKg, heightCm, age, gender };

  return {
    isak: rawIsak ? normalizeRecord(rawIsak, fallback) : null,
    withings: rawWithings ? normalizeRecord(rawWithings, fallback) : null,
    plan: selectActivePlan(plans),
  };
}
