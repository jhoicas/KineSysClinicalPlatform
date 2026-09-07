/**
 * EvaluationDashboard — Informe BIA / InBody H30 / Withings (CORE BODY)
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export type EvaluationSourceMode = 'MANUAL_ISAK' | 'WITHINGS' | 'INBODY';

export interface SegmentalRegionUI {
  right_arm: number | null;
  left_arm: number | null;
  trunk: number | null;
  right_leg: number | null;
  left_leg: number | null;
}

export interface HardwareReadingPreview {
  source: 'WITHINGS' | 'INBODY';
  measured_at: string;
  weight_kg: number | null;
  skeletal_muscle_kg?: number | null;
  fat_mass_kg?: number | null;
  body_fat_pct: number | null;
  visceral_fat_index: number | null;
  bmr: number | null;
  total_body_water_l?: number | null;
  protein_kg?: number | null;
  minerals_kg?: number | null;
  segmental: {
    fat: SegmentalRegionUI;
    muscle: SegmentalRegionUI;
  };
}

export interface EvaluationDashboardProps {
  patientName?: string;
  readOnly?: boolean;
  initialReading?: HardwareReadingPreview | null;
  onFetchHardware?: (source: 'WITHINGS' | 'INBODY') => Promise<HardwareReadingPreview | void>;
  className?: string;
}

const DEMO: Record<'WITHINGS' | 'INBODY', HardwareReadingPreview> = {
  WITHINGS: {
    source: 'WITHINGS',
    measured_at: new Date().toISOString(),
    weight_kg: 72.4,
    skeletal_muscle_kg: 28.6,
    fat_mass_kg: 18.2,
    body_fat_pct: 25.1,
    visceral_fat_index: 7,
    bmr: 1480,
    total_body_water_l: 38.2,
    protein_kg: 9.8,
    minerals_kg: 3.4,
    segmental: {
      muscle: { left_arm: 2.4, right_arm: 2.5, trunk: 22.1, left_leg: 7.2, right_leg: 7.4 },
      fat: { left_arm: 1.1, right_arm: 1.0, trunk: 9.4, left_leg: 3.2, right_leg: 3.1 },
    },
  },
  INBODY: {
    source: 'INBODY',
    measured_at: new Date().toISOString(),
    weight_kg: 71.8,
    skeletal_muscle_kg: 29.1,
    fat_mass_kg: 17.4,
    body_fat_pct: 24.2,
    visceral_fat_index: 6,
    bmr: 1510,
    total_body_water_l: 39.0,
    protein_kg: 10.1,
    minerals_kg: 3.5,
    segmental: {
      muscle: { left_arm: 2.5, right_arm: 2.6, trunk: 22.8, left_leg: 7.5, right_leg: 7.6 },
      fat: { left_arm: 1.0, right_arm: 0.95, trunk: 8.8, left_leg: 3.0, right_leg: 2.9 },
    },
  },
};

function RangeMeter({
  label,
  value,
  unit,
  min,
  max,
  status,
  accent = '#0284c7',
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  status: string;
  accent?: string;
}) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min || 1)) * 100));
  const ok = status.toLowerCase().includes('normal') || status.toLowerCase().includes('adecu');
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
            ok
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {status}
        </span>
      </div>
      <p className="text-xl font-black text-slate-900 tabular-nums">
        {value.toLocaleString('es-CO', { maximumFractionDigits: 1 })}
        <span className="text-xs text-slate-500 ml-1 font-bold">{unit}</span>
      </p>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden relative">
        <div className="absolute inset-y-0 left-[30%] right-[30%] bg-emerald-100/80" />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white shadow"
          style={{ left: `calc(${pct}% - 5px)`, backgroundColor: accent }}
        />
      </div>
      <div className="flex justify-between text-[9px] font-mono text-slate-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function SegmentalBody({
  muscle,
  fat,
}: {
  muscle: SegmentalRegionUI;
  fat: SegmentalRegionUI;
}) {
  const Callout = ({
    title,
    m,
    f,
    style,
  }: {
    title: string;
    m: number | null;
    f: number | null;
    style: React.CSSProperties;
  }) => (
    <div
      className="absolute z-10 rounded-xl border border-slate-200 bg-white/95 shadow-sm px-2.5 py-1.5 text-[10px] min-w-[88px]"
      style={style}
    >
      <p className="font-black text-slate-700 mb-0.5">{title}</p>
      <p className="text-[#0284c7] font-bold">Músc. {m ?? '—'} kg</p>
      <p className="text-[#f97316] font-bold">Grasa {f ?? '—'} kg</p>
    </div>
  );

  return (
    <div className="relative mx-auto w-full max-w-md h-[420px] rounded-3xl bg-slate-50 border border-slate-200 overflow-hidden">
      <svg viewBox="0 0 200 360" className="absolute left-1/2 top-6 -translate-x-1/2 w-[180px] h-[340px]">
        {/* Mitad músculo (izq) / grasa (der) */}
        <defs>
          <linearGradient id="muscleHalf" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#f97316" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="28" rx="18" ry="20" fill="url(#muscleHalf)" stroke="#64748b" strokeWidth="1.2" />
        <path
          d="M70 48 L130 48 L142 150 L120 210 L80 210 L58 150 Z"
          fill="url(#muscleHalf)"
          stroke="#64748b"
          strokeWidth="1.2"
        />
        <path d="M70 55 L45 130 L55 135 L78 80 Z" fill="#0284c7" fillOpacity="0.25" stroke="#0284c7" strokeWidth="1" />
        <path d="M130 55 L155 130 L145 135 L122 80 Z" fill="#f97316" fillOpacity="0.25" stroke="#f97316" strokeWidth="1" />
        <path d="M80 210 L72 320 L90 320 L95 210 Z" fill="#0284c7" fillOpacity="0.22" stroke="#0284c7" strokeWidth="1" />
        <path d="M105 210 L110 320 L128 320 L120 210 Z" fill="#f97316" fillOpacity="0.22" stroke="#f97316" strokeWidth="1" />
        <line x1="100" y1="48" x2="100" y2="210" stroke="#94a3b8" strokeDasharray="3 3" />
      </svg>

      {/* Líneas guía */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
        <line x1="28%" y1="28%" x2="42%" y2="32%" stroke="#94a3b8" strokeWidth="1" />
        <line x1="72%" y1="28%" x2="58%" y2="32%" stroke="#94a3b8" strokeWidth="1" />
        <line x1="22%" y1="48%" x2="40%" y2="48%" stroke="#94a3b8" strokeWidth="1" />
        <line x1="78%" y1="48%" x2="60%" y2="48%" stroke="#94a3b8" strokeWidth="1" />
        <line x1="28%" y1="72%" x2="42%" y2="68%" stroke="#94a3b8" strokeWidth="1" />
        <line x1="72%" y1="72%" x2="58%" y2="68%" stroke="#94a3b8" strokeWidth="1" />
      </svg>

      <Callout title="Brazo Izq." m={muscle.left_arm} f={fat.left_arm} style={{ left: '2%', top: '22%' }} />
      <Callout title="Brazo Der." m={muscle.right_arm} f={fat.right_arm} style={{ right: '2%', top: '22%' }} />
      <Callout title="Tronco" m={muscle.trunk} f={fat.trunk} style={{ left: '50%', top: '8%', transform: 'translateX(-50%)' }} />
      <Callout title="Pierna Izq." m={muscle.left_leg} f={fat.left_leg} style={{ left: '2%', top: '68%' }} />
      <Callout title="Pierna Der." m={muscle.right_leg} f={fat.right_leg} style={{ right: '2%', top: '68%' }} />

      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-4 text-[10px] font-bold">
        <span className="inline-flex items-center gap-1 text-[#0284c7]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" /> Músculo
        </span>
        <span className="inline-flex items-center gap-1 text-[#f97316]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" /> Grasa
        </span>
      </div>
    </div>
  );
}

