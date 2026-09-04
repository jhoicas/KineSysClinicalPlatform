import {
  MobilityAssessment,
  MovementGesture,
  PostureAssessment,
  PostureSeverity,
  StrengthAssessment,
  TreatmentPlan,
  TreatmentPhase,
} from '../types';

export const POSTURE_SEVERITIES: { value: PostureSeverity; label: string }[] = [
  { value: '', label: '—' },
  { value: 'normal', label: 'Normal' },
  { value: 'leve', label: 'Leve' },
  { value: 'moderada', label: 'Moderada' },
  { value: 'marcada', label: 'Marcada' },
];

export const POSTURE_ANTERIOR = ['Cabeza', 'Hombros', 'Pelvis', 'Rodillas', 'Pies'] as const;
export const POSTURE_LATERAL = [
  'Cabeza',
  'Hombros',
  'Cifosis dorsal',
  'Lordosis lumbar',
  'Pelvis',
  'Rodillas',
] as const;
export const POSTURE_POSTERIOR = ['Cabeza', 'Hombros', 'Escápulas', 'Columna', 'Pelvis', 'Rodillas', 'Pies'] as const;

export const POSTURE_FINDINGS: Record<string, readonly string[]> = {
  'anterior:Cabeza': ['Alineada', 'Derecha', 'Izquierda'],
  'anterior:Hombros': ['Simétricos', 'Elevado D', 'Elevado I'],
  'anterior:Pelvis': ['Nivelada', 'Elevada D', 'Elevada I'],
  'anterior:Rodillas': ['Alineadas', 'Valgo', 'Varo'],
  'anterior:Pies': ['Alineados', 'Pronación', 'Supinación'],
  'lateral:Cabeza': ['Alineada', 'Anteriorizada'],
  'lateral:Hombros': ['Alineados', 'Protracción'],
  'lateral:Cifosis dorsal': ['Normal', 'Hipercifosis'],
  'lateral:Lordosis lumbar': ['Normal', 'Hiperlordosis', 'Rectificación'],
  'lateral:Pelvis': ['Neutra', 'Anteversión', 'Retroversión'],
  'lateral:Rodillas': ['Neutras', 'Flexum', 'Recurvatum'],
  'posterior:Cabeza': ['Alineada', 'Derecha', 'Izquierda'],
  'posterior:Hombros': ['Simétricos', 'Elevado D', 'Elevado I'],
  'posterior:Escápulas': ['Simétricas', 'Asimetría', 'Escápula alada'],
  'posterior:Columna': ['Alineada', 'Desviación derecha', 'Desviación izquierda'],
  'posterior:Pelvis': ['Simétrica', 'Asimetría'],
  'posterior:Rodillas': ['Alineadas', 'Valgo', 'Varo'],
  'posterior:Pies': ['Alineados', 'Valgo', 'Varo'],
};

export function postureFindingsFor(view: 'anterior' | 'lateral' | 'posterior', landmark: string): readonly string[] {
  return POSTURE_FINDINGS[`${view}:${landmark}`] ?? [];
}

export const MOBILITY_SEGMENTS = [
  'Cuello',
  'Hombros',
  'Codos',
  'Muñecas',
  'Tronco',
  'Caderas',
  'Rodillas',
  'Tobillos',
] as const;

export const STRENGTH_SEGMENTS = [
  'Hombros',
  'Codos',
  'Muñecas',
  'Caderas',
  'Rodillas',
  'Tobillos',
] as const;

export const MOVEMENT_GESTURES = [
  'Sentadilla',
  'Estocada',
  'Peso muerto',
  'Salto vertical',
  'Salto unipodal',
  'Plancha',
] as const;

export const MOVEMENT_ALTERATIONS = [
  'Valgo dinámico',
  'Varo dinámico',
  'Aterrizaje rígido',
  'Colapso de tronco',
  'Desplazamiento lateral',
  'Elevación de talones',
  'Rodillas excesivamente adelante',
  'Pérdida de equilibrio',
] as const;

function landmarks(names: readonly string[]) {
  return names.map((landmark) => ({ landmark, severity: '' as PostureSeverity, finding: '' }));
}

export function createEmptyPosture(): PostureAssessment {
  return {
    anterior: { landmarks: landmarks(POSTURE_ANTERIOR) },
    lateral: { landmarks: landmarks(POSTURE_LATERAL) },
    posterior: { landmarks: landmarks(POSTURE_POSTERIOR) },
    concepto: '',
  };
}

