/**
 * AnthropometryService — Fase 2.1 (PLAN_NUTRICION)
 *
 * Funciones puras de biofisiología clínica:
 * - % grasa: Jackson-Pollock (3 y 7 pliegues) + Faulkner (4 pliegues)
 * - Somatotipo Heath-Carter (endo / meso / ecto)
 * - TMB: Mifflin-St Jeor y Harris-Benedict (revisada 1984)
 *
 * Unidades: pliegues en mm, perímetros/diámetros/altura en cm, peso en kg.
 */

export type BiologicalSex = 'male' | 'female';

export interface BodyCompositionResult {
  /** Densidad corporal (g/cm³); null si la fórmula no la calcula (Faulkner). */
  bodyDensity: number | null;
  /** Porcentaje de grasa corporal (Siri o Faulkner). */
  bodyFatPct: number;
  /** Masa grasa estimada (kg), si se provee peso. */
  fatMassKg: number | null;
  /** Masa libre de grasa estimada (kg), si se provee peso. */
  fatFreeMassKg: number | null;
  formula: string;
}

export interface JacksonPollock7Skinfolds {
  chest: number;
  midaxillary: number;
  triceps: number;
  subscapular: number;
  abdomen: number;
  suprailiac: number;
  thigh: number;
}

export interface JacksonPollock3SkinfoldsMale {
  chest: number;
  abdomen: number;
  thigh: number;
}

export interface JacksonPollock3SkinfoldsFemale {
  triceps: number;
  suprailiac: number;
  thigh: number;
}

export interface Faulkner4Skinfolds {
  triceps: number;
  subscapular: number;
  suprailiac: number;
  abdomen: number;
}

export interface HeathCarterInputs {
  /** Pliegues (mm) */
  tricepsMm: number;
  subscapularMm: number;
  suprailiacMm: number;
  medialCalfMm: number;
  /** Diámetros óseos (cm) */
  humerusBreadthCm: number;
  femurBreadthCm: number;
  /** Perímetros (cm) */
  flexedArmCm: number;
  calfCm: number;
  /** Antropometría global */
  heightCm: number;
  weightKg: number;
}

export interface SomatotypeResult {
  endomorphy: number;
  mesomorphy: number;
  ectomorphy: number;
  /** Clasificación textual aproximada (ej. "meso-endomorfo"). */
  label: string;
}

export interface BmrInputs {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: BiologicalSex;
}

export interface BmrResult {
  bmrKcal: number;
  formula: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} debe ser un número finito > 0 (recibido: ${value}).`);
  }
}

function assertNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} debe ser un número finito ≥ 0 (recibido: ${value}).`);
  }
}

