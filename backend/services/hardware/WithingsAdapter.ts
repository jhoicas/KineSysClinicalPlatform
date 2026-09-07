/**
 * WithingsAdapter — Fase 3.1 (PLAN_NUTRICION)
 *
 * Integra Withings Measure API (OAuth 2.0 + measure-getmeas) y mapea
 * Fat/Muscle Mass segmental hacia `segmental_composition_json`.
 *
 * Referencia meastypes:
 *   1 peso, 4 altura(m), 6 fat ratio %, 170 visceral, 226 BMR,
 *   174 fat mass segments, 175 muscle mass segments
 *
 * @see https://developer.withings.com/
 */

import {
  emptySegmentalComposition,
  emptySegmentalRegions,
  FetchEvaluationOptions,
  HardwareAdapterAuthOrPayload,
  INutritionHardwareAdapter,
  OAuthHardwareAuth,
  SegmentalCompositionJson,
  SegmentalRegionValues,
  StandardizedHardwareEvaluation,
  todayIsoDate,
} from './HardwareAdapter.interface';

/** Códigos oficiales Withings Measure API usados por este adapter. */
export const WITHINGS_MEASTYPE = {
  WEIGHT: 1,
  HEIGHT_M: 4,
  FAT_RATIO_PCT: 6,
  FAT_MASS_KG: 8,
  MUSCLE_MASS_KG: 76,
  VISCERAL_FAT: 170,
  FAT_MASS_SEGMENTS: 174,
  MUSCLE_MASS_SEGMENTS: 175,
  BMR: 226,
} as const;

/**
 * Orden típico de segmentos Body Scan en medidas 174/175
 * (array de 5 valores en kg, cuando el dispositivo los expone así).
 * Si Withings cambia el orden, ajustar este mapa.
 */
export const WITHINGS_SEGMENT_ORDER = [
  'right_arm',
  'left_arm',
  'trunk',
  'right_leg',
  'left_leg',
] as const satisfies ReadonlyArray<keyof SegmentalRegionValues>;

export interface WithingsMeasurePoint {
  value: number;
  unit: number;
  type: number;
  /** Algunos firmwares adjuntan position / typeext para segmentos. */
  typeext?: number;
  position?: number;
}

export interface WithingsMeasureGroup {
  grpid: number;
  date: number;
  measures: WithingsMeasurePoint[];
}

export interface WithingsGetMeasResponse {
  status: number;
  body?: {
    measuregrps?: WithingsMeasureGroup[];
  };
}

export interface WithingsAdapterConfig {
  /** Base URL Measure API. */
  apiBaseUrl?: string;
  /** Inyectable para tests / dry-run. */
  httpPost?: (url: string, init: RequestInit) => Promise<Response>;
}

function isOAuthAuth(value: HardwareAdapterAuthOrPayload): value is OAuthHardwareAuth {
  return typeof value === 'object' && value !== null && 'accessToken' in value;
}

/** Aplica unit Withings: valor real = value * 10^unit */
export function applyWithingsUnit(value: number, unit: number): number {
  return value * 10 ** unit;
}

export function mapSegmentArrayToRegions(
  values: Array<number | null | undefined>
): SegmentalRegionValues {
  const regions = emptySegmentalRegions();
  WITHINGS_SEGMENT_ORDER.forEach((key, idx) => {
    const raw = values[idx];
    regions[key] = raw == null || !Number.isFinite(raw) ? null : Number(raw);
  });
  return regions;
}

/**
 * Extrae el array segmental de una medida tipo 174/175.
 * Withings puede devolverlo como:
 * - varios measures del mismo type con `position` 0..4
 * - o un único measure cuyo `value` no aplica (en demos usamos typeext)
 */
export function extractSegmentalKg(
  measures: WithingsMeasurePoint[],
  meastype: number
): SegmentalRegionValues {
  const ofType = measures.filter((m) => m.type === meastype);
  if (ofType.length === 0) return emptySegmentalRegions();

  if (ofType.length >= 5 || ofType.some((m) => m.position != null)) {
    const byPos = [...ofType].sort(
      (a, b) => (a.position ?? a.typeext ?? 0) - (b.position ?? b.typeext ?? 0)
    );
    return mapSegmentArrayToRegions(
      byPos.slice(0, 5).map((m) => applyWithingsUnit(m.value, m.unit))
    );
  }

  // Fallback: un solo punto no es segmental útil
  return emptySegmentalRegions();
}