export function createEmptyMobility(): MobilityAssessment[] {
  return MOBILITY_SEGMENTS.map((estructura) => ({
    estructura,
    limitacion_izq: '',
    limitacion_der: '',
  }));
}

export function createEmptyStrength(): StrengthAssessment[] {
  return STRENGTH_SEGMENTS.map((estructura) => ({
    estructura,
    fuerza_izq_kg: null,
    fuerza_der_kg: null,
    asimetria_porcentaje: null,
  }));
}

/** Alinea fuerza guardada al catálogo de complejos articulares (estilo Fisiotest). */
export function mergeStrength(raw?: StrengthAssessment[] | null): StrengthAssessment[] {
  const base = createEmptyStrength();
  if (!raw?.length) return base;

  const byName = new Map(raw.map((r) => [r.estructura.trim().toLowerCase(), r]));
  return base.map((row) => {
    const found = byName.get(row.estructura.toLowerCase());
    if (!found) return row;
    return {
      estructura: row.estructura,
      fuerza_izq_kg: found.fuerza_izq_kg ?? null,
      fuerza_der_kg: found.fuerza_der_kg ?? null,
      asimetria_porcentaje: found.asimetria_porcentaje ?? null,
    };
  });
}

export function createEmptyGestures(): MovementGesture[] {
  return MOVEMENT_GESTURES.map((gesto) => ({ gesto, alteraciones: [], comentarios: '' }));
}

export function createEmptyTreatmentPlan(patientId = ''): TreatmentPlan {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `plan-${Date.now()}`,
    patientId,
    objective: '',
    currentPhase: 'Fase 1: Alivio y Reeducación' as TreatmentPhase,
    startDate: today,
    estimatedEndDate: today,
    sessionsCompleted: 0,
    totalSessionsPlanned: 12,
    exercises: [],
    clinicalNotes: '',
  };
}

/** Normaliza plan_tratamiento desde BD (objeto, string legado o vacío). */
export function normalizeTreatmentPlan(
  raw: TreatmentPlan | string | Record<string, unknown> | null | undefined,
  patientId = ''
): TreatmentPlan {
  const empty = createEmptyTreatmentPlan(patientId);
  if (raw == null || raw === '') return empty;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return empty;
    if (trimmed.startsWith('{')) {
      try {
        return normalizeTreatmentPlan(JSON.parse(trimmed) as Record<string, unknown>, patientId);
      } catch {
        return { ...empty, clinicalNotes: trimmed };
      }
    }
    return { ...empty, clinicalNotes: trimmed };
  }

  const obj = raw as Partial<TreatmentPlan> & Record<string, unknown>;
  return {
    ...empty,
    id: typeof obj.id === 'string' && obj.id ? obj.id : empty.id,
    patientId: typeof obj.patientId === 'string' ? obj.patientId : patientId || empty.patientId,
    objective: typeof obj.objective === 'string' ? obj.objective : empty.objective,
    currentPhase: (obj.currentPhase as TreatmentPhase) || empty.currentPhase,
    startDate: typeof obj.startDate === 'string' && obj.startDate ? obj.startDate : empty.startDate,
    estimatedEndDate:
      typeof obj.estimatedEndDate === 'string' && obj.estimatedEndDate
        ? obj.estimatedEndDate
        : empty.estimatedEndDate,
    sessionsCompleted:
      typeof obj.sessionsCompleted === 'number' ? obj.sessionsCompleted : empty.sessionsCompleted,
    totalSessionsPlanned:
      typeof obj.totalSessionsPlanned === 'number'
        ? obj.totalSessionsPlanned
        : empty.totalSessionsPlanned,
    exercises: Array.isArray(obj.exercises) ? (obj.exercises as TreatmentPlan['exercises']) : [],
    clinicalNotes:
      typeof obj.clinicalNotes === 'string'
        ? obj.clinicalNotes
        : typeof obj.clinicalNotes === 'undefined' && typeof obj === 'object'
          ? empty.clinicalNotes
          : empty.clinicalNotes,
  };
}

export const GESTURE_ICON_MAP: Record<string, string> = {
  Sentadilla: 'squat',
  Estocada: 'lunge',
  'Peso muerto': 'deadlift',
  'Salto vertical': 'jump',
  'Salto unipodal': 'jump',
  Plancha: 'push-up',
};

export function calcStrengthAsymmetry(left: number | null, right: number | null): number | null {
  if (left == null || right == null) return null;
  const max = Math.max(left, right);
  if (max <= 0) return 0;
  return Math.round((Math.abs(left - right) / max) * 1000) / 10;
}
