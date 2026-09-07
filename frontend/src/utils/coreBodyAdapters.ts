import type { PacienteClinico, EvaluacionAntropometrica, PlanNutricional, AlimentoItem } from '../types';
import type {
  Patient,
  AnthropometryAssessment,
  NutritionPlan,
  BodyCompositionBIA,
} from '../types/coreBodyNutrition';

function calcAge(birthDate?: string): number {
  if (!birthDate) return 30;
  const y = new Date(birthDate).getFullYear();
  return Math.max(12, new Date().getFullYear() - y);
}

/** Mapea PacienteClinico KineSys → Patient clínico (módulo nutrición). */
export function toCoreBodyPatient(
  p: PacienteClinico,
  opts?: {
    nutritionistName?: string;
    nutritionistId?: string;
    weightKg?: number;
    heightCm?: number;
  },
): Patient {
  const g = String(p.gender || '').toLowerCase();
  const gender: Patient['gender'] =
    g === 'f' || g === 'female' || g === 'femenino' ? 'F' : g === 'other' || g === 'otro' ? 'Otro' : 'M';

  return {
    id: p.id,
    name: `${p.first_name} ${p.last_name}`.trim(),
    age: calcAge(p.birth_date),
    birthDate: p.birth_date || '',
    gender,
    documentId: p.identifier_number || '',
    phone: p.telecom_phone || '',
    email: p.telecom_email || '',
    sportOrActivity: p.chronic_conditions?.[0] || 'Actividad física regular',
    diagnosticReason: 'Evaluación nutricional / antropometría ISAK',
    createdAt: p.created_at || new Date().toISOString(),
    physiotherapist: '',
    physiotherapistId: '',
    nutritionist: opts?.nutritionistName,
    nutritionistId: opts?.nutritionistId,
    heightCm: opts?.heightCm,
    weightKg: opts?.weightKg,
    evalNumber: '1/1',
    isakCertification: 'ISAK Nivel 3',
    activityLevel: 'Moderado (3-5 veces/semana)',
  };
}

/** Convierte assessment ISAK → EvaluacionAntropometrica KineSys (persistencia). */
export function coreBodyAnthroToKinesys(
  a: AnthropometryAssessment,
  ctx: {
    tenantId: string;
    nutritionistId: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    weightKg: number;
    heightCm: number;
  },
): EvaluacionAntropometrica {
  const fatPct = a.estimatedBodyFatPct;
  const fatMass = Math.round((fatPct / 100) * ctx.weightKg * 10) / 10;
  const bmi =
    ctx.heightCm > 0 ? Math.round((ctx.weightKg / (ctx.heightCm / 100) ** 2) * 10) / 10 : 0;

  return {
    id: a.id || crypto.randomUUID(),
    tenant_id: ctx.tenantId,
    patient_id: a.patientId,
    nutritionist_id: ctx.nutritionistId,
    evaluation_date: a.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    age: ctx.age,
    gender: ctx.gender,
    weight_kg: ctx.weightKg,
    height_cm: ctx.heightCm,
    activity_factor: 1.375,
    skinfold_triceps_mm: a.skinfolds.triceps,
    skinfold_subscapular_mm: a.skinfolds.subescapular,
    skinfold_suprailiac_mm: a.skinfolds.supraespinal,
    skinfold_abdominal_mm: a.skinfolds.abdominal,
    skinfold_biceps_mm: a.skinfolds.biceps,
    skinfold_thigh_mm: a.skinfolds.muslo,
    skinfold_calf_mm: a.skinfolds.pierna,
    waist_cm: a.perimeters.cintura,
    hip_cm: a.perimeters.cadera,
    relaxed_arm_cm: a.perimeters.brazoRelajado,
    contracted_arm_cm: a.perimeters.brazoContraido,
    thigh_cm: a.perimeters.muslo,
    calf_cm: a.perimeters.pierna,
    bmi,
    bmr_kcal: 0,
    tdee_kcal: 0,
    waist_hip_ratio: a.derivedIndices.cinturaCaderaRatio,
    body_fat_percentage: fatPct,
    fat_mass_kg: fatMass,
    fat_free_mass_kg: Math.round((ctx.weightKg - fatMass) * 10) / 10,
    cardiovascular_risk_level:
      a.derivedIndices.cinturaCaderaStatus === 'Normal' ? 'bajo' : 'moderado',
    clinical_notes: [
      a.generalObservations,
      `Ecuación ${a.activeEquation}`,
      `Somatotipo ${a.somatotype.category} (E${a.somatotype.endomorfia}/M${a.somatotype.mesomorfia}/Ec${a.somatotype.ectomorfia})`,
      `Biacromial ${a.diameters.biacromial} · Húmero ${a.diameters.humero} · Fémur ${a.diameters.femur}`,
    ]
      .filter(Boolean)
      .join(' · '),
    created_at: new Date().toISOString(),
  };
}

/** Convierte NutritionPlan UI → PlanNutricional KineSys. */
export function coreBodyPlanToKinesys(
  plan: NutritionPlan,
  ctx: { tenantId: string },
): PlanNutricional {
  return {
    id: plan.id || crypto.randomUUID(),
    tenant_id: ctx.tenantId,
    patient_id: plan.patientId,
    nutritionist_id: plan.nutritionistId,
    nutritionist_name: plan.nutritionist,
    plan_name: `Minuta TCA 2018 — ${plan.targetObjective}`,
    plan_type: 'recomposicion',
    status: 'active',
    caloric_target_kcal: plan.targetCaloriesKcal,
    macros_target: {
      protein_grams: plan.macroTargets.proteinGrams,
      protein_pct: plan.macroTargets.proteinPct,
      carbs_grams: plan.macroTargets.carbsGrams,
      carbs_pct: plan.macroTargets.carbsPct,
      fats_grams: plan.macroTargets.lipidsGrams,
      fats_pct: plan.macroTargets.lipidsPct,
      sodium_mg_max: plan.micronutrientAlerts?.sodiumMg,
    },
    meals: plan.meals.map((m, idx) => ({
      id: `meal_${idx}_${m.mealTime}`,
      name: m.mealTime,
      time_suggestion: m.recommendedHour,
      items: m.entries.map(
        (e): AlimentoItem => ({
          id: e.id,
          food_id: e.foodId,
          name: e.foodName,
          category: 'vegetal',
          portion_size: e.grams,
          unit: 'g',
          calories_kcal: e.caloriesKcal,
          protein_g: e.proteinG,
          carbs_g: e.carbsTotalG,
          fats_g: e.lipidsG,
          sodium_mg: 0,
        }),
      ),
      total_calories: m.entries.reduce((s, e) => s + e.caloriesKcal, 0),
      total_protein: m.entries.reduce((s, e) => s + e.proteinG, 0),
      total_carbs: m.entries.reduce((s, e) => s + e.carbsTotalG, 0),
      total_fats: m.entries.reduce((s, e) => s + e.lipidsG, 0),
      total_sodium: 0,
    })),
    clinical_restrictions: [],
    notes_and_recommendations: plan.generalIndications || '',
    hydration_target_liters: plan.hydrationDailyLiters,
    created_at: new Date().toISOString(),
  };
}

export type { BodyCompositionBIA };
