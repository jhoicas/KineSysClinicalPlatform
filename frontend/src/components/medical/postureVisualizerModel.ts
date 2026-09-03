import { PostureAssessment, PostureLandmark, PostureSeverity } from '../../types';

/** Modelo cinemático interno del maniquí (equivalente al de Fisiotest, sin mock). */
export interface VisualizerPosture {
  anterior: {
    cabeza: string;
    hombros: string;
    pelvis: string;
    rodillas: string;
    pies: string;
  };
  lateral: {
    cabeza: string;
    hombros: string;
    columnaDorsal: string;
    columnaLumbar: string;
    pelvis: string;
    rodillas: string;
  };
  posterior: {
    escapulas: string;
    columna: string;
    pelvis: string;
    talones: string;
  };
}

const ALIGNED = {
  anterior: {
    cabeza: 'Alineada',
    hombros: 'Simétricos',
    pelvis: 'Nivelada',
    rodillas: 'Alineadas',
    pies: 'Alineados',
  },
  lateral: {
    cabeza: 'Alineada',
    hombros: 'Alineados',
    columnaDorsal: 'Normal',
    columnaLumbar: 'Normal',
    pelvis: 'Neutra',
    rodillas: 'Neutras',
  },
  posterior: {
    escapulas: 'Simétricas',
    columna: 'Alineada',
    pelvis: 'Simétrica',
    talones: 'Alineados',
  },
} as const;

const DEFAULT_ALTERED = {
  anterior: {
    cabeza: 'Derecha',
    hombros: 'Elevado D',
    pelvis: 'Elevada D',
    rodillas: 'Valgo',
    pies: 'Pronación',
  },
  lateral: {
    cabeza: 'Anteriorizada',
    hombros: 'Protracción',
    columnaDorsal: 'Hipercifosis',
    columnaLumbar: 'Hiperlordosis',
    pelvis: 'Anteversión',
    rodillas: 'Recurvatum',
  },
  posterior: {
    escapulas: 'Asimetría',
    columna: 'Desviación derecha',
    pelvis: 'Asimetría',
    talones: 'Valgo',
  },
} as const;

const LANDMARK_MAP = {
  anterior: {
    cabeza: 'Cabeza',
    hombros: 'Hombros',
    pelvis: 'Pelvis',
    rodillas: 'Rodillas',
    pies: 'Pies',
  },
  lateral: {
    cabeza: 'Cabeza',
    hombros: 'Hombros',
    columnaDorsal: 'Cifosis dorsal',
    columnaLumbar: 'Lordosis lumbar',
    pelvis: 'Pelvis',
    rodillas: 'Rodillas',
  },
  posterior: {
    escapulas: 'Escápulas',
    columna: 'Columna',
    pelvis: 'Pelvis',
    talones: 'Pies',
  },
} as const;

function findLandmark(landmarks: PostureLandmark[], name: string) {
  return landmarks.find((lm) => lm.landmark === name);
}

function isAlteredSeverity(severity?: PostureSeverity | string) {
  return Boolean(severity && severity !== 'normal');
}

function pickFinding(
  landmarks: PostureLandmark[],
  landmarkName: string,
  aligned: string,
  fallbackAltered: string
) {
  const lm = findLandmark(landmarks, landmarkName);
  if (!lm) return aligned;
  if (lm.finding && lm.finding.trim()) return lm.finding;
  if (isAlteredSeverity(lm.severity)) return fallbackAltered;
  return aligned;
}

export function toVisualizerPosture(data: PostureAssessment): VisualizerPosture {
  return {
    anterior: {
      cabeza: pickFinding(data.anterior.landmarks, LANDMARK_MAP.anterior.cabeza, ALIGNED.anterior.cabeza, DEFAULT_ALTERED.anterior.cabeza),
      hombros: pickFinding(data.anterior.landmarks, LANDMARK_MAP.anterior.hombros, ALIGNED.anterior.hombros, DEFAULT_ALTERED.anterior.hombros),
      pelvis: pickFinding(data.anterior.landmarks, LANDMARK_MAP.anterior.pelvis, ALIGNED.anterior.pelvis, DEFAULT_ALTERED.anterior.pelvis),
      rodillas: pickFinding(data.anterior.landmarks, LANDMARK_MAP.anterior.rodillas, ALIGNED.anterior.rodillas, DEFAULT_ALTERED.anterior.rodillas),
      pies: pickFinding(data.anterior.landmarks, LANDMARK_MAP.anterior.pies, ALIGNED.anterior.pies, DEFAULT_ALTERED.anterior.pies),
    },
    lateral: {
      cabeza: pickFinding(data.lateral.landmarks, LANDMARK_MAP.lateral.cabeza, ALIGNED.lateral.cabeza, DEFAULT_ALTERED.lateral.cabeza),
      hombros: pickFinding(data.lateral.landmarks, LANDMARK_MAP.lateral.hombros, ALIGNED.lateral.hombros, DEFAULT_ALTERED.lateral.hombros),
      columnaDorsal: pickFinding(data.lateral.landmarks, LANDMARK_MAP.lateral.columnaDorsal, ALIGNED.lateral.columnaDorsal, DEFAULT_ALTERED.lateral.columnaDorsal),
      columnaLumbar: pickFinding(data.lateral.landmarks, LANDMARK_MAP.lateral.columnaLumbar, ALIGNED.lateral.columnaLumbar, DEFAULT_ALTERED.lateral.columnaLumbar),
      pelvis: pickFinding(data.lateral.landmarks, LANDMARK_MAP.lateral.pelvis, ALIGNED.lateral.pelvis, DEFAULT_ALTERED.lateral.pelvis),
      rodillas: pickFinding(data.lateral.landmarks, LANDMARK_MAP.lateral.rodillas, ALIGNED.lateral.rodillas, DEFAULT_ALTERED.lateral.rodillas),
    },
    posterior: {
      escapulas: pickFinding(data.posterior.landmarks, LANDMARK_MAP.posterior.escapulas, ALIGNED.posterior.escapulas, DEFAULT_ALTERED.posterior.escapulas),
      columna: pickFinding(data.posterior.landmarks, LANDMARK_MAP.posterior.columna, ALIGNED.posterior.columna, DEFAULT_ALTERED.posterior.columna),
      pelvis: pickFinding(data.posterior.landmarks, LANDMARK_MAP.posterior.pelvis, ALIGNED.posterior.pelvis, DEFAULT_ALTERED.posterior.pelvis),
      talones: pickFinding(data.posterior.landmarks, LANDMARK_MAP.posterior.talones, ALIGNED.posterior.talones, DEFAULT_ALTERED.posterior.talones),
    },
  };
}

export function getPinColor(
  data: PostureAssessment,
  view: 'anterior' | 'lateral' | 'posterior',
  part: string,
  value: string,
  aligned: string
) {
  const landmarkName = (LANDMARK_MAP[view] as Record<string, string>)[part];
  const lm = findLandmark(data[view].landmarks, landmarkName);
  const severity = lm?.severity || '';

  if (severity === 'normal' || (!severity && value === aligned)) return '#10B981';
  if (severity === 'leve') return '#F59E0B';
  if (severity === 'moderada') return '#F97316';
  if (severity === 'marcada') return '#EF4444';
  if (!severity && (!value || value === aligned)) return '#94A3B8';
  return '#3B82F6';
}
