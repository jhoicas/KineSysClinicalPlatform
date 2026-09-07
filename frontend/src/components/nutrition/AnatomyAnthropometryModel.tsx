import React, { useState } from 'react';
import {
  AnthropometryTab,
  SkinfoldMeasurements,
  PerimeterMeasurements,
  BoneDiameterMeasurements,
} from '../../types/coreBodyNutrition';
import { RotateCw, Check, Info, Compass, ChevronRight, ChevronLeft, Ruler } from 'lucide-react';

export interface AnatomicalPointDef {
  key: string;
  name: string;
  category: AnthropometryTab;
  unit: 'mm' | 'cm';
  view: 'anterior' | 'posterior' | 'both';
  // Coordinates on silhouette percentage (x: 0-100, y: 0-100)
  anteriorCoords?: { x: number; y: number };
  posteriorCoords?: { x: number; y: number };
  techniqueGuide: string;
  normalRangeText: string;
  illustrationType: 'caliper_fold' | 'tape_perimeter' | 'bone_caliper';
}

export const ANTHROPOMETRY_POINTS: AnatomicalPointDef[] = [
  // 1. PLIEGUES CUTÁNEOS (mm)
  {
    key: 'triceps',
    name: 'Tríceps',
    category: 'skinfolds',
    unit: 'mm',
    view: 'posterior',
    posteriorCoords: { x: 26, y: 31 },
    techniqueGuide: 'Pliegue vertical en la línea media posterior del brazo, punto acromiale-radiale medio.',
    normalRangeText: 'Referencia mujer activa: 12.0 - 18.0 mm',
    illustrationType: 'caliper_fold',
  },
  {
    key: 'subescapular',
    name: 'Subescapular',
    category: 'skinfolds',
    unit: 'mm',
    view: 'posterior',
    posteriorCoords: { x: 39, y: 28 },
    techniqueGuide: 'Pliegue oblicuo a 45° a 2 cm hacia afuera y abajo del ángulo inferior de la escápula.',
    normalRangeText: 'Referencia mujer activa: 10.0 - 16.0 mm',
    illustrationType: 'caliper_fold',
  },
  {
    key: 'biceps',
    name: 'Bíceps',
    category: 'skinfolds',
    unit: 'mm',
    view: 'anterior',
    anteriorCoords: { x: 74, y: 31 },
    techniqueGuide: 'Pliegue vertical en la cara anterior del brazo sobre el vientre del músculo bíceps braquial.',
    normalRangeText: 'Referencia mujer activa: 5.0 - 10.0 mm',
    illustrationType: 'caliper_fold',
  },
  {
    key: 'crestaIliaca',
    name: 'Cresta ilíaca',
    category: 'skinfolds',
    unit: 'mm',
    view: 'anterior',
    anteriorCoords: { x: 38, y: 44 },
    techniqueGuide: 'Pliegue horizontal tomado inmediatamente por encima del borde superior del hueso ilíaco.',
    normalRangeText: 'Referencia mujer activa: 14.0 - 22.0 mm',
    illustrationType: 'caliper_fold',
  },
  {
    key: 'supraespinal',
    name: 'Supraespinal',
    category: 'skinfolds',
    unit: 'mm',
    view: 'posterior',
    posteriorCoords: { x: 63, y: 45 },
    techniqueGuide: 'Pliegue diagonal a 45° en la intersección de la línea axilar anterior y la cresta ilíaca.',
    normalRangeText: 'Referencia mujer activa: 12.0 - 19.0 mm',
    illustrationType: 'caliper_fold',
  },
  {
    key: 'abdominal',
    name: 'Abdominal',
    category: 'skinfolds',
    unit: 'mm',
    view: 'anterior',
    anteriorCoords: { x: 44, y: 43 },
    techniqueGuide: 'Pliegue vertical a 5 cm a la derecha de la cicatriz umbilical.',
    normalRangeText: 'Referencia mujer activa: 15.0 - 24.0 mm',
    illustrationType: 'caliper_fold',
  },
  {
    key: 'muslo',
    name: 'Muslo anterior',
    category: 'skinfolds',
    unit: 'mm',
    view: 'anterior',
    anteriorCoords: { x: 42, y: 62 },
    techniqueGuide: 'Pliegue longitudinal paralelo al eje del fémur, en el punto medio trocánter-tibial.',
    normalRangeText: 'Referencia mujer activa: 18.0 - 26.0 mm',
    illustrationType: 'caliper_fold',
  },
  {
    key: 'pierna',
    name: 'Pierna medial',
    category: 'skinfolds',
    unit: 'mm',
    view: 'anterior',
    anteriorCoords: { x: 58, y: 80 },
    techniqueGuide: 'Pliegue vertical en la cara interna de la pantorrilla, en el perímetro máximo de pierna.',
    normalRangeText: 'Referencia mujer activa: 12.0 - 20.0 mm',
    illustrationType: 'caliper_fold',
  },

  // 2. PERÍMETROS (cm)
  {
    key: 'brazoRelajado',
    name: 'Brazo relajado',
    category: 'perimeters',
    unit: 'cm',
    view: 'both',
    anteriorCoords: { x: 74, y: 31 },
    posteriorCoords: { x: 26, y: 31 },
    techniqueGuide: 'Perímetro a nivel del punto acromiale-radiale medio con el brazo colgando relajado.',
    normalRangeText: 'Referencia: 24.0 - 30.0 cm',
    illustrationType: 'tape_perimeter',
  },
  {
    key: 'brazoContraido',
    name: 'Brazo contraído',
    category: 'perimeters',
    unit: 'cm',
    view: 'both',
    anteriorCoords: { x: 26, y: 31 },
    posteriorCoords: { x: 74, y: 31 },
    techniqueGuide: 'Perímetro máximo con codo a 90° y contracción isométrica máxima del bíceps.',
    normalRangeText: 'Referencia: 25.5 - 32.0 cm',
    illustrationType: 'tape_perimeter',
  },
  {
    key: 'cintura',
    name: 'Cintura',
    category: 'perimeters',
    unit: 'cm',
    view: 'both',
    anteriorCoords: { x: 50, y: 42 },
    posteriorCoords: { x: 50, y: 42 },
    techniqueGuide: 'Perímetro en el nivel más estrecho del abdomen entre el reborde costal y la cresta ilíaca.',
    normalRangeText: 'Referencia saludable mujer: < 80.0 cm',
    illustrationType: 'tape_perimeter',
  },
  {
    key: 'cadera',
    name: 'Cadera',
    category: 'perimeters',
    unit: 'cm',
    view: 'both',
    anteriorCoords: { x: 50, y: 50 },
    posteriorCoords: { x: 50, y: 50 },
    techniqueGuide: 'Perímetro horizontal a nivel del saliente máximo de los glúteos.',
    normalRangeText: 'Referencia: 88.0 - 98.0 cm',
    illustrationType: 'tape_perimeter',
  },
  {
    key: 'muslo',
    name: 'Muslo (1 cm glúteo)',
    category: 'perimeters',
    unit: 'cm',
    view: 'both',
    anteriorCoords: { x: 42, y: 62 },
    posteriorCoords: { x: 42, y: 62 },
    techniqueGuide: 'Perímetro horizontal 1 cm inmediatamente por debajo del pliegue subglúteo.',
    normalRangeText: 'Referencia: 44.0 - 54.0 cm',
    illustrationType: 'tape_perimeter',
  },
  {
    key: 'pierna',
    name: 'Pierna (Pantorrilla)',
    category: 'perimeters',
    unit: 'cm',
    view: 'both',
    anteriorCoords: { x: 58, y: 80 },
    posteriorCoords: { x: 58, y: 80 },
    techniqueGuide: 'Perímetro transversal a nivel del máximo desarrollo muscular de la pantorrilla.',
    normalRangeText: 'Referencia: 30.0 - 36.0 cm',
    illustrationType: 'tape_perimeter',
  },

  // 3. DIÁMETROS ÓSEOS (cm)
  {
    key: 'biacromial',
    name: 'Biacromial',
    category: 'diameters',
    unit: 'cm',
    view: 'posterior',
    posteriorCoords: { x: 50, y: 20 },
    techniqueGuide: 'Distancia entre los bordes más laterales de ambos acromion en bipedestación erguida.',
    normalRangeText: 'Referencia mujer: 34.0 - 39.0 cm',
    illustrationType: 'bone_caliper',
  },
  {
    key: 'humero',
    name: 'Húmero (Biepicondilar)',
    category: 'diameters',
    unit: 'cm',
    view: 'anterior',
    anteriorCoords: { x: 74, y: 39 },
    techniqueGuide: 'Distancia entre los epicóndilos medial y lateral del húmero con codo flexionado a 90°.',
    normalRangeText: 'Referencia mujer: 6.0 - 7.5 cm',
    illustrationType: 'bone_caliper',
  },
  {
    key: 'femur',
    name: 'Fémur (Biepicondilar)',
    category: 'diameters',
    unit: 'cm',
    view: 'anterior',
    anteriorCoords: { x: 56, y: 71 },
    techniqueGuide: 'Distancia transversal máxima entre los cóndilos medial y lateral del fémur (rodilla 90°).',
    normalRangeText: 'Referencia mujer: 8.5 - 10.2 cm',
    illustrationType: 'bone_caliper',
  },
];

