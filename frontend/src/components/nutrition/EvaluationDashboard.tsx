/**
 * EvaluationDashboard — Fase 4.1 (PLAN_NUTRICION)
 * Centro de comando: captura tri-modal Manual ISAK / Withings / InBody.
 */
import React, { useMemo, useState } from 'react';

export type EvaluationSourceMode = 'MANUAL_ISAK' | 'WITHINGS' | 'INBODY';

export interface IsaKFormState {
  // Globales
  weight_kg: string;
  height_cm: string;
  age: string;
  sex: 'male' | 'female';
  // 8 pliegues (mm)
  triceps_mm: string;
  subscapular_mm: string;
  biceps_mm: string;
  iliac_crest_mm: string;
  suprailiac_mm: string;
  abdominal_mm: string;
  thigh_mm: string;
  calf_mm: string;
  // Perímetros (cm)
  arm_relaxed_cm: string;
  arm_flexed_cm: string;
  waist_cm: string;
  hip_cm: string;
  thigh_cm: string;
  calf_cm: string;
  // Diámetros óseos (cm)
  humerus_cm: string;
  femur_cm: string;
  wrist_cm: string;
}

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
  body_fat_pct: number | null;
  visceral_fat_index: number | null;
  bmr: number | null;
  segmental: {
    fat: SegmentalRegionUI;
    muscle: SegmentalRegionUI;
  };
}

export interface EvaluationDashboardProps {
  patientName?: string;
  readOnly?: boolean;
  onManualChange?: (form: IsaKFormState) => void;
  /** Callback tras “Obtener última lectura” (el padre puede llamar al adapter real). */
  onFetchHardware?: (source: 'WITHINGS' | 'INBODY') => Promise<HardwareReadingPreview | void>;
  className?: string;
}

const SOURCE_TABS: { id: EvaluationSourceMode; label: string; icon: string; hint: string }[] = [
  { id: 'MANUAL_ISAK', label: 'Manual (ISAK)', icon: 'straighten', hint: 'Pliegues, perímetros y diámetros' },
  { id: 'WITHINGS', label: 'Withings', icon: 'monitor_weight', hint: 'Body Scan / Measure API' },
  { id: 'INBODY', label: 'InBody', icon: 'cardiology', hint: 'LookinBody / DSM-BIA' },
];

const defaultIsaK = (): IsaKFormState => ({
  weight_kg: '72.5',
  height_cm: '170',
  age: '32',
  sex: 'female',
  triceps_mm: '14',
  subscapular_mm: '16',
  biceps_mm: '8',
  iliac_crest_mm: '12',
  suprailiac_mm: '15',
  abdominal_mm: '18',
  thigh_mm: '20',
  calf_mm: '11',
  arm_relaxed_cm: '28',
  arm_flexed_cm: '30',
  waist_cm: '74',
  hip_cm: '98',
  thigh_cm: '54',
  calf_cm: '36',
  humerus_cm: '6.2',
  femur_cm: '9.1',
  wrist_cm: '5.4',
});

const DEMO_READINGS: Record<'WITHINGS' | 'INBODY', HardwareReadingPreview> = {
  WITHINGS: {
    source: 'WITHINGS',
    measured_at: new Date().toISOString(),
    weight_kg: 72.5,
    body_fat_pct: 22.4,
    visceral_fat_index: 8.5,
    bmr: 1485,
    segmental: {
      fat: { right_arm: 1.2, left_arm: 1.15, trunk: 8.5, right_leg: 3.2, left_leg: 3.1 },
      muscle: { right_arm: 3.1, left_arm: 3.05, trunk: 22, right_leg: 8.5, left_leg: 8.4 },
    },
  },
  INBODY: {
    source: 'INBODY',
    measured_at: new Date().toISOString(),
    weight_kg: 68.4,
    body_fat_pct: 28.6,
    visceral_fat_index: 9,
    bmr: 1320,
    segmental: {
      fat: { right_arm: 1.1, left_arm: 1.05, trunk: 9.2, right_leg: 3.4, left_leg: 3.3 },
      muscle: { right_arm: 2.4, left_arm: 2.35, trunk: 18.5, right_leg: 7.1, left_leg: 7.0 },
    },
  },
};

