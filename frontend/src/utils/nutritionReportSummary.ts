import type { EvaluacionAntropometrica, PacienteClinico, PlanNutricional } from '../types';

export type BadgeTone = 'ok' | 'warn' | 'alert' | 'neutral';

export interface Badge {
  label: string;
  tone: BadgeTone;
}

const isFemale = (p?: PacienteClinico | null, e?: EvaluacionAntropometrica | null) => {
  const g = String(e?.gender ?? p?.gender ?? '').toLowerCase();
  return g === 'f' || g === 'female' || g === 'femenino';
};

export function bmiBadge(bmi: number): Badge {
  if (!(bmi > 0)) return { label: 'Sin dato', tone: 'neutral' };
  if (bmi < 18.5) return { label: 'Bajo peso', tone: 'warn' };
  if (bmi < 25) return { label: 'Normopeso', tone: 'ok' };
  if (bmi < 30) return { label: 'Sobrepeso', tone: 'warn' };
  return { label: 'Obesidad', tone: 'alert' };
}

export function fatPctBadge(pct: number, female: boolean): Badge {
  if (!(pct > 0)) return { label: 'Sin dato', tone: 'neutral' };
  const [min, max] = female ? [18, 28] : [10, 20];
  if (pct < min) return { label: 'Bajo', tone: 'warn' };
  if (pct <= max) return { label: 'Rango saludable', tone: 'ok' };
  return { label: 'Elevado', tone: 'alert' };
}

export function visceralBadge(level: number): Badge {
  if (!(level > 0)) return { label: 'Sin dato', tone: 'neutral' };
  if (level <= 9) return { label: 'Normal', tone: 'ok' };
  if (level <= 14) return { label: 'Alto', tone: 'warn' };
  return { label: 'Muy alto', tone: 'alert' };
}

export function whrBadge(whr: number, female: boolean): Badge {
  if (!(whr > 0)) return { label: 'Sin dato', tone: 'neutral' };
  const limit = female ? 0.85 : 0.9;
  return whr <= limit ? { label: 'Riesgo bajo', tone: 'ok' } : { label: 'Riesgo elevado', tone: 'alert' };
}

export function whtrBadge(whtr: number): Badge {
  if (!(whtr > 0)) return { label: 'Sin dato', tone: 'neutral' };
  return whtr <= 0.5 ? { label: 'Normal', tone: 'ok' } : { label: 'Riesgo aumentado', tone: 'alert' };
}

export const EQUATION_LABELS: Record<string, string> = {
  faulkner_4: 'Faulkner (4 pliegues)',
  jackson_pollock_3: 'Jackson-Pollock (3 pliegues)',
  jackson_pollock_7: 'Jackson-Pollock (7 pliegues)',
  durnin_womersley_4: 'Durnin-Womersley (4 pliegues)',
  carter_somatotype: 'Carter (somatotipo)',
};

export interface NutritionReportInput {
  patient: PacienteClinico;
  isak?: EvaluacionAntropometrica | null;
  withings?: EvaluacionAntropometrica | null;
  plan?: PlanNutricional | null;
}

export interface NutritionReportSummary {
  patientName: string;
  isak: null | {
    date: string;
    fatPct: number;
    fatMassKg: number;
    fatFreeMassKg: number;
    whr: number;
    somatotype: string;
    equation: string;
  };
  withings: null | {
    date: string;
    weightKg: number;
    bmi: number;
    fatPct: number;
    muscleKg: number;
    hydrationKg: number;
    visceral: number;
  };
  plan: null | {
    name: string;
    objective: string;
    targetKcal: number;
    plannedKcal: number;
    proteinG: number;
    carbsG: number;
    fatsG: number;
    meals: number;
    hydrationLiters: number;
  };
}

export function planTotals(plan: PlanNutricional) {
  const meals = plan.meals ?? [];
  return {
    kcal: Math.round(meals.reduce((s, m) => s + (m.total_calories || 0), 0)),
    protein: Math.round(meals.reduce((s, m) => s + (m.total_protein || 0), 0) * 10) / 10,
    carbs: Math.round(meals.reduce((s, m) => s + (m.total_carbs || 0), 0) * 10) / 10,
    fats: Math.round(meals.reduce((s, m) => s + (m.total_fats || 0), 0) * 10) / 10,
  };
}

/** Cifras clave de los 3 bloques; las usan el PDF y el correo para no divergir. */
export function buildNutritionReportSummary(input: NutritionReportInput): NutritionReportSummary {
  const { patient, isak, withings, plan } = input;
  const day = (v?: string) => String(v ?? '').slice(0, 10);
  const totals = plan ? planTotals(plan) : null;
  return {
    patientName: `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim() || 'Paciente',
    isak: isak
      ? {
          date: day(isak.evaluation_date),
          fatPct: Number(isak.body_fat_percentage) || 0,
          fatMassKg: Number(isak.fat_mass_kg) || 0,
          fatFreeMassKg: Number(isak.fat_free_mass_kg) || 0,
          whr: Number(isak.waist_hip_ratio) || 0,
          somatotype: isak.somatotype_category ?? '',
          equation: EQUATION_LABELS[isak.isak_equation ?? ''] ?? isak.isak_equation ?? '',
        }
      : null,
    withings: withings
      ? {
          date: day(withings.evaluation_date),
          weightKg: Number(withings.weight_kg) || 0,
          bmi: Number(withings.bmi) || 0,
          fatPct: Number(withings.body_fat_percentage) || Number(withings.fat_ratio_percent) || 0,
          muscleKg: Number(withings.muscle_mass_kg) || 0,
          hydrationKg: Number(withings.hydration_kg) || 0,
          visceral: Number(withings.visceral_fat_index) || 0,
        }
      : null,
    plan:
      plan && totals
        ? {
            name: plan.plan_name,
            objective: plan.objective ?? '',
            targetKcal: Number(plan.caloric_target_kcal) || totals.kcal,
            plannedKcal: totals.kcal,
            proteinG: Number(plan.macros_target?.protein_grams) || totals.protein,
            carbsG: Number(plan.macros_target?.carbs_grams) || totals.carbs,
            fatsG: Number(plan.macros_target?.fats_grams) || totals.fats,
            meals: plan.meals?.length ?? 0,
            hydrationLiters: Number(plan.hydration_target_liters) || 0,
          }
        : null,
  };
}

export { isFemale };
