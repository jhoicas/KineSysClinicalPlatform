import React from 'react';
import { MobilityAssessment } from '../../types';
import { AnatomyIcon } from './AnatomyIcons';

interface MobilityDashboardProps {
  data: MobilityAssessment[];
}

function LimitationChip({ text, side }: { text: string; side: 'izq' | 'der' }) {
  const empty = !text.trim();
  return (
    <span
      className={`text-xs leading-snug max-w-[110px] truncate block ${
        empty
          ? 'text-on-surface-variant/40 italic'
          : side === 'izq'
          ? 'text-primary font-semibold'
          : 'text-tertiary font-semibold'
      }`}
    >
      {empty ? 'Sin limitación' : text}
    </span>
  );
}

export const MobilityDashboard: React.FC<MobilityDashboardProps> = ({ data }) => {
  const withLimitation = data.filter((d) => d.limitacion_izq.trim() || d.limitacion_der.trim()).length;

  return (
    <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-5 clinical-shadow">
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-xl">360</span>
          <h3 className="text-sm font-extrabold text-on-surface">Movilidad Articular</h3>
        </div>
        <div className="flex gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-primary font-bold">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            Izquierdo
          </span>
          <span className="flex items-center gap-1 text-tertiary font-bold">
            <span className="w-2 h-2 rounded-full bg-tertiary inline-block" />
            Derecho
          </span>
        </div>
      </div>

      {/* KPI strip */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 rounded-2xl bg-surface-container-low border border-outline-variant/20 px-3 py-2 text-center">
          <p className="text-lg font-black text-on-surface">{withLimitation}</p>
          <p className="text-[10px] text-on-surface-variant">segmentos con limitación</p>
        </div>
        <div className="flex-1 rounded-2xl bg-surface-container-low border border-outline-variant/20 px-3 py-2 text-center">
          <p className="text-lg font-black text-on-surface">{data.length - withLimitation}</p>
          <p className="text-[10px] text-on-surface-variant">segmentos libres</p>
        </div>
      </div>

      {/* segment list */}
      <div className="divide-y divide-outline-variant/15">
        {data.map((row) => {
          const hasIzq = !!row.limitacion_izq.trim();
          const hasDer = !!row.limitacion_der.trim();
          const hasAny = hasIzq || hasDer;

          return (
            <div
              key={row.estructura}
              className={`grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3 ${
                hasAny ? '' : 'opacity-60'
              }`}
            >
              {/* left: izq */}
              <div className="text-right">
                <LimitationChip text={row.limitacion_izq} side="izq" />
              </div>

              {/* center: anatomy icon + name */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <AnatomyIcon structure={row.estructura} size={40} className="w-10 h-10" />
                <span className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant text-center leading-none">
                  {row.estructura}
                </span>
              </div>

              {/* right: der */}
              <div className="text-left">
                <LimitationChip text={row.limitacion_der} side="der" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
