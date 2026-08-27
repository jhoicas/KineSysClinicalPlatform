import React, { useState, useEffect } from 'react';
import { useAuth } from '../app/providers/AuthProvider';
import { useI18n } from '../app/providers/I18nProvider';
import { supabase } from '../services/supabaseClient';
import { SideNavBar } from '../components/layout/SideNavBar';
import { TopNavBar } from '../components/layout/TopNavBar';
import { PatientSearchCombobox } from '../components/common/PatientSearchCombobox';
import { ToastContainer, ToastMessage } from '../components/common/Toast';
import { formatDateTime } from '../utils/dateUtils';
import { PainObservation } from '../types';
import { PainCanvas } from '../components/pain-map/PainCanvas';
import { useAppStore } from '../store/useAppStore';

interface DemoPainMapPageProps {
  onNavigate?: (path: string) => void;
}

export function DemoPainMapPage({ onNavigate }: DemoPainMapPageProps) {
  const { user, tenantId } = useAuth();
  const { t } = useI18n();
  const { activePatient, setActivePatient, clearActivePatient } = useAppStore();
  const [painObservations, setPainObservations] = useState<PainObservation[]>([]);
  const [loadingObservations, setLoadingObservations] = useState(false);

  // Form State
  const [bodySide, setBodySide] = useState<'front' | 'back'>('front');
  const [coordinates, setCoordinates] = useState<{ x: number; y: number }>({ x: 50, y: 48 });
  const [bodyRegion, setBodyRegion] = useState<string>('Zona Lumbar');
  const [painLevel, setPainLevel] = useState<number>(6);
  const [painType, setPainType] = useState<string>('punzante');
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['En reposo']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    if (activePatient?.id) {
      fetchObservationsForPatient(activePatient.id);
    } else {
      setPainObservations([]);
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
    } finally {
      setLoadingObservations(false);
    }
  };

  // Submit new Pain Observation to Supabase
  const handleSubmitPainObservation = async (e: React.FormEvent) => {
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
      const { data, error } = await supabase.from('pain_observations').insert({
        tenant_id: tenantId,
        patient_id: activePatient.id,
        professional_id: user.id,
        pain_level: Number(painLevel),
        pain_type: painType as any,
        body_region: bodyRegion,
        body_side: bodySide,
        coordinates_x: coordinates.x,
        coordinates_y: coordinates.y,
        clinical_notes: clinicalNotes || 'Evaluación en mapa anatómico.',
        tags: selectedTags,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      addToast(
        'success',
        t('common.success', 'Observación Guardada'),
        `${bodyRegion} (EVA ${painLevel}/10) para ${activePatient.full_name}.`
      );

      setClinicalNotes('');
      if (activePatient.id) {
        fetchObservationsForPatient(activePatient.id);
      }
    } catch (err: any) {
      console.error('Error saving pain observation:', err);
      addToast('error', t('common.error', 'Error al guardar'), err?.message || 'No se pudo guardar la observación.');
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="min-h-screen flex bg-background font-sans text-on-background overflow-hidden">
      <SideNavBar currentPath="/mapa-dolor" onNavigate={onNavigate} />

      <main className="flex-1 ml-0 md:ml-72 flex flex-col h-screen overflow-hidden">
        <TopNavBar currentPath="/mapa-dolor" onNavigate={onNavigate} />

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto pt-[80px] pb-12 px-6 md:px-10">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary/10 text-primary material-symbols-outlined text-2xl">
                  accessibility_new
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight">
                  {t('painmap.title', 'Mapa Anatómico 2D de Dolor')}
                </h2>
              </div>
              <p className="text-sm text-on-surface-variant mt-1">
                {t(
                  'painmap.subtitle',
                  'Pincha sobre el cuerpo para localizar el dolor y guarda el registro clínico en tiempo real.'
                )}
              </p>
            </div>

            {/* Patient Context Pill / Search */}
            {activePatient && (
              <div className="w-full lg:w-auto">
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
              </div>
            )}
          </div>

          {/* EMPTY STATE: NO ACTIVE PATIENT */}
          {!activePatient ? (
            <div className="max-w-3xl mx-auto my-12 bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-8 md:p-12 text-center clinical-shadow">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl">accessibility_new</span>
              </div>

              <h3 className="text-2xl font-black text-on-surface tracking-tight">
                Selecciona un Paciente para iniciar la Evaluación Anatómica
              </h3>

              <p className="text-sm text-on-surface-variant max-w-lg mx-auto mt-2 mb-8 leading-relaxed">
                Utiliza el buscador predictivo para cargar el historial kinésico, registrar puntos de
                dolor (EVA 1-10) y asociar hallazgos clínicos al expediente del paciente.
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

              <div className="mt-8 pt-6 border-t border-outline-variant/20 flex flex-wrap items-center justify-center gap-6 text-xs text-on-surface-variant font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-base">pin_drop</span>
                  Mapeo 2D Frontal y Dorsal
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-base">timeline</span>
                  Escala Visual Analógica (EVA)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-base">cloud_sync</span>
                  Sincronización en Tiempo Real
                </span>
              </div>
            </div>
          ) : (
            /* Main Grid: Left Canvas + Right Clinical Form */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT COLUMN: Interactive Body Canvas (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col items-center">
                <PainCanvas
                  bodySide={bodySide}
                  onChangeBodySide={(side) => setBodySide(side)}
                  coordinates={coordinates}
                  bodyRegion={bodyRegion}
                  painLevel={painLevel}
                  existingObservations={painObservations}
                  onSelectLocation={({
                    coordinates: nextCoords,
                    bodyRegion: nextRegion,
                    bodySide: nextSide,
                  }) => {
                    setCoordinates(nextCoords);
                    setBodyRegion(nextRegion);
                    setBodySide(nextSide);
                  }}
                  onSelectObservation={(obs) => {
                    setCoordinates({ x: obs.coordinates_x, y: obs.coordinates_y });
                    setBodyRegion(obs.body_region);
                    setBodySide(obs.body_side);
                    setPainLevel(obs.pain_level);
                    if (obs.pain_type) setPainType(obs.pain_type);
                    if (obs.clinical_notes) setClinicalNotes(obs.clinical_notes);
                    if (obs.tags) setSelectedTags(obs.tags);
                  }}
                />
              </div>

              {/* RIGHT COLUMN: Clinical Pain Registration Form (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
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

                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface">
                      {bodySide === 'front' ? t('painmap.view_front', 'Vista Anterior') : t('painmap.view_back', 'Vista Posterior')}
                    </span>
                  </div>

                <form onSubmit={handleSubmitPainObservation} className="space-y-5">
                  
                  {/* Region & Side Readout / Override */}
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
                        className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-sm font-bold text-on-surface outline-none focus:border-primary"
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
                      placeholder={t('painmap.notes_placeholder', 'Ej: Dolor punzante a la palpación profunda...')}
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
                          <span>{t('painmap.save_observation', 'Guardar Observación en Supabase')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Historical Observations for this Patient */}
              <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 clinical-shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">history</span>
                    {t('painmap.history_title', 'Historial de Observaciones')} ({painObservations.length})
                  </h4>
                  <span className="text-[11px] text-on-surface-variant">{t('painmap.last_records', 'Últimos registros')}</span>
                </div>

                {loadingObservations ? (
                  <div className="py-8 text-center text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined animate-spin text-2xl text-primary">sync</span>
                    <p className="mt-1">{t('common.loading', 'Cargando observaciones...')}</p>
                  </div>
                ) : painObservations.length === 0 ? (
                  <div className="p-6 text-center bg-surface-container-low rounded-2xl text-xs text-on-surface-variant">
                    {t('painmap.no_observations', 'No hay observaciones de dolor registradas para este paciente.')}
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {painObservations.map((obs) => (
                      <div
                        key={obs.id}
                        className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/20 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] shrink-0 ${getPainColor(
                              obs.pain_level
                            )}`}
                          >
                            {obs.pain_level}
                          </span>
                          <div>
                            <p className="font-bold text-on-surface">{obs.body_region}</p>
                            <p className="text-[11px] text-on-surface-variant">
                              {obs.clinical_notes || t('history.no_records', 'Sin notas')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] uppercase font-bold bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant">
                            {obs.body_side === 'front' ? t('painmap.view_front', 'Frontal') : t('painmap.view_back', 'Dorsal')}
                          </span>
                          <p className="text-[10px] text-outline mt-0.5">{formatDateTime(obs.created_at)}</p>
                        </div>
                      </div>
                    ))}
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
