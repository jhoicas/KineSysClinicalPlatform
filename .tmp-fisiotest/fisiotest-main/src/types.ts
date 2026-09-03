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