export function pickLatestMeasure(
  groups: WithingsMeasureGroup[],
  meastype: number
): { value: number; measuredAtUnix: number } | null {
  let best: { value: number; measuredAtUnix: number } | null = null;
  for (const g of groups) {
    for (const m of g.measures) {
      if (m.type !== meastype) continue;
      const v = applyWithingsUnit(m.value, m.unit);
      if (!best || g.date > best.measuredAtUnix) {
        best = { value: v, measuredAtUnix: g.date };
      }
    }
  }
  return best;
}

export function buildSegmentalFromWithingsGroups(
  groups: WithingsMeasureGroup[]
): SegmentalCompositionJson {
  // Usamos el grupo más reciente que tenga al menos un meastype segmental
  const sorted = [...groups].sort((a, b) => b.date - a.date);
  for (const g of sorted) {
    const fat = extractSegmentalKg(g.measures, WITHINGS_MEASTYPE.FAT_MASS_SEGMENTS);
    const muscle = extractSegmentalKg(g.measures, WITHINGS_MEASTYPE.MUSCLE_MASS_SEGMENTS);
    const hasFat = Object.values(fat).some((v) => v != null);
    const hasMuscle = Object.values(muscle).some((v) => v != null);
    if (hasFat || hasMuscle) {
      return {
        fat,
        muscle,
        meta: {
          unit: 'kg',
          provider: 'WITHINGS',
          raw_measure_ids: [
            WITHINGS_MEASTYPE.FAT_MASS_SEGMENTS,
            WITHINGS_MEASTYPE.MUSCLE_MASS_SEGMENTS,
          ],
          notes: 'Fat Mass (174) + Muscle Mass (175) segmental',
        },
      };
    }
  }
  return emptySegmentalComposition('WITHINGS');
}

/** Fixture Body Scan para demos / dryRun. */
export function createWithingsDemoMeasureResponse(): WithingsGetMeasResponse {
  const now = Math.floor(Date.now() / 1000);
  return {
    status: 0,
    body: {
      measuregrps: [
        {
          grpid: 9001,
          date: now,
          measures: [
            { value: 72500, unit: -3, type: WITHINGS_MEASTYPE.WEIGHT }, // 72.5 kg
            { value: 1700, unit: -3, type: WITHINGS_MEASTYPE.HEIGHT_M }, // 1.70 m
            { value: 224, unit: -1, type: WITHINGS_MEASTYPE.FAT_RATIO_PCT }, // 22.4 %
            { value: 85, unit: -1, type: WITHINGS_MEASTYPE.VISCERAL_FAT }, // 8.5
            { value: 14850, unit: -1, type: WITHINGS_MEASTYPE.BMR }, // 1485 kcal
            // Fat segments kg (unit -3 → /1000)
            ...WITHINGS_SEGMENT_ORDER.map((key, position) => ({
              value: [1200, 1150, 8500, 3200, 3100][position],
              unit: -3,
              type: WITHINGS_MEASTYPE.FAT_MASS_SEGMENTS,
              position,
              typeext: position,
            })),
            // Muscle segments kg
            ...WITHINGS_SEGMENT_ORDER.map((key, position) => ({
              value: [3100, 3050, 22000, 8500, 8400][position],
              unit: -3,
              type: WITHINGS_MEASTYPE.MUSCLE_MASS_SEGMENTS,
              position,
              typeext: position,
            })),
          ],
        },
      ],
    },
  };
}

export class WithingsAdapter implements INutritionHardwareAdapter {
  readonly source = 'WITHINGS' as const;

  private readonly apiBaseUrl: string;
  private readonly httpPost: (url: string, init: RequestInit) => Promise<Response>;

  constructor(config: WithingsAdapterConfig = {}) {
    this.apiBaseUrl = (config.apiBaseUrl || 'https://wbsapi.withings.net').replace(/\/$/, '');
    this.httpPost = config.httpPost || ((url, init) => fetch(url, init));
  }

