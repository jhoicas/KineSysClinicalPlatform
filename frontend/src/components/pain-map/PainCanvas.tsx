import React, { useState } from 'react';
import {
  AnatomicalSegment,
  getSegmentsForSide,
  getPainColorConfig,
} from './anatomicalData';
import {
  usePainCanvasEngine,
  SVG_VIEWBOX_WIDTH,
  SVG_VIEWBOX_HEIGHT,
} from './usePainCanvasEngine';
import { PainObservation } from '../../types';

export interface PainCanvasProps {
  bodySide: 'front' | 'back';
  onChangeBodySide: (side: 'front' | 'back') => void;
  coordinates: { x: number; y: number };
  bodyRegion: string;
  painLevel: number;
  onSelectLocation: (data: {
    coordinates: { x: number; y: number };
    bodyRegion: string;
    segmentId?: string;
    bodySide: 'front' | 'back';
  }) => void;
  existingObservations?: PainObservation[];
  onSelectObservation?: (obs: PainObservation) => void;
}

export function PainCanvas({
  bodySide,
  onChangeBodySide,
  coordinates,
  bodyRegion,
  painLevel,
  onSelectLocation,
  existingObservations = [],
  onSelectObservation,
}: PainCanvasProps) {
  const [selectedObsHover, setSelectedObsHover] = useState<PainObservation | null>(null);

  // Pain Canvas Engine Hook
  const {
    containerRef,
    svgRef,
    transform,
    zoomIn,
    zoomOut,
    resetZoom,
    focusSegment,
    hoveredSegment,
    tooltipPos,
    handleSegmentMouseEnter,
    handleSegmentMouseLeave,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleStageClick,
    handleSegmentClick,
  } = usePainCanvasEngine({
    bodySide,
    initialCoordinates: coordinates,
    initialRegion: bodyRegion,
    onSelectLocation,
  });

  const segments = getSegmentsForSide(bodySide);
  const painConfig = getPainColorConfig(painLevel);

  // Filter observations for currently active view
  const sideObservations = existingObservations.filter(
    (obs) => obs.body_side === bodySide
  );

  // Quick preset shortcuts for rapid clinical examination
  const quickPresets =
    bodySide === 'front'
      ? [
          { label: 'Cervical / Cuello', segmentId: 'front_neck' },
          { label: 'Hombro Der.', segmentId: 'front_deltoid_right' },
          { label: 'Hombro Izq.', segmentId: 'front_deltoid_left' },
          { label: 'Rótula / Rodilla Der.', segmentId: 'front_patella_right' },
          { label: 'Rótula / Rodilla Izq.', segmentId: 'front_patella_left' },
          { label: 'Tibia / Tobillo', segmentId: 'front_tibia_left' },
        ]
      : [
          { label: 'Cervical C1-C7', segmentId: 'back_cervical_spine' },
          { label: 'Dorsal T1-T12', segmentId: 'back_thoracic_spine' },
          { label: 'Lumbar L1-L5', segmentId: 'back_lumbar_spine' },
          { label: 'Escápula Der.', segmentId: 'back_scapula_right' },
          { label: 'Isquiotibiales', segmentId: 'back_hamstring_left' },
          { label: 'Tendón Aquiles', segmentId: 'back_achilles_left' },
        ];

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Top Controls: View Mode Switcher + Zoom Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
            <h3 className="font-extrabold text-sm text-on-surface tracking-tight">
              Lienzo Anatómico Vectorial (SVG)
            </h3>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            Mapeo segmentario de alta precisión con Zoom y Pan interactivo
          </p>
        </div>

        {/* View Switcher (Frontal / Posterior) */}
        <div className="flex items-center bg-surface-container-low p-1 rounded-2xl border border-outline-variant/30 shadow-2xs">
          <button
            type="button"
            id="btn-switch-front"
            onClick={() => onChangeBodySide('front')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              bodySide === 'front'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">front_hand</span>
            <span>Anterior</span>
          </button>
          <button
            type="button"
            id="btn-switch-back"
            onClick={() => onChangeBodySide('back')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              bodySide === 'back'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">accessibility</span>
            <span>Posterior</span>
          </button>
        </div>
      </div>

      {/* Interactive Quick Presets Chips */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
        <span className="text-[10px] font-extrabold uppercase text-outline shrink-0 mr-1 flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">center_focus_strong</span>
          Foco:
        </span>
        {quickPresets.map((preset) => (
          <button
            key={preset.segmentId}
            type="button"
            onClick={() => focusSegment(preset.segmentId)}
            className="px-3 py-1 rounded-full bg-surface-container-low hover:bg-primary-fixed hover:text-on-primary-fixed text-[11px] font-semibold text-on-surface-variant border border-outline-variant/40 transition-all cursor-pointer shrink-0"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Main Interactive Stage Container */}
      <div className="relative w-full max-w-[360px] h-[520px] bg-gradient-to-b from-slate-50/90 via-white to-slate-50/90 rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex items-center justify-center p-3">
        {/* Floating Zoom and Navigation Toolbar */}
        <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-md">
          <button
            type="button"
            id="btn-zoom-in"
            onClick={zoomIn}
            title="Acercar (Zoom +)"
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">zoom_in</span>
          </button>
          <button
            type="button"
            id="btn-zoom-out"
            onClick={zoomOut}
            title="Alejar (Zoom -)"
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">zoom_out</span>
          </button>
          <button
            type="button"
            id="btn-zoom-reset"
            onClick={resetZoom}
            title="Restablecer Vista (100%)"
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
          </button>

          {/* Zoom scale badge */}
          <div className="text-[9px] font-black text-center text-slate-500 pt-1 border-t border-slate-100">
            {transform.scale.toFixed(1)}x
          </div>
        </div>

        {/* Pan Guide Indicator (When Zoomed) */}
        {transform.scale > 1 && (
          <div className="absolute top-3 left-3 z-30 bg-teal-900/85 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-md flex items-center gap-1.5 animate-fadeIn pointer-events-none">
            <span className="material-symbols-outlined text-xs animate-bounce">pan_tool</span>
            <span>Arrastra para desplazar</span>
          </div>
        )}

        {/* Canvas Interactive Viewport */}
        <div
          id="pain-canvas-viewport"
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleStageClick}
          className={`relative w-full h-full flex items-center justify-center ${
            transform.scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
          }`}
        >
          {/* Zoom & Pan Transform Container */}
          <div
            style={{
              transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.scale})`,
              transformOrigin: 'center center',
              transition: transform.scale === 1 ? 'transform 0.25s ease-out' : 'none',
            }}
            className="relative w-full h-full flex items-center justify-center"
          >
            {/* SVG Anatomical Human Body */}
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`}
              className="w-full h-full max-h-[480px] drop-shadow-sm select-none"
              style={{ overflow: 'visible' }}
            >
              {/* Defs for gradients & glows */}
              <defs>
                <filter id="segment-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#0d9488" floodOpacity="0.35" />
                </filter>
                <linearGradient id="body-skeleton-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f1f5f9" />
                  <stop offset="100%" stopColor="#e2e8f0" />
                </linearGradient>
              </defs>

              {/* Background Silhouette Boundary */}
              <g id="body-base-silhouette" opacity="0.35">
                {bodySide === 'front' ? (
                  <path
                    d="M 200,20 C 235,20 235,65 220,95 L 230,120 C 255,120 275,135 275,160 C 275,210 260,250 280,265 C 310,325 310,360 295,385 C 285,370 280,330 260,250 L 245,170 C 245,260 240,290 240,330 C 255,420 255,540 260,650 C 275,690 230,705 230,650 L 220,490 C 215,440 205,350 200,345 C 195,350 185,440 180,490 L 170,650 C 170,705 125,690 140,650 C 145,540 145,420 160,330 C 160,290 155,260 155,170 L 140,250 C 120,330 115,370 105,385 C 90,360 90,325 120,265 C 140,250 125,210 125,160 C 125,135 145,120 170,120 L 180,95 C 165,65 165,20 200,20 Z"
                    fill="url(#body-skeleton-gradient)"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                  />
                ) : (
                  <path
                    d="M 200,20 C 235,20 235,65 215,85 L 265,135 C 275,155 270,185 260,195 L 280,265 C 310,325 310,360 295,385 C 285,370 280,330 260,250 L 240,165 C 240,260 245,330 245,335 C 255,420 255,540 260,640 C 270,685 230,700 230,640 L 220,495 C 215,440 205,350 200,350 C 195,350 185,440 180,495 L 170,640 C 170,700 130,685 140,640 C 145,540 145,420 155,335 C 155,330 160,260 160,165 L 140,250 C 120,330 115,370 105,385 C 90,360 90,325 120,265 L 140,195 C 130,185 125,155 135,135 L 185,85 C 165,65 165,20 200,20 Z"
                    fill="url(#body-skeleton-gradient)"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                  />
                )}
              </g>

              {/* Anatomical Segment Paths (Interactive) */}
              <g id="anatomical-interactive-paths">
                {segments.map((segment) => {
                  const isHovered = hoveredSegment?.id === segment.id;
                  const isSelected = bodyRegion === segment.name;

                  return (
                    <path
                      key={segment.id}
                      id={`segment-${segment.id}`}
                      d={segment.path}
                      fill={
                        isHovered
                          ? 'rgba(13, 148, 136, 0.35)'
                          : isSelected
                          ? 'rgba(13, 148, 136, 0.20)'
                          : '#f8fafc'
                      }
                      stroke={
                        isHovered
                          ? '#0f766e'
                          : isSelected
                          ? '#0d9488'
                          : '#cbd5e1'
                      }
                      strokeWidth={isHovered ? 2.5 : isSelected ? 2 : 1.2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      filter={isHovered ? 'url(#segment-glow)' : undefined}
                      className="transition-all duration-150 cursor-pointer pointer-events-auto"
                      onMouseEnter={() => handleSegmentMouseEnter(segment)}
                      onMouseLeave={handleSegmentMouseLeave}
                      onClick={(e) => handleSegmentClick(e, segment)}
                    />
                  );
                })}
              </g>

              {/* Landmark Anatomical Guide Lines */}
              <g id="anatomical-guide-lines" stroke="#0f766e" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 3" pointerEvents="none">
                {bodySide === 'front' ? (
                  <>
                    {/* Sternum / Midline */}
                    <line x1="200" y1="120" x2="200" y2="340" />
                    {/* Clavicles */}
                    <line x1="165" y1="120" x2="235" y2="120" />
                    {/* Patella Indicators */}
                    <circle cx="165" cy="470" r="10" fill="none" strokeWidth="1.2" />
                    <circle cx="235" cy="470" r="10" fill="none" strokeWidth="1.2" />
                  </>
                ) : (
                  <>
                    {/* Spine line */}
                    <line x1="200" y1="85" x2="200" y2="340" strokeWidth="1.5" strokeOpacity="0.4" />
                    {/* Scapula curves */}
                    <path d="M 165,140 Q 185,160 170,180" fill="none" />
                    <path d="M 235,140 Q 215,160 230,180" fill="none" />
                    {/* Popliteal guides */}
                    <circle cx="165" cy="470" r="9" fill="none" />
                    <circle cx="235" cy="470" r="9" fill="none" />
                  </>
                )}
              </g>
            </svg>

            {/* Historical Patient Observations Markers */}
            {sideObservations.map((obs) => {
              const obsConfig = getPainColorConfig(obs.pain_level);
              return (
                <div
                  key={obs.id}
                  style={{
                    left: `${obs.coordinates_x}%`,
                    top: `${obs.coordinates_y}%`,
                  }}
                  onMouseEnter={() => setSelectedObsHover(obs)}
                  onMouseLeave={() => setSelectedObsHover(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectObservation) onSelectObservation(obs);
                  }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-20 group/obs cursor-pointer"
                >
                  <div
                    style={{ boxShadow: `0 0 10px ${obsConfig.glow}` }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] text-white border-2 border-white shadow-md transition-transform hover:scale-130 active:scale-95 ${obsConfig.bg}`}
                  >
                    {obs.pain_level}
                  </div>
                </div>
              );
            })}

            {/* Active Candidate Pain Pinpoint (EVA 1-10) with Radar Pulse */}
            <div
              id="active-pain-pinpoint"
              style={{
                left: `${coordinates.x}%`,
                top: `${coordinates.y}%`,
              }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
            >
              <div className="relative flex items-center justify-center">
                {/* Glowing Radar Pulse Effect */}
                <span
                  style={{
                    backgroundColor: painConfig.glow,
                  }}
                  className="absolute w-12 h-12 rounded-full animate-ping opacity-75"
                ></span>

                {/* Outer Glow Halo */}
                <span
                  style={{
                    boxShadow: `0 0 16px 4px ${painConfig.glow}`,
                  }}
                  className="absolute w-10 h-10 rounded-full opacity-60"
                ></span>

                {/* Center Solid EVA Badge */}
                <div
                  className={`relative w-8 h-8 rounded-full bg-gradient-to-tr ${painConfig.gradient} flex items-center justify-center font-black text-xs text-white border-2 border-white shadow-xl`}
                >
                  {painLevel}
                </div>

                {/* Small indicator needle */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-1 border border-white"></div>
              </div>
            </div>
          </div>

          {/* Floating Medical Tooltip on Hover */}
          {hoveredSegment && tooltipPos && (
            <div
              style={{
                left: `${Math.min(230, Math.max(10, tooltipPos.x + 12))}px`,
                top: `${Math.max(10, tooltipPos.y - 45)}px`,
              }}
              className="absolute z-40 pointer-events-none bg-slate-900/95 backdrop-blur-md text-white px-3 py-2 rounded-xl shadow-xl border border-slate-700 max-w-[210px] animate-fadeIn"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                <p className="text-xs font-black tracking-tight text-slate-100">
                  {hoveredSegment.name}
                </p>
              </div>
              <span className="text-[10px] text-teal-300 font-semibold uppercase tracking-wider block mt-0.5">
                {hoveredSegment.categoryLabel}
              </span>
              {hoveredSegment.description && (
                <p className="text-[10px] text-slate-400 mt-1 leading-tight border-t border-slate-800 pt-1">
                  {hoveredSegment.description}
                </p>
              )}
            </div>
          )}

          {/* Observation Tooltip on Marker Hover */}
          {selectedObsHover && (
            <div className="absolute bottom-4 left-4 right-4 z-40 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-3 shadow-lg flex items-center justify-between text-xs animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-xs ${
                    getPainColorConfig(selectedObsHover.pain_level).bg
                  }`}
                >
                  {selectedObsHover.pain_level}
                </div>
                <div>
                  <p className="font-extrabold text-slate-800">{selectedObsHover.body_region}</p>
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {selectedObsHover.clinical_notes || 'Sin notas adicionales'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded border border-primary-fixed-dim uppercase">
                {selectedObsHover.pain_type || 'Punzante'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Anatomical Status Readout Footer */}
      <div className="w-full mt-3 flex items-center justify-between text-xs bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/30 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">my_location</span>
          <div>
            <span className="text-[10px] text-outline font-bold uppercase block">
              Segmento Activo
            </span>
            <span className="font-extrabold text-on-surface">{bodyRegion}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-outline font-bold uppercase block">
            Coordenadas Relativas
          </span>
          <span className="font-mono text-[11px] font-bold text-primary bg-primary-fixed/60 px-2 py-0.5 rounded border border-primary-fixed-dim">
            X: {coordinates.x}% | Y: {coordinates.y}%
          </span>
        </div>
      </div>
    </div>
  );
}
