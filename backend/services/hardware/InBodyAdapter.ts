/**
 * InBodyAdapter — Fase 3.2 (PLAN_NUTRICION)
 *
 * Parsea payloads LookinBody / Health Connect / JSON export y los normaliza
 * al DTO `StandardizedHardwareEvaluation` (source = INBODY).
 *
 * Regla de negocio: body_fat_pct y visceral_fat_index del dispositivo
 * prevalecen; el controlador no debe invocar Jackson-Pollock.
 */

import {
  emptySegmentalComposition,
  emptySegmentalRegions,
  FetchEvaluationOptions,
  HardwareAdapterAuthOrPayload,
  HardwareWebhookPayload,
  INutritionHardwareAdapter,
  SegmentalCompositionJson,
  SegmentalRegionValues,
  StandardizedHardwareEvaluation,
  todayIsoDate,
} from './HardwareAdapter.interface';

/** Campos frecuentes LookinBody / InBody H20–H40 / DSM-BIA exports. */
export interface LookinBodyRawEvaluation {
  USER_ID?: string;
  DATETIMES?: string;
  DATE?: string;
  WEIGHT?: number | string;
  HEIGHT?: number | string;
  PBF?: number | string; // Percent Body Fat
  VFL?: number | string; // Visceral Fat Level
  VFA?: number | string; // Visceral Fat Area (cm²) — se usa como índice si no hay VFL
  BMR?: number | string;
  // Segmental Lean / Fat (nomenclatura LookinBody)
  PBFRA?: number | string; // % fat right arm
  PBFLA?: number | string;
  PBFT?: number | string; // trunk
  PBFRR?: number | string; // right leg (RL)
  PBFLR?: number | string;
  LRA?: number | string; // lean mass right arm kg
  LLA?: number | string;
  LT?: number | string;
  LRL?: number | string;
  LLL?: number | string;
  FRA?: number | string; // fat mass right arm kg
  FLA?: number | string;
  FT?: number | string;
  FRL?: number | string;
  FLL?: number | string;
  EQUIP?: string;
  [key: string]: unknown;
}

export interface InBodyAdapterConfig {
  /** Preferir masa (kg) sobre % cuando ambos existan. */
  preferMassOverPercent?: boolean;
}

function isWebhookPayload(
  value: HardwareAdapterAuthOrPayload
): value is HardwareWebhookPayload {
  return typeof value === 'object' && value !== null && 'kind' in value && 'body' in value;
}

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function firstDefined(...values: Array<number | null>): number | null {
  for (const v of values) {
    if (v != null) return v;
  }
  return null;
}

/**
 * Normaliza distintas formas de payload a un registro LookinBody plano.
 */
export function coerceLookinBodyRecord(body: unknown): LookinBodyRawEvaluation {
  if (body == null) throw new Error('InBodyAdapter: payload vacío.');

  if (typeof body === 'string') {
    try {
      return coerceLookinBodyRecord(JSON.parse(body));
    } catch {
      throw new Error('InBodyAdapter: string no es JSON válido.');
    }
  }

  if (Array.isArray(body)) {
    if (body.length === 0) throw new Error('InBodyAdapter: array vacío.');
    return coerceLookinBodyRecord(body[0]);
  }

  if (typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    // LookinBody a veces envuelve en { data: { ... } } o { InBody: {...} }
    if (obj.data && typeof obj.data === 'object') {
      return coerceLookinBodyRecord(obj.data);
    }
    if (obj.InBody && typeof obj.InBody === 'object') {
      return coerceLookinBodyRecord(obj.InBody);
    }
    if (obj.results && Array.isArray(obj.results)) {
      return coerceLookinBodyRecord(obj.results[0]);
    }
    return obj as LookinBodyRawEvaluation;
  }

  throw new Error('InBodyAdapter: tipo de payload no soportado.');
}

