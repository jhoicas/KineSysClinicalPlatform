import React, { useEffect, useState } from 'react';
import { useAuth } from '../app/providers/AuthProvider';
import { SideNavBar } from '../components/layout/SideNavBar';
import { TopNavBar } from '../components/layout/TopNavBar';
import { PatientSearchCombobox } from '../components/common/PatientSearchCombobox';
import { ToastContainer, ToastMessage } from '../components/common/Toast';
import { useAppStore } from '../store/useAppStore';
import { getKinesiologyEvaluations, saveKinesiologyEvaluation } from '../services/dataService';
import {
  KinesiologyEvaluation,
  MobilityAssessment,
  MovementGesture,
  PostureAssessment,
  PostureSeverity,
  StrengthAssessment,
} from '../types';
import {
  MOVEMENT_ALTERATIONS,
  POSTURE_SEVERITIES,
  calcStrengthAsymmetry,
  createEmptyGestures,
  createEmptyMobility,
  createEmptyPosture,
  createEmptyStrength,
  postureFindingsFor,
} from '../data/kinesiologyCatalog';
import { formatDateTime } from '../utils/dateUtils';
import { StrengthDashboard } from '../components/medical/StrengthDashboard';
import { MobilityDashboard } from '../components/medical/MobilityDashboard';
import { HumanBodyVisualizer } from '../components/medical/HumanBodyVisualizer';

interface EvaluacionKinesicaPageProps {
  onNavigate?: (path: string) => void;
}

type EvalTab = 'postura' | 'movilidad' | 'fuerza' | 'control' | 'diagnostico';

const TABS: { id: EvalTab; label: string; icon: string }[] = [
  { id: 'postura', label: 'Postura', icon: 'accessibility_new' },
  { id: 'movilidad', label: 'Movilidad', icon: '360' },
  { id: 'fuerza', label: 'Fuerza', icon: 'fitness_center' },
  { id: 'control', label: 'Control de movimiento', icon: 'directions_run' },
  { id: 'diagnostico', label: 'Diagnóstico y plan', icon: 'clinical_notes' },
];

const inputClass =
  'mt-1 w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed';

function emptyForm() {
  return {
    postura: createEmptyPosture(),
    movilidad: createEmptyMobility(),
    fuerza: createEmptyStrength(),
    gestos_movimiento: createEmptyGestures(),
    diagnostico_kinesico: '',
    plan_tratamiento: '',
    observaciones_generales: '',
  };
}

function mergePosture(raw?: PostureAssessment | null): PostureAssessment {
  const base = createEmptyPosture();
  if (!raw) return base;
  const mergeView = (baseView: PostureAssessment['anterior'], saved?: PostureAssessment['anterior']) => ({
    landmarks: baseView.landmarks.map((lm) => {
      const found = saved?.landmarks?.find((s) => s.landmark === lm.landmark);
      return { ...lm, severity: (found?.severity as PostureSeverity) || '', finding: found?.finding || '' };
    }),
  });
  return {
    anterior: mergeView(base.anterior, raw.anterior),
    lateral: mergeView(base.lateral, raw.lateral),
    posterior: mergeView(base.posterior, raw.posterior),
    concepto: raw.concepto || '',
  };
}

