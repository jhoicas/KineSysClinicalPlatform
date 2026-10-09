import type { EvaluacionAntropometrica, PacienteClinico, PlanNutricional } from '../types';
import type { AnthropometryDraftForm, BodyCompositionBIA } from '../types/coreBodyNutrition';
import type { NutritionSessionDraft } from '../store/useAppStore';
import {
  biaToKinesys,
  hasIsakMeasurements,
  isakDraftToKinesys,
  isakStoreToDraftForm,
  toCoreBodyPatient,
} from './coreBodyAdapters';
import { selectNutritionSnapshot, type NutritionReportSnapshot } from './nutritionReportSnapshot';

/** true si la captura BIA trae al menos un valor de composición. */
export function hasBiaValues(bia: BodyCompositionBIA): boolean {
  return [
    bia.pesoKg,
    bia.masaMuscularEsqueleticaKg,
    bia.masaGrasaKg,
    bia.porcentajeGrasaCorporal,
    bia.otherIndicators.aguaCorporalTotalL,
    bia.otherIndicators.proteinaKg,
    bia.otherIndicators.mineralesKg,
    bia.otherIndicators.grasaVisceralNivel,
  ].some((i) => i.value > 0);
}

export interface LiveReportInputs {
  /** Evaluaciones persistidas (ISAK y Withings) del paciente activo. */
  evaluations: EvaluacionAntropometrica[];
  plans: PlanNutricional[];
  patient: PacienteClinico | null;
  tenantId: string;
  nutritionistId: string;
  nutritionistName: string;
  /** Borrador ISAK en memoria o cargado de la base. */
  isakForm: { patientId: string; form: Partial<AnthropometryDraftForm>; updatedAt: string } | null;
  /** Estado vivo global: lo escriben los módulos ISAK y BIA en cada cambio. */
  nutritionDraft: NutritionSessionDraft | null;
}

/**
 * ÚNICA fuente del snapshot del informe (ISAK + BIA + plan). La usan tanto la UI como todos los
 * botones de exportación (barra fija, vista previa, correo y accesos directos), de modo que un PDF
 * siempre refleja lo mismo sin importar desde dónde se pida.
 *
 * Es pura: se alimenta con el estado de React al renderizar o con una lectura fresca del store y de
 * las referencias al momento del clic.
 */
export function buildLiveReportSnapshot(input: LiveReportInputs): NutritionReportSnapshot {
  const { evaluations, plans, patient, tenantId, nutritionistId, nutritionistName, isakForm, nutritionDraft } = input;
  const latestEvaluation = evaluations.length > 0 ? evaluations[0] : null;
  const draftForPatient = patient && nutritionDraft?.patientId === patient.id ? nutritionDraft : null;

  const gender: 'male' | 'female' | 'other' =
    patient?.gender === 'female' ? 'female' : patient?.gender === 'other' ? 'other' : 'male';
  const profileHeight = patient?.height_cm && patient.height_cm > 0 ? patient.height_cm : undefined;
  const age = patient ? toCoreBodyPatient(patient).age : 0;

  const flattenIsak = (form: Partial<AnthropometryDraftForm>, updatedAt: string): EvaluacionAntropometrica | null => {
    if (!patient) return null;
    return isakDraftToKinesys(form, {
      id: `isak-draft-${patient.id}`,
      tenantId,
      nutritionistId,
      patientId: patient.id,
      age,
      gender,
      weightKg: latestEvaluation?.weight_kg ?? 0,
      heightCm: profileHeight ?? latestEvaluation?.height_cm ?? 0,
      evaluatorName: nutritionistName,
      updatedAt,
    });
  };

  // ISAK en curso: borrador en memoria + espejo vivo del store (formulario completo, o el espejo por grupos).
  const draftIsak =
    isakForm && patient && isakForm.patientId === patient.id ? flattenIsak(isakForm.form, isakForm.updatedAt) : null;
  const storeForm =
    draftForPatient?.isakDraft && hasIsakMeasurements(draftForPatient.isakDraft)
      ? draftForPatient.isakDraft
      : isakStoreToDraftForm(draftForPatient);
  const storeIsak = storeForm ? flattenIsak(storeForm, draftForPatient?.updatedAt ?? new Date().toISOString()) : null;

  // BIA vigente en el store (manual o báscula) aplanada al formato del informe.
  let draftWithings: EvaluacionAntropometrica | null = null;
  const bia = draftForPatient?.biaSnapshot as unknown as BodyCompositionBIA | null | undefined;
  if (patient && draftForPatient && bia?.pesoKg && bia.otherIndicators && hasBiaValues(bia)) {
    const stampIso = draftForPatient.updatedAt ?? draftForPatient.biaSavedAt ?? new Date().toISOString();
    draftWithings = {
      ...biaToKinesys(bia, { tenantId, nutritionistId, patientId: patient.id, age, gender, heightCm: patient.height_cm ?? 0 }),
      id: `bia-draft-${patient.id}`,
      evaluation_date: stampIso,
      created_at: stampIso,
    };
  }

  return selectNutritionSnapshot(evaluations, plans, draftIsak, {
    draftWithings,
    storeIsak,
    profile: {
      heightCm: patient?.height_cm,
      weightKg: draftForPatient?.weightKg,
      age: patient ? age : undefined,
      gender: patient?.gender,
    },
  });
}
