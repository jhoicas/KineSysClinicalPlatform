/** Tipos Core Body / fisiotest — Nutrición & Antropometría (portados) */

export interface Patient {
  id: string;
  name: string;
  age: number;
  birthDate: string;
  gender: 'M' | 'F' | 'Otro';
  documentId: string;
  phone: string;
  email: string;
  sportOrActivity: string;
  diagnosticReason: string;
  createdAt: string;
  physiotherapist: string;
  physiotherapistId: string;
  nutritionist?: string;
  nutritionistId?: string;
  heightCm?: number;
  weightKg?: number;
  evalNumber?: string;
  isakCertification?: string;
  activityLevel?: 'Sedentario' | 'Ligero' | 'Moderado (3-5 veces/semana)' | 'Alto rendimiento';
}

// ==========================================
// 1. MÓDULO DE ANTROPOMETRÍA AVANZADA (ISAK)
// ==========================================

export type AnthropometryTab = 'skinfolds' | 'perimeters' | 'diameters';

export interface SkinfoldMeasurements {
  triceps: number; // mm
  subescapular: number; // mm
  biceps: number; // mm
  crestaIliaca: number; // mm
  supraespinal: number; // mm
  abdominal: number; // mm
  muslo: number; // mm
  pierna: number; // mm
}

export type EstimationEquationId =
  | 'faulkner_4'
  | 'jackson_pollock_3'
  | 'jackson_pollock_7'
  | 'durnin_womersley_4'
  | 'carter_somatotype';

export interface PerimeterMeasurements {
  brazoRelajado: number; // cm
  brazoContraido: number; // cm
  cintura: number; // cm
  cadera: number; // cm
  muslo: number; // cm
  pierna: number; // cm
}

export interface BoneDiameterMeasurements {
  biacromial: number; // cm
  humero: number; // cm (biepicondilar)
  femur: number; // cm (biepicondilar)
}

export type SomatotypeCategory =
  | 'Ectomorfo'
  | 'Mesomorfo'
  | 'Endomorfo'
  | 'Meso-Endomorfo'
  | 'Ecto-Mesomorfo';

export interface SomatotypeResult {
  category: SomatotypeCategory;
  endomorfia: number;
  mesomorfia: number;
  ectomorfia: number;
  interpretation: string;
}

export interface AnthropometryAssessment {
  id: string;
  patientId: string;
  date: string;
  evaluator: string;
  evaluatorCertification: string; // e.g. 'ISAK Nivel 3'
  evaluationNumber: string; // e.g. '1/1'
  skinfolds: SkinfoldMeasurements;
  activeEquation: EstimationEquationId;
  estimatedBodyFatPct: number;
  fatStatus: 'Bajo' | 'Rango saludable' | 'Sobrepeso' | 'Elevado';
  perimeters: PerimeterMeasurements;
  derivedIndices: {
    cinturaCaderaRatio: number; // WHR
    cinturaCaderaStatus: 'Normal' | 'Riesgo Moderado' | 'Riesgo Elevado';
    cinturaTallaRatio: number; // WHtR
    cinturaTallaStatus: 'Normal' | 'Riesgo Aumentado';
    relacionBrazo: number; // flexionado / relajado
    relacionBrazoStatus: 'Normal' | 'Hipertrofia Atípica';
  };
  perimetersInterpretation: string;
  diameters: BoneDiameterMeasurements;
  somatotype: SomatotypeResult;
  generalObservations: string;
}

// ==========================================
// 2. MÓDULO DE COMPOSICIÓN CORPORAL (BIA)
// ==========================================

export interface SegmentalBiometric {
  muscleKg: number;
  fatKg: number;
  fatPct?: number;
}

export interface RangeIndicator {
  value: number;
  minNormal: number;
  maxNormal: number;
  unit: string;
  status: 'Bajo' | 'Normal' | 'Adecuada' | 'Elevado';
}

export interface BodyCompositionBIA {
  id: string;
  patientId: string;
  date: string;
  deviceModel: 'InBody H30' | 'Withings Body Scan';
  sourceMode: 'hardware_auto' | 'manual_entry';
  lastSyncTimestamp: string;
  pesoKg: RangeIndicator;
  masaMuscularEsqueleticaKg: RangeIndicator;
  masaGrasaKg: RangeIndicator;
  porcentajeGrasaCorporal: RangeIndicator;
  segmental: {
    brazoIzq: SegmentalBiometric;
    brazoDer: SegmentalBiometric;
    tronco: SegmentalBiometric;
    troncoEspalda?: SegmentalBiometric;
    piernaIzq: SegmentalBiometric;
    piernaDer: SegmentalBiometric;
  };
  otherIndicators: {
    aguaCorporalTotalL: RangeIndicator;
    proteinaKg: RangeIndicator;
    mineralesKg: RangeIndicator;
    grasaVisceralNivel: RangeIndicator;
  };
  evaluatorNotes?: string;
}

// ==========================================
// 3. PLANIFICACIÓN DIETÉTICA (TCA 2018 COLOMBIA)
// ==========================================

export type TcaFoodCategory =
  | 'Cereales y Raíces'
  | 'Carnes, Huevos y Leguminosas'
  | 'Lácteos y Derivados'
  | 'Frutas y Verduras'
  | 'Grasas y Aceites'
  | 'Platos Típicos Tradicionales';

export interface TcaFoodItem {
  id: string;
  name: string;
  category: TcaFoodCategory;
  servingPortionName: string; // e.g. '1 unidad (100g)'
  portionGrams: number;
  edibleFraction: number; // 0 to 1
  caloriesKcal: number;
  proteinG: number;
  lipidsG: number;
  carbsTotalG: number;
  calciumMg: number;
  ironMg: number;
  sodiumMg: number;
  purchaseUnit: string; // e.g. 'Paquete x 5 un', 'Kilo', 'Docena'
  estimatedPricePerPortionCOP: number; // Valor en pesos colombianos
  notes?: string;
}

export type MealTimeType =
  | 'Desayuno'
  | 'Media Mañana'
  | 'Almuerzo'
  | 'Media Tarde'
  | 'Cena';

export interface MealFoodEntry {
  id: string;
  foodId: string;
  foodName: string;
  grams: number;
  portionCount: number;
  caloriesKcal: number;
  proteinG: number;
  lipidsG: number;
  carbsTotalG: number;
  estimatedCostCOP: number;
}

export interface MealPlanSection {
  mealTime: MealTimeType;
  recommendedHour: string;
  entries: MealFoodEntry[];
  clinicalTip?: string;
}

export interface NutritionPlan {
  id: string;
  patientId: string;
  date: string;
  nutritionist: string;
  nutritionistId: string;
  targetObjective: 'Definición / Descenso de Grasa' | 'Hipertrofia Muscular' | 'Mantenimiento y Rendimiento' | 'Recomposición Corporal';
  basalMetabolicRateKcal: number; // BMR
  totalDailyEnergyExpenditureKcal: number; // TDEE
  targetCaloriesKcal: number;
  macroTargets: {
    proteinPct: number;
    proteinGrams: number;
    carbsPct: number;
    carbsGrams: number;
    lipidsPct: number;
    lipidsGrams: number;
  };
  meals: MealPlanSection[];
  hydrationDailyLiters: number;
  micronutrientAlerts: {
    calciumMg: number;
    ironMg: number;
    sodiumMg: number;
  };
  dailyBasketEstimatedCostCOP: number;
  monthlyBasketEstimatedCostCOP: number;
  generalIndications: string;
}