export function EvaluacionKinesicaPage({ onNavigate }: EvaluacionKinesicaPageProps) {
  const { user, tenantId } = useAuth();
  const { activePatient } = useAppStore();

  const [tab, setTab] = useState<EvalTab>('postura');
  const [form, setForm] = useState(emptyForm);
  const [history, setHistory] = useState<KinesiologyEvaluation[]>([]);
  const [currentId, setCurrentId] = useState<string | undefined>();
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const loadHistory = async () => {
    if (!activePatient?.id || !tenantId) {
      setHistory([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await getKinesiologyEvaluations(tenantId, activePatient.id);
      setHistory(rows);
    } catch (err) {
      console.error(err);
      addToast('error', 'Error', 'No se pudo cargar el historial de evaluaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startNewEvaluation();
    void loadHistory();
  }, [activePatient?.id, tenantId]);

  const applyEvaluation = (row: KinesiologyEvaluation, historic: boolean) => {
    setCurrentId(row.id);
    setReadOnly(historic);
    setForm({
      postura: mergePosture(row.postura),
      movilidad: row.movilidad?.length ? row.movilidad : createEmptyMobility(),
      fuerza: row.fuerza?.length ? row.fuerza : createEmptyStrength(),
      gestos_movimiento: row.gestos_movimiento?.length ? row.gestos_movimiento : createEmptyGestures(),
      diagnostico_kinesico: row.diagnostico_kinesico || '',
      plan_tratamiento: row.plan_tratamiento || '',
      observaciones_generales: row.observaciones_generales || '',
    });
  };

  const startNewEvaluation = () => {
    setCurrentId(undefined);
    setReadOnly(false);
    setForm(emptyForm());
    setTab('postura');
  };

  const updatePostureLandmark = (
    view: keyof Pick<PostureAssessment, 'anterior' | 'lateral' | 'posterior'>,
    landmark: string,
    patch: { severity?: PostureSeverity; finding?: string }
  ) => {
    setForm((prev) => ({
      ...prev,
      postura: {
        ...prev.postura,
        [view]: {
          landmarks: prev.postura[view].landmarks.map((lm) =>
            lm.landmark === landmark ? { ...lm, ...patch } : lm
          ),
        },
      },
    }));
  };

  const updateMobility = (index: number, field: keyof MobilityAssessment, value: string) => {
    setForm((prev) => ({
      ...prev,
      movilidad: prev.movilidad.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
  };

  const updateStrength = (index: number, side: 'fuerza_izq_kg' | 'fuerza_der_kg', value: string) => {
    const parsed = value === '' ? null : Number(value);
    setForm((prev) => ({
      ...prev,
      fuerza: prev.fuerza.map((row, i) => {
        if (i !== index) return row;
        const next: StrengthAssessment = { ...row, [side]: Number.isFinite(parsed as number) ? parsed : null };
        next.asimetria_porcentaje = calcStrengthAsymmetry(next.fuerza_izq_kg, next.fuerza_der_kg);
        return next;
      }),
    }));
  };

  const toggleAlteration = (gestoIndex: number, alteration: string) => {
    setForm((prev) => ({
      ...prev,
      gestos_movimiento: prev.gestos_movimiento.map((g, i) => {
        if (i !== gestoIndex) return g;
        const has = g.alteraciones.includes(alteration);
        return {
          ...g,
          alteraciones: has ? g.alteraciones.filter((a) => a !== alteration) : [...g.alteraciones, alteration],
        } satisfies MovementGesture;
      }),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!activePatient?.id || !tenantId || !user?.id) {
      addToast('error', 'No se puede guardar', 'Falta paciente activo o sesión de profesional.');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveKinesiologyEvaluation({
        id: currentId,
        tenant_id: tenantId,
        patient_id: activePatient.id,
        professional_id: user.id,
        postura: form.postura,
        movilidad: form.movilidad,
        fuerza: form.fuerza,
        gestos_movimiento: form.gestos_movimiento,
        diagnostico_kinesico: form.diagnostico_kinesico,
        plan_tratamiento: form.plan_tratamiento,
        observaciones_generales: form.observaciones_generales,
      });
      setCurrentId(saved.id);
      addToast('success', 'Evaluación guardada', 'La valoración kinésica quedó registrada en la bitácora.');
      await loadHistory();
    } catch (err) {
      console.error(err);
      addToast('error', 'Error al guardar', 'No se pudo persistir la evaluación kinésica.');
    } finally {
      setSaving(false);
    }
  };

  const postureSelectClass =
    'w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-2 py-1.5 text-[11px] font-semibold disabled:opacity-70 disabled:cursor-not-allowed';

  const renderPostureView = (
    title: string,
    view: 'anterior' | 'lateral' | 'posterior'
  ) => (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-3 clinical-shadow">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-outline-variant/15">
        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
        <h4 className="text-[11px] font-black uppercase tracking-wider text-on-surface">{title}</h4>
      </div>
      <div className="flex flex-col gap-2">
        {form.postura[view].landmarks.map((lm) => {
          const findings = postureFindingsFor(view, lm.landmark);
          return (
            <div
              key={lm.landmark}
              className="rounded-xl bg-surface-container-low/80 border border-outline-variant/15 px-2.5 py-2 space-y-1.5"
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                {lm.landmark}
              </span>
              <div className="flex flex-col gap-1.5">
                {findings.length > 0 && (
                  <select
                    disabled={readOnly}
                    className={postureSelectClass}
                    value={lm.finding || ''}
                    onChange={(e) => updatePostureLandmark(view, lm.landmark, { finding: e.target.value })}
                  >
                    <option value="">Hallazgo —</option>
                    {findings.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  disabled={readOnly}
                  className={postureSelectClass}
                  value={lm.severity}
                  onChange={(e) =>
                    updatePostureLandmark(view, lm.landmark, { severity: e.target.value as PostureSeverity })
                  }
                >
                  {POSTURE_SEVERITIES.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>
                      {opt.label === '—' ? 'Severidad —' : opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background font-sans text-on-background overflow-hidden">
      <SideNavBar currentPath="/evaluacion-kinesica" onNavigate={onNavigate} />

      <main className="flex-1 ml-0 md:ml-72 flex flex-col h-screen overflow-hidden">
        <TopNavBar currentPath="/evaluacion-kinesica" onNavigate={onNavigate} />

        <div className="flex-1 overflow-y-auto pt-[80px] pb-12 px-6 md:px-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary/10 text-primary material-symbols-outlined text-2xl">
                  physical_therapy
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight">
                  Evaluación Kinésica Integral
                </h2>
              </div>
              <p className="text-sm text-on-surface-variant mt-1">
                Postura, movilidad, fuerza, control de movimiento y plan de tratamiento.
              </p>
            </div>
            {activePatient && (
              <button
                type="button"
                onClick={startNewEvaluation}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary text-on-primary px-4 py-2.5 text-sm font-bold"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Nueva Evaluación
              </button>
            )}
          </div>

          {!activePatient ? (
            <div className="max-w-4xl mx-auto my-6 animate-fadeIn">
              <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-8 md:p-12 text-center clinical-shadow">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-4xl">physical_therapy</span>
                </div>
                <h3 className="text-2xl font-black text-on-surface tracking-tight">
                  Selecciona un Paciente para iniciar la Evaluación Kinésica
                </h3>
                <p className="text-sm text-on-surface-variant max-w-lg mx-auto mt-2 mb-8 leading-relaxed">
                  Carga el expediente para registrar postura, movilidad articular, fuerza con asimetrías y
                  comparar el progreso en la bitácora.
                </p>
                <div className="max-w-xl mx-auto">
                  <PatientSearchCombobox
                    variant="large"
                    autoFocus={true}
                    placeholder="Buscar paciente por nombre, RUT/DNI o email..."
                    onSelectPatient={(patient) => {
                      addToast('success', 'Paciente Activo', `Sesión iniciada con ${patient.full_name}`);
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 animate-fadeIn">
              <form onSubmit={handleSave} className="space-y-4 min-w-0">
                {readOnly && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-on-surface">
                    Vista de solo lectura de una evaluación histórica. Usa <strong>Nueva Evaluación</strong> para
                    registrar el estado actual.
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {TABS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-bold border ${
                        tab === item.id
                          ? 'bg-primary text-on-primary border-primary'
                          : 'bg-surface-container-lowest text-on-surface border-outline-variant/30'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>

                {tab === 'postura' && (
                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
                    <div className="xl:col-span-1">
                      {renderPostureView('VISTA ANTERIOR', 'anterior')}
                    </div>

                    <div className="xl:col-span-2 space-y-4">
                      <div className="flex justify-center bg-surface-container-lowest rounded-3xl p-4 border border-outline-variant/30">
                        <HumanBodyVisualizer data={form.postura} />
                      </div>
                      <label className="block bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-4">
                        <span className="text-xs font-bold text-on-surface-variant">
                          Observación fisioterapéutica / Concepto postural
                        </span>
                        <textarea
                          disabled={readOnly}
                          rows={3}
                          className={inputClass}
                          value={form.postura.concepto || ''}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              postura: { ...prev.postura, concepto: e.target.value },
                            }))
                          }
                          placeholder="Síntesis de hallazgos posturales..."
                        />
                      </label>
                    </div>

                    <div className="xl:col-span-1 flex flex-col gap-6">
                      {renderPostureView('VISTA LATERAL', 'lateral')}
                      {renderPostureView('VISTA POSTERIOR', 'posterior')}
                    </div>
                  </div>
                )}

                {/* ── Movilidad: form + dashboard ── */}
                {tab === 'movilidad' && (
                  <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
                    <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 md:p-8 clinical-shadow">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-[11px] uppercase tracking-wider text-on-surface-variant">
                              <th className="pb-3">Segmento</th>
                              <th className="pb-3">Limitación izquierda</th>
                              <th className="pb-3">Limitación derecha</th>
                            </tr>
                          </thead>
                          <tbody>
                            {form.movilidad.map((row, index) => (
                              <tr key={row.estructura} className="border-t border-outline-variant/20">
                                <td className="py-3 font-semibold">{row.estructura}</td>
                                <td className="py-3 pr-2">
                                  <input
                                    disabled={readOnly}
                                    className={inputClass}
                                    value={row.limitacion_izq}
                                    onChange={(e) => updateMobility(index, 'limitacion_izq', e.target.value)}
                                    placeholder="Ej. −20° FLX"
                                  />
                                </td>
                                <td className="py-3">
                                  <input
                                    disabled={readOnly}
                                    className={inputClass}
                                    value={row.limitacion_der}
                                    onChange={(e) => updateMobility(index, 'limitacion_der', e.target.value)}
                                    placeholder="Ej. Completa"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                    <MobilityDashboard data={form.movilidad} />
                  </div>
                )}

                {/* ── Fuerza: form + dashboard ── */}
                {tab === 'fuerza' && (
                  <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
                    <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 md:p-8 clinical-shadow">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-[11px] uppercase tracking-wider text-on-surface-variant">
                              <th className="pb-3">Estructura</th>
                              <th className="pb-3">Izq (kg)</th>
                              <th className="pb-3">Der (kg)</th>
                              <th className="pb-3">Asimetría %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {form.fuerza.map((row, index) => (
                              <tr key={row.estructura} className="border-t border-outline-variant/20">
                                <td className="py-3 font-semibold">{row.estructura}</td>
                                <td className="py-3 pr-2">
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.1}
                                    disabled={readOnly}
                                    className={inputClass}
                                    value={row.fuerza_izq_kg ?? ''}
                                    onChange={(e) => updateStrength(index, 'fuerza_izq_kg', e.target.value)}
                                  />
                                </td>
                                <td className="py-3 pr-2">
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.1}
                                    disabled={readOnly}
                                    className={inputClass}
                                    value={row.fuerza_der_kg ?? ''}
                                    onChange={(e) => updateStrength(index, 'fuerza_der_kg', e.target.value)}
                                  />
                                </td>
                                <td className="py-3">
                                  <span
                                    className={`inline-flex min-w-[3.5rem] justify-center rounded-xl px-2 py-2 text-xs font-black ${
                                      (row.asimetria_porcentaje ?? 0) >= 15
                                        ? 'bg-error/10 text-error'
                                        : 'bg-surface-container-low text-on-surface'
                                    }`}
                                  >
                                    {row.asimetria_porcentaje == null ? '—' : `${row.asimetria_porcentaje}%`}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="text-[11px] text-on-surface-variant mt-3">
                          Asimetría = |Izq − Der| / mayor valor × 100. Se destaca si es ≥ 15%.
                        </p>
                      </div>
                    </section>
                    <StrengthDashboard data={form.fuerza} />
                  </div>
                )}

                <section className={`bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 md:p-8 clinical-shadow space-y-5 ${(tab === 'postura' || tab === 'movilidad' || tab === 'fuerza') ? 'hidden' : ''}`}>

                  {tab === 'control' && (
                    <div className="space-y-4">
                      {form.gestos_movimiento.map((g, index) => (
                        <div
                          key={g.gesto}
                          className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4"
                        >
                          <h4 className="text-sm font-extrabold mb-3">{g.gesto}</h4>
                          <div className="flex flex-wrap gap-2">
                            {MOVEMENT_ALTERATIONS.map((alt) => {
                              const checked = g.alteraciones.includes(alt);
                              return (
                                <label
                                  key={alt}
                                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                                    checked
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-outline-variant/30 text-on-surface-variant'
                                  } ${readOnly ? 'pointer-events-none opacity-80' : 'cursor-pointer'}`}
                                >
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    disabled={readOnly}
                                    checked={checked}
                                    onChange={() => toggleAlteration(index, alt)}
                                  />
                                  {alt}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === 'diagnostico' && (
                    <div className="space-y-4">
                      <label className="block">
                        <span className="text-xs font-bold text-on-surface-variant">Diagnóstico kinésico</span>
                        <textarea
                          disabled={readOnly}
                          rows={4}
                          className={inputClass}
                          value={form.diagnostico_kinesico}
                          onChange={(e) => setForm((prev) => ({ ...prev, diagnostico_kinesico: e.target.value }))}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold text-on-surface-variant">Plan de tratamiento</span>
                        <textarea
                          disabled={readOnly}
                          rows={4}
                          className={inputClass}
                          value={form.plan_tratamiento}
                          onChange={(e) => setForm((prev) => ({ ...prev, plan_tratamiento: e.target.value }))}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold text-on-surface-variant">Recomendaciones / observaciones</span>
                        <textarea
                          disabled={readOnly}
                          rows={4}
                          className={inputClass}
                          value={form.observaciones_generales}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, observaciones_generales: e.target.value }))
                          }
                        />
                      </label>
                    </div>
                  )}
                </section>

                {!readOnly && (
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-2xl bg-primary text-on-primary px-6 py-3 text-sm font-bold disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-lg">{saving ? 'sync' : 'save'}</span>
                      {saving ? 'Guardando...' : 'Guardar evaluación'}
                    </button>
                  </div>
                )}
              </form>

              <aside className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-5 clinical-shadow h-fit xl:sticky xl:top-24">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary">history</span>
                  <h3 className="text-sm font-extrabold">Bitácora histórica</h3>
                </div>
                {loading ? (
                  <p className="text-xs text-on-surface-variant flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-primary text-sm">sync</span>
                    Cargando...
                  </p>
                ) : history.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">Aún no hay evaluaciones registradas.</p>
                ) : (
                  <ul className="space-y-2">
                    {history.map((item) => {
                      const active = currentId === item.id;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => applyEvaluation(item, true)}
                            className={`w-full text-left rounded-2xl border px-3 py-2.5 ${
                              active
                                ? 'border-primary bg-primary/10'
                                : 'border-outline-variant/20 hover:bg-surface-container-low'
                            }`}
                          >
                            <p className="text-xs font-bold text-on-surface">{formatDateTime(item.created_at)}</p>
                            <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                              {item.diagnostico_kinesico || 'Sin diagnóstico registrado'}
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </aside>
            </div>
          )}
        </div>
      </main>

      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
