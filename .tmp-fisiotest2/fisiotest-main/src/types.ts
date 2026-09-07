export type SeverityLevel = 'normal' | 'leve' | 'moderada' | 'marcada';

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

// Posture Assessment
export type PainType =
  | 'Punzante'
  | 'Sordo / Opresivo'
  | 'Urente / Quemante'
  | 'Eléctrico / Irradiado'
  | 'Pulsátil'
  | 'Tirantez / Fatiga';

export type PainDuration =
  | 'Agudo (< 4 semanas)'
  | 'Subagudo (4 - 12 semanas)'
  | 'Crónico (> 3 meses)';

export interface PainPoint {
  id: string;
  regionId: string;
  regionName: string;
  view: 'anterior' | 'posterior';
  x: number; // percentage 0 - 100 on silhouette
  y: number; // percentage 0 - 100 on silhouette
  intensityVAS: number; // 0 to 10
  painType: PainType;
  duration: PainDuration;
  aggravatingFactors?: string;
  relievingFactors?: string;
  radiatesTo?: string;
  notes?: string;
  createdAt: string;
}

export interface PainMapAssessment {
  id: string;
  patientId: string;
  date: string;
  evaluator: string;
  painPoints: PainPoint[];
  generalObservations: string;
  functionalImpactScore: number; // 0 to 10
}

// Posture Assessment
export interface PostureAssessment {
  id: string;
  patientId: string;
  date: string;
  evaluator: string;
  anterior: {
    cabeza: 'Alineada' | 'Derecha' | 'Izquierda';
    hombros: 'Simétricos' | 'Elevado D' | 'Elevado I';
    pelvis: 'Nivelada' | 'Elevada D' | 'Elevada I';
    rodillas: 'Alineadas' | 'Valgo' | 'Varo';
    pies: 'Alineados' | 'Pronación' | 'Supinación';
  };
  lateral: {
    cabeza: 'Alineada' | 'Anteriorizada';
    hombros: 'Alineados' | 'Protracción';
    columnaDorsal: 'Normal' | 'Hipercifosis';
    columnaLumbar: 'Normal' | 'Hiperlordosis' | 'Rectificación';
    pelvis: 'Neutra' | 'Anteversión' | 'Retroversión';
    rodillas: 'Neutras' | 'Flexum' | 'Recurvatum';
  };
  posterior: {
    escapulas: 'Simétricas' | 'Asimetría' | 'Escápula alada';
    columna: 'Alineada' | 'Desviación derecha' | 'Desviación izquierda';
    pelvis: 'Simétrica' | 'Asimetría';
    talones: 'Alineados' | 'Valgo' | 'Varo';
  };
  observacion: string;
  conceptoPostural: 'Adecuado' | 'Alteración leve' | 'Alteración moderada' | 'Alteración marcada';
}

// Mobility Assessment
export interface MobilityItem {
  structure: 'Cuello' | 'Hombros' | 'Codos' | 'Muñecas' | 'Tronco' | 'Caderas' | 'Rodillas' | 'Tobillos';
  leftLimitation: string;
  rightLimitation: string;
  leftDegrees?: number;
  rightDegrees?: number;
  normalDegrees?: number;
  hasLeftLimitation: boolean;
  hasRightLimitation: boolean;
}

export interface MobilityAssessment {
  id: string;
  patientId: string;
  date: string;
  evaluator: string;
  structures: MobilityItem[];
  generalObservations: string;
}

// Strength Assessment (ActivForce 2 style)
export interface StrengthItem {
  id: string;
  structure: 'Hombros' | 'Codos' | 'Muñecas' | 'Caderas' | 'Rodillas' | 'Tobillos';
  submovements: string;
  leftKg: number;
  rightKg: number;
  asymmetryPct: number;
  interpretation: 'Simetría conservada' | 'Asimetría leve' | 'Asimetría moderada' | 'Asimetría marcada';
  notes?: string;
}

export interface StrengthAssessment {
  id: string;
  patientId: string;
  date: string;
  evaluator: string;
  deviceConnected: boolean;
  deviceName: string;
  fuerzaGlobalPct: number;
  asimetriaGlobalPct: number;
  findings: string[];
  recommendations: string[];
  structures: StrengthItem[];
}

// Movement Control / Gestures Assessment
export interface GestureCriteria {
  id: string;
  name: string;
  selected: boolean;
}

export interface MovementGesture {
  id: string;
  name: string;
  iconName: string;
  imageHint?: string;
  evaluated: boolean;
  criteria: GestureCriteria[];
  comments: string;
  status: 'Sin alteraciones relevantes' | 'Criterios hallados';
}

export interface MovementAssessment {
  id: string;
  patientId: string;
  date: string;
  evaluator: string;
  gestures: MovementGesture[];
  recommendations: string[];
  conclusion: string;
}

// Exercise & Treatment Plan
export interface Exercise {
  id: string;
  name: string;
  category: 'Fuerza' | 'Movilidad' | 'Control Motor' | 'Postura' | 'Propiocepción';
  targetMuscle: string;
  sets: number;
  repsOrDuration: string;
  restSeconds: number;
  frequencyDaysPerWeek: number;
  instructions: string;
  imageUrl?: string;
  videoPlaceholderUrl?: string;
  tags?: string[];
  difficulty?: 'Bajo' | 'Medio' | 'Avanzado';
  status: 'active' | 'completed' | 'pending';
}

export interface LibraryExercise {
  id: string;
  name: string;
  category: 'Fuerza' | 'Movilidad' | 'Control Motor' | 'Postura' | 'Propiocepción';
  targetMuscle: string;
  defaultSets: number;
  defaultRepsOrDuration: string;
  defaultRestSeconds: number;
  defaultFrequencyDaysPerWeek: number;
  instructions: string;
  imageUrl?: string;
  tags: string[];
  difficulty?: 'Bajo' | 'Medio' | 'Avanzado';
  equipment?: string;
  createdAt?: string;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  objective: string;
  currentPhase: 'Fase 1: Alivio y Reeducación' | 'Fase 2: Fortalecimiento y Control' | 'Fase 3: Readaptación Deportiva';
  startDate: string;
  estimatedEndDate: string;
  sessionsCompleted: number;
  totalSessionsPlanned: number;
  exercises: Exercise[];
  clinicalNotes: string;
}

// Historical Progress Data Point
export interface ProgressSessionPoint {
  date: string;
  sessionNumber: number;
  globalStrengthPct: number;
  globalAsymmetryPct: number;
  painVAS: number; // 0 to 10
  shoulderMobilityDeg: number;
  hipMobilityDeg: number;
  functionalScorePct: number;
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
