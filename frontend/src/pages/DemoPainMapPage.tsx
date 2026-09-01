import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../app/providers/AuthProvider';
import { useI18n } from '../app/providers/I18nProvider';
import { supabase } from '../services/supabaseClient';
import { SideNavBar } from '../components/layout/SideNavBar';
import { TopNavBar } from '../components/layout/TopNavBar';
import { PatientSearchCombobox } from '../components/common/PatientSearchCombobox';
import { ToastContainer, ToastMessage } from '../components/common/Toast';
import { formatDateTime } from '../utils/dateUtils';
import { PainObservation, PacienteClinico } from '../types';
import { PainCanvas } from '../components/pain-map/PainCanvas';
import { useAppStore, ActivePatient } from '../store/useAppStore';

interface DemoPainMapPageProps {
  onNavigate?: (path: string) => void;
}

export function DemoPainMapPage({ onNavigate }: DemoPainMapPageProps) {
  const { user, tenantId } = useAuth();
  const { t } = useI18n();
  const { activePatient, setActivePatient, clearActivePatient } = useAppStore();

  // Data states from Supabase
  const [painObservations, setPainObservations] = useState<PainObservation[]>([]);
  const [availablePatients, setAvailablePatients] = useState<PacienteClinico[]>([]);
  const [loadingObservations, setLoadingObservations] = useState<boolean>(false);
  const [loadingPatients, setLoadingPatients] = useState<boolean>(false);

  // Form State
  const [bodySide, setBodySide] = useState<'front' | 'back'>('front');
  const [coordinates, setCoordinates] = useState<{ x: number; y: number }>({ x: 50, y: 48 });
  const [bodyRegion, setBodyRegion] = useState<string>('Zona Lumbar');
  const [painLevel, setPainLevel] = useState<number>(6);
  const [painType, setPainType] = useState<string>('punzante');
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['En reposo']);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Historical Session Filter / Inspection State
  const [selectedSessionDate, setSelectedSessionDate] = useState<string>('all');
  const [activeObservationId, setActiveObservationId] = useState<string | null>(null);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Load available patients if no patient is active
  useEffect(() => {
    if (!activePatient) {
      loadAvailablePatients();
    }
  }, [activePatient, tenantId]);

  const loadAvailablePatients = async () => {
    setLoadingPatients(true);
    try {
      const { data, error } = await supabase
        .from('pacientes_clinicos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) {
        console.warn('Error loading pacientes_clinicos, fallback to users:', error);
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'patient')
          .limit(8);

        if (usersData) {
          const mapped: PacienteClinico[] = usersData.map((u: Record<string, unknown>) => ({
            id: String(u.id),
            tenant_id: String(u.tenant_id || tenantId || ''),
            identifier_type: 'CC' as const,
            identifier_number: String(u.rut_or_dni || '12345678'),
            first_name: String((u.full_name as string)?.split(' ')[0] || 'Paciente'),
            last_name: String((u.full_name as string)?.split(' ').slice(1).join(' ') || 'Clínico'),
            gender: (u.gender as PacienteClinico['gender']) || 'unknown',
            birth_date: String(u.birth_date || '1990-01-01'),
            telecom_phone: String(u.phone || ''),
            telecom_email: String(u.email || ''),
            known_allergies: (u.allergies as string[]) || [],
            chronic_conditions: (u.medical_conditions as string[]) || [],
            active: true,
            created_at: String(u.created_at || new Date().toISOString()),
          }));
          setAvailablePatients(mapped);
        }
      } else if (data) {
        setAvailablePatients(data);
      }
    } catch (e) {
      console.error('Error fetching available patients:', e);
    } finally {
      setLoadingPatients(false);
    }
  };

  // Fetch observations when active patient changes
  useEffect(() => {
    if (activePatient?.id) {
      fetchObservationsForPatient(activePatient.id);
    } else {
      setPainObservations([]);
      setSelectedSessionDate('all');
      setActiveObservationId(null);
    }
  }, [activePatient?.id]);

  const fetchObservationsForPatient = async (patientId: string) => {
    setLoadingObservations(true);
    try {
      const { data, error } = await supabase
        .from('pain_observations')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPainObservations(data || []);
    } catch (err) {
      console.error('Error fetching pain observations:', err);
      addToast('error', t('common.error', 'Error de consulta'), 'No se pudo obtener el historial de dolor.');
    } finally {
      setLoadingObservations(false);
    }
  };

  // Save Pain Map Evaluation to Supabase
  const savePainMapEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient || !user) {
      addToast(
        'error',
        t('common.error', 'Faltan datos'),
        t('painmap.active_patient', 'Debes seleccionar un paciente primero.')
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<PainObservation> = {
        tenant_id: tenantId || 'tenant_kine_001',
        patient_id: activePatient.id,
        professional_id: user.id,
        pain_level: Number(painLevel),
        pain_type: painType as any,
        body_region: bodyRegion,
        body_side: bodySide,
        coordinates_x: Math.round(coordinates.x),
        coordinates_y: Math.round(coordinates.y),
        clinical_notes: clinicalNotes || 'Evaluación en mapa anatómico 2D.',
        tags: selectedTags,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('pain_observations')
        .insert(payload);

      if (error) throw error;

      addToast(
        'success',
        t('common.success', 'Observación Guardada'),
        `${bodyRegion} (EVA ${painLevel}/10) registrada en el expediente de ${activePatient.full_name}.`
      );

      setClinicalNotes('');
      if (activePatient.id) {
        await fetchObservationsForPatient(activePatient.id);
      }
    } catch (err: any) {
      console.error('Error saving pain observation:', err);
      addToast('error', t('common.error', 'Error al guardar'), err?.message || 'No se pudo registrar la evaluación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete observation
  const handleDeleteObservation = async (obsId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Deseas eliminar este punto de dolor registrado?')) return;

    try {
      const { error } = await supabase.from('pain_observations').delete().eq('id', obsId);
      if (error) throw error;

      setPainObservations((prev) => prev.filter((o) => o.id !== obsId));
      if (activeObservationId === obsId) {
        setActiveObservationId(null);
      }
      addToast('info', 'Punto Eliminado', 'Se removió la observación del registro.');
    } catch (err: any) {
      console.error('Error deleting observation:', err);
      addToast('error', 'Error', 'No se pudo eliminar el registro.');
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const getPainColor = (lvl: number) => {
    if (lvl <= 3) return 'bg-emerald-500 text-white';
    if (lvl <= 6) return 'bg-amber-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getPainTextTone = (lvl: number) => {
    if (lvl <= 3) return 'text-emerald-600';
    if (lvl <= 6) return 'text-amber-600';
    return 'text-red-600';
  };

  const painTypes = [
    { id: 'punzante', label: t('painmap.type_stabbing', 'Punzante'), icon: 'bolt' },
    { id: 'urente', label: t('painmap.type_burning', 'Urente (Ardor)'), icon: 'local_fire_department' },
    { id: 'sordo', label: t('painmap.type_dull', 'Sordo / Constante'), icon: 'radio_button_checked' },
    { id: 'opresivo', label: t('painmap.type_tight', 'Opresivo'), icon: 'compress' },
    { id: 'irradiado', label: t('painmap.type_radiating', 'Irradiado'), icon: 'alt_route' },
    { id: 'pulsatil', label: t('painmap.type_throbbing', 'Pulsátil'), icon: 'favorite' },
  ];

  const commonTags = [
    { id: 'En reposo', label: t('painmap.factor_rest', 'En reposo') },
    { id: 'Con carga', label: t('painmap.factor_load', 'Con carga') },
    { id: 'Matutino', label: t('painmap.factor_morning', 'Matutino') },
    { id: 'Nocturno', label: t('painmap.factor_night', 'Nocturno') },
    { id: 'Al estiramiento', label: t('painmap.factor_stretch', 'Al estiramiento') },
    { id: 'Post-ejercicio', label: t('painmap.factor_post_exercise', 'Post-ejercicio') },
  ];

  // Distinct session dates for historical timeline filter
  const sessionDates = useMemo(() => {
    const datesSet = new Set<string>();
    painObservations.forEach((obs) => {
      if (obs.created_at) {
        const d = obs.created_at.split('T')[0];
        datesSet.add(d);
      }
    });
    return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  }, [painObservations]);

  // Filtered observations based on session date filter
  const filteredObservations = useMemo(() => {
    if (selectedSessionDate === 'all') return painObservations;
    return painObservations.filter((obs) => obs.created_at?.startsWith(selectedSessionDate));
  }, [painObservations, selectedSessionDate]);

  // Calculate clinical evolution metrics (first vs latest)
  const evolutionMetrics = useMemo(() => {
    if (painObservations.length < 2) return null;
    const sorted = [...painObservations].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const initial = sorted[0];
    const latest = sorted[sorted.length - 1];
    const delta = latest.pain_level - initial.pain_level;
    const pct = initial.pain_level > 0 ? Math.round((delta / initial.pain_level) * 100) : 0;

    return {
      initialLevel: initial.pain_level,
      latestLevel: latest.pain_level,
      delta,
      pct,
      isImprovement: delta <= 0,
    };
  }, [painObservations]);

  // Quick select patient card handler
  const handleQuickSelectPatient = (patient: PacienteClinico) => {
    const active: ActivePatient = {
      id: patient.id,
      full_name: `${patient.first_name} ${patient.last_name}`,
      email: patient.telecom_email,
      phone: patient.telecom_phone,
      rut_or_dni: patient.identifier_number,
      birth_date: patient.birth_date,
      gender: patient.gender,
      medical_conditions: patient.chronic_conditions,
      allergies: patient.known_allergies,
      tenant_id: patient.tenant_id,
    };
    setActivePatient(active);
    addToast('success', t('patient.active_session', 'Paciente Activo'), `${active.full_name} seleccionado.`);
  };

  return (
    <div className="min-h-screen flex bg-background font-sans text-on-background overflow-hidden">
      <SideNavBar currentPath="/mapa-dolor" onNavigate={onNavigate} />

      <main className="flex-1 ml-0 md:ml-72 flex flex-col h-screen overflow-hidden">
        <TopNavBar currentPath="/mapa-dolor" onNavigate={onNavigate} />

        {/* Workspace Container */}
        <div className="flex-1 overflow-y-auto pt-[80px] pb-12 px-6 md:px-10">
          {/* Header Banner */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary/10 text-primary material-symbols-outlined text-2xl">
                  accessibility_new
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight">
                  {t('painmap.title', 'Mapa Anatómico 2D de Dolor & Fisioterapia')}
                </h2>
              </div>
              <p className="text-sm text-on-surface-variant mt-1">
                {t(
                  'painmap.subtitle',
                  'Mapeo segmentario interactivo con persistencia directa en Supabase y seguimiento evolutivo.'
                )}
              </p>
            </div>

            {/* Patient Context / Search */}
            {activePatient && (
              <div className="w-full lg:w-auto flex items-center gap-3">
                <PatientSearchCombobox
                  variant="standard"
                  showActiveBadge={true}
                  onSelectPatient={(p) => {
                    addToast(
                      'info',
                      t('patient.active_session', 'Paciente Activo'),
                      `${p.full_name} seleccionado.`
                    );
                  }}
                />
                <button
                  type="button"
                  onClick={() => clearActivePatient()}
                  className="p-2 rounded-2xl bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-error border border-outline-variant/30 transition-all cursor-pointer"
                  title="Cambiar paciente"
                >
                  <span className="material-symbols-outlined text-lg">person_cancel</span>
                </button>
              </div>
            )}
          </div>

          {/* EMPTY STATE: NO ACTIVE PATIENT */}
          {!activePatient ? (
            <div className="max-w-4xl mx-auto my-6 space-y-8 animate-fadeIn">
              <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-8 md:p-12 text-center clinical-shadow">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-4xl">accessibility_new</span>
                </div>

                <h3 className="text-2xl font-black text-on-surface tracking-tight">
                  Selecciona un Paciente para iniciar la Evaluación Kinésica
                </h3>

                <p className="text-sm text-on-surface-variant max-w-lg mx-auto mt-2 mb-8 leading-relaxed">
                  Utiliza el buscador predictivo para cargar el historial de mapas anatómicos, registrar puntos de
                  dolor (EVA 1-10) y analizar la evolución temporal en base de datos.
                </p>

                {/* Large Predictive Search Combobox */}
                <div className="max-w-xl mx-auto">
                  <PatientSearchCombobox
                    variant="large"
                    autoFocus={true}
                    placeholder="Buscar paciente por nombre, RUT/DNI o email..."
                    onSelectPatient={(patient) => {
                      addToast(
                        'success',
                        t('patient.active_session', 'Paciente Activo'),
                        `Sesión iniciada con ${patient.full_name}`
                      );
                    }}
                  />
                </div>
              </div>

              {/* Quick Patient Selection Cards */}
              <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 clinical-shadow space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">group</span>
                    <h4 className="text-sm font-extrabold text-on-surface">Pacientes Registrados en Clínica</h4>
                  </div>
                  <span className="text-xs text-on-surface-variant">Selección rápida</span>
                </div>

                {loadingPatients ? (
                  <div className="py-8 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                    <span>Cargando pacientes desde Supabase...</span>
                  </div>
                ) : availablePatients.length === 0 ? (
                  <div className="p-6 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-2xl">
                    No hay pacientes disponibles. Utiliza el buscador para encontrar un registro.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {availablePatients.map((pat) => (
                      <div
                        key={pat.id}
                        onClick={() => handleQuickSelectPatient(pat)}
                        className="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 hover:border-primary/50 transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:text-white text-primary flex items-center justify-center font-black text-xs transition-colors">
                            {pat.first_name[0]}
                            {pat.last_name[0]}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                              {pat.first_name} {pat.last_name}
                            </p>
                            <p className="text-[10px] text-on-surface-variant truncate">
                              ID: {pat.identifier_number}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[10px] text-on-surface-variant font-medium">
                          <span>{pat.gender === 'male' ? 'Masc.' : pat.gender === 'female' ? 'Fem.' : 'N/A'}</span>
                          <span className="text-primary font-bold flex items-center gap-0.5">
                            Evaluar <span className="material-symbols-outlined text-xs">arrow_forward</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Main Grid: Left Canvas + Right Clinical Form & History */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">
              {/* LEFT COLUMN: Interactive Body Canvas & Controls (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col items-center">
                <PainCanvas
                  bodySide={bodySide}
                  onChangeBodySide={(side) => setBodySide(side)}
                  coordinates={coordinates}
                  bodyRegion={bodyRegion}
                  painLevel={painLevel}
                  existingObservations={filteredObservations}
                  onSelectLocation={({
                    coordinates: nextCoords,
                    bodyRegion: nextRegion,
                    bodySide: nextSide,
                  }) => {
                    setCoordinates(nextCoords);
                    setBodyRegion(nextRegion);
                    setBodySide(nextSide);
                    setActiveObservationId(null);
                  }}
                  onSelectObservation={(obs) => {
                    setCoordinates({ x: obs.coordinates_x, y: obs.coordinates_y });
                    setBodyRegion(obs.body_region);
                    setBodySide(obs.body_side);
                    setPainLevel(obs.pain_level);
                    if (obs.pain_type) setPainType(obs.pain_type);
                    if (obs.clinical_notes) setClinicalNotes(obs.clinical_notes);
                    if (obs.tags) setSelectedTags(obs.tags);
                    setActiveObservationId(obs.id);
                  }}
                />
              </div>

              {/* RIGHT COLUMN: Clinical Pain Registration Form & Evolution History (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Evolution Metric Banner (If >=2 observations) */}
                {evolutionMetrics && (
                  <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-5 clinical-shadow flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xs ${
                          evolutionMetrics.isImprovement ? 'bg-emerald-600' : 'bg-amber-600'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">
                          {evolutionMetrics.isImprovement ? 'trending_down' : 'trending_up'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black uppercase tracking-wider text-on-surface">
                            Evolución Kinésica del Dolor
                          </h4>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              evolutionMetrics.isImprovement
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {evolutionMetrics.isImprovement ? 'Mejoría Clínica' : 'Atención / Alza'}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          EVA Inicial: <span className="font-bold text-on-surface">{evolutionMetrics.initialLevel}/10</span> ➔
                          EVA Actual: <span className="font-bold text-primary">{evolutionMetrics.latestLevel}/10</span>
                          {' '}({evolutionMetrics.delta > 0 ? `+${evolutionMetrics.delta}` : evolutionMetrics.delta} pts / {evolutionMetrics.pct}%)
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-on-surface-variant font-bold">
                        {painObservations.length} puntos evaluados
                      </span>
                    </div>
                  </div>
                )}

                {/* Form Card */}
                <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 clinical-shadow p-6">
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-outline-variant/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl">edit_note</span>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-on-surface">
                          {t('painmap.clinical_notes', 'Registro de Observación Kinésica')}
                        </h3>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          Paciente:{' '}
                          <span className="font-bold text-primary">{activePatient.full_name}</span>
                          {activePatient.rut_or_dni && (
                            <span className="ml-1 text-[11px] font-semibold text-on-surface-variant">
                              ({activePatient.rut_or_dni})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-surface-container-high text-on-surface flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                      {bodySide === 'front'
                        ? t('painmap.view_front', 'Vista Anterior')
                        : t('painmap.view_back', 'Vista Posterior')}
                    </span>
                  </div>

                  <form onSubmit={savePainMapEvaluation} className="space-y-5">
                    {/* Region & Orientation */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                          {t('painmap.selected_region', 'Zona Anatómica Seleccionada')}
                        </label>
                        <input
                          type="text"
                          value={bodyRegion}
                          onChange={(e) => setBodyRegion(e.target.value)}
                          className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-sm font-bold text-primary outline-none focus:border-primary"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                          {t('painmap.orientation', 'Orientación Corporal')}
                        </label>
                        <select
                          value={bodySide}
                          onChange={(e) => setBodySide(e.target.value as 'front' | 'back')}
                          className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-sm font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
                        >
                          <option value="front">{t('painmap.view_front', 'Vista Anterior (Frontal)')}</option>
                          <option value="back">{t('painmap.view_back', 'Vista Posterior (Dorsal)')}</option>
                        </select>
                      </div>
                    </div>

                    {/* EVA Pain Scale (1 to 10) Slider & Buttons */}
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase text-on-surface tracking-wider">
                          {t('painmap.eva_scale', 'Escala Visual Analógica (EVA 1 - 10)')}
                        </label>
                        <span className={`text-base font-black ${getPainTextTone(painLevel)}`}>
                          {t('painmap.level', 'Nivel')} {painLevel} / 10
                        </span>
                      </div>

                      {/* Numeric Buttons */}
                      <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                          const isSelected = painLevel === num;
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setPainLevel(num)}
                              className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                isSelected
                                  ? `${getPainColor(num)} scale-105 shadow-md`
                                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high border border-outline-variant/20'
                              }`}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>

                      {/* Interactive Slider */}
                      <input
                        id="input-pain-slider"
                        type="range"
                        min="1"
                        max="10"
                        value={painLevel}
                        onChange={(e) => setPainLevel(Number(e.target.value))}
                        className="w-full h-2 bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 rounded-lg appearance-none cursor-pointer accent-primary"
                      />

                      <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase">
                        <span>{t('painmap.mild', '1: Leve')}</span>
                        <span>{t('painmap.moderate', '5: Moderado')}</span>
                        <span>{t('painmap.severe', '10: Intolerable')}</span>
                      </div>
                    </div>

                    {/* Pain Type Selection */}
                    <div>
                      <label className="block text-xs font-black uppercase text-on-surface-variant mb-2">
                        {t('painmap.pain_type', 'Carácter / Tipo de Dolor')}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {painTypes.map((type) => {
                          const isSelected = painType === type.id;
                          return (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => setPainType(type.id)}
                              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-primary text-white border-primary shadow-xs'
                                  : 'bg-surface-container-low border-outline-variant/30 text-on-surface hover:border-primary/40'
                              }`}
                            >
                              <span className="material-symbols-outlined text-base">{type.icon}</span>
                              <span className="truncate">{type.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Aggravating Factors / Tags */}
                    <div>
                      <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                        {t('painmap.aggravating_factors', 'Factores Agravantes / Gatillantes')}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {commonTags.map((tag) => {
                          const isSelected = selectedTags.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleTag(tag.id)}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-primary/20 text-primary border border-primary/40'
                                  : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container-high'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '}
                              {tag.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Clinical Notes Textarea */}
                    <div>
                      <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                        {t('painmap.clinical_notes', 'Notas Clínicas & Hallazgos')}
                      </label>
                      <textarea
                        id="textarea-clinical-notes"
                        rows={3}
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                        placeholder={t('painmap.notes_placeholder', 'Ej: Dolor punzante a la palpación profunda, test de Neer positivo...')}
                        className="w-full bg-surface-container-low border border-outline-variant/40 rounded-2xl p-3.5 text-xs font-medium text-on-surface outline-none focus:border-primary transition-all resize-none"
                      ></textarea>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        id="btn-submit-pain-observation"
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-primary hover:bg-primary-container text-white font-extrabold text-sm py-3.5 px-6 rounded-2xl transition-all shadow-md shadow-primary/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                            <span>{t('painmap.saving', 'Guardando en Supabase...')}</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-lg">save</span>
                            <span>{t('painmap.save_observation', 'Guardar Registro en Supabase')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Historical Observations & Session Timeline */}
                <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 clinical-shadow p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-lg">history</span>
                      <h4 className="font-extrabold text-sm text-on-surface">
                        {t('painmap.history_title', 'Historial de Evaluaciones Kinésicas')} ({painObservations.length})
                      </h4>
                    </div>

                    {/* Session Timeline Filter */}
                    {sessionDates.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-on-surface-variant">Sesión:</span>
                        <select
                          value={selectedSessionDate}
                          onChange={(e) => setSelectedSessionDate(e.target.value)}
                          className="bg-surface-container-low border border-outline-variant/40 rounded-xl px-2.5 py-1 text-xs font-bold text-on-surface outline-none cursor-pointer"
                        >
                          <option value="all">Todas las fechas ({painObservations.length})</option>
                          {sessionDates.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {loadingObservations ? (
                    <div className="py-8 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                      <p>{t('common.loading', 'Cargando evaluaciones...')}</p>
                    </div>
                  ) : filteredObservations.length === 0 ? (
                    <div className="p-6 text-center bg-surface-container-low rounded-2xl text-xs text-on-surface-variant">
                      {t('painmap.no_observations', 'No hay observaciones de dolor registradas para este filtro.')}
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {filteredObservations.map((obs) => {
                        const isHighlighted = activeObservationId === obs.id;
                        return (
                          <div
                            key={obs.id}
                            onClick={() => {
                              setCoordinates({ x: obs.coordinates_x, y: obs.coordinates_y });
                              setBodyRegion(obs.body_region);
                              setBodySide(obs.body_side);
                              setPainLevel(obs.pain_level);
                              if (obs.pain_type) setPainType(obs.pain_type);
                              if (obs.clinical_notes) setClinicalNotes(obs.clinical_notes);
                              if (obs.tags) setSelectedTags(obs.tags);
                              setActiveObservationId(obs.id);
                            }}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                              isHighlighted
                                ? 'bg-primary/10 border-primary shadow-xs'
                                : 'bg-surface-container-low border-outline-variant/20 hover:bg-surface-container-high'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${getPainColor(
                                  obs.pain_level
                                )}`}
                              >
                                {obs.pain_level}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-on-surface">{obs.body_region}</p>
                                  {obs.pain_type && (
                                    <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                                      {obs.pain_type}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">
                                  {obs.clinical_notes || t('history.no_records', 'Sin notas')}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <span className="text-[10px] uppercase font-bold bg-surface-container-high px-2 py-0.5 rounded-md text-on-surface-variant">
                                  {obs.body_side === 'front'
                                    ? t('painmap.view_front', 'Frontal')
                                    : t('painmap.view_back', 'Dorsal')}
                                </span>
                                <p className="text-[10px] text-outline mt-0.5">{formatDateTime(obs.created_at)}</p>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => handleDeleteObservation(obs.id, e)}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                                title="Eliminar observación"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
