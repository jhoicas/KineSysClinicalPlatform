import type {
  EvaluacionAntropometrica,
  OrdenNutricionFHIR,
  PlanNutricional,
} from '../types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

/**
 * Schema real (004): columnas fijas + `data` JSONB con el payload clínico.
 * El frontend trabaja con objetos planos; estos helpers empaquetan/desempaquetan.
 */
export function toAnthropometryInsert(record: EvaluacionAntropometrica): Record<string, unknown> {
  const {
    id,
    tenant_id,
    patient_id,
    nutritionist_id,
    evaluation_date,
    created_at: _createdAt,
    ...clinical
  } = record;

  const payload: Record<string, unknown> = {
    tenant_id,
    patient_id,
    nutritionist_id,
    evaluation_date: evaluation_date || new Date().toISOString(),
    data: clinical,
  };
  if (isUuid(id)) payload.id = id;
  return payload;
}

export function mapAnthropometryFromDb(row: Record<string, unknown>): EvaluacionAntropometrica {
  const data = asObject(row.data);
  return {
    ...data,
    id: String(row.id ?? ''),
    tenant_id: String(row.tenant_id ?? ''),
    patient_id: String(row.patient_id ?? ''),
    nutritionist_id: String(row.nutritionist_id ?? ''),
    evaluation_date: String(row.evaluation_date ?? ''),
    created_at: String(row.created_at ?? ''),
  } as EvaluacionAntropometrica;
}

export function toFhirOrderInsert(
  order: OrdenNutricionFHIR,
  practitionerIdFallback: string,
): Record<string, unknown> {
  const {
    id,
    tenant_id,
    patient_id,
    practitioner_id,
    order_date,
    status,
    created_at: _createdAt,
    ...clinical
  } = order;

  const practitionerId = isUuid(practitioner_id) ? practitioner_id : practitionerIdFallback;

  const payload: Record<string, unknown> = {
    tenant_id,
    patient_id,
    practitioner_id: practitionerId,
    order_date: order_date || new Date().toISOString(),
    status: status || 'active',
    data: clinical,
  };
  if (isUuid(id)) payload.id = id;
  return payload;
}

export function mapFhirOrderFromDb(row: Record<string, unknown>): OrdenNutricionFHIR {
  const data = asObject(row.data);
  return {
    ...data,
    id: String(row.id ?? ''),
    tenant_id: String(row.tenant_id ?? ''),
    patient_id: String(row.patient_id ?? ''),
    practitioner_id: String(row.practitioner_id ?? ''),
    order_date: String(row.order_date ?? ''),
    status: (row.status as OrdenNutricionFHIR['status']) || 'active',
    created_at: String(row.created_at ?? ''),
  } as OrdenNutricionFHIR;
}

export function toNutritionPlanInsert(plan: PlanNutricional): Record<string, unknown> {
  const {
    id,
    tenant_id,
    patient_id,
    nutritionist_id,
    plan_name,
    plan_type,
    status,
    created_at: _createdAt,
    updated_at: _updatedAt,
    ...clinical
  } = plan;

  const payload: Record<string, unknown> = {
    tenant_id,
    patient_id,
    nutritionist_id,
    plan_name,
    plan_type,
    status: status || 'active',
    data: clinical,
  };
  if (isUuid(id)) payload.id = id;
  return payload;
}

export function mapNutritionPlanFromDb(row: Record<string, unknown>): PlanNutricional {
  const data = asObject(row.data);
  return {
    ...data,
    id: String(row.id ?? ''),
    tenant_id: String(row.tenant_id ?? ''),
    patient_id: String(row.patient_id ?? ''),
    nutritionist_id: String(row.nutritionist_id ?? ''),
    plan_name: String(row.plan_name ?? data.plan_name ?? ''),
    plan_type: (row.plan_type as PlanNutricional['plan_type']) || (data.plan_type as PlanNutricional['plan_type']),
    status: (row.status as PlanNutricional['status']) || 'active',
    created_at: String(row.created_at ?? ''),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  } as PlanNutricional;
}
