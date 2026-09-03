import React from 'react';
import { PainPoint } from '../types';

interface PainMapVisualizerProps {
  painPoints: PainPoint[];
  activePointId?: string | null;
  onSelectPoint?: (point: PainPoint) => void;
  onCanvasClick?: (view: 'anterior' | 'posterior', x: number, y: number) => void;
  readOnly?: boolean;
  compact?: boolean;
}

// Color helper for VAS/EVA score (0 to 10)
export const getEvaColor = (score: number) => {
  if (score <= 0) return '#10B981'; // Green
  if (score <= 3) return '#84CC16'; // Lime / Mild
  if (score <= 6) return '#F59E0B'; // Amber / Moderate
  if (score <= 8) return '#EF4444'; // Red / Severe
  return '#991B1B'; // Deep Dark Red / Extreme
};

export const getEvaBadgeClass = (score: number) => {
  if (score <= 3) return 'bg-lime-100 text-lime-800 border-lime-300';
  if (score <= 6) return 'bg-amber-100 text-amber-800 border-amber-300';
  if (score <= 8) return 'bg-rose-100 text-rose-800 border-rose-300';
  return 'bg-red-200 text-red-900 border-red-400 font-black';
};

export const PainMapVisualizer: React.FC<PainMapVisualizerProps> = ({
  painPoints,
  activePointId,
  onSelectPoint,
  onCanvasClick,
  readOnly = false,
  compact = false,
}) => {
  const anteriorPoints = painPoints.filter((p) => p.view === 'anterior');
  const posteriorPoints = painPoints.filter((p) => p.view === 'posterior');

  const handleSvgClick = (
    e: React.MouseEvent<SVGSVGElement>,
    view: 'anterior' | 'posterior'
  ) => {
    if (readOnly || !onCanvasClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert to percentage coordinates (0 to 100)
    const xPct = Math.max(5, Math.min(95, Math.round((clickX / rect.width) * 1000) / 10));
    const yPct = Math.max(5, Math.min(95, Math.round((clickY / rect.height) * 1000) / 10));

    onCanvasClick(view, xPct, yPct);
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 ${compact ? 'max-w-md mx-auto' : 'w-full'}`}>
      {/* Vista Anterior */}
      <div className="flex flex-col items-center bg-slate-50/90 rounded-2xl p-4 border border-slate-200 relative group">
        <div className="w-full flex items-center justify-between text-xs font-bold text-slate-700 mb-2 px-1">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            Vista Anterior
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">
            {anteriorPoints.length} {anteriorPoints.length === 1 ? 'punto' : 'puntos'}
          </span>
        </div>

        {!readOnly && (
          <div className="absolute top-10 right-4 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
            + Clic para ubicar
          </div>
        )}

        <div className="relative w-full flex justify-center items-center py-1">
          <svg
            viewBox="0 0 200 400"
            className={`w-full ${compact ? 'h-64' : 'h-80 sm:h-96'} max-w-[220px] select-none ${
              !readOnly ? 'cursor-crosshair' : 'cursor-default'
            }`}
            onClick={(e) => handleSvgClick(e, 'anterior')}
          >
            {/* Subtle anatomical grid */}
            <defs>
              <pattern id="painGridAnterior" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="1,3" />
              </pattern>
            </defs>
            <rect width="200" height="400" fill="url(#painGridAnterior)" />

            {/* Plumb line / Center Axis */}
            <line x1="100" y1="10" x2="100" y2="390" stroke="#94A3B8" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />

            {/* Anatomical Silhouette: Anterior */}
            <g fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" strokeLinejoin="round">
              {/* Head */}
              <circle cx="100" cy="38" r="22" fill="#F1F5F9" stroke="#64748B" strokeWidth="1.8" />
              {/* Neck */}
              <path d="M 91 58 L 91 72 L 109 72 L 109 58 Z" fill="#F1F5F9" stroke="#64748B" strokeWidth="1.5" />
              {/* Clavicles */}
              <line x1="72" y1="74" x2="98" y2="78" stroke="#94A3B8" strokeWidth="1.5" />
              <line x1="128" y1="74" x2="102" y2="78" stroke="#94A3B8" strokeWidth="1.5" />

              {/* Torso & Pelvis */}
              <path
                d="M 68 76 C 58 84, 52 108, 56 142 C 58 160, 62 185, 66 205 L 134 205 C 138 185, 142 160, 144 142 C 148 108, 142 84, 132 76 Z"
                fill="#F8FAFC"
                stroke="#64748B"
                strokeWidth="1.8"
              />
              {/* Pectoral line */}
              <path d="M 66 112 Q 100 120 134 112" fill="none" stroke="#CBD5E1" strokeWidth="1.2" />
              {/* Umbilicus / Core center */}
              <circle cx="100" cy="165" r="2.5" fill="#94A3B8" />

              {/* Arms (Left anatomical = right side of viewer, Right anatomical = left side) */}
              {/* Right Arm (Viewer Left) */}
              <path
                d="M 68 76 C 52 86, 36 120, 32 155 C 30 178, 24 208, 22 230 C 20 236, 16 248, 20 252 C 24 256, 30 248, 34 240 C 38 220, 42 185, 46 160 C 50 135, 56 105, 60 90 Z"
                fill="#F8FAFC"
                stroke="#64748B"
                strokeWidth="1.5"
              />
              {/* Left Arm (Viewer Right) */}
              <path
                d="M 132 76 C 148 86, 164 120, 168 155 C 170 178, 176 208, 178 230 C 180 236, 184 248, 180 252 C 176 256, 170 248, 166 240 C 162 220, 158 185, 154 160 C 150 135, 144 105, 140 90 Z"
                fill="#F8FAFC"
                stroke="#64748B"
                strokeWidth="1.5"
              />

              {/* Legs */}
              {/* Right Leg (Viewer Left) */}
              <path
                d="M 68 205 C 64 240, 62 270, 66 295 C 68 312, 66 345, 68 375 L 82 375 C 84 345, 88 312, 88 295 C 90 270, 96 235, 96 215 Z"
                fill="#F8FAFC"
                stroke="#64748B"
                strokeWidth="1.8"
              />
              {/* Right Patella / Knee */}
              <ellipse cx="76" cy="295" rx="7" ry="9" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.2" />
              {/* Right Foot */}
              <path d="M 64 375 L 60 388 L 84 388 L 82 375 Z" fill="#F1F5F9" stroke="#64748B" strokeWidth="1.5" />

              {/* Left Leg (Viewer Right) */}
              <path
                d="M 132 205 C 136 240, 138 270, 134 295 C 132 312, 134 345, 132 375 L 118 375 C 116 345, 112 312, 112 295 C 110 270, 104 235, 104 215 Z"
                fill="#F8FAFC"
                stroke="#64748B"
                strokeWidth="1.8"
              />
              {/* Left Patella / Knee */}
              <ellipse cx="124" cy="295" rx="7" ry="9" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.2" />
              {/* Left Foot */}
              <path d="M 118 375 L 116 388 L 140 388 L 136 375 Z" fill="#F1F5F9" stroke="#64748B" strokeWidth="1.5" />
            </g>

            {/* Pre-defined Landmarks Labels (Subtle) */}
            <text x="100" y="24" textAnchor="middle" fontSize="7" fill="#94A3B8" fontWeight="bold">Frente</text>
            <text x="76" y="297" textAnchor="middle" fontSize="7" fill="#64748B">R. Der</text>
            <text x="124" y="297" textAnchor="middle" fontSize="7" fill="#64748B">R. Izq</text>

            {/* Render Registered Pain Points (Anterior) */}
            {anteriorPoints.map((pt) => {
              const cx = (pt.x / 100) * 200;
              const cy = (pt.y / 100) * 400;
              const isSelected = activePointId === pt.id;
              const color = getEvaColor(pt.intensityVAS);

              return (
                <g
                  key={pt.id}
                  className="cursor-pointer transition-transform hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPoint?.(pt);
                  }}
                >
                  {/* Pulsing Outer Halo */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 18 : 13}
                    fill={color}
                    opacity="0.25"
                    className="animate-pulse"
                  />
                  {/* Border Circle */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 12 : 9}
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter="drop-shadow(0 2px 3px rgba(0,0,0,0.3))"
                  />
                  {/* EVA Text */}
                  <text
                    x={cx}
                    y={cy + 3.5}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize={isSelected ? '9' : '7.5'}
                    fontWeight="bold"
                    className="pointer-events-none select-none"
                  >
                    {pt.intensityVAS}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="w-full flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200 mt-2">
          <span>Derecha (D)</span>
          <span className="text-[10px] text-slate-400">Escala EVA 0-10</span>
          <span>Izquierda (I)</span>
        </div>
      </div>

      {/* Vista Posterior */}
      <div className="flex flex-col items-center bg-slate-50/90 rounded-2xl p-4 border border-slate-200 relative group">
        <div className="w-full flex items-center justify-between text-xs font-bold text-slate-700 mb-2 px-1">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            Vista Posterior
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">
            {posteriorPoints.length} {posteriorPoints.length === 1 ? 'punto' : 'puntos'}
          </span>
        </div>

        {!readOnly && (
          <div className="absolute top-10 right-4 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
            + Clic para ubicar
          </div>
        )}

        <div className="relative w-full flex justify-center items-center py-1">
          <svg
            viewBox="0 0 200 400"
            className={`w-full ${compact ? 'h-64' : 'h-80 sm:h-96'} max-w-[220px] select-none ${
              !readOnly ? 'cursor-crosshair' : 'cursor-default'
            }`}
            onClick={(e) => handleSvgClick(e, 'posterior')}
          >
            <defs>
              <pattern id="painGridPosterior" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="1,3" />
              </pattern>
            </defs>
            <rect width="200" height="400" fill="url(#painGridPosterior)" />

            {/* Plumb line / Center Axis */}
            <line x1="100" y1="10" x2="100" y2="390" stroke="#94A3B8" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />

            {/* Anatomical Silhouette: Posterior */}
            <g fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" strokeLinejoin="round">
              {/* Head / Occipital */}
              <circle cx="100" cy="38" r="22" fill="#F1F5F9" stroke="#64748B" strokeWidth="1.8" />
              <path d="M 85 45 C 92 50, 108 50, 115 45" fill="none" stroke="#CBD5E1" strokeWidth="1.2" />

              {/* Neck */}
              <path d="M 91 58 L 91 72 L 109 72 L 109 58 Z" fill="#F1F5F9" stroke="#64748B" strokeWidth="1.5" />
              {/* C7 Prominence */}
              <circle cx="100" cy="68" r="2.5" fill="#94A3B8" />

              {/* Torso / Back */}
              <path
                d="M 68 76 C 58 84, 52 108, 56 142 C 58 160, 62 185, 66 205 L 134 205 C 138 185, 142 160, 144 142 C 148 108, 142 84, 132 76 Z"
                fill="#F8FAFC"
                stroke="#64748B"
                strokeWidth="1.8"
              />

              {/* Scapulae */}
              <path d="M 75 92 L 88 95 L 82 118 Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.2" />
              <path d="M 125 92 L 112 95 L 118 118 Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.2" />

              {/* Spine Line */}
              <line x1="100" y1="72" x2="100" y2="200" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4,2" />

              {/* Gluteal Crease / Sacrum */}
              <path d="M 100 205 L 100 225" stroke="#94A3B8" strokeWidth="1.5" />
              <path d="M 78 220 Q 100 230 122 220" fill="none" stroke="#CBD5E1" strokeWidth="1.2" />

              {/* Arms (Posterior) */}
              {/* Right Arm Anatomical (Viewer Left) */}
              <path
                d="M 68 76 C 52 86, 36 120, 32 155 C 30 178, 24 208, 22 230 C 20 236, 16 248, 20 252 C 24 256, 30 248, 34 240 C 38 220, 42 185, 46 160 C 50 135, 56 105, 60 90 Z"
                fill="#F8FAFC"
                stroke="#64748B"
                strokeWidth="1.5"
              />
              {/* Left Arm Anatomical (Viewer Right) */}
              <path
                d="M 132 76 C 148 86, 164 120, 168 155 C 170 178, 176 208, 178 230 C 180 236, 184 248, 180 252 C 176 256, 170 248, 166 240 C 162 220, 158 185, 154 160 C 150 135, 144 105, 140 90 Z"
                fill="#F8FAFC"
                stroke="#64748B"
                strokeWidth="1.5"
              />

              {/* Legs (Posterior) */}
              {/* Right Leg (Viewer Left) */}
              <path
                d="M 68 205 C 64 240, 62 270, 66 295 C 68 312, 66 345, 68 375 L 82 375 C 84 345, 88 312, 88 295 C 90 270, 96 235, 96 215 Z"
                fill="#F8FAFC"
                stroke="#64748B"
                strokeWidth="1.8"
              />
              {/* Popliteal Fossa */}
              <path d="M 70 295 Q 76 298 84 295" fill="none" stroke="#CBD5E1" strokeWidth="1.2" />
              {/* Achilles tendon / Heel */}
              <line x1="76" y1="355" x2="76" y2="380" stroke="#94A3B8" strokeWidth="2" />
              <path d="M 68 375 L 68 388 L 84 388 L 82 375 Z" fill="#F1F5F9" stroke="#64748B" strokeWidth="1.5" />

              {/* Left Leg (Viewer Right) */}
              <path
                d="M 132 205 C 136 240, 138 270, 134 295 C 132 312, 134 345, 132 375 L 118 375 C 116 345, 112 312, 112 295 C 110 270, 104 235, 104 215 Z"
                fill="#F8FAFC"
                stroke="#64748B"
                strokeWidth="1.8"
              />
              {/* Popliteal Fossa */}
              <path d="M 116 295 Q 124 298 130 295" fill="none" stroke="#CBD5E1" strokeWidth="1.2" />
              {/* Achilles tendon / Heel */}
              <line x1="124" y1="355" x2="124" y2="380" stroke="#94A3B8" strokeWidth="2" />
              <path d="M 118 375 L 116 388 L 132 388 L 132 375 Z" fill="#F1F5F9" stroke="#64748B" strokeWidth="1.5" />
            </g>

            {/* Labels (Subtle) */}
            <text x="100" y="24" textAnchor="middle" fontSize="7" fill="#94A3B8" fontWeight="bold">Nuca</text>
            <text x="100" y="150" textAnchor="middle" fontSize="6.5" fill="#94A3B8">Lumbar</text>
            <text x="76" y="365" textAnchor="middle" fontSize="6" fill="#64748B">Aquiles D</text>
            <text x="124" y="365" textAnchor="middle" fontSize="6" fill="#64748B">Aquiles I</text>

            {/* Render Registered Pain Points (Posterior) */}
            {posteriorPoints.map((pt) => {
              const cx = (pt.x / 100) * 200;
              const cy = (pt.y / 100) * 400;
              const isSelected = activePointId === pt.id;
              const color = getEvaColor(pt.intensityVAS);

              return (
                <g
                  key={pt.id}
                  className="cursor-pointer transition-transform hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPoint?.(pt);
                  }}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 18 : 13}
                    fill={color}
                    opacity="0.25"
                    className="animate-pulse"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 12 : 9}
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter="drop-shadow(0 2px 3px rgba(0,0,0,0.3))"
                  />
                  <text
                    x={cx}
                    y={cy + 3.5}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize={isSelected ? '9' : '7.5'}
                    fontWeight="bold"
                    className="pointer-events-none select-none"
                  >
                    {pt.intensityVAS}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="w-full flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200 mt-2">
          <span>Derecha (D)</span>
          <span className="text-[10px] text-slate-400">Escala EVA 0-10</span>
          <span>Izquierda (I)</span>
        </div>
      </div>
    </div>
  );
};