interface AnatomyAnthropometryModelProps {
  gender?: 'M' | 'F' | 'Otro';
  activeTab: AnthropometryTab;
  skinfolds: SkinfoldMeasurements;
  perimeters: PerimeterMeasurements;
  diameters: BoneDiameterMeasurements;
  onUpdateSkinfold: (key: keyof SkinfoldMeasurements, val: number) => void;
  onUpdatePerimeter: (key: keyof PerimeterMeasurements, val: number) => void;
  onUpdateDiameter: (key: keyof BoneDiameterMeasurements, val: number) => void;
  activePointKey?: string;
  onSelectPointKey?: (key: string) => void;
}

export const AnatomyAnthropometryModel: React.FC<AnatomyAnthropometryModelProps> = ({
  gender = 'F',
  activeTab,
  skinfolds,
  perimeters,
  diameters,
  onUpdateSkinfold,
  onUpdatePerimeter,
  onUpdateDiameter,
  activePointKey,
  onSelectPointKey,
}) => {
  const isFemale = gender === 'F';
  // Filter points for active tab
  const tabPoints = ANTHROPOMETRY_POINTS.filter((p) => p.category === activeTab);

  // Selected point for popover
  const [internalSelectedKey, setInternalSelectedKey] = useState<string>(
    activePointKey || (tabPoints[0] ? tabPoints[0].key : '')
  );

  const selectedKey = activePointKey || internalSelectedKey;
  const currentPoint = tabPoints.find((p) => p.key === selectedKey) || tabPoints[0];

  // Temporary edit value for popover input
  const getCurrentValue = (point: AnatomicalPointDef): number | null => {
    if (point.category === 'skinfolds') {
      const v = (skinfolds as Record<string, number>)[point.key];
      return v != null && v > 0 ? v : null;
    }
    if (point.category === 'perimeters') {
      const v = (perimeters as Record<string, number>)[point.key];
      return v != null && v > 0 ? v : null;
    }
    const v = (diameters as Record<string, number>)[point.key];
    return v != null && v > 0 ? v : null;
  };

  const [inputVal, setInputVal] = useState<string>(
    currentPoint && getCurrentValue(currentPoint) != null
      ? getCurrentValue(currentPoint)!.toFixed(1)
      : ''
  );

  const handleSelectPoint = (pointKey: string) => {
    setInternalSelectedKey(pointKey);
    if (onSelectPointKey) {
      onSelectPointKey(pointKey);
    }
    const pt = tabPoints.find((p) => p.key === pointKey);
    if (pt) {
      const v = getCurrentValue(pt);
      setInputVal(v != null ? v.toFixed(1) : '');
    }
  };

  const handleSaveCurrentVal = () => {
    if (!currentPoint) return;
    const num = parseFloat(inputVal.replace(',', '.'));
    if (isNaN(num)) return;

    if (currentPoint.category === 'skinfolds') {
      onUpdateSkinfold(currentPoint.key as keyof SkinfoldMeasurements, num);
    } else if (currentPoint.category === 'perimeters') {
      onUpdatePerimeter(currentPoint.key as keyof PerimeterMeasurements, num);
    } else {
      onUpdateDiameter(currentPoint.key as keyof BoneDiameterMeasurements, num);
    }
  };

  const handleRepeatMeasurement = () => {
    setInputVal('');
  };

  // Navigation: Next / Prev
  const currentIndex = tabPoints.findIndex((p) => p.key === selectedKey);
  const handlePrev = () => {
    if (currentIndex > 0) {
      handleSelectPoint(tabPoints[currentIndex - 1].key);
    }
  };
  const handleNext = () => {
    if (currentIndex < tabPoints.length - 1) {
      handleSelectPoint(tabPoints[currentIndex + 1].key);
    }
  };

  // Color coding by category
  const themeColor =
    activeTab === 'skinfolds'
      ? {
          badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-600 ring-blue-300 text-white',
          dotActive: 'bg-blue-700 ring-4 ring-blue-400 scale-125 shadow-lg shadow-blue-500/50',
          cardBorder: 'border-blue-200 shadow-blue-500/10',
          btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
        }
      : activeTab === 'perimeters'
      ? {
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-600 ring-emerald-300 text-white',
          dotActive: 'bg-emerald-700 ring-4 ring-emerald-400 scale-125 shadow-lg shadow-emerald-500/50',
          cardBorder: 'border-emerald-200 shadow-emerald-500/10',
          btnPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        }
      : {
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-600 ring-amber-300 text-white',
          dotActive: 'bg-amber-700 ring-4 ring-amber-400 scale-125 shadow-lg shadow-amber-500/50',
          cardBorder: 'border-amber-200 shadow-amber-500/10',
          btnPrimary: 'bg-amber-600 hover:bg-amber-700 text-white',
        };

  return (
    <div id="anatomy-anthropometry-container" className="relative flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Banner Status */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-slate-500" />
            Modelo Anatómico ISAK
          </span>
          <span className={`px-2 py-0.5 rounded-full font-medium border ${themeColor.badgeBg}`}>
            {activeTab === 'skinfolds'
              ? 'Pliegues Cutáneos (mm)'
              : activeTab === 'perimeters'
              ? 'Perímetros Musculares (cm)'
              : 'Diámetros Óseos (cm)'}
          </span>
          <span className="px-2 py-0.5 rounded-full font-medium border border-slate-200 bg-white text-slate-600">
            {isFemale ? '♀ Femenino' : '♂ Masculino'}
          </span>
        </div>
        <div className="text-slate-500 text-2xs font-medium">
          Haz clic sobre cualquier punto para medir o calibrar
        </div>
      </div>

      {/* Main Dual Anatomical Canvas Area */}
      <div className="relative p-6 bg-radial from-slate-50 to-slate-100/40 min-h-[460px] flex items-center justify-center">
        {/* Silhouette Pair (Anterior & Posterior) */}
        <div className="flex items-center justify-center gap-10 md:gap-16 w-full max-w-xl">
          {/* VISTA ANTERIOR */}
          <div className="relative flex flex-col items-center">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Vista Anterior
            </span>
            <div className="relative w-44 h-96 flex items-center justify-center select-none">
              {/* Athletic SVG Silhouette - Front (gender-conditioned) */}
              <svg
                viewBox="0 0 100 220"
                className="w-full h-full drop-shadow-md text-slate-300"
                style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.04))' }}
              >
                <defs>
                  <linearGradient id="bodySkinFront" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#CBD5E1" />
                    <stop offset="100%" stopColor="#94A3B8" />
                  </linearGradient>
                  <linearGradient id="sportsAttire" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0F172A" />
                    <stop offset="100%" stopColor="#1E293B" />
                  </linearGradient>
                </defs>
                <ellipse cx="50" cy={isFemale ? 18 : 17} rx={isFemale ? 10 : 11} ry={isFemale ? 13 : 14} fill="url(#bodySkinFront)" />
                <path d="M46 30 L46 36 L54 36 L54 30 Z" fill="url(#bodySkinFront)" />
                {/* Torso: mujer cintura marcada; hombre hombros anchos / cintura recta */}
                {isFemale ? (
                  <path
                    d="M46 36 C35 38 28 44 26 50 C24 57 23 70 23 78 C23 83 26 84 27 80 L28 65 C32 68 36 70 38 78 C40 85 41 94 40 100 C39 105 38 108 34 114 C30 119 32 125 35 125 L49 125 L51 125 L65 125 C68 125 70 119 66 114 C62 108 61 105 60 100 C59 94 60 85 62 78 C64 70 68 68 72 65 L73 80 C74 84 77 83 77 78 C77 70 76 57 74 50 C72 44 65 38 54 36 Z"
                    fill="url(#bodySkinFront)"
                  />
                ) : (
                  <path
                    d="M44 36 C30 38 22 44 20 52 C18 60 17 72 17 82 C17 86 20 87 22 84 L24 66 C28 70 32 74 34 84 C36 94 37 104 36 112 C35 118 34 122 30 126 C28 128 32 130 36 130 L50 130 L64 130 C68 130 72 128 70 126 C66 122 65 118 64 112 C63 104 64 94 66 84 C68 74 72 70 76 66 L78 84 C80 87 83 86 83 82 C83 72 82 60 80 52 C78 44 70 38 56 36 Z"
                    fill="url(#bodySkinFront)"
                  />
                )}
                <path
                  d={isFemale
                    ? 'M74 50 C77 60 80 75 80 92 C80 102 78 112 77 118 C76 122 73 124 72 120 C71 114 74 100 73 90 C72 82 71 72 70 66 Z'
                    : 'M80 52 C84 64 88 80 88 100 C88 112 86 122 84 128 C83 132 80 132 79 128 C78 120 82 104 80 92 C78 80 76 68 74 62 Z'}
                  fill="url(#bodySkinFront)"
                />
                <path
                  d={isFemale
                    ? 'M26 50 C23 60 20 75 20 92 C20 102 22 112 23 118 C24 122 27 124 28 120 C29 114 26 100 27 90 C28 82 29 72 30 66 Z'
                    : 'M20 52 C16 64 12 80 12 100 C12 112 14 122 16 128 C17 132 20 132 21 128 C22 120 18 104 20 92 C22 80 24 68 26 62 Z'}
                  fill="url(#bodySkinFront)"
                />
                {isFemale ? (
                  <path d="M40 40 Q50 48 60 40 L64 62 Q50 67 36 62 Z" fill="url(#sportsAttire)" />
                ) : (
                  <g stroke="#64748B" strokeWidth="0.7" fill="none" opacity="0.55">
                    <path d="M34 48 Q50 56 66 48" />
                    <path d="M36 62 Q50 70 64 62" />
                    <path d="M40 78 L40 100 M60 78 L60 100" />
                    <ellipse cx="34" cy="52" rx="6" ry="8" />
                    <ellipse cx="66" cy="52" rx="6" ry="8" />
                  </g>
                )}
                <path
                  d={isFemale
                    ? 'M38 98 Q50 96 62 98 L65 124 L52 124 L50 112 L48 124 L35 124 Z'
                    : 'M34 108 Q50 106 66 108 L68 132 L52 132 L50 120 L48 132 L32 132 Z'}
                  fill="url(#sportsAttire)"
                />
                <path
                  d={isFemale
                    ? 'M35 124 C34 135 34 150 37 165 C38 172 39 179 38 188 C37 196 36 205 35 212 C35 215 39 216 41 214 C43 208 44 196 44 186 C44 175 46 162 46 150 C46 138 48 126 50 114 Z'
                    : 'M32 132 C30 145 30 160 34 176 C35 184 36 192 35 200 C34 208 33 214 34 216 C36 218 40 217 41 214 C43 206 44 196 44 186 C44 172 46 156 48 142 C48 136 49 132 50 128 Z'}
                  fill="url(#bodySkinFront)"
                />
                <path
                  d={isFemale
                    ? 'M65 124 C66 135 66 150 63 165 C62 172 61 179 62 188 C63 196 64 205 65 212 C65 215 61 216 59 214 C57 208 56 196 56 186 C56 175 54 162 54 150 C54 138 52 126 50 114 Z'
                    : 'M68 132 C70 145 70 160 66 176 C65 184 64 192 65 200 C66 208 67 214 66 216 C64 218 60 217 59 214 C57 206 56 196 56 186 C56 172 54 156 52 142 C52 136 51 132 50 128 Z'}
                  fill="url(#bodySkinFront)"
                />
                {isFemale && (
                  <>
                    <circle cx="50" cy="85" r="1.2" fill="#64748B" opacity="0.6" />
                    <path d="M48 68 Q50 71 52 68" stroke="#64748B" strokeWidth="0.8" fill="none" opacity="0.4" />
                  </>
                )}
              </svg>

              {/* Anterior Active Points Overlay */}
              {tabPoints
                .filter((p) => p.view === 'anterior' || p.view === 'both')
                .map((pt) => {
                  const coords = pt.anteriorCoords;
                  if (!coords) return null;
                  const isSelected = pt.key === selectedKey;
                  const val = getCurrentValue(pt);
                  return (
                    <button
                      key={`ant-${pt.key}`}
                      id={`btn-point-ant-${pt.key}`}
                      onClick={() => handleSelectPoint(pt.key)}
                      style={{
                        left: `${coords.x}%`,
                        top: `${coords.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      title={`${pt.name}${val != null ? `: ${val} ${pt.unit}` : ''}`}
                      className={`absolute z-10 transition-all duration-200 cursor-pointer flex items-center justify-center rounded-full ${
                        isSelected ? themeColor.dotActive : `${themeColor.dot} hover:scale-110 shadow-sm`
                      } w-4 h-4 text-2xs font-bold ring-2`}
                    >
                      <span className="sr-only">{pt.name}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* VISTA POSTERIOR */}
          <div className="relative flex flex-col items-center">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Vista Posterior
            </span>
            <div className="relative w-44 h-96 flex items-center justify-center select-none">
              {/* Female Athletic SVG Silhouette - Back */}
              <svg
                viewBox="0 0 100 220"
                className="w-full h-full drop-shadow-md text-slate-300"
                style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.04))' }}
              >
                <defs>
                  <linearGradient id="bodySkinBack" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#CBD5E1" />
                    <stop offset="100%" stopColor="#94A3B8" />
                  </linearGradient>
                </defs>
                <ellipse cx="50" cy={isFemale ? 18 : 17} rx={isFemale ? 10 : 11} ry={isFemale ? 13 : 14} fill="url(#bodySkinBack)" />
                {isFemale && <path d="M43 14 C43 25 57 25 57 14 Z" fill="#475569" opacity="0.3" />}
                <path d="M46 30 L46 36 L54 36 L54 30 Z" fill="url(#bodySkinBack)" />
                <line x1="50" y1="38" x2="50" y2={isFemale ? 92 : 100} stroke="#64748B" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.4" />
                {isFemale ? (
                  <path
                    d="M46 36 C35 38 28 44 26 50 C24 57 23 70 23 78 C23 83 26 84 27 80 L28 65 C32 68 36 70 38 78 C40 85 41 94 40 100 C39 105 38 108 34 114 C30 119 32 125 35 125 L49 125 L51 125 L65 125 C68 125 70 119 66 114 C62 108 61 105 60 100 C59 94 60 85 62 78 C64 70 68 68 72 65 L73 80 C74 84 77 83 77 78 C77 70 76 57 74 50 C72 44 65 38 54 36 Z"
                    fill="url(#bodySkinBack)"
                  />
                ) : (
                  <path
                    d="M44 36 C30 38 22 44 20 52 C18 60 17 72 17 82 C17 86 20 87 22 84 L24 66 C28 70 32 74 34 84 C36 94 37 104 36 112 C35 118 34 122 30 126 C28 128 32 130 36 130 L50 130 L64 130 C68 130 72 128 70 126 C66 122 65 118 64 112 C63 104 64 94 66 84 C68 74 72 70 76 66 L78 84 C80 87 83 86 83 82 C83 72 82 60 80 52 C78 44 70 38 56 36 Z"
                    fill="url(#bodySkinBack)"
                  />
                )}
                <path d="M38 46 Q42 54 44 60" stroke="#64748B" strokeWidth="0.9" fill="none" opacity="0.4" />
                <path d="M62 46 Q58 54 56 60" stroke="#64748B" strokeWidth="0.9" fill="none" opacity="0.4" />
                {!isFemale && (
                  <g stroke="#64748B" strokeWidth="0.7" fill="none" opacity="0.5">
                    <path d="M36 50 Q42 62 38 78" />
                    <path d="M64 50 Q58 62 62 78" />
                    <path d="M42 88 Q50 96 58 88" />
                  </g>
                )}
                <path
                  d={isFemale
                    ? 'M26 50 C23 60 20 75 20 92 C20 102 22 112 23 118 C24 122 27 124 28 120 C29 114 26 100 27 90 C28 82 29 72 30 66 Z'
                    : 'M20 52 C16 64 12 80 12 100 C12 112 14 122 16 128 C17 132 20 132 21 128 C22 120 18 104 20 92 C22 80 24 68 26 62 Z'}
                  fill="url(#bodySkinBack)"
                />
                <path
                  d={isFemale
                    ? 'M74 50 C77 60 80 75 80 92 C80 102 78 112 77 118 C76 122 73 124 72 120 C71 114 74 100 73 90 C72 82 71 72 70 66 Z'
                    : 'M80 52 C84 64 88 80 88 100 C88 112 86 122 84 128 C83 132 80 132 79 128 C78 120 82 104 80 92 C78 80 76 68 74 62 Z'}
                  fill="url(#bodySkinBack)"
                />
                {isFemale ? (
                  <path d="M42 40 L58 40 L60 62 L40 62 Z" fill="#0F172A" />
                ) : null}
                <path
                  d={isFemale
                    ? 'M38 98 Q50 96 62 98 L65 124 L52 124 L50 116 L48 124 L35 124 Z'
                    : 'M34 108 Q50 106 66 108 L68 132 L52 132 L50 124 L48 132 L32 132 Z'}
                  fill="#0F172A"
                />
                <path
                  d={isFemale
                    ? 'M35 124 C34 135 34 150 37 165 C38 172 39 179 38 188 C37 196 36 205 35 212 C35 215 39 216 41 214 C43 208 44 196 44 186 C44 175 46 162 46 150 C46 138 48 126 50 114 Z'
                    : 'M32 132 C30 145 30 160 34 176 C35 184 36 192 35 200 C34 208 33 214 34 216 C36 218 40 217 41 214 C43 206 44 196 44 186 C44 172 46 156 48 142 C48 136 49 132 50 128 Z'}
                  fill="url(#bodySkinBack)"
                />
                <path
                  d={isFemale
                    ? 'M65 124 C66 135 66 150 63 165 C62 172 61 179 62 188 C63 196 64 205 65 212 C65 215 61 216 59 214 C57 208 56 196 56 186 C56 175 54 162 54 150 C54 138 52 126 50 114 Z'
                    : 'M68 132 C70 145 70 160 66 176 C65 184 64 192 65 200 C66 208 67 214 66 216 C64 218 60 217 59 214 C57 206 56 196 56 186 C56 172 54 156 52 142 C52 136 51 132 50 128 Z'}
                  fill="url(#bodySkinBack)"
                />
                <path d="M40 170 Q43 172 45 170" stroke="#64748B" strokeWidth="0.8" fill="none" opacity="0.5" />
                <path d="M55 170 Q57 172 60 170" stroke="#64748B" strokeWidth="0.8" fill="none" opacity="0.5" />
              </svg>

              {/* Posterior Active Points Overlay */}
              {tabPoints
                .filter((p) => p.view === 'posterior' || p.view === 'both')
                .map((pt) => {
                  const coords = pt.posteriorCoords;
                  if (!coords) return null;
                  const isSelected = pt.key === selectedKey;
                  const val = getCurrentValue(pt);
                  return (
                    <button
                      key={`post-${pt.key}`}
                      id={`btn-point-post-${pt.key}`}
                      onClick={() => handleSelectPoint(pt.key)}
                      style={{
                        left: `${coords.x}%`,
                        top: `${coords.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      title={`${pt.name}${val != null ? `: ${val} ${pt.unit}` : ''}`}
                      className={`absolute z-10 transition-all duration-200 cursor-pointer flex items-center justify-center rounded-full ${
                        isSelected ? themeColor.dotActive : `${themeColor.dot} hover:scale-110 shadow-sm`
                      } w-4 h-4 text-2xs font-bold ring-2`}
                    >
                      <span className="sr-only">{pt.name}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Dock inferior de medición — fuera del canvas anatómico (sin superposición) */}
      {currentPoint && (
        <div
          id="anthropometry-measure-dock"
          className={`border-t border-slate-200 bg-white px-4 py-3 ${themeColor.cardBorder}`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 max-w-5xl mx-auto">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                {currentPoint.illustrationType === 'caliper_fold' ? (
                  <Ruler className="w-5 h-5 text-blue-600" />
                ) : currentPoint.illustrationType === 'tape_perimeter' ? (
                  <Compass className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Ruler className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {currentPoint.category === 'skinfolds'
                      ? 'Pliegue Cutáneo'
                      : currentPoint.category === 'perimeters'
                      ? 'Perímetro'
                      : 'Diámetro Óseo'}
                  </span>
                  <span className="text-2xs text-slate-400">ISAK · KineSys</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 truncate">{currentPoint.name}</h4>
                <p className="text-2xs text-slate-500 line-clamp-2">{currentPoint.techniqueGuide}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="relative w-36">
                <input
                  type="number"
                  step="0.1"
                  id={`input-measure-${currentPoint.key}`}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveCurrentVal();
                  }}
                  className="w-full text-base font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-hidden text-right pr-10 transition-all"
                  placeholder="—"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                  {currentPoint.unit}
                </span>
              </div>
              <button
                id="btn-save-measure"
                type="button"
                onClick={handleSaveCurrentVal}
                className={`inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-xs font-semibold transition-all shadow-sm ${themeColor.btnPrimary}`}
              >
                <Check className="w-3.5 h-3.5" />
                Guardar
              </button>
              <button
                id="btn-repeat-measure"
                type="button"
                onClick={handleRepeatMeasurement}
                className="py-2 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium transition-colors"
                title="Limpiar para repetir medición"
              >
                Repetir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Progress and Step Navigator Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200">
        <button
          id="btn-step-prev"
          onClick={handlePrev}
          disabled={currentIndex <= 0}
          className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-800">
            {currentIndex + 1} / {tabPoints.length}{' '}
            <span className="font-normal text-slate-500 capitalize">{activeTab === 'skinfolds' ? 'Pliegues' : activeTab === 'perimeters' ? 'Perímetros' : 'Diámetros'}</span>
          </span>
          <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full transition-all duration-300 ${
                activeTab === 'skinfolds'
                  ? 'bg-blue-600'
                  : activeTab === 'perimeters'
                  ? 'bg-emerald-600'
                  : 'bg-amber-600'
              }`}
              style={{ width: `${((currentIndex + 1) / tabPoints.length) * 100}%` }}
            />
          </div>
        </div>

        <button
          id="btn-step-next"
          onClick={handleNext}
          disabled={currentIndex >= tabPoints.length - 1}
          className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
        >
          Siguiente
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
