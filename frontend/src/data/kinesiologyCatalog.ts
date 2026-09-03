import {
  MobilityAssessment,
  MovementGesture,
  PostureAssessment,
  PostureSeverity,
  StrengthAssessment,
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
export const POSTURE_POSTERIOR = ['Cabeza', 'Hombros', 'Escápulas', 'Pelvis', 'Rodillas', 'Pies'] as const;

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
  'Hombro (ABD)',
  'Hombro (FLX)',
  'Cadera (ABD)',
  'Cuádriceps',
  'Isquiotibiales',
  'Gemelos',
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
  return names.map((landmark) => ({ landmark, severity: '' as PostureSeverity }));
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

export function createEmptyGestures(): MovementGesture[] {
  return MOVEMENT_GESTURES.map((gesto) => ({ gesto, alteraciones: [] }));
}

export function calcStrengthAsymmetry(left: number | null, right: number | null): number | null {
  if (left == null || right == null) return null;
  const max = Math.max(left, right);
  if (max <= 0) return 0;
  return Math.round((Math.abs(left - right) / max) * 1000) / 10;
}
