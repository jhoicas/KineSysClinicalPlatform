import type { EvaluacionAntropometrica, PlanNutricional } from '../types';

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

const WITHINGS_SOURCES = new Set(['withings_scale', 'WITHINGS', 'withings_manual']);

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

export function selectNutritionSnapshot(
  evaluations: EvaluacionAntropometrica[],
  plans: PlanNutricional[],
): NutritionReportSnapshot {
  return {
    isak: latest(evaluations.filter(isIsakRecord)),
    withings: latest(evaluations.filter(isWithingsRecord)),
    plan: selectActivePlan(plans),
  };
}
