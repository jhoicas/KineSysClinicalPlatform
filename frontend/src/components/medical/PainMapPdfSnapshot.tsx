import React from 'react';
import type { PainObservation } from '../../types';
import { groupPainBySide, painLevelHex } from '../../utils/painMapCapture';

interface PainMapPdfSnapshotProps {
  observations: PainObservation[];
  /** id estable para html2canvas */
  captureId?: string;
}

function BodySilhouette({
  side,
  points,
}: {
  side: 'front' | 'back';
  points: PainObservation[];
}) {
  return (
    <div className="relative w-[160px] h-[320px] mx-auto bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
      <svg viewBox="0 0 100 200" className="absolute inset-0 w-full h-full" aria-hidden>
        {/* Cabeza */}
        <ellipse cx="50" cy="18" rx="12" ry="14" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.2" />
        {/* Cuello */}
        <rect x="46" y="30" width="8" height="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
        {/* Torso */}
        <path
          d="M32 38 L68 38 L72 95 L60 130 L40 130 L28 95 Z"
          fill="#f1f5f9"
          stroke="#64748b"
          strokeWidth="1.4"
        />
        {/* Brazos */}
        <path d="M32 42 L18 90 L24 92 L36 55 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
        <path d="M68 42 L82 90 L76 92 L64 55 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
        {/* Piernas */}
        <path d="M40 130 L36 185 L46 185 L48 130 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
        <path d="M52 130 L54 185 L64 185 L60 130 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
        {side === 'back' && (
          <line x1="50" y1="42" x2="50" y2="120" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
        )}
      </svg>
      {points.map((obs) => (
        <div
          key={obs.id}
          title={`${obs.body_region} EVA ${obs.pain_level}`}
          className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[8px] font-black text-white"
          style={{
            left: `${Math.min(95, Math.max(5, obs.coordinates_x))}%`,
            top: `${Math.min(95, Math.max(5, obs.coordinates_y))}%`,
            backgroundColor: painLevelHex(obs.pain_level),
          }}
        >
          {obs.pain_level}
        </div>
      ))}
      <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        {side === 'front' ? 'Vista anterior' : 'Vista posterior'}
      </span>
    </div>
  );
}

/**
 * Lienzo off-screen / embebido para captura con html2canvas del mapa de dolor.
 */
export const PainMapPdfSnapshot = React.forwardRef<HTMLDivElement, PainMapPdfSnapshotProps>(
  function PainMapPdfSnapshot({ observations, captureId = 'kinesys-pain-map-capture' }, ref) {
    const { front, back } = groupPainBySide(observations);

    return (
      <div
        ref={ref}
        id={captureId}
        className="bg-white p-4 rounded-xl border border-slate-200"
        style={{ width: 420, fontFamily: 'Segoe UI, Roboto, sans-serif' }}
      >
        <p className="text-xs font-black text-slate-800 mb-3 tracking-wide uppercase">
          Mapa corporal de dolor (EVA)
        </p>
        <div className="flex gap-4 justify-center">
          <BodySilhouette side="front" points={front} />
          <BodySilhouette side="back" points={back} />
        </div>
        {observations.length === 0 ? (
          <p className="text-[11px] text-slate-500 text-center mt-3">Sin puntos de dolor registrados.</p>
        ) : (
          <div className="mt-3 space-y-1">
            {observations.slice(0, 8).map((obs) => (
              <div key={obs.id} className="flex items-center gap-2 text-[10px] text-slate-700">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: painLevelHex(obs.pain_level) }}
                />
                <span className="font-bold">{obs.body_region}</span>
                <span className="text-slate-400">·</span>
                <span>EVA {obs.pain_level}/10</span>
                {obs.pain_type ? <span className="text-slate-400">({obs.pain_type})</span> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);
