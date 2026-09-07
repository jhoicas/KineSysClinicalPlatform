import React, { useEffect, useMemo, useState } from 'react';
import type { EvaluacionAntropometrica, PacienteClinico } from '../../types';
import { calculateWaistHipRatio } from '../../utils/nutritionCalculations';
import {
  calculateArmRatio,
  calculateWHtR,
  EQUATION_OPTIONS,
  estimateBodyFat,
  heathCarterSomatotype,
  type IsaKEquationId,
} from '../../utils/isakCalculations';
import { useAppStore } from '../../store/useAppStore';
import { IsakPatientHeader } from './IsakPatientHeader';
import {
  ISAK_NODES,
  IsakAnatomicalModel,
  type IsakMeasureTab,
  type IsakNodeDef,
  type IsakNodeId,
} from './IsakAnatomicalModel';
import { AnthropometryProgressTimeline } from './AnthropometryProgressTimeline';

interface AnthropometryEvaluationModuleProps {
  patient: PacienteClinico;
  historyEvaluations?: EvaluacionAntropometrica[];
  nutritionistId: string;
  nutritionistName?: string;
  clinicName?: string;
  tenantId: string;
  onSaveEvaluation: (record: EvaluacionAntropometrica) => Promise<void>;
  onGoToDietPlanner?: (savedEvaluation: EvaluacionAntropometrica) => void;
}

type MeasureMap = Partial<Record<IsakNodeId, number>>;

function calcAge(birthDate?: string): number {
  if (!birthDate) return 30;
  const y = new Date(birthDate).getFullYear();
  return Math.max(12, new Date().getFullYear() - y);
}

const TABS: { id: IsakMeasureTab; label: string; icon: string }[] = [
  { id: 'pliegues', label: 'Pliegues Cutáneos', icon: 'square_foot' },
  { id: 'perimetros', label: 'Perímetros', icon: 'straighten' },
  { id: 'diametros', label: 'Diámetros Óseos', icon: 'architecture' },
];