  async fetchEvaluation(
    patientId: string,
    authOrPayload: HardwareAdapterAuthOrPayload,
    options: FetchEvaluationOptions = {}
  ): Promise<StandardizedHardwareEvaluation> {
    if (!patientId?.trim()) {
      throw new Error('WithingsAdapter: patientId es obligatorio.');
    }
    if (!isOAuthAuth(authOrPayload) || !authOrPayload.accessToken) {
      throw new Error(
        'WithingsAdapter requiere OAuthHardwareAuth.accessToken (flujo OAuth 2.0).'
      );
    }

    const raw = options.dryRun
      ? createWithingsDemoMeasureResponse()
      : await this.callGetMeas(authOrPayload, options);

    if (raw.status !== 0) {
      throw new Error(`Withings API status=${raw.status}`);
    }

    const groups = raw.body?.measuregrps ?? [];
    if (groups.length === 0) {
      throw new Error('WithingsAdapter: no hay measuregrps para el usuario.');
    }

    const weight = pickLatestMeasure(groups, WITHINGS_MEASTYPE.WEIGHT);
    const heightM = pickLatestMeasure(groups, WITHINGS_MEASTYPE.HEIGHT_M);
    const fatRatio = pickLatestMeasure(groups, WITHINGS_MEASTYPE.FAT_RATIO_PCT);
    const visceral = pickLatestMeasure(groups, WITHINGS_MEASTYPE.VISCERAL_FAT);
    const bmr = pickLatestMeasure(groups, WITHINGS_MEASTYPE.BMR);

    const measuredAtUnix =
      weight?.measuredAtUnix ??
      fatRatio?.measuredAtUnix ??
      groups[0]?.date ??
      Math.floor(Date.now() / 1000);

    const evaluation: StandardizedHardwareEvaluation = {
      patient_id: patientId,
      source: 'WITHINGS',
      evaluation_date: todayIsoDate(new Date(measuredAtUnix * 1000)),
      weight_kg: weight ? round(weight.value, 3) : null,
      height_cm: heightM ? round(heightM.value * 100, 2) : null,
      body_fat_pct: fatRatio ? round(fatRatio.value, 2) : null,
      visceral_fat_index: visceral ? round(visceral.value, 2) : null,
      bmr: bmr ? round(bmr.value, 2) : null,
      measurements_json: {},
      segmental_composition_json: buildSegmentalFromWithingsGroups(groups),
      somatotype_json: {},
      notes:
        'Origen Withings Measure API. % grasa del dispositivo (no recalcular Jackson-Pollock).',
      provider_meta: {
        device_model: 'Withings Body Scan / Body Comp',
        measured_at: new Date(measuredAtUnix * 1000).toISOString(),
        external_user_id: String(authOrPayload.externalUserId ?? ''),
        raw: options.dryRun ? undefined : raw,
      },
    };

    return evaluation;
  }

  /**
   * POST measure?action=getmeas
   * En producción completar OAuth refresh si el access_token expiró.
   */
  private async callGetMeas(
    auth: OAuthHardwareAuth,
    options: FetchEvaluationOptions
  ): Promise<WithingsGetMeasResponse> {
    const meastypes = [
      WITHINGS_MEASTYPE.WEIGHT,
      WITHINGS_MEASTYPE.HEIGHT_M,
      WITHINGS_MEASTYPE.FAT_RATIO_PCT,
      WITHINGS_MEASTYPE.VISCERAL_FAT,
      WITHINGS_MEASTYPE.FAT_MASS_SEGMENTS,
      WITHINGS_MEASTYPE.MUSCLE_MASS_SEGMENTS,
      WITHINGS_MEASTYPE.BMR,
    ].join(',');

    const form = new URLSearchParams();
    form.set('action', 'getmeas');
    form.set('meastypes', meastypes);
    form.set('category', '1');
    if (options.sinceUnix) form.set('startdate', String(options.sinceUnix));
    if (auth.externalUserId != null) form.set('userid', String(auth.externalUserId));

    const res = await this.httpPost(`${this.apiBaseUrl}/measure`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Withings HTTP ${res.status}: ${text}`);
    }

    return (await res.json()) as WithingsGetMeasResponse;
  }
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export default WithingsAdapter;
