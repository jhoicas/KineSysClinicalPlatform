import type { PacienteClinico, EvaluacionAntropometrica, PlanNutricional, AlimentoItem } from '../types';
import type {
  Patient,
  AnthropometryAssessment,
  NutritionPlan,
  BodyCompositionBIA,
} from '../types/coreBodyNutrition';

function planTypeFor(objective: NutritionPlan['targetObjective']): PlanNutricional['plan_type'] {
  switch (objective) {
    case 'Definición / Descenso de Grasa':
      return 'deficit_controlado';
    case 'Hipertrofia Muscular':
      return 'superavit_magro';
    case 'Mantenimiento y Rendimiento':
      return 'mantenimiento';
    default:
      return 'recomposicion';
  }
}

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
    birth_date: p.birth_date || '',
    gender,
    document_id: p.identifier_number || '',
    phone: p.telecom_phone || '',
    email: p.telecom_email || '',
    sport_or_activity: p.chronic_conditions?.[0] || 'Actividad física regular',
    diagnostic_reason: 'Evaluación nutricional / antropometría ISAK',
    created_at: p.created_at || new Date().toISOString(),
    physiotherapist: '',
    physiotherapist_id: '',
    nutritionist: opts?.nutritionistName,
    nutritionist_id: opts?.nutritionistId,
    height_cm: opts?.heightCm ?? p.height_cm,
    weight_kg: opts?.weightKg,
    eval_number: '1/1',
    isak_certification: 'ISAK Nivel 3',
    activity_level: 'Moderado (3-5 veces/semana)',
  };
}

/** Tasa metabólica basal Mifflin-St Jeor (kcal/día); 0 si faltan datos. */
export function mifflinStJeorBmr(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female' | 'other',
): number {
  if (!(weightKg > 0) || !(heightCm > 0) || !(age > 0)) return 0;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(gender === 'female' ? base - 161 : base + 5);
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

  const bmr = mifflinStJeorBmr(ctx.weightKg, ctx.heightCm, ctx.age, ctx.gender);

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
    skinfold_iliac_crest_mm: a.skinfolds.crestaIliaca,
    skinfold_chest_mm: a.skinfolds.pecho,
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
    diameter_biacromial_cm: a.diameters.biacromial,
    diameter_humerus_cm: a.diameters.humero,
    diameter_femur_cm: a.diameters.femur,
    isak_equation: a.activeEquation,
    fat_status: a.fatStatus,
    somatotype_category: a.somatotype.category,
    somatotype_endomorphy: a.somatotype.endomorfia,
    somatotype_mesomorphy: a.somatotype.mesomorfia,
    somatotype_ectomorphy: a.somatotype.ectomorfia,
    somatotype_interpretation: a.somatotype.interpretation,
    waist_height_ratio: a.derivedIndices.cinturaTallaRatio,
    waist_hip_status: a.derivedIndices.cinturaCaderaStatus,
    arm_ratio: a.derivedIndices.relacionBrazo,
    perimeters_interpretation: a.perimetersInterpretation,
    evaluator_name: a.evaluator,
    evaluator_certification: a.evaluatorCertification,
    evaluation_number: a.evaluationNumber,
    source: 'isak_manual',
    bmi,
    bmr_kcal: bmr,
    tdee_kcal: Math.round(bmr * 1.375),
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

/** Convierte una captura/edición manual de Withings Body Scan → EvaluacionAntropometrica (persistencia). */
export function biaToKinesys(
  bia: BodyCompositionBIA,
  ctx: {
    tenantId: string;
    nutritionistId: string;
    patientId: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    heightCm: number;
  },
): EvaluacionAntropometrica {
  const weight = bia.pesoKg.value;
  const fatMass = bia.masaGrasaKg.value;
  const bmi =
    ctx.heightCm > 0 && weight > 0 ? Math.round((weight / (ctx.heightCm / 100) ** 2) * 10) / 10 : 0;
  const bmr = mifflinStJeorBmr(weight, ctx.heightCm, ctx.age, ctx.gender);
  const seg = bia.segmental;
  return {
    id: crypto.randomUUID(),
    tenant_id: ctx.tenantId,
    patient_id: ctx.patientId,
    nutritionist_id: ctx.nutritionistId,
    evaluation_date: new Date().toISOString(),
    age: ctx.age,
    gender: ctx.gender,
    weight_kg: weight,
    height_cm: ctx.heightCm,
    activity_factor: 1.375,
    skinfold_triceps_mm: 0,
    skinfold_subscapular_mm: 0,
    skinfold_suprailiac_mm: 0,
    skinfold_abdominal_mm: 0,
    waist_cm: 0,
    hip_cm: 0,
    bmi,
    bmr_kcal: bmr,
    tdee_kcal: Math.round(bmr * 1.375),
    waist_hip_ratio: 0,
    body_fat_percentage: bia.porcentajeGrasaCorporal.value,
    fat_ratio_percent: bia.porcentajeGrasaCorporal.value,
    fat_mass_kg: fatMass,
    fat_free_mass_kg: Math.round((weight - fatMass) * 10) / 10,
    cardiovascular_risk_level: 'bajo',
    source: 'withings_manual',
    device_model: bia.deviceModel,
    muscle_mass_kg: bia.masaMuscularEsqueleticaKg.value,
    hydration_kg: bia.otherIndicators.aguaCorporalTotalL.value,
    protein_kg: bia.otherIndicators.proteinaKg.value,
    bone_mass_kg: bia.otherIndicators.mineralesKg.value,
    visceral_fat_index: bia.otherIndicators.grasaVisceralNivel.value,
    segmental: {
      brazoIzq: seg.brazoIzq,
      brazoDer: seg.brazoDer,
      tronco: seg.tronco,
      piernaIzq: seg.piernaIzq,
      piernaDer: seg.piernaDer,
    },
    clinical_notes: bia.evaluatorNotes,
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
    plan_type: planTypeFor(plan.targetObjective),
    objective: plan.targetObjective,
    bmr_kcal: plan.basalMetabolicRateKcal,
    tdee_kcal: plan.totalDailyEnergyExpenditureKcal,
    micronutrient_targets: {
      calcium_mg: plan.micronutrientAlerts?.calciumMg ?? 0,
      iron_mg: plan.micronutrientAlerts?.ironMg ?? 0,
      sodium_mg: plan.micronutrientAlerts?.sodiumMg ?? 0,
    },
    daily_cost_cop: plan.dailyBasketEstimatedCostCOP,
    monthly_cost_cop: plan.monthlyBasketEstimatedCostCOP,
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
      clinical_tip: m.clinicalTip || undefined,
      items: m.entries.map(
        (e): AlimentoItem => ({
          id: e.id,
          food_id: e.foodId,
          name: e.foodName,
          category: 'vegetal',
          portion_size: e.grams,
          unit: 'g',
          portion_count: e.portionCount,
          cost_cop: e.estimatedCostCOP,
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