function round(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/**
 * Ecuación de Siri (1961): convierte densidad corporal en % grasa.
 * BF% = (495 / BD) − 450
 */
export function bodyFatFromDensitySiri(bodyDensity: number): number {
  assertPositive('bodyDensity', bodyDensity);
  return round((495 / bodyDensity) - 450, 2);
}

function withMassBreakdown(
  bodyFatPct: number,
  weightKg: number | undefined,
  bodyDensity: number | null,
  formula: string
): BodyCompositionResult {
  const fatMassKg =
    weightKg != null && Number.isFinite(weightKg) && weightKg > 0
      ? round((bodyFatPct / 100) * weightKg, 2)
      : null;
  const fatFreeMassKg =
    fatMassKg != null && weightKg != null ? round(weightKg - fatMassKg, 2) : null;

  return {
    bodyDensity: bodyDensity != null ? round(bodyDensity, 5) : null,
    bodyFatPct: round(bodyFatPct, 2),
    fatMassKg,
    fatFreeMassKg,
    formula,
  };
}

// ── Jackson-Pollock ───────────────────────────────────────────────────────────

/**
 * Jackson & Pollock 7 pliegues (1978/1980).
 * Hombres: BD = 1.112 − 0.00043499·Σ + 0.00000055·Σ² − 0.00028826·edad
 * Mujeres: BD = 1.097 − 0.00046971·Σ + 0.00000056·Σ² − 0.00012828·edad
 */
export function jacksonPollock7(
  sex: BiologicalSex,
  ageYears: number,
  folds: JacksonPollock7Skinfolds,
  weightKg?: number
): BodyCompositionResult {
  assertNonNegative('ageYears', ageYears);
  const values = Object.values(folds);
  values.forEach((v, i) => assertPositive(`skinfold[${i}]`, v));

  const sum = values.reduce((a, b) => a + b, 0);
  const sumSq = sum * sum;

  let bd: number;
  if (sex === 'male') {
    bd = 1.112 - 0.00043499 * sum + 0.00000055 * sumSq - 0.00028826 * ageYears;
  } else {
    bd = 1.097 - 0.00046971 * sum + 0.00000056 * sumSq - 0.00012828 * ageYears;
  }

  const bf = bodyFatFromDensitySiri(bd);
  return withMassBreakdown(
    bf,
    weightKg,
    bd,
    `Jackson-Pollock 7 pliegues (${sex}), Σ=${round(sum, 1)} mm, edad=${ageYears}`
  );
}

/**
 * Jackson & Pollock 3 pliegues.
 * Hombres (pecho, abdomen, muslo):
 *   BD = 1.10938 − 0.0008267·Σ + 0.0000016·Σ² − 0.0002574·edad
 * Mujeres (tríceps, suprailiaco, muslo):
 *   BD = 1.0994921 − 0.0009929·Σ + 0.0000023·Σ² − 0.0001392·edad
 */
export function jacksonPollock3(
  sex: BiologicalSex,
  ageYears: number,
  folds: JacksonPollock3SkinfoldsMale | JacksonPollock3SkinfoldsFemale,
  weightKg?: number
): BodyCompositionResult {
  assertNonNegative('ageYears', ageYears);

  let sum: number;
  if (sex === 'male') {
    const m = folds as JacksonPollock3SkinfoldsMale;
    assertPositive('chest', m.chest);
    assertPositive('abdomen', m.abdomen);
    assertPositive('thigh', m.thigh);
    sum = m.chest + m.abdomen + m.thigh;
  } else {
    const f = folds as JacksonPollock3SkinfoldsFemale;
    assertPositive('triceps', f.triceps);
    assertPositive('suprailiac', f.suprailiac);
    assertPositive('thigh', f.thigh);
    sum = f.triceps + f.suprailiac + f.thigh;
  }

  const sumSq = sum * sum;
  const bd =
    sex === 'male'
      ? 1.10938 - 0.0008267 * sum + 0.0000016 * sumSq - 0.0002574 * ageYears
      : 1.0994921 - 0.0009929 * sum + 0.0000023 * sumSq - 0.0001392 * ageYears;

  const bf = bodyFatFromDensitySiri(bd);
  return withMassBreakdown(
    bf,
    weightKg,
    bd,
    `Jackson-Pollock 3 pliegues (${sex}), Σ=${round(sum, 1)} mm, edad=${ageYears}`
  );
}

// ── Faulkner ──────────────────────────────────────────────────────────────────

/**
 * Faulkner (1968) — 4 pliegues (tríceps, subescapular, suprailiaco, abdominal).
 * BF% = (Σ4 × 0.153) + 5.783
 * No calcula densidad corporal; aplica directamente el % de grasa.
 */
export function faulkner4(
  folds: Faulkner4Skinfolds,
  weightKg?: number
): BodyCompositionResult {
  assertPositive('triceps', folds.triceps);
  assertPositive('subscapular', folds.subscapular);
  assertPositive('suprailiac', folds.suprailiac);
  assertPositive('abdomen', folds.abdomen);

  const sum = folds.triceps + folds.subscapular + folds.suprailiac + folds.abdomen;
  const bf = sum * 0.153 + 5.783;

  return withMassBreakdown(
    bf,
    weightKg,
    null,
    `Faulkner 4 pliegues, Σ=${round(sum, 1)} mm`
  );
}

// ── Heath-Carter ──────────────────────────────────────────────────────────────

/**
 * Somatotipo antropométrico Heath-Carter (ISAK).
 * Endomorfia usa pliegues corregidos por talla; mesomorfia corrige perímetros
 * restando el pliegue correspondiente / 10; ectomorfia usa HWR = altura / ∛peso.
 */
export function heathCarterSomatotype(input: HeathCarterInputs): SomatotypeResult {
  const {
    tricepsMm,
    subscapularMm,
    suprailiacMm,
    medialCalfMm,
    humerusBreadthCm,
    femurBreadthCm,
    flexedArmCm,
    calfCm,
    heightCm,
    weightKg,
  } = input;

  assertPositive('heightCm', heightCm);
  assertPositive('weightKg', weightKg);
  [
    ['tricepsMm', tricepsMm],
    ['subscapularMm', subscapularMm],
    ['suprailiacMm', suprailiacMm],
    ['medialCalfMm', medialCalfMm],
    ['humerusBreadthCm', humerusBreadthCm],
    ['femurBreadthCm', femurBreadthCm],
    ['flexedArmCm', flexedArmCm],
    ['calfCm', calfCm],
  ].forEach(([name, value]) => assertPositive(String(name), value as number));

  // Endomorfia
  const sum3 = tricepsMm + subscapularMm + suprailiacMm;
  const x = sum3 * (170.18 / heightCm);
  let endomorphy = -0.7182 + 0.1451 * x - 0.00068 * x * x + 0.0000014 * x * x * x;
  if (endomorphy < 0.1) endomorphy = 0.1;

  // Mesomorfia (perímetros corregidos: cm − pliegue_mm/10)
  const correctedArm = flexedArmCm - tricepsMm / 10;
  const correctedCalf = calfCm - medialCalfMm / 10;
  let mesomorphy =
    0.858 * humerusBreadthCm +
    0.601 * femurBreadthCm +
    0.188 * correctedArm +
    0.161 * correctedCalf -
    0.131 * heightCm +
    4.5;
  if (mesomorphy < 0.1) mesomorphy = 0.1;

  // Ectomorfia
  const hwr = heightCm / Math.cbrt(weightKg);
  let ectomorphy: number;
  if (hwr >= 40.75) {
    ectomorphy = 0.732 * hwr - 28.58;
  } else if (hwr > 38.25) {
    ectomorphy = 0.463 * hwr - 17.63;
  } else {
    ectomorphy = 0.1;
  }
  if (ectomorphy < 0.1) ectomorphy = 0.1;

  return {
    endomorphy: round(endomorphy, 1),
    mesomorphy: round(mesomorphy, 1),
    ectomorphy: round(ectomorphy, 1),
    label: classifySomatotype(endomorphy, mesomorphy, ectomorphy),
  };
}

function classifySomatotype(endo: number, meso: number, ecto: number): string {
  const ranked = [
    { k: 'endo', v: endo },
    { k: 'meso', v: meso },
    { k: 'ecto', v: ecto },
  ].sort((a, b) => b.v - a.v);

  const [first, second] = ranked;
  if (Math.abs(first.v - second.v) < 0.5) {
    return `${first.k}-${second.k}morfo (equilibrado)`;
  }
  const map: Record<string, string> = {
    endo: 'endomorfo',
    meso: 'mesomorfo',
    ecto: 'ectomorfo',
  };
  return `${map[first.k]} (secundario ${map[second.k]})`;
}

// ── TMB / BMR ─────────────────────────────────────────────────────────────────

/**
 * Mifflin-St Jeor (1990) — recomendada actualmente en clínica.
 * ♂: 10·peso + 6.25·talla − 5·edad + 5
 * ♀: 10·peso + 6.25·talla − 5·edad − 161
 */
export function mifflinStJeor(input: BmrInputs): BmrResult {
  assertPositive('weightKg', input.weightKg);
  assertPositive('heightCm', input.heightCm);
  assertNonNegative('ageYears', input.ageYears);

  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears;
  const bmr = input.sex === 'male' ? base + 5 : base - 161;

  return {
    bmrKcal: round(bmr, 0),
    formula:
      input.sex === 'male'
        ? `Mifflin-St Jeor ♂: 10×${input.weightKg}+6.25×${input.heightCm}−5×${input.ageYears}+5`
        : `Mifflin-St Jeor ♀: 10×${input.weightKg}+6.25×${input.heightCm}−5×${input.ageYears}−161`,
  };
}

/**
 * Harris-Benedict revisada (Roza & Shizgal, 1984).
 * ♂: 88.362 + 13.397·peso + 4.799·talla − 5.677·edad
 * ♀: 447.593 + 9.247·peso + 3.098·talla − 4.330·edad
 */
export function harrisBenedict(input: BmrInputs): BmrResult {
  assertPositive('weightKg', input.weightKg);
  assertPositive('heightCm', input.heightCm);
  assertNonNegative('ageYears', input.ageYears);

  const bmr =
    input.sex === 'male'
      ? 88.362 + 13.397 * input.weightKg + 4.799 * input.heightCm - 5.677 * input.ageYears
      : 447.593 + 9.247 * input.weightKg + 3.098 * input.heightCm - 4.33 * input.ageYears;

  return {
    bmrKcal: round(bmr, 0),
    formula:
      input.sex === 'male'
        ? `Harris-Benedict 1984 ♂: 88.362+13.397×${input.weightKg}+4.799×${input.heightCm}−5.677×${input.ageYears}`
        : `Harris-Benedict 1984 ♀: 447.593+9.247×${input.weightKg}+3.098×${input.heightCm}−4.330×${input.ageYears}`,
  };
}

/**
 * TDEE = TMB × factor de actividad (sedentario 1.2 … muy activo 1.9).
 */
export function calculateTdee(bmrKcal: number, activityFactor = 1.375): number {
  assertPositive('bmrKcal', bmrKcal);
  assertPositive('activityFactor', activityFactor);
  return round(bmrKcal * activityFactor, 0);
}

/** Fachada orientada a objeto (opcional) para inyección / tests. */
export const AnthropometryService = {
  bodyFatFromDensitySiri,
  jacksonPollock7,
  jacksonPollock3,
  faulkner4,
  heathCarterSomatotype,
  mifflinStJeor,
  harrisBenedict,
  calculateTdee,
} as const;

export default AnthropometryService;
