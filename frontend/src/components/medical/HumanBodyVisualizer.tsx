import React, { useState } from 'react';
import { PostureAssessment } from '../../types';
import { getPinColor, toVisualizerPosture } from './postureVisualizerModel';

interface HumanBodyVisualizerProps {
  data: PostureAssessment;
  activeView?: 'all' | 'anterior' | 'lateral' | 'posterior';
  onSelectLandmark?: (view: 'anterior' | 'lateral' | 'posterior', part: string) => void;
  viewMode?: 'muscular' | 'skeletal';
  showPlumbLine?: boolean;
  showAngles?: boolean;
  showGhostIdeal?: boolean;
  hideToolbar?: boolean;
  hideCardWrapper?: boolean;
  hideViewTitle?: boolean;
}

export const HumanBodyVisualizer: React.FC<HumanBodyVisualizerProps> = ({
  data,
  activeView = 'all',
  onSelectLandmark,
  viewMode: propViewMode,
  showPlumbLine: propShowPlumbLine,
  showAngles: propShowAngles,
  showGhostIdeal: propShowGhostIdeal,
  hideToolbar = false,
  hideCardWrapper = false,
  hideViewTitle = false,
}) => {
  const posture = toVisualizerPosture(data);
  // Visualizer settings state (internal fallback or controlled)
  const [internalViewMode, setInternalViewMode] = useState<'muscular' | 'skeletal'>('muscular');
  const [internalShowPlumbLine, setInternalShowPlumbLine] = useState<boolean>(true);
  const [internalShowAngles, setInternalShowAngles] = useState<boolean>(true);
  const [internalShowGhostIdeal, setInternalShowGhostIdeal] = useState<boolean>(true);

  const viewMode = propViewMode !== undefined ? propViewMode : internalViewMode;
  const showPlumbLine = propShowPlumbLine !== undefined ? propShowPlumbLine : internalShowPlumbLine;
  const showAngles = propShowAngles !== undefined ? propShowAngles : internalShowAngles;
  const showGhostIdeal = propShowGhostIdeal !== undefined ? propShowGhostIdeal : internalShowGhostIdeal;

  const getBadgeColor = (
    view: 'anterior' | 'lateral' | 'posterior',
    part: string,
    val: string,
    normalVal: string
  ) => getPinColor(data, view, part, val, normalVal);

  // Compute total alterations
  const anteriorDeviations = [
    posture.anterior.cabeza !== 'Alineada',
    posture.anterior.hombros !== 'Simétricos',
    posture.anterior.pelvis !== 'Nivelada',
    posture.anterior.rodillas !== 'Alineadas',
    posture.anterior.pies !== 'Alineados',
  ].filter(Boolean).length;

  const lateralDeviations = [
    posture.lateral.cabeza !== 'Alineada',
    posture.lateral.hombros !== 'Alineados',
    posture.lateral.columnaDorsal !== 'Normal',
    posture.lateral.columnaLumbar !== 'Normal',
    posture.lateral.pelvis !== 'Neutra',
    posture.lateral.rodillas !== 'Neutras',
  ].filter(Boolean).length;

  const posteriorDeviations = [
    posture.posterior.escapulas !== 'Simétricas',
    posture.posterior.columna !== 'Alineada',
    posture.posterior.pelvis !== 'Simétrica',
    posture.posterior.talones !== 'Alineados',
  ].filter(Boolean).length;

  const totalDeviations = anteriorDeviations + lateralDeviations + posteriorDeviations;
  const symmetryScore = Math.max(20, Math.round(100 - totalDeviations * 6.5));

  // Dynamic kinematic calculations for VISTA ANTERIOR
  const anteriorHeadRotate =
    posture.anterior.cabeza === 'Derecha' ? 6.5 : posture.anterior.cabeza === 'Izquierda' ? -6.5 : 0;
  const anteriorHeadTranslateX =
    posture.anterior.cabeza === 'Derecha' ? 4 : posture.anterior.cabeza === 'Izquierda' ? -4 : 0;

  const anteriorShoulderLeftY =
    posture.anterior.hombros === 'Elevado I' ? -6 : posture.anterior.hombros === 'Elevado D' ? 2 : 0;
  const anteriorShoulderRightY =
    posture.anterior.hombros === 'Elevado D' ? -6 : posture.anterior.hombros === 'Elevado I' ? 2 : 0;
  const anteriorShoulderAngle =
    posture.anterior.hombros === 'Elevado D' ? -4.5 : posture.anterior.hombros === 'Elevado I' ? 4.5 : 0;

  const anteriorPelvisLeftY =
    posture.anterior.pelvis === 'Elevada I' ? -5 : posture.anterior.pelvis === 'Elevada D' ? 2 : 0;
  const anteriorPelvisRightY =
    posture.anterior.pelvis === 'Elevada D' ? -5 : posture.anterior.pelvis === 'Elevada I' ? 2 : 0;
  const anteriorPelvisAngle =
    posture.anterior.pelvis === 'Elevada D' ? -3.8 : posture.anterior.pelvis === 'Elevada I' ? 3.8 : 0;

  // Knees: normal distance = 22px between centers (39 and 61)
  // Valgo (knock-knees) = knees shift inward (44 and 56), tibiae flare outward
  // Varo (bow-legs) = knees shift outward (32 and 68), tibiae curve
  const leftKneeOffset =
    posture.anterior.rodillas === 'Valgo' ? 5.5 : posture.anterior.rodillas === 'Varo' ? -7 : 0;
  const rightKneeOffset =
    posture.anterior.rodillas === 'Valgo' ? -5.5 : posture.anterior.rodillas === 'Varo' ? 7 : 0;

  // Feet
  const footPronationAngleLeft =
    posture.anterior.pies === 'Pronación' ? -6 : posture.anterior.pies === 'Supinación' ? 6 : 0;
  const footPronationAngleRight =
    posture.anterior.pies === 'Pronación' ? 6 : posture.anterior.pies === 'Supinación' ? -6 : 0;

  // Dynamic kinematic calculations for VISTA LATERAL (Sagittal Plane)
  // Head forward translation
  const lateralHeadX = posture.lateral.cabeza === 'Anteriorizada' ? 12 : 0;
  // Shoulder protraction
  const lateralShoulderX = posture.lateral.hombros === 'Protracción' ? 8 : 0;
  // Dorsal kyphosis (apex displacement)
  const lateralKyphosisOffset = posture.lateral.columnaDorsal === 'Hipercifosis' ? -10 : 0;
  // Lumbar lordosis (apex displacement forward)
  const lateralLordosisOffset =
    posture.lateral.columnaLumbar === 'Hiperlordosis'
      ? 9
      : posture.lateral.columnaLumbar === 'Rectificación'
      ? -4
      : 0;
  // Pelvic sagittal tilt
  const lateralPelvisTilt =
    posture.lateral.pelvis === 'Anteversión' ? -8 : posture.lateral.pelvis === 'Retroversión' ? 7 : 0;
  // Knee sagittal
  const lateralKneeOffset =
    posture.lateral.rodillas === 'Recurvatum' ? -6 : posture.lateral.rodillas === 'Flexum' ? 7 : 0;

  // Dynamic kinematic calculations for VISTA POSTERIOR
  const posteriorScapulaRightY =
    posture.posterior.escapulas === 'Asimetría' ? -6 : 0;
  const posteriorScapulaWinging =
    posture.posterior.escapulas === 'Escápula alada';

  const posteriorSpineDeviation =
    posture.posterior.columna === 'Desviación derecha'
      ? 7
      : posture.posterior.columna === 'Desviación izquierda'
      ? -7
      : 0;

  const posteriorPelvisTilt =
    posture.posterior.pelvis === 'Asimetría' ? -4 : 0;

  const posteriorHeelAngleLeft =
    posture.posterior.talones === 'Valgo' ? 5 : posture.posterior.talones === 'Varo' ? -5 : 0;
  const posteriorHeelAngleRight =
    posture.posterior.talones === 'Valgo' ? -5 : posture.posterior.talones === 'Varo' ? 5 : 0;

  return (
    <div className="space-y-4 w-full">
      {/* Visualizer Top Control Ribbon */}
      {!hideToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          {/* Toggle Modes */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setInternalViewMode(viewMode === 'muscular' ? 'skeletal' : 'muscular')}
              className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'skeletal'
                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Alternar entre silueta muscular y ejes esqueléticos biomecánicos"
            >
              <span className={`material-symbols-outlined text-[16px] ${viewMode === 'skeletal' ? 'text-blue-600' : 'text-slate-500'}`}>layers</span>
              <span>{viewMode === 'muscular' ? 'Modo Muscular' : 'Ejes Esqueléticos'}</span>
            </button>

            <button
              type="button"
              onClick={() => setInternalShowPlumbLine(!showPlumbLine)}
              className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
                showPlumbLine
                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
              title="Línea de gravedad / plomada vertical de referencia"
            >
              <span className={`material-symbols-outlined text-[16px] ${showPlumbLine ? 'text-blue-600' : 'text-slate-400'}`}>my_location</span>
              <span>Línea de Plomada</span>
            </button>

            <button
              type="button"
              onClick={() => setInternalShowAngles(!showAngles)}
              className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
                showAngles
                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
              title="Mostrar grados angulares y milímetros de desviación"
            >
              <span className={`material-symbols-outlined text-[16px] ${showAngles ? 'text-blue-600' : 'text-slate-400'}`}>architecture</span>
              <span>Ángulos & Ejes</span>
            </button>

            <button
              type="button"
              onClick={() => setInternalShowGhostIdeal(!showGhostIdeal)}
              className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
                showGhostIdeal
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
              title="Superpone la silueta fantasma en postura neutra ideal para comparar las desviaciones"
            >
              <span className={`material-symbols-outlined text-[16px] ${showGhostIdeal ? 'text-emerald-600' : 'text-slate-400'}`}>visibility</span>
              <span>Comparar con Ideal</span>
            </button>
          </div>

          {/* Real-time Postural Index Badge */}
          <div className="flex items-center gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-semibold border border-slate-200/80">
              <span>Simetría Global:</span>
              <span
                className={`font-bold ${
                  symmetryScore >= 85
                    ? 'text-emerald-600'
                    : symmetryScore >= 65
                    ? 'text-blue-600'
                    : 'text-amber-600'
                }`}
              >
                {symmetryScore}%
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {totalDeviations === 0 ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">check_circle</span> Alineación Neutra
                </span>
              ) : (
                <span className="text-blue-700 font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-blue-600">warning</span> {totalDeviations} hallazgos activos
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Mannequin Stage Card */}
      <div
        className={`relative w-full overflow-hidden ${
          hideCardWrapper
            ? 'p-1 sm:p-2'
            : 'bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs'
        }`}
      >
        {/* Subtle Biomechanical Grid Lines */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-[14%] left-0 right-0 border-b border-dashed border-slate-200" />
          <div className="absolute top-[24%] left-0 right-0 border-b border-dashed border-slate-200" />
          <div className="absolute top-[48%] left-0 right-0 border-b border-dashed border-slate-200" />
          <div className="absolute top-[72%] left-0 right-0 border-b border-dashed border-slate-200" />
          <div className="absolute top-[92%] left-0 right-0 border-b border-dashed border-slate-200" />
        </div>

        {/* Global SVG Definitions (Shaders, Gradients, Filters) */}
        <svg className="w-0 h-0 absolute pointer-events-none">
          <defs>
            {/* Realistic Anatomical Skin / Muscular Shading Gradient */}
            <linearGradient id="skinMuscleAnterior" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="35%" stopColor="#e2e8f0" />
              <stop offset="70%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            <linearGradient id="skinMuscleLateral" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="25%" stopColor="#cbd5e1" />
              <stop offset="70%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>

            <linearGradient id="skinMusclePosterior" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="40%" stopColor="#cbd5e1" />
              <stop offset="85%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            {/* Shorts / Pelvic Apparel */}
            <linearGradient id="shortsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Skeletal Bone Shading */}
            <linearGradient id="boneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            {/* Drop Shadow Filter */}
            <filter id="modelShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.08" />
            </filter>
          </defs>
        </svg>

        {/* View Grid: Anterior, Lateral, Posterior */}
        <div
          className={`grid gap-8 relative z-10 w-full ${
            activeView === 'all'
              ? 'grid-cols-1 md:grid-cols-3'
              : 'grid-cols-1 max-w-sm mx-auto'
          }`}
        >
          {/* ========================================================================= */}
          {/* 1. VISTA ANTERIOR (Frontal Coronal Plane) */}
          {/* ========================================================================= */}
          {(activeView === 'all' || activeView === 'anterior') && (
            <div className="flex flex-col items-center w-full">
              {!hideViewTitle && (
                <div className="flex items-center justify-between w-full mb-3 px-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1 rounded-md">
                    VISTA ANTERIOR
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Plano Coronal</span>
                </div>
              )}

              {/* Dynamic Anatomical SVG Canvas */}
              <div className="relative w-full max-w-[240px] h-[460px] flex items-center justify-center">
                <svg
                  viewBox="0 0 100 240"
                  className="w-full h-full filter drop-shadow-xs transition-all duration-500 ease-out"
                >
                  {/* Reference Ground Shadow */}
                  <ellipse cx="50" cy="232" rx="34" ry="4" fill="#cbd5e1" opacity="0.45" />

                  {/* ------------------------------------------------------------- */}
                  {/* GHOST / IDEAL POSTURE (When toggled) */}
                  {/* ------------------------------------------------------------- */}
                  {showGhostIdeal && totalDeviations > 0 && (
                    <g opacity="0.22" stroke="#10b981" strokeWidth="0.8" strokeDasharray="2 2" fill="none">
                      {/* Ideal Head */}
                      <circle cx="50" cy="22" r="10.5" />
                      {/* Ideal Shoulders */}
                      <line x1="26" y1="46" x2="74" y2="46" />
                      {/* Ideal Torso */}
                      <path d="M28 46 Q50 44 72 46 L67 106 L50 108 L33 106 Z" />
                      {/* Ideal Pelvis */}
                      <line x1="30" y1="108" x2="70" y2="108" />
                      {/* Ideal Knees */}
                      <circle cx="39" cy="166" r="5" />
                      <circle cx="61" cy="166" r="5" />
                      {/* Ideal Legs */}
                      <line x1="39" y1="110" x2="39" y2="224" />
                      <line x1="61" y1="110" x2="61" y2="224" />
                    </g>
                  )}

                  {/* ------------------------------------------------------------- */}
                  {/* PLUMB LINE (Línea de Plomada / Gravedad) */}
                  {/* ------------------------------------------------------------- */}
                  {showPlumbLine && (
                    <g>
                      <line
                        x1="50"
                        y1="6"
                        x2="50"
                        y2="234"
                        stroke="#3b82f6"
                        strokeDasharray="3 3"
                        strokeWidth="0.9"
                        opacity="0.85"
                      />
                      <circle cx="50" cy="8" r="2" fill="#3b82f6" />
                      <circle cx="50" cy="232" r="2" fill="#3b82f6" />
                    </g>
                  )}

                  {/* ------------------------------------------------------------- */}
                  {/* BODY MODEL - ANTERIOR */}
                  {/* ------------------------------------------------------------- */}
                  <g className="transition-all duration-500 ease-out">
                    {/* LEGS & FEET GROUP */}
                    {/* Left Leg (Viewer's Left, Anatomical Right) */}
                    <g className="transition-all duration-500 ease-out">
                      {/* Thigh (Quadriceps) */}
                      <path
                        d={`M34 116 Q28 140 34 162 Q36 166 38 166 Q44 166 46 162 Q48 140 48 116 Z`}
                        fill="url(#skinMuscleAnterior)"
                        stroke="#64748b"
                        strokeWidth="1.1"
                      />
                      {/* Vastus medialis teardrop definition */}
                      <path d="M41 154 Q45 158 43 164" fill="none" stroke="#94a3b8" strokeWidth="0.8" />
                      {/* Patella (Knee joint) with dynamic Valgo/Varo offset */}
                      <ellipse
                        cx={39 + leftKneeOffset}
                        cy="166"
                        rx="4.8"
                        ry="5.5"
                        fill="#e2e8f0"
                        stroke="#64748b"
                        strokeWidth="1.2"
                        className="transition-all duration-500 ease-out cursor-pointer hover:scale-110"
                        onClick={() => onSelectLandmark?.('anterior', 'rodillas')}
                      />
                      {/* Patellar tendon */}
                      <line
                        x1={39 + leftKneeOffset}
                        y1="171.5"
                        x2={38 + leftKneeOffset * 0.7}
                        y2="180"
                        stroke="#94a3b8"
                        strokeWidth="1.2"
                      />
                      {/* Calf (Gastrocnemius) & Tibia to Ankle */}
                      <path
                        d={`M${36 + leftKneeOffset} 171 Q${30 + leftKneeOffset * 0.5} 190 35 214 L36 226 L42 226 L43 214 Q${47 + leftKneeOffset * 0.5} 190 ${42 + leftKneeOffset} 171 Z`}
                        fill="url(#skinMuscleAnterior)"
                        stroke="#64748b"
                        strokeWidth="1.1"
                        className="transition-all duration-500 ease-out"
                      />
                      {/* Left Ankle & Foot with Pronation angle */}
                      <g
                        transform={`rotate(${footPronationAngleLeft} 39 226)`}
                        className="transition-all duration-500 ease-out"
                      >
                        {/* Malleolus medial & lateral */}
                        <circle cx="34.5" cy="223" r="1.8" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
                        <circle cx="43.5" cy="223" r="1.8" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
                        {/* Foot silhouette */}
                        <path
                          d="M33 226 Q32 232 37 232 L44 232 Q45 229 44 226 Z"
                          fill="#cbd5e1"
                          stroke="#64748b"
                          strokeWidth="1"
                        />
                      </g>
                    </g>

                    {/* Right Leg (Viewer's Right, Anatomical Left) */}
                    <g className="transition-all duration-500 ease-out">
                      {/* Thigh (Quadriceps) */}
                      <path
                        d={`M52 116 Q52 140 54 162 Q56 166 62 166 Q64 166 66 162 Q72 140 66 116 Z`}
                        fill="url(#skinMuscleAnterior)"
                        stroke="#64748b"
                        strokeWidth="1.1"
                      />
                      {/* Vastus medialis teardrop definition */}
                      <path d="M59 154 Q55 158 57 164" fill="none" stroke="#94a3b8" strokeWidth="0.8" />
                      {/* Patella with dynamic Valgo/Varo offset */}
                      <ellipse
                        cx={61 + rightKneeOffset}
                        cy="166"
                        rx="4.8"
                        ry="5.5"
                        fill="#e2e8f0"
                        stroke="#64748b"
                        strokeWidth="1.2"
                        className="transition-all duration-500 ease-out cursor-pointer hover:scale-110"
                        onClick={() => onSelectLandmark?.('anterior', 'rodillas')}
                      />
                      {/* Patellar tendon */}
                      <line
                        x1={61 + rightKneeOffset}
                        y1="171.5"
                        x2={62 + rightKneeOffset * 0.7}
                        y2="180"
                        stroke="#94a3b8"
                        strokeWidth="1.2"
                      />
                      {/* Calf (Gastrocnemius) & Tibia to Ankle */}
                      <path
                        d={`M${58 + rightKneeOffset} 171 Q${53 + rightKneeOffset * 0.5} 190 57 214 L58 226 L64 226 L65 214 Q${70 + rightKneeOffset * 0.5} 190 ${64 + rightKneeOffset} 171 Z`}
                        fill="url(#skinMuscleAnterior)"
                        stroke="#64748b"
                        strokeWidth="1.1"
                        className="transition-all duration-500 ease-out"
                      />
                      {/* Right Ankle & Foot with Pronation angle */}
                      <g
                        transform={`rotate(${footPronationAngleRight} 61 226)`}
                        className="transition-all duration-500 ease-out"
                      >
                        {/* Malleolus medial & lateral */}
                        <circle cx="56.5" cy="223" r="1.8" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
                        <circle cx="65.5" cy="223" r="1.8" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
                        {/* Foot silhouette */}
                        <path
                          d="M56 226 Q55 229 56 232 L63 232 Q68 232 67 226 Z"
                          fill="#cbd5e1"
                          stroke="#64748b"
                          strokeWidth="1"
                        />
                      </g>
                    </g>

                    {/* PELVIS / SHORTS (With dynamic pelvic tilt) */}
                    <g
                      transform={`rotate(${anteriorPelvisAngle} 50 110)`}
                      className="transition-all duration-500 ease-out"
                    >
                      {/* Shorts contour */}
                      <path
                        d={`M32 ${106 + anteriorPelvisLeftY} Q50 108 68 ${106 + anteriorPelvisRightY} L66 128 L53 126 L50 118 L47 126 L34 128 Z`}
                        fill="url(#shortsGrad)"
                        stroke="#0f172a"
                        strokeWidth="1.2"
                      />
                      {/* Bi-iliac ASIS markers */}
                      <circle
                        cx="36"
                        cy={110 + anteriorPelvisLeftY}
                        r="2.5"
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth="0.8"
                        className="cursor-pointer hover:scale-125"
                        onClick={() => onSelectLandmark?.('anterior', 'pelvis')}
                      />
                      <circle
                        cx="64"
                        cy={110 + anteriorPelvisRightY}
                        r="2.5"
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth="0.8"
                        className="cursor-pointer hover:scale-125"
                        onClick={() => onSelectLandmark?.('anterior', 'pelvis')}
                      />
                    </g>

                    {/* TORSO / CHEST / ABDOMINAL CONTOURS */}
                    <g className="transition-all duration-500 ease-out">
                      {/* Main Torso */}
                      <path
                        d={`M${26} ${46 + anteriorShoulderLeftY} Q${50} 43 ${74} ${46 + anteriorShoulderRightY} L68 104 Q50 106 32 104 Z`}
                        fill="url(#skinMuscleAnterior)"
                        stroke="#64748b"
                        strokeWidth="1.2"
                      />
                      {/* Pectoral Contours */}
                      <path
                        d={`M34 ${52 + anteriorShoulderLeftY * 0.7} Q44 ${58 + anteriorShoulderLeftY * 0.5} 48 57`}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="1"
                      />
                      <path
                        d={`M66 ${52 + anteriorShoulderRightY * 0.7} Q56 ${58 + anteriorShoulderRightY * 0.5} 52 57`}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="1"
                      />
                      {/* Sternal notch & Clavicles with dynamic tilt */}
                      <circle cx="50" cy="45" r="1.8" fill="#94a3b8" />
                      <line
                        x1="48"
                        y1="45"
                        x2="28"
                        y2={46 + anteriorShoulderLeftY}
                        stroke="#64748b"
                        strokeWidth="1.3"
                      />
                      <line
                        x1="52"
                        y1="45"
                        x2="72"
                        y2={46 + anteriorShoulderRightY}
                        stroke="#64748b"
                        strokeWidth="1.3"
                      />
                      {/* Abdominal linea alba */}
                      <line x1="50" y1="58" x2="50" y2="100" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 2" />
                      {/* Navel */}
                      <ellipse cx="50" cy="94" rx="1.5" ry="1.2" fill="#94a3b8" />

                      {/* Left Arm */}
                      <path
                        d={`M26 ${46 + anteriorShoulderLeftY} L16 88 L14 122 L11 122 L13 86 L23 ${48 + anteriorShoulderLeftY} Z`}
                        fill="url(#skinMuscleAnterior)"
                        stroke="#64748b"
                        strokeWidth="1"
                      />
                      {/* Right Arm */}
                      <path
                        d={`M74 ${46 + anteriorShoulderRightY} L84 88 L86 122 L89 122 L87 86 L77 ${48 + anteriorShoulderRightY} Z`}
                        fill="url(#skinMuscleAnterior)"
                        stroke="#64748b"
                        strokeWidth="1"
                      />
                    </g>

                    {/* SKELETAL OVERLAY (When skeletal mode is active) */}
                    {viewMode === 'skeletal' && (
                      <g stroke="#2563eb" strokeWidth="1.2" opacity="0.85" fill="none">
                        {/* Spine */}
                        <line x1="50" y1="38" x2="50" y2="106" strokeWidth="2.5" strokeDasharray="3 2" />
                        {/* Pelvis ring */}
                        <ellipse cx="50" cy="110" rx="18" ry="8" strokeWidth="1.5" />
                        {/* Femur left & right */}
                        <line x1="36" y1="114" x2={39 + leftKneeOffset} y2="166" strokeWidth="2" />
                        <line x1="64" y1="114" x2={61 + rightKneeOffset} y2="166" strokeWidth="2" />
                        {/* Tibia left & right */}
                        <line x1={39 + leftKneeOffset} y1="166" x2="39" y2="224" strokeWidth="2" />
                        <line x1={61 + rightKneeOffset} y1="166" x2="61" y2="224" strokeWidth="2" />
                        {/* Joint markers */}
                        <circle cx={39 + leftKneeOffset} cy="166" r="3" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
                        <circle cx={61 + rightKneeOffset} cy="166" r="3" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
                      </g>
                    )}

                    {/* NECK & HEAD GROUP (With dynamic tilt & translation) */}
                    <g
                      transform={`translate(${anteriorHeadTranslateX}, 0) rotate(${anteriorHeadRotate} 50 38)`}
                      className="transition-all duration-500 ease-out"
                    >
                      {/* Neck with SCM (Sternocleidomastoid) muscle lines */}
                      <path d="M45 32 L45 42 L55 42 L55 32 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
                      <line x1="46" y1="33" x2="49" y2="42" stroke="#94a3b8" strokeWidth="0.8" />
                      <line x1="54" y1="33" x2="51" y2="42" stroke="#94a3b8" strokeWidth="0.8" />

                      {/* Head Cranium & Jaw contour */}
                      <path
                        d="M50 10 C42 10 39 16 39 24 C39 30 43 36 50 36 C57 36 61 30 61 24 C61 16 58 10 50 10 Z"
                        fill="url(#skinMuscleAnterior)"
                        stroke="#64748b"
                        strokeWidth="1.2"
                      />
                      {/* Facial midline & ear cues */}
                      <ellipse cx="38.5" cy="24" rx="1.5" ry="3.5" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
                      <ellipse cx="61.5" cy="24" rx="1.5" ry="3.5" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
                      <circle cx="50" cy="24" r="1.2" fill="#94a3b8" />
                    </g>
                  </g>

                  {/* ------------------------------------------------------------- */}
                  {/* ANATOMICAL AXIS & ANGLE OVERLAYS */}
                  {/* ------------------------------------------------------------- */}
                  {showAngles && (
                    <g className="text-[5.5px] font-sans">
                      {/* Biacromial Shoulder Axis */}
                      <line
                        x1="22"
                        y1={46 + anteriorShoulderLeftY}
                        x2="78"
                        y2={46 + anteriorShoulderRightY}
                        stroke={posture.anterior.hombros !== 'Simétricos' ? '#3b82f6' : '#10b981'}
                        strokeWidth="0.9"
                        strokeDasharray="2 1.5"
                      />
                      {posture.anterior.hombros !== 'Simétricos' && (
                        <g>
                          <rect x="74" y={42 + anteriorShoulderRightY} width="24" height="7" rx="2" fill="#ffffff" stroke="#3b82f6" strokeWidth="0.6" />
                          <text x="86" y={47 + anteriorShoulderRightY} fill="#1e3a8a" textAnchor="middle" fontSize="4.5" fontWeight="bold">
                            {posture.anterior.hombros === 'Elevado D' ? 'Der +4.5°' : 'Izq +4.5°'}
                          </text>
                        </g>
                      )}

                      {/* Pelvic Axis */}
                      <line
                        x1="26"
                        y1={108 + anteriorPelvisLeftY}
                        x2="74"
                        y2={108 + anteriorPelvisRightY}
                        stroke={posture.anterior.pelvis !== 'Nivelada' ? '#3b82f6' : '#10b981'}
                        strokeWidth="0.9"
                        strokeDasharray="2 1.5"
                      />
                      {posture.anterior.pelvis !== 'Nivelada' && (
                        <g>
                          <rect x="74" y={105 + anteriorPelvisRightY} width="24" height="7" rx="2" fill="#ffffff" stroke="#3b82f6" strokeWidth="0.6" />
                          <text x="86" y={110 + anteriorPelvisRightY} fill="#1e3a8a" textAnchor="middle" fontSize="4.5" fontWeight="bold">
                            Báscula 3.8°
                          </text>
                        </g>
                      )}

                      {/* Knee Intercondylar/Q-Angle Indicator */}
                      {posture.anterior.rodillas !== 'Alineadas' && (
                        <g>
                          <line
                            x1={39 + leftKneeOffset}
                            y1="166"
                            x2={61 + rightKneeOffset}
                            y2="166"
                            stroke="#3b82f6"
                            strokeWidth="1"
                            strokeDasharray="1.5 1.5"
                          />
                          <rect x="36" y="174" width="28" height="7" rx="2" fill="#ffffff" stroke="#3b82f6" strokeWidth="0.6" />
                          <text x="50" y="179" fill="#1e3a8a" textAnchor="middle" fontSize="4.5" fontWeight="bold">
                            {posture.anterior.rodillas === 'Valgo' ? 'Genu Valgo' : 'Genu Varo'}
                          </text>
                        </g>
                      )}
                    </g>
                  )}
                </svg>

                {/* Interactive Landmark Pins Overlaid on Model */}
                {/* Head Pin */}
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('anterior', 'cabeza')}
                  className="absolute top-[9%] left-[50%] -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{
                    backgroundColor: getBadgeColor('anterior', 'cabeza', posture.anterior.cabeza, 'Alineada'),
                    transform: `translate(calc(-50% + ${anteriorHeadTranslateX}px), 0)`,
                  }}
                  title={`Cabeza: ${posture.anterior.cabeza}`}
                />
                {/* Shoulder Left & Right Pins */}
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('anterior', 'hombros')}
                  className="absolute top-[21%] left-[26%] -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{
                    backgroundColor: getBadgeColor('anterior', 'hombros', posture.anterior.hombros, 'Simétricos'),
                    transform: `translate(-50%, ${anteriorShoulderLeftY}px)`,
                  }}
                  title={`Hombro Izq: ${posture.anterior.hombros}`}
                />
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('anterior', 'hombros')}
                  className="absolute top-[21%] left-[74%] -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{
                    backgroundColor: getBadgeColor('anterior', 'hombros', posture.anterior.hombros, 'Simétricos'),
                    transform: `translate(-50%, ${anteriorShoulderRightY}px)`,
                  }}
                  title={`Hombro Der: ${posture.anterior.hombros}`}
                />
                {/* Pelvis Pin */}
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('anterior', 'pelvis')}
                  className="absolute top-[47%] left-[50%] -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{ backgroundColor: getBadgeColor('anterior', 'pelvis', posture.anterior.pelvis, 'Nivelada') }}
                  title={`Pelvis: ${posture.anterior.pelvis}`}
                />
                {/* Knee Pins */}
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('anterior', 'rodillas')}
                  className="absolute top-[71%] w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{
                    left: `${39 + leftKneeOffset * 0.4}%`,
                    backgroundColor: getBadgeColor('anterior', 'rodillas', posture.anterior.rodillas, 'Alineadas'),
                  }}
                  title={`Rodilla Izq: ${posture.anterior.rodillas}`}
                />
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('anterior', 'rodillas')}
                  className="absolute top-[71%] w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{
                    left: `${61 + rightKneeOffset * 0.4}%`,
                    backgroundColor: getBadgeColor('anterior', 'rodillas', posture.anterior.rodillas, 'Alineadas'),
                  }}
                  title={`Rodilla Der: ${posture.anterior.rodillas}`}
                />
                {/* Feet Pins */}
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('anterior', 'pies')}
                  className="absolute top-[94%] left-[40%] -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{ backgroundColor: getBadgeColor('anterior', 'pies', posture.anterior.pies, 'Alineados') }}
                  title={`Pies: ${posture.anterior.pies}`}
                />
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('anterior', 'pies')}
                  className="absolute top-[94%] left-[60%] -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{ backgroundColor: getBadgeColor('anterior', 'pies', posture.anterior.pies, 'Alineados') }}
                  title={`Pies: ${posture.anterior.pies}`}
                />
              </div>

              {/* Bottom Quick Metric Capsule */}
              <div className="mt-2 text-center text-xs text-slate-500 font-medium">
                <span className="text-slate-800 font-bold">Alineación Frontal: </span>
                {anteriorDeviations === 0 ? 'Equilibrada' : `${anteriorDeviations} asimetría(s)`}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. VISTA LATERAL (Sagittal Plane) */}
          {/* ========================================================================= */}
          {(activeView === 'all' || activeView === 'lateral') && (
            <div className="flex flex-col items-center w-full">
              {!hideViewTitle && (
                <div className="flex items-center justify-between w-full mb-3 px-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1 rounded-md">
                    VISTA LATERAL
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Plano Sagital</span>
                </div>
              )}

              {/* Dynamic Anatomical SVG Canvas */}
              <div className="relative w-full max-w-[240px] h-[460px] flex items-center justify-center">
                <svg
                  viewBox="0 0 100 240"
                  className="w-full h-full filter drop-shadow-xs transition-all duration-500 ease-out"
                >
                  {/* Ground Shadow */}
                  <ellipse cx="50" cy="232" rx="34" ry="4" fill="#cbd5e1" opacity="0.45" />

                  {/* ------------------------------------------------------------- */}
                  {/* GHOST / IDEAL POSTURE (When toggled) */}
                  {/* ------------------------------------------------------------- */}
                  {showGhostIdeal && totalDeviations > 0 && (
                    <g opacity="0.22" stroke="#10b981" strokeWidth="0.8" strokeDasharray="2 2" fill="none">
                      {/* Ideal Ear */}
                      <circle cx="50" cy="24" r="3" />
                      {/* Ideal Acromion */}
                      <circle cx="50" cy="46" r="3" />
                      {/* Ideal Spine Profile */}
                      <path d="M47 34 Q50 44 48 54 Q44 68 46 84 Q50 96 46 108" />
                      {/* Ideal Trochanter & Knee & Malleolus */}
                      <circle cx="50" cy="116" r="3" />
                      <circle cx="50" cy="166" r="3" />
                      <circle cx="50" cy="224" r="3" />
                    </g>
                  )}

                  {/* ------------------------------------------------------------- */}
                  {/* PLUMB LINE (Reference line through ear, shoulder, hip, knee, ankle) */}
                  {/* ------------------------------------------------------------- */}
                  {showPlumbLine && (
                    <g>
                      <line
                        x1="50"
                        y1="6"
                        x2="50"
                        y2="234"
                        stroke="#3b82f6"
                        strokeDasharray="3 3"
                        strokeWidth="0.9"
                        opacity="0.85"
                      />
                      {/* Reference Landmarks on Plumb Line */}
                      <circle cx="50" cy="24" r="1.5" fill="#3b82f6" opacity="0.6" />
                      <circle cx="50" cy="48" r="1.5" fill="#3b82f6" opacity="0.6" />
                      <circle cx="50" cy="116" r="1.5" fill="#3b82f6" opacity="0.6" />
                      <circle cx="50" cy="166" r="1.5" fill="#3b82f6" opacity="0.6" />
                      <circle cx="50" cy="224" r="1.5" fill="#3b82f6" opacity="0.6" />
                    </g>
                  )}

                  {/* ------------------------------------------------------------- */}
                  {/* BODY MODEL - LATERAL */}
                  {/* ------------------------------------------------------------- */}
                  <g className="transition-all duration-500 ease-out">
                    {/* LEG & FOOT (Profile) */}
                    <g className="transition-all duration-500 ease-out">
                      {/* Thigh (Profile) */}
                      <path
                        d={`M44 116 Q40 140 44 166 L${56 + lateralKneeOffset} 166 Q62 140 56 116 Z`}
                        fill="url(#skinMuscleLateral)"
                        stroke="#64748b"
                        strokeWidth="1.1"
                      />
                      {/* Patella profile */}
                      <path
                        d={`M${56 + lateralKneeOffset} 162 Q${60 + lateralKneeOffset} 166 ${56 + lateralKneeOffset} 170 Z`}
                        fill="#cbd5e1"
                        stroke="#64748b"
                        strokeWidth="1"
                      />
                      {/* Lower Leg (Tibia & Gastrocnemius profile) */}
                      <path
                        d={`M${44 + lateralKneeOffset * 0.4} 166 Q38 190 46 222 L48 226 L56 226 Q${60 + lateralKneeOffset * 0.4} 190 ${56 + lateralKneeOffset} 166 Z`}
                        fill="url(#skinMuscleLateral)"
                        stroke="#64748b"
                        strokeWidth="1.1"
                      />
                      {/* Lateral Malleolus */}
                      <circle cx="49" cy="223" r="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
                      {/* Foot Profile with Arch */}
                      <path
                        d="M38 228 L64 228 Q67 232 64 232 L36 232 Q34 230 38 228 Z"
                        fill="#cbd5e1"
                        stroke="#64748b"
                        strokeWidth="1"
                      />
                    </g>

                    {/* PELVIS / SHORTS (With dynamic Anteversión/Retroversión) */}
                    <g
                      transform={`rotate(${lateralPelvisTilt} 50 114)`}
                      className="transition-all duration-500 ease-out"
                    >
                      {/* Shorts profile */}
                      <path
                        d="M38 108 L62 108 L58 132 L40 130 Z"
                        fill="url(#shortsGrad)"
                        stroke="#0f172a"
                        strokeWidth="1.2"
                      />
                      {/* Greater Trochanter marker */}
                      <circle cx="49" cy="116" r="2.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="0.8" />
                    </g>

                    {/* TORSO & SPINE (With Kyphosis & Lordosis deformation) */}
                    <g className="transition-all duration-500 ease-out">
                      {/* Torso Profile Body Contour (Morphing with Kyphosis & Lordosis) */}
                      <path
                        d={`
                          M${44 + lateralShoulderX * 0.3} 46 
                          Q${36 + lateralKyphosisOffset} 68 ${42 + lateralKyphosisOffset * 0.5} 84 
                          Q${46 + lateralLordosisOffset} 98 40 108 
                          L58 108 
                          Q${64 + lateralLordosisOffset * 0.4} 90 ${62 + lateralShoulderX * 0.4} 66 
                          Q${60 + lateralShoulderX * 0.5} 48 ${54 + lateralShoulderX} 46 
                          Z
                        `}
                        fill="url(#skinMuscleLateral)"
                        stroke="#64748b"
                        strokeWidth="1.2"
                      />

                      {/* Thoracic spine curve indicator */}
                      <path
                        d={`M44 48 Q${37 + lateralKyphosisOffset} 68 ${43 + lateralKyphosisOffset * 0.5} 84`}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="1.2"
                        strokeDasharray="2 1.5"
                      />

                      {/* Lumbar lordosis curve indicator */}
                      <path
                        d={`M${43 + lateralKyphosisOffset * 0.5} 84 Q${48 + lateralLordosisOffset} 96 42 108`}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="1.2"
                        strokeDasharray="2 1.5"
                      />

                      {/* Arm profile with Shoulder Protraction offset */}
                      <g
                        transform={`translate(${lateralShoulderX}, 0)`}
                        className="transition-all duration-500 ease-out"
                      >
                        {/* Arm */}
                        <path
                          d="M52 46 L55 86 L56 120 L51 120 L49 86 L48 46 Z"
                          fill="url(#skinMuscleLateral)"
                          stroke="#64748b"
                          strokeWidth="1"
                        />
                        {/* Acromion marker */}
                        <circle cx="50" cy="46" r="2.8" fill="#3b82f6" stroke="#ffffff" strokeWidth="0.8" />
                      </g>
                    </g>

                    {/* SKELETAL OVERLAY LATERAL */}
                    {viewMode === 'skeletal' && (
                      <g stroke="#2563eb" strokeWidth="1.2" opacity="0.85" fill="none">
                        {/* S-shaped anatomical spine */}
                        <path
                          d={`M${50 + lateralHeadX * 0.5} 34 Q${36 + lateralKyphosisOffset} 68 ${42} 86 Q${48 + lateralLordosisOffset} 98 48 114`}
                          strokeWidth="2.5"
                          strokeDasharray="3 2"
                        />
                        {/* Femur */}
                        <line x1="49" y1="116" x2={50 + lateralKneeOffset} y2="166" strokeWidth="2" />
                        {/* Tibia */}
                        <line x1={50 + lateralKneeOffset} y1="166" x2="49" y2="223" strokeWidth="2" />
                        <circle cx={50 + lateralKneeOffset} cy="166" r="3" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
                      </g>
                    )}

                    {/* HEAD & NECK (Profile, with dynamic Anteriorizada translation) */}
                    <g
                      transform={`translate(${lateralHeadX}, 0)`}
                      className="transition-all duration-500 ease-out"
                    >
                      {/* Neck profile */}
                      <path d="M46 34 L48 46 L54 46 L52 34 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />

                      {/* Cranium & Facial Profile (Forehead, nose, lips, chin, jawline) */}
                      <path
                        d="M44 14 Q56 11 58 18 Q63 24 59 29 Q54 36 46 34 Q37 31 44 14 Z"
                        fill="url(#skinMuscleLateral)"
                        stroke="#64748b"
                        strokeWidth="1.2"
                      />
                      {/* External Auditory Meatus (Ear) */}
                      <ellipse cx="48" cy="24" rx="2.2" ry="3.8" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
                      <circle cx="48" cy="24" r="1.2" fill="#3b82f6" />
                    </g>
                  </g>

                  {/* ------------------------------------------------------------- */}
                  {/* ANGLE & DEVIATION CALLOUTS LATERAL */}
                  {/* ------------------------------------------------------------- */}
                  {showAngles && (
                    <g className="text-[5.5px] font-sans">
                      {/* Head Anteriorization distance callout */}
                      {posture.lateral.cabeza === 'Anteriorizada' && (
                        <g>
                          <line x1="50" y1="24" x2={50 + lateralHeadX} y2="24" stroke="#3b82f6" strokeWidth="1" />
                          <rect x={54 + lateralHeadX} y="20" width="26" height="7" rx="2" fill="#ffffff" stroke="#3b82f6" strokeWidth="0.6" />
                          <text x={67 + lateralHeadX} y="25" fill="#1e3a8a" textAnchor="middle" fontSize="4.5" fontWeight="bold">
                            Antepulsión +4.2 cm
                          </text>
                        </g>
                      )}

                      {/* Thoracic Kyphosis Callout */}
                      {posture.lateral.columnaDorsal === 'Hipercifosis' && (
                        <g>
                          <rect x="2" y="66" width="28" height="7" rx="2" fill="#ffffff" stroke="#3b82f6" strokeWidth="0.6" />
                          <text x="16" y="71" fill="#1e3a8a" textAnchor="middle" fontSize="4.5" fontWeight="bold">
                            Hipercifosis ~48°
                          </text>
                        </g>
                      )}

                      {/* Lumbar Lordosis Callout */}
                      {posture.lateral.columnaLumbar === 'Hiperlordosis' && (
                        <g>
                          <rect x="68" y="92" width="28" height="7" rx="2" fill="#ffffff" stroke="#3b82f6" strokeWidth="0.6" />
                          <text x="82" y="97" fill="#1e3a8a" textAnchor="middle" fontSize="4.5" fontWeight="bold">
                            Hiperlordosis ~54°
                          </text>
                        </g>
                      )}

                      {/* Knee Recurvatum Callout */}
                      {posture.lateral.rodillas === 'Recurvatum' && (
                        <g>
                          <rect x="6" y="162" width="28" height="7" rx="2" fill="#ffffff" stroke="#3b82f6" strokeWidth="0.6" />
                          <text x="20" y="167" fill="#1e3a8a" textAnchor="middle" fontSize="4.5" fontWeight="bold">
                            Recurvatum -8°
                          </text>
                        </g>
                      )}
                    </g>
                  )}
                </svg>

                {/* Interactive Landmark Pins Overlaid on Model */}
                {/* Head Pin */}
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('lateral', 'cabeza')}
                  className="absolute top-[9%] w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{
                    left: `${50 + lateralHeadX * 0.4}%`,
                    backgroundColor: getBadgeColor('lateral', 'cabeza', posture.lateral.cabeza, 'Alineada'),
                  }}
                  title={`Cabeza: ${posture.lateral.cabeza}`}
                />
                {/* Shoulder Pin */}
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('lateral', 'hombros')}
                  className="absolute top-[21%] w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{
                    left: `${50 + lateralShoulderX * 0.4}%`,
                    backgroundColor: getBadgeColor('lateral', 'hombros', posture.lateral.hombros, 'Alineados'),
                  }}
                  title={`Hombros: ${posture.lateral.hombros}`}
                />
                {/* Thoracic Spine Pin */}
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('lateral', 'columnaDorsal')}
                  className="absolute top-[31%] left-[44%] -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{ backgroundColor: getBadgeColor('lateral', 'columnaDorsal', posture.lateral.columnaDorsal, 'Normal') }}
                  title={`Columna Dorsal: ${posture.lateral.columnaDorsal}`}
                />
                {/* Lumbar Spine Pin */}
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('lateral', 'columnaLumbar')}
                  className="absolute top-[42%] left-[46%] -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{ backgroundColor: getBadgeColor('lateral', 'columnaLumbar', posture.lateral.columnaLumbar, 'Normal') }}
                  title={`Columna Lumbar: ${posture.lateral.columnaLumbar}`}
                />
                {/* Pelvis Pin */}
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('lateral', 'pelvis')}
                  className="absolute top-[50%] left-[50%] -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{ backgroundColor: getBadgeColor('lateral', 'pelvis', posture.lateral.pelvis, 'Neutra') }}
                  title={`Pelvis: ${posture.lateral.pelvis}`}
                />
                {/* Knee Pin */}
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('lateral', 'rodillas')}
                  className="absolute top-[71%] w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{
                    left: `${50 + lateralKneeOffset * 0.4}%`,
                    backgroundColor: getBadgeColor('lateral', 'rodillas', posture.lateral.rodillas, 'Neutras'),
                  }}
                  title={`Rodilla: ${posture.lateral.rodillas}`}
                />
              </div>

              {/* Bottom Quick Metric Capsule */}
              <div className="mt-2 text-center text-xs text-slate-500 font-medium">
                <span className="text-slate-800 font-bold">Curvatura Sagital: </span>
                {lateralDeviations === 0 ? 'Fisiológica' : `${lateralDeviations} alteración(es)`}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. VISTA POSTERIOR (Dorsal Plane) */}
          {/* ========================================================================= */}
          {(activeView === 'all' || activeView === 'posterior') && (
            <div className="flex flex-col items-center w-full">
              {!hideViewTitle && (
                <div className="flex items-center justify-between w-full mb-3 px-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1 rounded-md">
                    VISTA POSTERIOR
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Plano Dorsal</span>
                </div>
              )}

              {/* Dynamic Anatomical SVG Canvas */}
              <div className="relative w-full max-w-[240px] h-[460px] flex items-center justify-center">
                <svg
                  viewBox="0 0 100 240"
                  className="w-full h-full filter drop-shadow-xs transition-all duration-500 ease-out"
                >
                  {/* Ground Shadow */}
                  <ellipse cx="50" cy="232" rx="34" ry="4" fill="#cbd5e1" opacity="0.45" />

                  {/* ------------------------------------------------------------- */}
                  {/* GHOST / IDEAL POSTURE (When toggled) */}
                  {/* ------------------------------------------------------------- */}
                  {showGhostIdeal && totalDeviations > 0 && (
                    <g opacity="0.22" stroke="#10b981" strokeWidth="0.8" strokeDasharray="2 2" fill="none">
                      <line x1="50" y1="36" x2="50" y2="108" />
                      <circle cx="41" cy="62" r="3" />
                      <circle cx="59" cy="62" r="3" />
                      <line x1="39" y1="166" x2="39" y2="224" />
                      <line x1="61" y1="166" x2="61" y2="224" />
                    </g>
                  )}

                  {/* ------------------------------------------------------------- */}
                  {/* PLUMB LINE */}
                  {/* ------------------------------------------------------------- */}
                  {showPlumbLine && (
                    <g>
                      <line
                        x1="50"
                        y1="6"
                        x2="50"
                        y2="234"
                        stroke="#3b82f6"
                        strokeDasharray="3 3"
                        strokeWidth="0.9"
                        opacity="0.85"
                      />
                      <circle cx="50" cy="8" r="2" fill="#3b82f6" />
                      <circle cx="50" cy="232" r="2" fill="#3b82f6" />
                    </g>
                  )}

                  {/* ------------------------------------------------------------- */}
                  {/* BODY MODEL - POSTERIOR */}
                  {/* ------------------------------------------------------------- */}
                  <g className="transition-all duration-500 ease-out">
                    {/* LEGS & CALVES & ACHILLES TENDON */}
                    <g className="transition-all duration-500 ease-out">
                      {/* Left Leg (Posterior) */}
                      <path
                        d="M34 116 Q30 140 34 162 Q36 166 42 166 Q48 140 48 116 Z"
                        fill="url(#skinMusclePosterior)"
                        stroke="#64748b"
                        strokeWidth="1.1"
                      />
                      {/* Popliteal fossa crease */}
                      <line x1="36" y1="166" x2="44" y2="166" stroke="#94a3b8" strokeWidth="0.8" />
                      {/* Left Gastrocnemius (Calf medialis & lateralis) */}
                      <path
                        d="M35 166 Q29 188 35 214 L36 226 L42 226 L43 214 Q48 188 43 166 Z"
                        fill="url(#skinMusclePosterior)"
                        stroke="#64748b"
                        strokeWidth="1.1"
                      />
                      {/* Left Achilles Tendon with Valgo/Varo deviation */}
                      <line
                        x1="39"
                        y1="208"
                        x2={39 + posteriorHeelAngleLeft}
                        y2="226"
                        stroke="#2563eb"
                        strokeWidth="1.6"
                        className="transition-all duration-500 ease-out"
                      />
                      <ellipse cx={39 + posteriorHeelAngleLeft} cy="226" rx="4" ry="2.8" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />

                      {/* Right Leg (Posterior) */}
                      <path
                        d="M52 116 Q52 140 58 166 Q64 166 66 162 Q70 140 66 116 Z"
                        fill="url(#skinMusclePosterior)"
                        stroke="#64748b"
                        strokeWidth="1.1"
                      />
                      {/* Popliteal fossa crease */}
                      <line x1="56" y1="166" x2="64" y2="166" stroke="#94a3b8" strokeWidth="0.8" />
                      {/* Right Gastrocnemius */}
                      <path
                        d="M57 166 Q52 188 57 214 L58 226 L64 226 L65 214 Q71 188 65 166 Z"
                        fill="url(#skinMusclePosterior)"
                        stroke="#64748b"
                        strokeWidth="1.1"
                      />
                      {/* Right Achilles Tendon with Valgo/Varo deviation */}
                      <line
                        x1="61"
                        y1="208"
                        x2={61 + posteriorHeelAngleRight}
                        y2="226"
                        stroke="#2563eb"
                        strokeWidth="1.6"
                        className="transition-all duration-500 ease-out"
                      />
                      <ellipse cx={61 + posteriorHeelAngleRight} cy="226" rx="4" ry="2.8" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
                    </g>

                    {/* PELVIS / GLUTEAL REGION (With tilt) */}
                    <g
                      transform={`rotate(${posteriorPelvisTilt} 50 110)`}
                      className="transition-all duration-500 ease-out"
                    >
                      {/* Shorts / Gluteus */}
                      <path
                        d="M32 106 Q50 108 68 106 L66 128 L50 122 L34 128 Z"
                        fill="url(#shortsGrad)"
                        stroke="#0f172a"
                        strokeWidth="1.2"
                      />
                      {/* Gluteal crease */}
                      <line x1="50" y1="106" x2="50" y2="122" stroke="#0f172a" strokeWidth="1.2" />
                      {/* Dimples of Venus (PSIS) */}
                      <circle cx="43" cy="110" r="1.5" fill="#3b82f6" />
                      <circle cx="57" cy="110" r="1.5" fill="#3b82f6" />
                    </g>

                    {/* BACK / SCAPULAE / DYNAMIC SCOLIOSIS SPINE */}
                    <g className="transition-all duration-500 ease-out">
                      {/* Back Musculature Contour */}
                      <path
                        d="M26 46 Q50 43 74 46 L68 104 Q50 106 32 104 Z"
                        fill="url(#skinMusclePosterior)"
                        stroke="#64748b"
                        strokeWidth="1.2"
                      />

                      {/* VERTEBRAL COLUMN (Dynamic Scoliotic C/S Curve) */}
                      <path
                        d={`M50 38 Q${50 + posteriorSpineDeviation} 72 50 106`}
                        fill="none"
                        stroke={posture.posterior.columna !== 'Alineada' ? '#3b82f6' : '#64748b'}
                        strokeWidth="2.2"
                        strokeDasharray={posture.posterior.columna !== 'Alineada' ? 'none' : '3 2'}
                        className="transition-all duration-500 ease-out"
                      />

                      {/* Vertebral segments indicators along spine */}
                      {[44, 52, 60, 68, 76, 84, 92, 100].map((y, idx) => {
                        // calculate interpolated x along curve
                        const t = (y - 38) / (106 - 38);
                        const curveX = 50 + 4 * posteriorSpineDeviation * t * (1 - t);
                        return (
                          <circle
                            key={idx}
                            cx={curveX}
                            cy={y}
                            r="1.3"
                            fill={posture.posterior.columna !== 'Alineada' ? '#2563eb' : '#94a3b8'}
                          />
                        );
                      })}

                      {/* SCAPULAE (Left & Right) */}
                      {/* Left Scapula */}
                      <g className="transition-all duration-500 ease-out">
                        <path
                          d="M34 52 Q43 54 42 68 Q37 66 34 52 Z"
                          fill="#cbd5e1"
                          stroke="#64748b"
                          strokeWidth="1.1"
                        />
                        {/* Spine of scapula */}
                        <line x1="34" y1="53" x2="42" y2="57" stroke="#94a3b8" strokeWidth="1.2" />
                      </g>

                      {/* Right Scapula (With Winging or Asymmetry) */}
                      <g
                        transform={`translate(0, ${posteriorScapulaRightY})`}
                        className="transition-all duration-500 ease-out"
                      >
                        <path
                          d="M66 52 Q57 54 58 68 Q63 66 66 52 Z"
                          fill={posteriorScapulaWinging ? '#dbeafe' : '#cbd5e1'}
                          stroke={posteriorScapulaWinging ? '#2563eb' : '#64748b'}
                          strokeWidth={posteriorScapulaWinging ? '1.8' : '1.1'}
                        />
                        {/* Spine of scapula */}
                        <line x1="66" y1="53" x2="58" y2="57" stroke="#94a3b8" strokeWidth="1.2" />
                        {/* Winging highlight shadow effect */}
                        {posteriorScapulaWinging && (
                          <path
                            d="M57 55 Q56 62 58 71"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="1.6"
                            strokeDasharray="2 1"
                          />
                        )}
                      </g>

                      {/* Arms */}
                      <path
                        d="M26 46 L16 88 L14 122 L11 122 L13 86 L23 48 Z"
                        fill="url(#skinMusclePosterior)"
                        stroke="#64748b"
                        strokeWidth="1"
                      />
                      <path
                        d="M74 46 L84 88 L86 122 L89 122 L87 86 L77 48 Z"
                        fill="url(#skinMusclePosterior)"
                        stroke="#64748b"
                        strokeWidth="1"
                      />
                    </g>

                    {/* SKELETAL OVERLAY POSTERIOR */}
                    {viewMode === 'skeletal' && (
                      <g stroke="#2563eb" strokeWidth="1.2" opacity="0.85" fill="none">
                        <ellipse cx="50" cy="110" rx="18" ry="7" strokeWidth="1.5" />
                        <line x1="36" y1="114" x2="39" y2="166" strokeWidth="2" />
                        <line x1="64" y1="114" x2="61" y2="166" strokeWidth="2" />
                        <line x1="39" y1="166" x2="39" y2="224" strokeWidth="2" />
                        <line x1="61" y1="166" x2="61" y2="224" strokeWidth="2" />
                      </g>
                    )}

                    {/* HEAD & NECK (Posterior) */}
                    <g className="transition-all duration-500 ease-out">
                      {/* Neck with Trapezius contour */}
                      <path d="M45 32 L45 42 L55 42 L55 32 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
                      {/* C7 Vertebra Prominens */}
                      <circle cx="50" cy="40" r="1.8" fill="#3b82f6" />

                      {/* Head Cranium Posterior */}
                      <path
                        d="M50 10 C42 10 39 16 39 24 C39 30 43 36 50 36 C57 36 61 30 61 24 C61 16 58 10 50 10 Z"
                        fill="url(#skinMusclePosterior)"
                        stroke="#64748b"
                        strokeWidth="1.2"
                      />
                      {/* Occipital protuberance */}
                      <ellipse cx="50" cy="24" rx="4" ry="2" fill="#94a3b8" opacity="0.5" />
                    </g>
                  </g>

                  {/* ------------------------------------------------------------- */}
                  {/* SCOLIOSIS & POSTERIOR ANGLE CALLOUTS */}
                  {/* ------------------------------------------------------------- */}
                  {showAngles && (
                    <g className="text-[5.5px] font-sans">
                      {/* Scoliotic curve lateral deviation */}
                      {posture.posterior.columna !== 'Alineada' && (
                        <g>
                          <line x1="50" y1="72" x2={50 + posteriorSpineDeviation} y2="72" stroke="#3b82f6" strokeWidth="1" />
                          <rect
                            x={posteriorSpineDeviation > 0 ? 56 : 14}
                            y="68"
                            width="30"
                            height="7"
                            rx="2"
                            fill="#ffffff"
                            stroke="#3b82f6"
                            strokeWidth="0.6"
                          />
                          <text
                            x={posteriorSpineDeviation > 0 ? 71 : 29}
                            y="73"
                            fill="#1e3a8a"
                            textAnchor="middle"
                            fontSize="4.5"
                            fontWeight="bold"
                          >
                            {posture.posterior.columna === 'Desviación derecha' ? 'Curva D +9°' : 'Curva I +9°'}
                          </text>
                        </g>
                      )}

                      {/* Winging Scapula Banner */}
                      {posteriorScapulaWinging && (
                        <g>
                          <rect x="66" y="58" width="32" height="7" rx="2" fill="#ffffff" stroke="#ef4444" strokeWidth="0.6" />
                          <text x="82" y="63" fill="#b91c1c" textAnchor="middle" fontSize="4.5" fontWeight="bold">
                            Escápula Alada
                          </text>
                        </g>
                      )}
                    </g>
                  )}
                </svg>

                {/* Interactive Landmark Pins Overlaid on Model */}
                {/* Scapulae Pins */}
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('posterior', 'escapulas')}
                  className="absolute top-[28%] left-[38%] -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{ backgroundColor: getBadgeColor('posterior', 'escapulas', posture.posterior.escapulas, 'Simétricas') }}
                  title={`Escápula Izquierda: ${posture.posterior.escapulas}`}
                />
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('posterior', 'escapulas')}
                  className="absolute top-[28%] left-[62%] -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{
                    backgroundColor: getBadgeColor('posterior', 'escapulas', posture.posterior.escapulas, 'Simétricas'),
                    transform: `translate(-50%, ${posteriorScapulaRightY}px)`,
                  }}
                  title={`Escápula Derecha: ${posture.posterior.escapulas}`}
                />
                {/* Spine Pin */}
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('posterior', 'columna')}
                  className="absolute top-[37%] w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{
                    left: `${50 + posteriorSpineDeviation * 0.4}%`,
                    backgroundColor: getBadgeColor('posterior', 'columna', posture.posterior.columna, 'Alineada'),
                  }}
                  title={`Columna: ${posture.posterior.columna}`}
                />
                {/* Pelvis Pin */}
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('posterior', 'pelvis')}
                  className="absolute top-[48%] left-[50%] -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{ backgroundColor: getBadgeColor('posterior', 'pelvis', posture.posterior.pelvis, 'Simétrica') }}
                  title={`Pelvis: ${posture.posterior.pelvis}`}
                />
                {/* Heel Pins */}
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('posterior', 'talones')}
                  className="absolute top-[93%] left-[39%] -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{ backgroundColor: getBadgeColor('posterior', 'talones', posture.posterior.talones, 'Alineados') }}
                  title={`Talón Izquierdo: ${posture.posterior.talones}`}
                />
                <button
                  type="button"
                  onClick={() => onSelectLandmark?.('posterior', 'talones')}
                  className="absolute top-[93%] left-[61%] -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-transform hover:scale-130 z-20"
                  style={{ backgroundColor: getBadgeColor('posterior', 'talones', posture.posterior.talones, 'Alineados') }}
                  title={`Talón Derecho: ${posture.posterior.talones}`}
                />
              </div>

              {/* Bottom Quick Metric Capsule */}
              <div className="mt-2 text-center text-xs text-slate-500 font-medium">
                <span className="text-slate-800 font-bold">Alineación Dorsal: </span>
                {posteriorDeviations === 0 ? 'Sin escoliosis' : `${posteriorDeviations} asimetría(s)`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
