/**
 * Cálculos ISAK / composición corporal para el frontend CORE BODY.
 * Espejo clínico de backend/services/AnthropometryService.ts
 */

export type IsaKEquationId =
  | 'faulkner'
  | 'yuhasz'
  | 'jackson_pollock_3'
  | 'jackson_pollock_7'
  | 'durnin_womersley';

export interface SkinfoldSet {
  triceps: number;
  subscapular: number;
  biceps?: number;
  iliac_crest?: number;
  suprailiac: number;
  abdominal: number;
  thigh?: number;
  calf?: number;
  chest?: number;
  midaxillary?: number;
}

export interface BodyFatResult {
  bodyFatPct: number;
  fatMassKg: number;
  leanMassKg: number;
  formula: string;
  formulaLatex: string;
  classification: { label: string; tone: 'green' | 'amber' | 'red' | 'blue' };
}

export interface SomatotypeResult {
  endomorphy: number;
  mesomorphy: number;
  ectomorphy: number;
  dominant: 'Ectomorfo' | 'Mesomorfo' | 'Endomorfo' | 'Equilibrado';
  description: string;
}

function round(n: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function siri(bd: number): number {
  return (495 / bd) - 450;
}

export function classifyBodyFat(pct: number, gender: 'male' | 'female' | 'other'): BodyFatResult['classification'] {
  if (gender === 'male') {
    if (pct < 6) return { label: 'Esencial / Bajo', tone: 'amber' };
    if (pct <= 13) return { label: 'Atlético', tone: 'blue' };
    if (pct <= 17) return { label: 'Rango saludable', tone: 'green' };
    if (pct <= 24) return { label: 'Aceptable', tone: 'amber' };
    return { label: 'Elevado', tone: 'red' };
  }
  if (pct < 14) return { label: 'Esencial / Bajo', tone: 'amber' };
  if (pct <= 20) return { label: 'Atlético', tone: 'blue' };
  if (pct <= 24) return { label: 'Rango saludable', tone: 'green' };
  if (pct <= 31) return { label: 'Aceptable', tone: 'amber' };
  return { label: 'Elevado', tone: 'red' };
}

export function faulkner4(folds: SkinfoldSet, weightKg: number): BodyFatResult {
  const sum = folds.triceps + folds.subscapular + folds.suprailiac + folds.abdominal;
  const bodyFatPct = round(sum * 0.153 + 5.783, 1);
  const fatMassKg = round((bodyFatPct / 100) * weightKg, 1);
  return {
    bodyFatPct,
    fatMassKg,
    leanMassKg: round(weightKg - fatMassKg, 1),
    formula: `Faulkner (1968) — 4 pliegues · Σ=${round(sum, 1)} mm`,
    formulaLatex: '%GC = (Σ4 × 0.153) + 5.783',
    classification: classifyBodyFat(bodyFatPct, 'male'),
  };
}

/**
 * Yuhasz (1974) — 6 pliegues típicos ISAK/deportivo.
 * Hombres: %GC = (Σ6 × 0.1051) + 2.585
 * Mujeres: %GC = (Σ6 × 0.1548) + 3.580
 * Σ6 = tríceps + subescapular + suprailiaco + abdominal + muslo + pierna
 */
export function yuhasz6(
  gender: 'male' | 'female' | 'other',
  folds: SkinfoldSet,
  weightKg: number,
): BodyFatResult {
  const sum =
    folds.triceps +
    folds.subscapular +
    folds.suprailiac +
    folds.abdominal +
    (folds.thigh || 0) +
    (folds.calf || 0);
  const female = gender === 'female';
  const bodyFatPct = round(female ? sum * 0.1548 + 3.58 : sum * 0.1051 + 2.585, 1);
  const fatMassKg = round((bodyFatPct / 100) * weightKg, 1);
  return {
    bodyFatPct,
    fatMassKg,
    leanMassKg: round(weightKg - fatMassKg, 1),
    formula: `Yuhasz (1974) — 6 pliegues (${female ? '♀' : '♂'}) · Σ=${round(sum, 1)} mm`,
    formulaLatex: female
      ? '%GC = (Σ6 × 0.1548) + 3.580'
      : '%GC = (Σ6 × 0.1051) + 2.585',
    classification: classifyBodyFat(bodyFatPct, gender),
  };
}

export function jacksonPollock3(
  gender: 'male' | 'female' | 'other',
  age: number,
  folds: SkinfoldSet,
  weightKg: number,
): BodyFatResult {
  const sex = gender === 'female' ? 'female' : 'male';
  const sum =
    sex === 'male'
      ? (folds.chest || folds.abdominal) + folds.abdominal + (folds.thigh || 0)
      : folds.triceps + folds.suprailiac + (folds.thigh || 0);
  const sumSq = sum * sum;
  const bd =
    sex === 'male'
      ? 1.10938 - 0.0008267 * sum + 0.0000016 * sumSq - 0.0002574 * age
      : 1.0994921 - 0.0009929 * sum + 0.0000023 * sumSq - 0.0001392 * age;
  const bodyFatPct = round(Math.min(65, Math.max(4, siri(bd))), 1);
  const fatMassKg = round((bodyFatPct / 100) * weightKg, 1);
  return {
    bodyFatPct,
    fatMassKg,
    leanMassKg: round(weightKg - fatMassKg, 1),
    formula: `Jackson-Pollock 3 pliegues (${sex}) · Σ=${round(sum, 1)} mm`,
    formulaLatex:
      sex === 'male'
        ? 'BD = 1.10938 − 0.0008267·Σ + 0.0000016·Σ² − 0.0002574·edad'
        : 'BD = 1.0994921 − 0.0009929·Σ + 0.0000023·Σ² − 0.0001392·edad',
    classification: classifyBodyFat(bodyFatPct, gender),
  };
}

export function jacksonPollock7(
  gender: 'male' | 'female' | 'other',
  age: number,
  folds: SkinfoldSet,
  weightKg: number,
): BodyFatResult {
  const sex = gender === 'female' ? 'female' : 'male';
  const sum =
    (folds.chest || folds.abdominal * 0.9) +
    (folds.midaxillary || folds.iliac_crest || folds.suprailiac) +
    folds.triceps +
    folds.subscapular +
    folds.abdominal +
    folds.suprailiac +
    (folds.thigh || 0);
  const sumSq = sum * sum;
  const bd =
    sex === 'male'
      ? 1.112 - 0.00043499 * sum + 0.00000055 * sumSq - 0.00028826 * age
      : 1.097 - 0.00046971 * sum + 0.00000056 * sumSq - 0.00012828 * age;
  const bodyFatPct = round(Math.min(65, Math.max(4, siri(bd))), 1);
  const fatMassKg = round((bodyFatPct / 100) * weightKg, 1);
  return {
    bodyFatPct,
    fatMassKg,
    leanMassKg: round(weightKg - fatMassKg, 1),
    formula: `Jackson-Pollock 7 pliegues (${sex}) · Σ=${round(sum, 1)} mm`,
    formulaLatex: 'BD = a − b·Σ + c·Σ² − d·edad → %GC = 495/BD − 450',
    classification: classifyBodyFat(bodyFatPct, gender),
  };
}

export function durninWomersley(
  gender: 'male' | 'female' | 'other',
  age: number,
  folds: SkinfoldSet,
  weightKg: number,
): BodyFatResult {
  const sum = folds.triceps + folds.subscapular + folds.suprailiac + folds.abdominal;
  const logSum = Math.log10(Math.max(sum, 1));
  let density = 1.15;
  if (gender === 'male') {
    density = age < 30 ? 1.1631 - 0.0632 * logSum : age < 50 ? 1.1422 - 0.0544 * logSum : 1.1295 - 0.0489 * logSum;
  } else {
    density = age < 30 ? 1.1599 - 0.0717 * logSum : age < 50 ? 1.1423 - 0.0632 * logSum : 1.1333 - 0.0612 * logSum;
  }
  const bodyFatPct = round(Math.min(65, Math.max(4, (4.95 / density - 4.5) * 100)), 1);
  const fatMassKg = round((bodyFatPct / 100) * weightKg, 1);
  return {
    bodyFatPct,
    fatMassKg,
    leanMassKg: round(weightKg - fatMassKg, 1),
    formula: `Durnin-Womersley / Siri · Σ4=${round(sum, 1)} mm`,
    formulaLatex: '%GC = (4.95 / D − 4.50) × 100',
    classification: classifyBodyFat(bodyFatPct, gender),
  };
}

export function estimateBodyFat(
  equation: IsaKEquationId,
  gender: 'male' | 'female' | 'other',
  age: number,
  folds: SkinfoldSet,
  weightKg: number,
): BodyFatResult {
  switch (equation) {
    case 'faulkner': {
      const r = faulkner4(folds, weightKg);
      return { ...r, classification: classifyBodyFat(r.bodyFatPct, gender) };
    }
    case 'yuhasz':
      return yuhasz6(gender, folds, weightKg);
    case 'jackson_pollock_3':
      return jacksonPollock3(gender, age, folds, weightKg);
    case 'jackson_pollock_7':
      return jacksonPollock7(gender, age, folds, weightKg);
    default:
      return durninWomersley(gender, age, folds, weightKg);
  }
}

export const EQUATION_OPTIONS: { id: IsaKEquationId; label: string }[] = [
  { id: 'faulkner', label: 'Faulkner (1968) — 4 pliegues' },
  { id: 'yuhasz', label: 'Yuhasz (1974) — 6 pliegues' },
  { id: 'jackson_pollock_3', label: 'Jackson-Pollock — 3 pliegues' },
  { id: 'jackson_pollock_7', label: 'Jackson-Pollock — 7 pliegues' },
  { id: 'durnin_womersley', label: 'Durnin-Womersley / Siri' },
];

export function calculateWHtR(waistCm: number, heightCm: number): {
  ratio: number;
  status: 'Normal' | 'Riesgo' | 'Alto riesgo';
} {
  if (!heightCm) return { ratio: 0, status: 'Normal' };
  const ratio = round(waistCm / heightCm, 2);
  if (ratio < 0.5) return { ratio, status: 'Normal' };
  if (ratio < 0.6) return { ratio, status: 'Riesgo' };
  return { ratio, status: 'Alto riesgo' };
}

export function calculateArmRatio(flexed?: number, relaxed?: number): {
  ratio: number;
  status: 'Normal' | 'Riesgo';
} {
  if (!flexed || !relaxed || relaxed <= 0) return { ratio: 0, status: 'Normal' };
  const ratio = round(flexed / relaxed, 2);
  return { ratio, status: ratio >= 1.02 && ratio <= 1.2 ? 'Normal' : 'Riesgo' };
}

export function heathCarterSomatotype(input: {
  tricepsMm: number;
  subscapularMm: number;
  suprailiacMm: number;
  medialCalfMm: number;
  humerusCm: number;
  femurCm: number;
  flexedArmCm: number;
  calfCm: number;
  heightCm: number;
  weightKg: number;
}): SomatotypeResult {
  const {
    tricepsMm,
    subscapularMm,
    suprailiacMm,
    medialCalfMm,
    humerusCm,
    femurCm,
    flexedArmCm,
    calfCm,
    heightCm,
    weightKg,
  } = input;

  const sum3 = tricepsMm + subscapularMm + suprailiacMm;
  const heightCorrection = 170.18 / Math.max(heightCm, 1);
  const X = sum3 * heightCorrection;
  let endomorphy = -0.7182 + 0.1451 * X - 0.00068 * X * X + 0.0000014 * X * X * X;
  endomorphy = Math.max(0.1, round(endomorphy, 1));

  const correctedArm = flexedArmCm - tricepsMm / 10;
  const correctedCalf = calfCm - medialCalfMm / 10;
  let mesomorphy =
    0.858 * humerusCm +
    0.601 * femurCm +
    0.188 * correctedArm +
    0.161 * correctedCalf -
    0.131 * heightCm +
    4.5;
  mesomorphy = Math.max(0.1, round(mesomorphy, 1));

  const hwr = heightCm / Math.cbrt(Math.max(weightKg, 1));
  let ectomorphy: number;
  if (hwr >= 40.75) ectomorphy = 0.732 * hwr - 28.58;
  else if (hwr > 38.25) ectomorphy = 0.463 * hwr - 17.63;
  else ectomorphy = 0.1;
  ectomorphy = Math.max(0.1, round(ectomorphy, 1));

  const max = Math.max(endomorphy, mesomorphy, ectomorphy);
  let dominant: SomatotypeResult['dominant'] = 'Equilibrado';
  let description =
    'Distribución equilibrada entre linealidad, muscularidad y adiposidad relativa.';
  if (max === mesomorphy && mesomorphy - endomorphy >= 0.5 && mesomorphy - ectomorphy >= 0.5) {
    dominant = 'Mesomorfo';
    description =
      'Predominio de desarrollo musculoesquelético, con adecuado balance entre linealidad y robustez ósea.';
  } else if (max === endomorphy && endomorphy - mesomorphy >= 0.5) {
    dominant = 'Endomorfo';
    description =
      'Predominio de adiposidad relativa. Considerar estrategia de recomposición y control de perímetros centrales.';
  } else if (max === ectomorphy && ectomorphy - mesomorphy >= 0.5) {
    dominant = 'Ectomorfo';
    description =
      'Predominio de linealidad y delgadez relativa. Priorizar densificación ósea-muscular progresiva.';
  }

  return { endomorphy, mesomorphy, ectomorphy, dominant, description };
}
