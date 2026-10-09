import type { EvaluacionAntropometrica, PacienteClinico, PlanNutricional, Tenant } from '../types';
import type { GenerateNutritionReportPdfOptions } from './nutritionReportPdf';

/** Datos institucionales que se imprimen en el encabezado de los PDF. */
export interface ClinicPdfBranding {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicEmail: string;
  clinicLogoBase64: string | undefined;
  primaryColorHex: string;
}

export function getClinicPdfBranding(tenant: Tenant | null | undefined): ClinicPdfBranding {
  const settings = (tenant?.settings ?? {}) as { address?: string; phone?: string; email?: string };
  return {
    clinicName: tenant?.name || 'KineSys Salud & Centro Clínico',
    clinicAddress: settings.address || 'Av. Salud Integral 1050, Piso 4',
    clinicPhone: settings.phone || '+56 9 8765 4321',
    clinicEmail: settings.email || 'contacto@kinesys.health',
    clinicLogoBase64: tenant?.logo_url || undefined,
    primaryColorHex: tenant?.primary_color || '#004870',
  };
}

/** Bloques del informe integral: último ISAK, última medición Withings y plan activo. */
export interface NutritionReportData {
  isak?: EvaluacionAntropometrica | null;
  withings?: EvaluacionAntropometrica | null;
  plan?: PlanNutricional | null;
}

export function hasNutritionReportData(data: NutritionReportData): boolean {
  return Boolean(data.isak || data.withings || data.plan);
}

export function buildNutritionReportPdfOptions(params: {
  patient: PacienteClinico;
  nutritionistName: string;
  tenant: Tenant | null | undefined;
  data: NutritionReportData;
}): GenerateNutritionReportPdfOptions {
  const { patient, nutritionistName, tenant, data } = params;
  return {
    ...getClinicPdfBranding(tenant),
    patient,
    nutritionistName,
    isak: data.isak ?? null,
    withings: data.withings ?? null,
    plan: data.plan ?? null,
  };
}
