/**
 * Hardware Adapter — contratos base (Fase 3 / PLAN_NUTRICION)
 *
 * Abstrae Withings, InBody (y futuros dispositivos) hacia un DTO listo
 * para persistir en `kinesys.nutrition_evaluations`.
 *
 * Regla de negocio: cuando `source` es WITHINGS | INBODY, el % de grasa
 * del hardware prevalece; no se recalcula con Jackson-Pollock / Faulkner.
 */

/** Coincide con `kinesys.nutrition_eval_source` (excluye MANUAL_ISAK en adapters). */
export type HardwareEvaluationSource = 'WITHINGS' | 'INBODY';

export type NutritionEvalSource = 'MANUAL_ISAK' | HardwareEvaluationSource;

/** Segmentos corporales estándar (kg o % según el proveedor; documentado en adapter). */
export interface SegmentalRegionValues {
  right_arm: number | null;
  left_arm: number | null;
  trunk: number | null;
  right_leg: number | null;
  left_leg: number | null;
}

/**
 * Forma canónica de `segmental_composition_json` en nutrition_evaluations.
 * Ambos adaptadores deben producir este shape.
 */
export interface SegmentalCompositionJson {
  /** Masa grasa segmental (kg) o % — ver `unit` en `meta`. */
  fat: SegmentalRegionValues;
  /** Masa muscular segmental (kg) o % lean. */
  muscle: SegmentalRegionValues;
  meta?: {
    unit?: 'kg' | 'percent' | 'mixed';
    provider?: HardwareEvaluationSource;
    raw_measure_ids?: number[];
    notes?: string;
  };
}

/**
 * DTO alineado con columnas de `kinesys.nutrition_evaluations`.
 * Listo para INSERT/UPSERT tras añadir tenant_id / professional_id en el controlador.
 */
export interface StandardizedHardwareEvaluation {
  patient_id: string;
  source: HardwareEvaluationSource;
  /** Fecha clínica (YYYY-MM-DD). */
  evaluation_date: string;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_pct: number | null;
  visceral_fat_index: number | null;
  bmr: number | null;
  /**
   * Vacío en flujo hardware (pliegues ISAK no aplican).
   * Se deja explícito para que el controlador no mezcle orígenes.
   */
  measurements_json: Record<string, unknown>;
  segmental_composition_json: SegmentalCompositionJson;
  /** Hardware no calcula Heath-Carter; objeto vacío por defecto. */
  somatotype_json: Record<string, unknown>;
  notes?: string | null;
  /** Trazabilidad / debug (no es columna DB; el controlador puede omitirlo). */
  provider_meta?: {
    device_model?: string;
    measured_at?: string;
    external_user_id?: string;
    raw?: unknown;
  };
}

/** Credenciales OAuth Withings (u otro token bearer). */
export interface OAuthHardwareAuth {
  accessToken: string;
  refreshToken?: string;
  /** Withings userid numérico o UUID del vínculo paciente↔dispositivo. */
  externalUserId?: string | number;
}

/** Payload crudo InBody / LookinBody / Health Connect. */
export interface HardwareWebhookPayload {
  kind: 'lookinbody' | 'health_connect' | 'csv' | 'json';
  body: unknown;
}

export type HardwareAdapterAuthOrPayload = OAuthHardwareAuth | HardwareWebhookPayload;

export interface FetchEvaluationOptions {
  /** Si true, no llama red: usa fixtures internas (dev / demos). */
  dryRun?: boolean;
  /** Límite inferior unix (Withings startdate). */
  sinceUnix?: number;
}

/**
 * Contrato Adapter: un único método de entrada para el controlador.
 */
export interface INutritionHardwareAdapter {
  readonly source: HardwareEvaluationSource;

  /**
   * Obtiene la última evaluación del paciente y la normaliza al DTO estándar.
   * @param patientId UUID de `kinesys.pacientes_clinicos`
   * @param authOrPayload OAuth (Withings) o webhook/archivo (InBody)
   */
  fetchEvaluation(
    patientId: string,
    authOrPayload: HardwareAdapterAuthOrPayload,
    options?: FetchEvaluationOptions
  ): Promise<StandardizedHardwareEvaluation>;
}

export function emptySegmentalRegions(): SegmentalRegionValues {
  return {
    right_arm: null,
    left_arm: null,
    trunk: null,
    right_leg: null,
    left_leg: null,
  };
}

export function emptySegmentalComposition(
  provider?: HardwareEvaluationSource
): SegmentalCompositionJson {
  return {
    fat: emptySegmentalRegions(),
    muscle: emptySegmentalRegions(),
    meta: { unit: 'kg', provider, notes: 'sin datos segmentales' },
  };
}

export function todayIsoDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