function round(n: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export const EvaluationDashboard: React.FC<EvaluationDashboardProps> = ({
  patientName,
  onFetchHardware,
  initialReading = null,
  className = '',
}) => {
  const activePatient = useAppStore((s) => s.activePatient);
  const patchNutritionDraft = useAppStore((s) => s.patchNutritionDraft);
  const nutritionDraft = useAppStore((s) => s.nutritionDraft);

  const storedBia =
    nutritionDraft?.patientId === activePatient?.id && nutritionDraft?.biaSnapshot
      ? (nutritionDraft.biaSnapshot as unknown as HardwareReadingPreview)
      : null;

  const [source, setSource] = useState<'WITHINGS' | 'INBODY'>(
    nutritionDraft?.biaSource || 'INBODY',
  );
  const [reading, setReading] = useState<HardwareReadingPreview | null>(
    initialReading || storedBia || DEMO.INBODY,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activePatient?.id || !reading) return;
    patchNutritionDraft({
      patientId: activePatient.id,
      biaSource: source,
      biaSnapshot: reading as unknown as Record<string, unknown>,
      weightKg: reading.weight_kg ?? undefined,
    });
  }, [activePatient?.id, reading, source, patchNutritionDraft]);

  const metrics = useMemo(() => {
    const r = reading;
    if (!r) return null;
    return {
      weight: r.weight_kg ?? 0,
      muscle: r.skeletal_muscle_kg ?? round((r.weight_kg || 0) * 0.4, 1),
      fat: r.fat_mass_kg ?? round(((r.body_fat_pct || 0) / 100) * (r.weight_kg || 0), 1),
      fatPct: r.body_fat_pct ?? 0,
      water: r.total_body_water_l ?? 38,
      protein: r.protein_kg ?? 10,
      minerals: r.minerals_kg ?? 3.4,
      visceral: r.visceral_fat_index ?? 5,
    };
  }, [reading]);

  const fetchReading = async (src: 'WITHINGS' | 'INBODY') => {
    setSource(src);
    setLoading(true);
    try {
      const custom = onFetchHardware ? await onFetchHardware(src) : undefined;
      setReading(custom || DEMO[src]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-800">
            Informe de composición corporal BIA
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {patientName ? `${patientName} · ` : ''}
            InBody H30 / Withings Body Scan — análisis segmental
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fetchReading('INBODY')}
            disabled={loading}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold border ${
              source === 'INBODY'
                ? 'bg-[#0a192f] text-white border-[#0a192f]'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            InBody H30
          </button>
          <button
            type="button"
            onClick={() => void fetchReading('WITHINGS')}
            disabled={loading}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold border ${
              source === 'WITHINGS'
                ? 'bg-[#0a192f] text-white border-[#0a192f]'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            Withings
          </button>
        </div>
      </div>

      {!metrics ? (
        <p className="text-sm text-slate-500">Sin lectura BIA disponible.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_240px] gap-4">
          {/* A. Composición general */}
          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Composición general
            </p>
            <RangeMeter
              label="Peso corporal"
              value={metrics.weight}
              unit="kg"
              min={45}
              max={110}
              status="Normal"
              accent="#0a192f"
            />
            <RangeMeter
              label="Masa muscular esquelética"
              value={metrics.muscle}
              unit="kg"
              min={18}
              max={40}
              status="Adecuada"
              accent="#0284c7"
            />
            <RangeMeter
              label="Masa grasa"
              value={metrics.fat}
              unit="kg"
              min={8}
              max={35}
              status="Normal"
              accent="#f97316"
            />
            <RangeMeter
              label="% Grasa corporal"
              value={metrics.fatPct}
              unit="%"
              min={10}
              max={40}
              status="Normal"
              accent="#f97316"
            />
          </div>

          {/* B. Segmental */}
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 text-center">
              Análisis segmental — músculo / grasa
            </p>
            <SegmentalBody muscle={reading!.segmental.muscle} fat={reading!.segmental.fat} />
          </div>

          {/* C. Otros indicadores */}
          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Otros indicadores
            </p>
            <RangeMeter
              label="Agua corporal total"
              value={metrics.water}
              unit="L"
              min={28}
              max={50}
              status="Normal"
              accent="#0284c7"
            />
            <RangeMeter
              label="Proteína"
              value={metrics.protein}
              unit="kg"
              min={6}
              max={14}
              status="Adecuada"
              accent="#10b981"
            />
            <RangeMeter
              label="Minerales"
              value={metrics.minerals}
              unit="kg"
              min={2.2}
              max={4.5}
              status="Normal"
              accent="#64748b"
            />
            <RangeMeter
              label="Grasa visceral"
              value={metrics.visceral}
              unit="nivel"
              min={1}
              max={9}
              status={metrics.visceral <= 9 ? 'Normal' : 'Elevado'}
              accent="#f97316"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationDashboard;
