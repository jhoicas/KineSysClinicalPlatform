import React from 'react';
import { StrengthAssessment } from '../../types';

interface StrengthDashboardProps {
  data: StrengthAssessment[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

function asymmetryColor(pct: number | null) {
  if (pct == null) return { text: 'text-on-surface-variant', bg: 'bg-surface-container-low', ring: '#94a3b8' };
  if (pct < 10)  return { text: 'text-emerald-600', bg: 'bg-emerald-50', ring: '#10b981' };
  if (pct < 20)  return { text: 'text-amber-600',   bg: 'bg-amber-50',   ring: '#f59e0b' };
  if (pct < 30)  return { text: 'text-orange-600',  bg: 'bg-orange-50',  ring: '#f97316' };
  return          { text: 'text-red-600',    bg: 'bg-red-50',    ring: '#ef4444' };
}

function asymmetryLabel(pct: number | null) {
  if (pct == null) return 'Sin datos';
  if (pct < 10)  return 'Simetría conservada';
  if (pct < 20)  return 'Asimetría leve';
  if (pct < 30)  return 'Asimetría moderada';
  return          'Asimetría marcada';
}

/** SVG ring KPI ─ radio=40 → circunferencia ≈ 251 */
function Ring({ value, max, color, label, sublabel }: {
  value: number;
  max: number;
  label: string;
  sublabel: string;
  color: string;
}) {
  const R = 40;
  const C = 2 * Math.PI * R;
  const pct = Math.min(1, value / (max || 1));
  const dash = pct * C;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" viewBox="0 0 100 100">
        {/* track */}
        <circle cx="50" cy="50" r={R} fill="none" stroke="#e2e8f0" strokeWidth="9" />
        {/* progress */}
        <circle
          cx="50" cy="50" r={R}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C - dash}`}
          strokeDashoffset={C / 4}      /* rotate −90° */
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
        <text x="50" y="46" textAnchor="middle" className="font-black text-base" fontSize="13" fontWeight="900" fill={color}>
          {label}
        </text>
        <text x="50" y="62" textAnchor="middle" fontSize="9" fill="#64748b">
          {sublabel}
        </text>
      </svg>
    </div>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

export const StrengthDashboard: React.FC<StrengthDashboardProps> = ({ data }) => {
  const withValues = data.filter(
    (d) => d.fuerza_izq_kg != null || d.fuerza_der_kg != null
  );

  // global KPIs
  const allForces = withValues.flatMap((d) =>
    [d.fuerza_izq_kg, d.fuerza_der_kg].filter((v): v is number => v != null)
  );
  const avgForce  = allForces.length
    ? Math.round(allForces.reduce((s, v) => s + v, 0) / allForces.length)
    : 0;

  const asymmetries = withValues
    .map((d) => d.asimetria_porcentaje)
    .filter((v): v is number => v != null);
  const avgAsym = asymmetries.length
    ? Math.round((asymmetries.reduce((s, v) => s + v, 0) / asymmetries.length) * 10) / 10
    : 0;

  const maxForce = Math.max(...allForces, 1);
  const asymColor = asymmetryColor(asymmetries.length ? avgAsym : null);

  return (
    <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-5 clinical-shadow space-y-5">
      {/* header */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-xl">fitness_center</span>
        <h3 className="text-sm font-extrabold text-on-surface">Análisis de Fuerza</h3>
      </div>

      {/* KPI rings */}
      {withValues.length > 0 ? (
        <>
          <div className="flex justify-around gap-4 py-2">
            <div className="text-center">
              <Ring
                value={avgForce}
                max={maxForce * 1.25}
                label={`${avgForce}`}
                sublabel="kg prom."
                color="#6366f1"
              />
              <p className="text-[11px] font-bold text-on-surface-variant mt-1">Fuerza global</p>
            </div>
            <div className="text-center">
              <Ring
                value={avgAsym}
                max={50}
                label={`${avgAsym}%`}
                sublabel="asim."
                color={asymColor.ring}
              />
              <p className={`text-[11px] font-bold mt-1 ${asymColor.text}`}>
                {asymmetryLabel(asymmetries.length ? avgAsym : null)}
              </p>
            </div>
          </div>

          {/* per-structure list */}
          <div className="space-y-4 divide-y divide-outline-variant/15">
            {data.map((row) => {
              const maxLocal = Math.max(row.fuerza_izq_kg ?? 0, row.fuerza_der_kg ?? 0, 1);
              const col = asymmetryColor(row.asimetria_porcentaje);
              return (
                <div key={row.estructura} className="pt-4 first:pt-0">
                  {/* structure name + asym badge */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-on-surface">
                      {row.estructura}
                    </p>
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${col.bg} ${col.text}`}>
                      {row.asimetria_porcentaje != null ? `${row.asimetria_porcentaje}%` : '—'}
                    </span>
                  </div>

                  {/* Izquierda */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] text-on-surface-variant w-6 shrink-0">IZQ</span>
                    <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${((row.fuerza_izq_kg ?? 0) / maxLocal) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-on-surface w-12 text-right">
                      {row.fuerza_izq_kg != null ? `${row.fuerza_izq_kg} kg` : '—'}
                    </span>
                  </div>

                  {/* Derecha */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-on-surface-variant w-6 shrink-0">DER</span>
                    <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-tertiary rounded-full transition-all duration-500"
                        style={{ width: `${((row.fuerza_der_kg ?? 0) / maxLocal) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-on-surface w-12 text-right">
                      {row.fuerza_der_kg != null ? `${row.fuerza_der_kg} kg` : '—'}
                    </span>
                  </div>

                  {/* interpretive badge */}
                  <p className={`text-[10px] font-semibold mt-1.5 ${col.text}`}>
                    {asymmetryLabel(row.asimetria_porcentaje)}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="py-8 text-center text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-3xl block mb-2 text-outline-variant">
            fitness_center
          </span>
          Ingresa datos de fuerza para ver el análisis de asimetrías.
        </div>
      )}
    </div>
  );
};