export const AnthropometryEvaluationModule: React.FC<AnthropometryEvaluationModuleProps> = ({
  patient,
  historyEvaluations = [],
  nutritionistId,
  tenantId,
  onSaveEvaluation,
  onGoToDietPlanner,
}) => {
  const age = calcAge(patient.birth_date);
  const gender = (patient.gender === 'female' ? 'female' : patient.gender === 'other' ? 'other' : 'male') as
    | 'male'
    | 'female'
    | 'other';

  const nutritionDraft = useAppStore((s) => s.nutritionDraft);
  const patchNutritionDraft = useAppStore((s) => s.patchNutritionDraft);
  const setActivePatient = useAppStore((s) => s.setActivePatient);
  const activePatient = useAppStore((s) => s.activePatient);

  const draftForPatient =
    nutritionDraft?.patientId === patient.id ? nutritionDraft : null;

  const [moduleView, setModuleView] = useState<'isak' | 'progreso'>('isak');
  const [activeTab, setActiveTab] = useState<IsakMeasureTab>('pliegues');
  const [selectedId, setSelectedId] = useState<IsakNodeId | null>('triceps');
  const [draftValue, setDraftValue] = useState('14.5');
  const [equation, setEquation] = useState<IsaKEquationId>(
    (draftForPatient?.equation as IsaKEquationId) || 'faulkner',
  );
  const [weightKg, setWeightKg] = useState(
    draftForPatient?.weightKg ??
      (typeof patient.weight_kg === 'number' ? patient.weight_kg : gender === 'male' ? 78 : 62.4),
  );
  const [heightCm, setHeightCm] = useState(
    draftForPatient?.heightCm ??
      (typeof patient.height_cm === 'number' ? patient.height_cm : gender === 'male' ? 175 : 167),
  );
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  const defaultMeasures: MeasureMap = {
    biceps: 8.5,
    triceps: gender === 'male' ? 14.5 : 16,
    subscapular: gender === 'male' ? 18 : 14.5,
    iliac_crest: 12,
    suprailiac: gender === 'male' ? 19.5 : 15,
    abdominal: gender === 'male' ? 22 : 17.5,
    thigh_sf: 16,
    calf_sf: 11,
    arm_relaxed: 32,
    arm_flexed: 34.5,
    waist: gender === 'male' ? 88 : 70,
    hip: gender === 'male' ? 98 : 96,
    thigh_cir: 56,
    calf_cir: 37,
    biacromial: 38,
    humerus: 6.8,
    femur: 9.2,
  };

  const [measures, setMeasures] = useState<MeasureMap>(() => ({
    ...defaultMeasures,
    ...(draftForPatient?.isakMeasures as MeasureMap | undefined),
  }));

  // Sync live → store (debounced lightly via effect)
  useEffect(() => {
    patchNutritionDraft({
      patientId: patient.id,
      weightKg,
      heightCm,
      equation,
      isakMeasures: measures as Record<string, number>,
    });
  }, [patient.id, weightKg, heightCm, equation, measures, patchNutritionDraft]);

  const patientHistory = historyEvaluations.filter((e) => e.patient_id === patient.id);

  const bodyFat = useMemo(
    () =>
      estimateBodyFat(
        equation,
        gender,
        age,
        {
          triceps: measures.triceps || 0,
          subscapular: measures.subscapular || 0,
          biceps: measures.biceps,
          iliac_crest: measures.iliac_crest,
          suprailiac: measures.suprailiac || 0,
          abdominal: measures.abdominal || 0,
          thigh: measures.thigh_sf,
          calf: measures.calf_sf,
        },
        weightKg,
      ),
    [equation, gender, age, measures, weightKg],
  );

  const whr = useMemo(
    () => calculateWaistHipRatio(measures.waist || 0, measures.hip || 1, gender),
    [measures.waist, measures.hip, gender],
  );
  const whtr = useMemo(
    () => calculateWHtR(measures.waist || 0, heightCm),
    [measures.waist, heightCm],
  );
  const armRatio = useMemo(
    () => calculateArmRatio(measures.arm_flexed, measures.arm_relaxed),
    [measures.arm_flexed, measures.arm_relaxed],
  );

  const somatotype = useMemo(
    () =>
      heathCarterSomatotype({
        tricepsMm: measures.triceps || 0,
        subscapularMm: measures.subscapular || 0,
        suprailiacMm: measures.suprailiac || 0,
        medialCalfMm: measures.calf_sf || 0,
        humerusCm: measures.humerus || 6,
        femurCm: measures.femur || 9,
        flexedArmCm: measures.arm_flexed || 30,
        calfCm: measures.calf_cir || 35,
        heightCm,
        weightKg,
      }),
    [measures, heightCm, weightKg],
  );

  const handleSelect = (node: IsakNodeDef) => {
    setSelectedId(node.id);
    setDraftValue(measures[node.id] != null ? String(measures[node.id]) : '');
  };

  const handleSaveMeasure = () => {
    if (!selectedId) return;
    const n = Number(draftValue);
    if (!Number.isFinite(n) || n < 0) return;
    setMeasures((prev) => ({ ...prev, [selectedId]: n }));
  };

  const handleRepeat = () => {
    if (!selectedId) return;
    setDraftValue('');
    setMeasures((prev) => {
      const next = { ...prev };
      delete next[selectedId];
      return next;
    });
  };

  const handleStepNav = (dir: 'prev' | 'next') => {
    const idx = TABS.findIndex((t) => t.id === activeTab);
    const next = dir === 'next' ? Math.min(TABS.length - 1, idx + 1) : Math.max(0, idx - 1);
    setActiveTab(TABS[next].id);
    const first = ISAK_NODES.find((n) => n.tab === TABS[next].id);
    if (first) handleSelect(first);
  };

  const buildRecord = (): EvaluacionAntropometrica => {
    const activity = 1.375;
    return {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      patient_id: patient.id,
      nutritionist_id: nutritionistId,
      evaluation_date: new Date().toISOString().slice(0, 10),
      age,
      gender,
      weight_kg: weightKg,
      height_cm: heightCm,
      activity_factor: activity,
      skinfold_triceps_mm: measures.triceps || 0,
      skinfold_subscapular_mm: measures.subscapular || 0,
      skinfold_suprailiac_mm: measures.suprailiac || 0,
      skinfold_abdominal_mm: measures.abdominal || 0,
      skinfold_biceps_mm: measures.biceps,
      skinfold_thigh_mm: measures.thigh_sf,
      skinfold_calf_mm: measures.calf_sf,
      waist_cm: measures.waist || 0,
      hip_cm: measures.hip || 0,
      relaxed_arm_cm: measures.arm_relaxed,
      contracted_arm_cm: measures.arm_flexed,
      thigh_cm: measures.thigh_cir,
      calf_cm: measures.calf_cir,
      bmi: round(weightKg / ((heightCm / 100) ** 2), 1),
      bmr_kcal: 0,
      tdee_kcal: 0,
      waist_hip_ratio: whr.ratio,
      body_fat_percentage: bodyFat.bodyFatPct,
      fat_mass_kg: bodyFat.fatMassKg,
      fat_free_mass_kg: bodyFat.leanMassKg,
      cardiovascular_risk_level: whr.risk_level,
      clinical_notes: `ISAK · ${bodyFat.formula} · Somatotipo ${somatotype.dominant} (E${somatotype.endomorphy}/M${somatotype.mesomorphy}/Ec${somatotype.ectomorphy}) · Biacromial ${measures.biacromial || '—'} cm · Húmero ${measures.humerus || '—'} · Fémur ${measures.femur || '—'}`,
      created_at: new Date().toISOString(),
    };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const record = buildRecord();
      await onSaveEvaluation(record);
      if (activePatient?.id === patient.id) {
        setActivePatient({
          ...activePatient,
          weight_kg: weightKg,
          height_cm: heightCm,
          gender: patient.gender || activePatient.gender,
        });
      }
      setSaveOk(true);
      setTimeout(() => {
        setSaveOk(false);
        onGoToDietPlanner?.(record);
      }, 1200);
    } catch (err) {
      console.error('Supabase Error:', err);
    } finally {
      setSaving(false);
    }
  };

  const toneClass = (tone: string) =>
    tone === 'green'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : tone === 'red'
          ? 'bg-red-50 text-red-700 border-red-200'
          : 'bg-sky-50 text-sky-700 border-sky-200';

  const statusBadge = (status: string) =>
    status === 'Normal' || status === 'bajo'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-amber-50 text-amber-800 border-amber-200';

  return (
    <div className="space-y-4 bg-[#f8fafc] -mx-1 px-1 rounded-3xl">
      <IsakPatientHeader
        patient={patient}
        evaluationNumber={patientHistory.length + 1}
        sportActivity={patient.chronic_conditions?.[0] || 'Actividad física regular'}
        onSaveAndExit={() => void handleSave()}
        onStepNav={handleStepNav}
        saving={saving}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setModuleView('isak')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold border ${
            moduleView === 'isak'
              ? 'bg-[#0a192f] text-white border-[#0a192f]'
              : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          Antropometría 1 · ISAK Manual
        </button>
        <button
          type="button"
          onClick={() => setModuleView('progreso')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold border ${
            moduleView === 'progreso'
              ? 'bg-[#0a192f] text-white border-[#0a192f]'
              : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          Progreso longitudinal
        </button>
      </div>

      {moduleView === 'progreso' ? (
        <AnthropometryProgressTimeline
          patient={patient}
          evaluations={patientHistory}
          onLoadIntoCalculator={(_ev) => setModuleView('isak')}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white border border-slate-200 p-3">
            <label className="text-[11px] font-bold text-slate-500">
              Peso (kg)
              <input
                type="number"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value) || 0)}
                className="mt-1 block w-24 rounded-xl border border-slate-200 px-2 py-1.5 text-sm font-bold"
              />
            </label>
            <label className="text-[11px] font-bold text-slate-500">
              Talla (cm)
              <input
                type="number"
                step="0.1"
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value) || 0)}
                className="mt-1 block w-24 rounded-xl border border-slate-200 px-2 py-1.5 text-sm font-bold"
              />
            </label>
            <div className="flex gap-1 ml-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    const first = ISAK_NODES.find((n) => n.tab === tab.id);
                    if (first) handleSelect(first);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#0284c7] text-white border-[#0284c7]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-4">
            <IsakAnatomicalModel
              gender={gender}
              activeTab={activeTab}
              values={measures}
              selectedId={selectedId}
              onSelect={handleSelect}
              draftValue={draftValue}
              onDraftChange={setDraftValue}
              onSaveMeasure={handleSaveMeasure}
              onRepeatMeasure={handleRepeat}
            />

            <aside className="space-y-3">
              {activeTab === 'pliegues' && (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                  <h3 className="text-sm font-black text-slate-800">Pliegues registrados (mm)</h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {ISAK_NODES.filter((n) => n.tab === 'pliegues').map((n) => (
                      <div
                        key={n.id}
                        className="flex justify-between text-xs border-b border-slate-100 py-1.5"
                      >
                        <span className="text-slate-600 font-medium">{n.label}</span>
                        <strong className="text-slate-900 font-mono">
                          {measures[n.id] != null ? `${measures[n.id]} mm` : '—'}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <label className="block text-[11px] font-bold text-slate-500">
                    Ecuación de estimación
                    <select
                      value={equation}
                      onChange={(e) => setEquation(e.target.value as IsaKEquationId)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800"
                    >
                      {EQUATION_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Fórmula</p>
                    <p className="text-xs font-mono text-slate-700 mt-1">{bodyFat.formulaLatex}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{bodyFat.formula}</p>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-br from-[#0a192f] to-[#0284c7] p-4 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200">
                      % Grasa corporal
                    </p>
                    <div className="flex items-end justify-between mt-1">
                      <span className="text-4xl font-black tabular-nums">
                        {bodyFat.bodyFatPct.toLocaleString('es-CO', { minimumFractionDigits: 1 })}
                        <span className="text-lg ml-1">%</span>
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border bg-white/15 border-white/25`}
                      >
                        {bodyFat.classification.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-sky-100/90 mt-2">
                      Masa grasa {bodyFat.fatMassKg} kg · Magra {bodyFat.leanMassKg} kg
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'perimetros' && (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                  <h3 className="text-sm font-black text-slate-800">Circunferencias (cm)</h3>
                  <div className="space-y-1.5">
                    {ISAK_NODES.filter((n) => n.tab === 'perimetros').map((n) => (
                      <div
                        key={n.id}
                        className="flex justify-between text-xs border-b border-slate-100 py-1.5"
                      >
                        <span className="text-slate-600 font-medium">{n.label}</span>
                        <strong className="font-mono text-slate-900">
                          {measures[n.id] != null ? `${measures[n.id]} cm` : '—'}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <h4 className="text-xs font-black text-slate-700 pt-2">Índices derivados</h4>
                  <div className="space-y-2">
                    {[
                      { label: 'Cintura/Cadera (WHR)', value: whr.ratio, status: whr.risk_level === 'bajo' ? 'Normal' : 'Riesgo' },
                      { label: 'Cintura/Talla (WHtR)', value: whtr.ratio, status: whtr.status },
                      { label: 'Brazo flex/relajado', value: armRatio.ratio, status: armRatio.status },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3 py-2"
                      >
                        <div>
                          <p className="text-[11px] font-bold text-slate-600">{row.label}</p>
                          <p className="text-sm font-black text-slate-900 font-mono">{row.value || '—'}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${statusBadge(row.status)}`}>
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-sky-700">
                      Interpretación clínica
                    </p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {whr.description}. WHtR {whtr.ratio} indica{' '}
                      {whtr.status === 'Normal'
                        ? 'distribución abdominal dentro de rango preventivo.'
                        : 'carga abdominal elevada; priorizar intervención cardiometabólica.'}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'diametros' && (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                  <h3 className="text-sm font-black text-slate-800">Diámetros óseos (cm)</h3>
                  <div className="space-y-1.5">
                    {ISAK_NODES.filter((n) => n.tab === 'diametros').map((n) => (
                      <div
                        key={n.id}
                        className="flex justify-between text-xs border-b border-slate-100 py-1.5"
                      >
                        <span className="text-slate-600 font-medium">{n.label}</span>
                        <strong className="font-mono text-slate-900">
                          {measures[n.id] != null ? `${measures[n.id]} cm` : '—'}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <h4 className="text-xs font-black text-slate-700 pt-1">Tipo de cuerpo (Heath-Carter)</h4>

                  {/* Somatochart 2D (proyección de componentes endo/meso/ecto) */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Gráfica somática tridimensional (proyección)
                    </p>
                    <svg viewBox="0 0 220 190" className="w-full max-w-[280px] mx-auto h-40">
                      <polygon
                        points="110,18 198,160 22,160"
                        fill="#fff"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                      />
                      <text x="110" y="12" textAnchor="middle" className="fill-slate-500" fontSize="9" fontWeight="700">
                        Meso
                      </text>
                      <text x="12" y="175" textAnchor="start" className="fill-slate-500" fontSize="9" fontWeight="700">
                        Endo
                      </text>
                      <text x="208" y="175" textAnchor="end" className="fill-slate-500" fontSize="9" fontWeight="700">
                        Ecto
                      </text>
                      {/* Posición relativa normalizada 0–7 → triángulo */}
                      {(() => {
                        const e = Math.min(7, somatotype.endomorphy) / 7;
                        const m = Math.min(7, somatotype.mesomorphy) / 7;
                        const c = Math.min(7, somatotype.ectomorphy) / 7;
                        const sum = e + m + c || 1;
                        const x = 110 + ((c - e) / sum) * 88;
                        const y = 160 - (m / sum) * 130;
                        return (
                          <g>
                            <circle cx={x} cy={y} r="7" fill="#f97316" stroke="#fff" strokeWidth="2" />
                            <circle cx={x} cy={y} r="12" fill="none" stroke="#fb923c" strokeWidth="1" opacity="0.5" />
                          </g>
                        );
                      })()}
                    </svg>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { key: 'Ectomorfo', v: somatotype.ectomorphy, path: 'M50 10 L62 90 L38 90 Z' },
                        { key: 'Mesomorfo', v: somatotype.mesomorphy, path: 'M40 12 L60 12 L68 90 L32 90 Z' },
                        { key: 'Endomorfo', v: somatotype.endomorphy, path: 'M42 14 L58 14 L72 88 L28 88 Z' },
                      ] as const
                    ).map((s) => {
                      const active = somatotype.dominant === s.key;
                      return (
                        <div
                          key={s.key}
                          className={`rounded-xl border p-2 text-center ${
                            active
                              ? 'border-orange-300 bg-orange-50'
                              : 'border-slate-100 bg-slate-50'
                          }`}
                        >
                          <svg viewBox="0 0 100 100" className="w-12 h-14 mx-auto">
                            <path
                              d={s.path}
                              fill={active ? '#fdba74' : '#e2e8f0'}
                              stroke={active ? '#f97316' : '#94a3b8'}
                              strokeWidth="2"
                            />
                          </svg>
                          <p className="text-[10px] font-bold text-slate-700">{s.key}</p>
                          <p className="text-xs font-black text-slate-900">{s.v}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#f97316] text-white">
                      {somatotype.dominant}
                    </span>
                    <p className="text-xs text-slate-700 mt-2 leading-relaxed">{somatotype.description}</p>
                    <p className="text-[10px] text-slate-500 mt-2 font-mono">
                      Endo {somatotype.endomorphy} · Meso {somatotype.mesomorphy} · Ecto{' '}
                      {somatotype.ectomorphy}
                    </p>
                  </div>
                </div>
              )}

              {saveOk && (
                <div className={`rounded-xl border px-3 py-2 text-xs font-bold ${toneClass('green')}`}>
                  Evaluación ISAK guardada correctamente
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
};

function round(n: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