export function mapInBodySegmental(
  raw: LookinBodyRawEvaluation,
  preferMassOverPercent = true
): SegmentalCompositionJson {
  const fatMass: SegmentalRegionValues = {
    right_arm: num(raw.FRA),
    left_arm: num(raw.FLA),
    trunk: num(raw.FT),
    right_leg: num(raw.FRL),
    left_leg: num(raw.FLL),
  };

  const fatPct: SegmentalRegionValues = {
    right_arm: num(raw.PBFRA),
    left_arm: num(raw.PBFLA),
    trunk: num(raw.PBFT),
    right_leg: num(raw.PBFRR),
    left_leg: num(raw.PBFLR),
  };

  const muscle: SegmentalRegionValues = {
    right_arm: num(raw.LRA),
    left_arm: num(raw.LLA),
    trunk: num(raw.LT),
    right_leg: num(raw.LRL),
    left_leg: num(raw.LLL),
  };

  const hasMass = Object.values(fatMass).some((v) => v != null);
  const hasPct = Object.values(fatPct).some((v) => v != null);
  const hasMuscle = Object.values(muscle).some((v) => v != null);

  if (!hasMass && !hasPct && !hasMuscle) {
    return emptySegmentalComposition('INBODY');
  }

  const useMass = preferMassOverPercent ? hasMass || !hasPct : hasPct && !hasMass ? false : hasMass;

  return {
    fat: useMass ? fatMass : hasPct ? fatPct : fatMass,
    muscle: hasMuscle ? muscle : emptySegmentalRegions(),
    meta: {
      unit: useMass ? 'kg' : 'percent',
      provider: 'INBODY',
      notes: 'DSM-BIA LookinBody / InBody segmental lean & fat',
    },
  };
}

export function createInBodyDemoPayload(): LookinBodyRawEvaluation {
  return {
    USER_ID: 'demo-inbody',
    DATETIMES: new Date().toISOString(),
    WEIGHT: 68.4,
    HEIGHT: 165.0,
    PBF: 28.6,
    VFL: 9,
    BMR: 1320,
    FRA: 1.1,
    FLA: 1.05,
    FT: 9.2,
    FRL: 3.4,
    FLL: 3.3,
    LRA: 2.4,
    LLA: 2.35,
    LT: 18.5,
    LRL: 7.1,
    LLL: 7.0,
    EQUIP: 'InBody H40',
  };
}

function resolveEvaluationDate(raw: LookinBodyRawEvaluation): string {
  const candidates = [raw.DATETIMES, raw.DATE];
  for (const c of candidates) {
    if (!c) continue;
    const d = new Date(String(c));
    if (!Number.isNaN(d.getTime())) return todayIsoDate(d);
  }
  return todayIsoDate();
}

export class InBodyAdapter implements INutritionHardwareAdapter {
  readonly source = 'INBODY' as const;

  constructor(private readonly config: InBodyAdapterConfig = {}) {}

  async fetchEvaluation(
    patientId: string,
    authOrPayload: HardwareAdapterAuthOrPayload,
    options: FetchEvaluationOptions = {}
  ): Promise<StandardizedHardwareEvaluation> {
    if (!patientId?.trim()) {
      throw new Error('InBodyAdapter: patientId es obligatorio.');
    }

    let raw: LookinBodyRawEvaluation;

    if (options.dryRun) {
      raw = createInBodyDemoPayload();
    } else if (isWebhookPayload(authOrPayload)) {
      raw = coerceLookinBodyRecord(authOrPayload.body);
    } else {
      throw new Error(
        'InBodyAdapter espera HardwareWebhookPayload { kind, body } (LookinBody / Health Connect).'
      );
    }

    const weight = num(raw.WEIGHT);
    const height = num(raw.HEIGHT);
    const bodyFat = num(raw.PBF);
    const visceral = firstDefined(num(raw.VFL), num(raw.VFA));
    const bmr = num(raw.BMR);

    const evaluation: StandardizedHardwareEvaluation = {
      patient_id: patientId,
      source: 'INBODY',
      evaluation_date: resolveEvaluationDate(raw),
      weight_kg: weight != null ? round(weight, 3) : null,
      height_cm: height != null ? round(height, 2) : null,
      body_fat_pct: bodyFat != null ? round(bodyFat, 2) : null,
      visceral_fat_index: visceral != null ? round(visceral, 2) : null,
      bmr: bmr != null ? round(bmr, 2) : null,
      measurements_json: {},
      segmental_composition_json: mapInBodySegmental(
        raw,
        this.config.preferMassOverPercent !== false
      ),
      somatotype_json: {},
      notes:
        'Origen InBody/LookinBody. Usar PBF y VFL del dispositivo; no recalcular pliegues.',
      provider_meta: {
        device_model: String(raw.EQUIP || 'InBody'),
        measured_at: raw.DATETIMES ? String(raw.DATETIMES) : undefined,
        external_user_id: raw.USER_ID ? String(raw.USER_ID) : undefined,
        raw: options.dryRun ? undefined : raw,
      },
    };

    return evaluation;
  }
}

export default InBodyAdapter;