const SEGMENT_LABELS: { key: keyof SegmentalRegionUI; label: string }[] = [
  { key: 'right_arm', label: 'Brazo D' },
  { key: 'left_arm', label: 'Brazo I' },
  { key: 'trunk', label: 'Tronco' },
  { key: 'right_leg', label: 'Pierna D' },
  { key: 'left_leg', label: 'Pierna I' },
];

const fieldClass =
  'mt-1 w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-60';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

function SegmentalBars({
  title,
  values,
  colorClass,
  maxHint,
}: {
  title: string;
  values: SegmentalRegionUI;
  colorClass: string;
  maxHint: number;
}) {
  const max = Math.max(
    maxHint,
    ...SEGMENT_LABELS.map((s) => values[s.key] ?? 0),
    0.1
  );
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-extrabold text-on-surface">{title}</p>
      {SEGMENT_LABELS.map(({ key, label }) => {
        const v = values[key];
        const pct = v == null ? 0 : Math.min(100, (v / max) * 100);
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[10px] font-semibold text-on-surface-variant">{label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-high">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-12 text-right text-[11px] font-bold tabular-nums text-on-surface">
              {v == null ? '—' : `${v.toFixed(1)}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const EvaluationDashboard: React.FC<EvaluationDashboardProps> = ({
  patientName,
  readOnly = false,
  onManualChange,
  onFetchHardware,
  className = '',
}) => {
  const [source, setSource] = useState<EvaluationSourceMode>('MANUAL_ISAK');
  const [form, setForm] = useState<IsaKFormState>(defaultIsaK);
  const [loadingHw, setLoadingHw] = useState(false);
  const [hwError, setHwError] = useState<string | null>(null);
  const [reading, setReading] = useState<HardwareReadingPreview | null>(null);

  const patchForm = (patch: Partial<IsaKFormState>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      onManualChange?.(next);
      return next;
    });
  };

  const handleFetch = async () => {
    if (source === 'MANUAL_ISAK' || readOnly) return;
    setLoadingHw(true);
    setHwError(null);
    try {
      const result = onFetchHardware
        ? await onFetchHardware(source)
        : DEMO_READINGS[source];
      setReading(result || DEMO_READINGS[source]);
    } catch (err) {
      setHwError(err instanceof Error ? err.message : 'No se pudo obtener la lectura.');
      setReading(null);
    } finally {
      setLoadingHw(false);
    }
  };

  const bmi = useMemo(() => {
    const w = Number(form.weight_kg);
    const h = Number(form.height_cm) / 100;
    if (!Number.isFinite(w) || !Number.isFinite(h) || h <= 0) return null;
    return Math.round((w / (h * h)) * 10) / 10;
  }, [form.weight_kg, form.height_cm]);

  return (
    <div className={`space-y-5 ${className}`}>
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Evaluación</p>
          <h2 className="text-lg font-black text-on-surface">
            Tablero tri-modal{patientName ? ` · ${patientName}` : ''}
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            ISAK manual o sincronización de hardware. El % de grasa del dispositivo no se recalcula con pliegues.
          </p>
        </div>
      </header>

      {/* Source selector */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {SOURCE_TABS.map((tab) => {
          const active = source === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={readOnly}
              onClick={() => {
                setSource(tab.id);
                setHwError(null);
                if (tab.id === 'MANUAL_ISAK') setReading(null);
              }}
              className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                active
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-xl ${active ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {tab.icon}
                </span>
                <span className="text-sm font-extrabold text-on-surface">{tab.label}</span>
              </div>
              <p className="mt-1 text-[11px] text-on-surface-variant">{tab.hint}</p>
            </button>
          );
        })}
      </div>

      {source === 'MANUAL_ISAK' ? (
        <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 clinical-shadow space-y-6">
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Peso (kg)">
              <input disabled={readOnly} className={fieldClass} value={form.weight_kg} onChange={(e) => patchForm({ weight_kg: e.target.value })} />
            </Field>
            <Field label="Talla (cm)">
              <input disabled={readOnly} className={fieldClass} value={form.height_cm} onChange={(e) => patchForm({ height_cm: e.target.value })} />
            </Field>
            <Field label="Edad">
              <input disabled={readOnly} className={fieldClass} value={form.age} onChange={(e) => patchForm({ age: e.target.value })} />
            </Field>
            <Field label="Sexo biológico">
              <select
                disabled={readOnly}
                className={fieldClass}
                value={form.sex}
                onChange={(e) => patchForm({ sex: e.target.value as 'male' | 'female' })}
              >
                <option value="female">Femenino</option>
                <option value="male">Masculino</option>
              </select>
            </Field>
          </section>

          {bmi != null && (
            <p className="text-xs text-on-surface-variant">
              IMC estimado: <span className="font-bold text-on-surface">{bmi}</span> kg/m²
            </p>
          )}

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-on-surface">
              <span className="material-symbols-outlined text-primary text-lg">architecture</span>
              Pliegues cutáneos (mm) — protocolo 8 sitios
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(
                [
                  ['triceps_mm', 'Tríceps'],
                  ['subscapular_mm', 'Subescapular'],
                  ['biceps_mm', 'Bíceps'],
                  ['iliac_crest_mm', 'Cresta ilíaca'],
                  ['suprailiac_mm', 'Suprailiaco'],
                  ['abdominal_mm', 'Abdominal'],
                  ['thigh_mm', 'Muslo'],
                  ['calf_mm', 'Pierna'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <Field label={label}>
                    <input
                      disabled={readOnly}
                      className={fieldClass}
                      value={form[key]}
                      onChange={(e) => patchForm({ [key]: e.target.value })}
                    />
                  </Field>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-on-surface">
              <span className="material-symbols-outlined text-primary text-lg">oval</span>
              Perímetros (cm)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(
                [
                  ['arm_relaxed_cm', 'Brazo relajado'],
                  ['arm_flexed_cm', 'Brazo flexionado'],
                  ['waist_cm', 'Cintura'],
                  ['hip_cm', 'Cadera'],
                  ['thigh_cm', 'Muslo'],
                  ['calf_cm', 'Pierna'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <Field label={label}>
                    <input
                      disabled={readOnly}
                      className={fieldClass}
                      value={form[key]}
                      onChange={(e) => patchForm({ [key]: e.target.value })}
                    />
                  </Field>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-on-surface">
              <span className="material-symbols-outlined text-primary text-lg">square_foot</span>
              Diámetros óseos (cm)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(
                [
                  ['humerus_cm', 'Húmero (biepicondilar)'],
                  ['femur_cm', 'Fémur (biepicondilar)'],
                  ['wrist_cm', 'Muñeca'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <Field label={label}>
                    <input
                      disabled={readOnly}
                      className={fieldClass}
                      value={form[key]}
                      onChange={(e) => patchForm({ [key]: e.target.value })}
                    />
                  </Field>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 clinical-shadow space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-on-surface">
                Sincronizar {source === 'WITHINGS' ? 'Withings' : 'InBody'}
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Obtiene la última lectura del adaptador de hardware y muestra composición segmental.
              </p>
            </div>
            <button
              type="button"
              disabled={readOnly || loadingHw}
              onClick={() => void handleFetch()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-lg ${loadingHw ? 'animate-spin' : ''}`}>
                {loadingHw ? 'sync' : 'cloud_download'}
              </span>
              {loadingHw ? 'Obteniendo…' : 'Obtener última lectura'}
            </button>
          </div>

          {hwError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {hwError}
            </p>
          )}

          {!reading ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-low/50 text-center px-4">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-2">analytics</span>
              <p className="text-sm font-bold text-on-surface">Sin lectura cargada</p>
              <p className="text-xs text-on-surface-variant mt-1 max-w-sm">
                Pulsa “Obtener última lectura” para visualizar grasa y músculo por segmento.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Peso', value: reading.weight_kg != null ? `${reading.weight_kg} kg` : '—' },
                  { label: '% Grasa', value: reading.body_fat_pct != null ? `${reading.body_fat_pct}%` : '—' },
                  { label: 'Grasa visceral', value: reading.visceral_fat_index ?? '—' },
                  { label: 'TMB', value: reading.bmr != null ? `${reading.bmr} kcal` : '—' },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-2xl bg-surface-container-low px-3 py-3">
                    <p className="text-[10px] font-bold uppercase text-on-surface-variant">{kpi.label}</p>
                    <p className="mt-1 text-base font-black text-on-surface">{kpi.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SegmentalBars title="Masa grasa segmental (kg)" values={reading.segmental.fat} colorClass="bg-amber-500" maxHint={10} />
                <SegmentalBars title="Masa muscular segmental (kg)" values={reading.segmental.muscle} colorClass="bg-primary" maxHint={25} />
              </div>

              <p className="text-[11px] text-on-surface-variant">
                Lectura {reading.source} · {new Date(reading.measured_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EvaluationDashboard;
