import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../app/providers/AuthProvider';
import { useI18n } from '../app/providers/I18nProvider';
import { supabase } from '../services/supabaseClient';
import {
  PacienteClinico,
  EvaluacionAntropometrica,
  PlanNutricional,
  OrdenNutricionFHIR,
} from '../types';
import { AnthropometryEvaluationModule } from '../components/nutrition/AnthropometryEvaluationModule';
import { DietPlannerModule } from '../components/nutrition/DietPlannerModule';
import { FhirNutritionOrderModule } from '../components/nutrition/FhirNutritionOrderModule';
import { NutritionSqlMigrationTab } from '../components/nutrition/NutritionSqlMigrationTab';
import { AnthropometryPdfModal } from '../components/nutrition/AnthropometryPdfModal';
import { RoleSwitcherBanner } from '../components/layout/RoleSwitcherBanner';
import { PatientSearchCombobox } from '../components/common/PatientSearchCombobox';
import { EcoExportActions } from '../components/common/EcoExportActions';
import { useAppStore, ActivePatient } from '../store/useAppStore';

interface NutritionistDashboardProps {
  onNavigate: (path: string) => void;
}

/**
 * Convierte un ActivePatient del store global al formato interoperable PacienteClinico
 */
function mapActiveToPacienteClinico(active: ActivePatient, tenantId: string): PacienteClinico {
  const parts = (active.full_name || 'Paciente').trim().split(' ');
  const firstName = parts[0] || 'Paciente';
  const lastName = parts.slice(1).join(' ') || '';

  return {
    id: active.id,
    tenant_id: active.tenant_id || tenantId,
    identifier_type: 'RUT',
    identifier_number: active.rut_or_dni || '12.345.678-9',
    first_name: active.first_name || firstName,
    last_name: active.last_name || lastName,
    gender: (active.gender === 'female' ? 'female' : active.gender === 'other' ? 'other' : 'male') as any,
    birth_date: active.birth_date || '1990-05-15',
    telecom_phone: active.phone || '+56 9 8765 4321',
    telecom_email: active.email || 'paciente@ejemplo.com',
    known_allergies: active.allergies || [],
    chronic_conditions: active.medical_conditions || [],
    active: true,
    created_at: active.created_at || new Date().toISOString(),
  };
}

export const NutritionistDashboard: React.FC<NutritionistDashboardProps> = ({ onNavigate }) => {
  const { user, tenant } = useAuth();
  const { t } = useI18n();

  // Global Active Patient Store
  const { activePatient, setActivePatient, clearActivePatient } = useAppStore();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<
    'antropometria' | 'planificador' | 'fhir_orders' | 'historial' | 'sql_migration'
  >('antropometria');

  // Nutrition Domain Records State for Active Patient
  const [evaluations, setEvaluations] = useState<EvaluacionAntropometrica[]>([]);
  const [plans, setPlans] = useState<PlanNutricional[]>([]);
  const [fhirOrders, setFhirOrders] = useState<OrdenNutricionFHIR[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // View modal states
  const [viewingEvaluation, setViewingEvaluation] = useState<EvaluacionAntropometrica | null>(null);
  const [viewingPlan, setViewingPlan] = useState<PlanNutricional | null>(null);
  const [pdfModalData, setPdfModalData] = useState<{
    patient: PacienteClinico;
    evaluation: EvaluacionAntropometrica;
  } | null>(null);

  const tenantId = tenant?.id || user?.tenant_id || 'tenant_kine_001';
  const nutritionistId = user?.id || 'prof_nutri_01';
  const nutritionistName = user?.full_name || 'Nut. Andrea Soler';

  // Derived current clinical patient object
  const currentClinico = useMemo<PacienteClinico | null>(() => {
    if (!activePatient) return null;
    return mapActiveToPacienteClinico(activePatient, tenantId);
  }, [activePatient, tenantId]);

  // Load Patient-Scoped Nutrition Clinical Data from Supabase
  const loadPatientNutritionData = async (patientId: string) => {
    setIsLoading(true);
    try {
      // 1. Anthropometric Evaluations filtered by active patient and tenant
      const { data: antData, error: antError } = await supabase
        .from('evaluaciones_antropometricas')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('patient_id', patientId)
        .order('evaluation_date', { ascending: false });

      if (antError) {
        console.warn('Note: evaluaciones_antropometricas query issue:', antError.message);
      }
      setEvaluations(antData || []);

      // 2. Nutrition Plans filtered by active patient and tenant
      const { data: planData, error: planError } = await supabase
        .from('planes_nutricionales')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (planError) {
        console.warn('Note: planes_nutricionales query issue:', planError.message);
      }
      setPlans(planData || []);

      // 3. FHIR Nutrition Orders filtered by active patient and tenant
      const { data: orderData, error: orderError } = await supabase
        .from('ordenes_nutricion_fhir')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (orderError) {
        console.warn('Note: ordenes_nutricion_fhir query issue:', orderError.message);
      }
      setFhirOrders(orderData || []);
    } catch (err) {
      console.error('Error loading patient nutrition data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync data whenever activePatient changes
  useEffect(() => {
    if (activePatient?.id) {
      loadPatientNutritionData(activePatient.id);
    } else {
      setEvaluations([]);
      setPlans([]);
      setFhirOrders([]);
    }
  }, [activePatient?.id, tenantId]);

  // Global update listener
  useEffect(() => {
    const handleDataUpdate = () => {
      if (activePatient?.id) {
        loadPatientNutritionData(activePatient.id);
      }
    };

    window.addEventListener('kinesys_data_updated', handleDataUpdate);
    return () => window.removeEventListener('kinesys_data_updated', handleDataUpdate);
  }, [activePatient?.id, tenantId]);

  // Handlers for Save Operations with enforced Foreign Keys
  const handleSaveEvaluation = async (record: EvaluacionAntropometrica) => {
    if (!activePatient) return;
    const scopedRecord: EvaluacionAntropometrica = {
      ...record,
      patient_id: activePatient.id,
      tenant_id: tenantId,
      nutritionist_id: nutritionistId,
    };
    await supabase.from('evaluaciones_antropometricas').insert(scopedRecord);
    loadPatientNutritionData(activePatient.id);
  };

  const handleSavePlan = async (plan: PlanNutricional) => {
    if (!activePatient) return;
    const scopedPlan: PlanNutricional = {
      ...plan,
      patient_id: activePatient.id,
      tenant_id: tenantId,
      nutritionist_id: nutritionistId,
      nutritionist_name: nutritionistName,
    };
    await supabase.from('planes_nutricionales').insert(scopedPlan);
    loadPatientNutritionData(activePatient.id);
  };

  const handleCreateTestFhirOrder = async (order: OrdenNutricionFHIR) => {
    if (!activePatient) return;
    const scopedOrder: OrdenNutricionFHIR = {
      ...order,
      patient_id: activePatient.id,
      tenant_id: tenantId,
    };
    await supabase.from('ordenes_nutricion_fhir').insert(scopedOrder);
    loadPatientNutritionData(activePatient.id);
  };

  // Find latest evaluation for the active patient
  const latestEvaluation = evaluations.length > 0 ? evaluations[0] : null;

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col font-sans">
      {/* Top Banner / Role Switcher */}
      <RoleSwitcherBanner currentPath="/nutricion" onNavigate={onNavigate} />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        {/* Header Clinical Ribbon */}
        <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-3xl border border-outline-variant/30 clinical-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary-fixed/50 text-secondary flex items-center justify-center border border-secondary-fixed-dim shadow-2xs shrink-0">
              <span className="material-symbols-outlined text-3xl">nutrition</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black tracking-tight text-on-surface">
                  EHR Nutrición Clínica & Antropometría
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-bold border border-secondary-fixed-dim">
                  Panel Nutricional
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Profesional: <strong>{nutritionistName}</strong> • Clínica:{' '}
                <strong>{tenant?.name || 'KineSys Salud'}</strong>
              </p>
            </div>
          </div>

          {/* Top Patient Context Pill / Search (Visible if activePatient exists) */}
          {activePatient && (
            <div className="w-full md:w-auto">
              <PatientSearchCombobox
                variant="standard"
                showActiveBadge={true}
                allowClear={true}
                onSelectPatient={(p) => {
                  setActivePatient(p);
                }}
              />
            </div>
          )}
        </div>

        {/* =========================================================================
            ESTADO 1: SIN PACIENTE ACTIVO (EMPTY STATE ELEGANTE Y CENTRALIZADO)
            ========================================================================= */}
        {!activePatient || !currentClinico ? (
          <div className="max-w-3xl mx-auto my-8 bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-8 sm:p-12 text-center clinical-shadow animate-fadeIn">
            {/* Icono Principal */}
            <div className="w-20 h-20 rounded-3xl bg-secondary-fixed/40 text-secondary flex items-center justify-center mx-auto mb-6 border border-secondary-fixed shadow-xs">
              <span className="material-symbols-outlined text-4xl">person_search</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
              Selecciona un Paciente para iniciar la Consulta Nutricional
            </h2>

            <p className="text-sm text-on-surface-variant max-w-lg mx-auto mt-2 mb-8 leading-relaxed">
              El cálculo de Tasa Metabólica Basal (Mifflin-St Jeor), porcentaje de grasa por
              pliegues cutáneos y diseño de pautas alimentarias requieren vincular los datos al
              expediente clínico del paciente.
            </p>

            {/* Buscador Predictivo en Formato Grande */}
            <div className="max-w-xl mx-auto text-left">
              <PatientSearchCombobox
                variant="large"
                autoFocus={true}
                placeholder="Buscar paciente por nombre, RUT/DNI o email..."
                onSelectPatient={(patient) => {
                  setActivePatient(patient);
                }}
              />
            </div>

            {/* Badges de Capacidades Clínicas */}
            <div className="mt-10 pt-6 border-t border-outline-variant/20 flex flex-wrap items-center justify-center gap-6 text-xs text-on-surface-variant font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">straighten</span>
                Mifflin-St Jeor & Pliegues Cutáneos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-base">restaurant_menu</span>
                Planificación de Dietas & Macronutrientes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-tertiary text-base">sync_alt</span>
                Órdenes Nutricionales FHIR
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">picture_as_pdf</span>
                Exportación PDF con Gráficos
              </span>
            </div>
          </div>
        ) : (
          /* =========================================================================
              ESTADO 2: PACIENTE ACTIVO SELECCIONADO (PESTAÑAS & MÓDULOS DE CÁLCULO)
              ========================================================================= */
          <div className="space-y-6 animate-fadeIn">
            {/* Header del Paciente Activo */}
            <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={
                    activePatient.avatar_url ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                  }
                  alt={activePatient.full_name}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-primary/30 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                      Expediente Clínico Activo
                    </span>
                    {activePatient.rut_or_dni && (
                      <span className="text-xs font-mono font-bold bg-surface-container-lowest px-2 py-0.5 rounded-md border border-outline-variant/30 text-on-surface">
                        {activePatient.rut_or_dni}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-extrabold text-on-surface mt-0.5">
                    {activePatient.full_name}
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    {activePatient.email || activePatient.phone || 'Sin contacto registrado'}
                    {activePatient.medical_conditions && activePatient.medical_conditions.length > 0 && (
                      <span className="ml-2 font-medium text-primary">
                        • {activePatient.medical_conditions.join(', ')}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={clearActivePatient}
                  className="px-3 py-1.5 bg-surface-container-lowest hover:bg-error-container/30 text-on-surface-variant hover:text-error rounded-xl text-xs font-bold transition-colors border border-outline-variant/30 flex items-center gap-1.5 cursor-pointer"
                  title="Limpiar paciente activo y volver al buscador"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  <span>Cambiar Paciente</span>
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('antropometria')}
                className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'antropometria'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base">straighten</span>
                <span>Evaluación Antropométrica (Mifflin-St Jeor)</span>
              </button>

              <button
                onClick={() => setActiveTab('planificador')}
                className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'planificador'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base">restaurant_menu</span>
                <span>Planificación de Dietas & Menús</span>
              </button>

              <button
                onClick={() => setActiveTab('fhir_orders')}
                className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'fhir_orders'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base">sync_alt</span>
                <span>Órdenes Clínicas FHIR ({fhirOrders.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('historial')}
                className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'historial'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base">history</span>
                <span>Historial & Trazabilidad ({plans.length + evaluations.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('sql_migration')}
                className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'sql_migration'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base">database</span>
                <span>Migración SQL / RLS</span>
              </button>
            </div>

            {/* Tab 1: Antropometría & Mifflin-St Jeor */}
            {activeTab === 'antropometria' && (
              <AnthropometryEvaluationModule
                patient={currentClinico}
                historyEvaluations={evaluations}
                nutritionistId={nutritionistId}
                nutritionistName={nutritionistName}
                clinicName={tenant?.name || 'KineSys Salud'}
                tenantId={tenantId}
                onSaveEvaluation={handleSaveEvaluation}
                onGoToDietPlanner={() => setActiveTab('planificador')}
              />
            )}

            {/* Tab 2: Diet & Menu Planner */}
            {activeTab === 'planificador' && (
              <DietPlannerModule
                patient={currentClinico}
                nutritionistId={nutritionistId}
                nutritionistName={nutritionistName}
                tenantId={tenantId}
                activeFhirOrders={fhirOrders}
                latestEvaluation={latestEvaluation}
                onSavePlan={handleSavePlan}
              />
            )}

            {/* Tab 3: FHIR NutritionOrder Interoperability */}
            {activeTab === 'fhir_orders' && (
              <FhirNutritionOrderModule
                orders={fhirOrders}
                patients={[currentClinico]}
                activePatientId={currentClinico.id}
                onSelectPatient={() => {}}
                onCreateTestOrder={handleCreateTestFhirOrder}
                tenantId={tenantId}
              />
            )}

            {/* Tab 4: Historial de Evaluaciones y Pautas del Paciente Activo */}
            {activeTab === 'historial' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Evaluaciones Antropométricas History */}
                  <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 clinical-shadow space-y-4">
                    <h3 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-base">straighten</span>
                        <span>Evaluaciones Antropométricas ({evaluations.length})</span>
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-bold">
                        {currentClinico.first_name} {currentClinico.last_name}
                      </span>
                    </h3>

                    {evaluations.length === 0 ? (
                      <div className="p-8 text-center bg-surface-container-low rounded-2xl border border-outline-variant/30">
                        <span className="material-symbols-outlined text-3xl text-outline mb-1">
                          straighten
                        </span>
                        <p className="text-xs font-bold text-on-surface">
                          Sin evaluaciones registradas para este paciente
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('antropometria')}
                          className="mt-3 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Realizar primera evaluación
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {evaluations.map((ev) => (
                          <div
                            key={ev.id}
                            className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 flex items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-on-surface">
                                  {currentClinico.first_name} {currentClinico.last_name}
                                </span>
                                <span className="text-[10px] font-mono text-on-surface-variant font-bold">
                                  {ev.evaluation_date}
                                </span>
                              </div>
                              <p className="text-[11px] text-on-surface-variant font-mono mt-0.5">
                                BMR: <strong>{ev.bmr_kcal} kcal</strong> • TDEE: <strong>{ev.tdee_kcal} kcal</strong> • Grasa: <strong>{ev.body_fat_percentage}%</strong>
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setPdfModalData({ patient: currentClinico, evaluation: ev });
                                }}
                                className="px-2.5 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-primary text-xs font-bold rounded-xl border border-outline-variant/40 cursor-pointer transition-colors flex items-center gap-1"
                                title="Exportar informe PDF"
                              >
                                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                                <span>PDF</span>
                              </button>

                              <button
                                onClick={() => setViewingEvaluation(ev)}
                                className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold rounded-xl border border-outline-variant/40 cursor-pointer transition-colors"
                              >
                                Detalle
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Planes Nutricionales History */}
                  <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 clinical-shadow space-y-4">
                    <h3 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-base">restaurant_menu</span>
                        <span>Planes Nutricionales Prescritos ({plans.length})</span>
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-bold">
                        {currentClinico.first_name} {currentClinico.last_name}
                      </span>
                    </h3>

                    {plans.length === 0 ? (
                      <div className="p-8 text-center bg-surface-container-low rounded-2xl border border-outline-variant/30">
                        <span className="material-symbols-outlined text-3xl text-outline mb-1">
                          restaurant_menu
                        </span>
                        <p className="text-xs font-bold text-on-surface">
                          Sin pautas nutricionales creadas para este paciente
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('planificador')}
                          className="mt-3 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Crear plan nutricional
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {plans.map((pl) => (
                          <div
                            key={pl.id}
                            className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 flex items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-on-surface">{pl.plan_name}</span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-secondary-fixed text-on-secondary-fixed border border-secondary-fixed-dim">
                                  {pl.status.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-[11px] text-on-surface-variant mt-0.5">
                                Objetivo: <strong>{pl.caloric_target_kcal} kcal</strong> • Creado: {pl.created_at?.split('T')[0]}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <EcoExportActions
                                patient={currentClinico}
                                documentType="plan_nutricional"
                                plan={pl}
                                size="sm"
                                showPreviewOption={false}
                              />

                              <button
                                onClick={() => setViewingPlan(pl)}
                                className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold rounded-xl border border-outline-variant/40 cursor-pointer shadow-2xs transition-colors"
                              >
                                Detalle
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: SQL Migration Script */}
            {activeTab === 'sql_migration' && <NutritionSqlMigrationTab />}
          </div>
        )}
      </div>

      {/* Modal: View Full Anthropometric Evaluation */}
      {viewingEvaluation && currentClinico && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-xl rounded-3xl border border-outline-variant/40 shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <h3 className="text-sm font-black text-on-surface">Detalle de Evaluación Antropométrica</h3>
              <button
                onClick={() => setViewingEvaluation(null)}
                className="p-1 rounded-full hover:bg-surface-container-high text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-surface-container-low rounded-xl">
                <span className="text-[10px] text-on-surface-variant font-bold block">BMR (Mifflin)</span>
                <span className="text-base font-black text-on-surface">{viewingEvaluation.bmr_kcal} kcal</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl">
                <span className="text-[10px] text-on-surface-variant font-bold block">TDEE Total</span>
                <span className="text-base font-black text-primary">{viewingEvaluation.tdee_kcal} kcal</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl">
                <span className="text-[10px] text-on-surface-variant font-bold block">% Grasa</span>
                <span className="text-base font-black text-tertiary">{viewingEvaluation.body_fat_percentage}%</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl">
                <span className="text-[10px] text-on-surface-variant font-bold block">Cintura/Cadera</span>
                <span className="text-base font-black text-on-surface">{viewingEvaluation.waist_hip_ratio}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-bold text-on-surface block uppercase tracking-wider text-[10px]">
                Pliegues Cutáneos (mm)
              </span>
              <div className="p-3 bg-surface-container-low rounded-xl font-mono text-[11px] grid grid-cols-2 gap-2">
                <span>Tríceps: {viewingEvaluation.skinfold_triceps_mm} mm</span>
                <span>Subescapular: {viewingEvaluation.skinfold_subscapular_mm} mm</span>
                <span>Suprailíaco: {viewingEvaluation.skinfold_suprailiac_mm} mm</span>
                <span>Abdominal: {viewingEvaluation.skinfold_abdominal_mm} mm</span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <span className="font-bold text-on-surface block uppercase tracking-wider text-[10px]">
                Observaciones Clínicas
              </span>
              <div className="p-3 bg-surface-container-low rounded-xl text-on-surface leading-relaxed">
                {viewingEvaluation.clinical_notes || 'Sin observaciones adicionales.'}
              </div>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-outline-variant/30">
              <EcoExportActions
                patient={currentClinico}
                documentType="antropometria"
                evaluation={viewingEvaluation}
                historyEvaluations={evaluations}
                size="sm"
              />

              <button
                onClick={() => setViewingEvaluation(null)}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Plan Details */}
      {viewingPlan && currentClinico && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-3xl border border-outline-variant/40 shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div>
                <h3 className="text-sm font-black text-on-surface">{viewingPlan.plan_name}</h3>
                <span className="text-xs text-on-surface-variant font-mono">
                  Calorías Meta: <strong>{viewingPlan.caloric_target_kcal} kcal</strong> • Prescrito por: {viewingPlan.nutritionist_name}
                </span>
              </div>
              <button
                onClick={() => setViewingPlan(null)}
                className="p-1 rounded-full hover:bg-surface-container-high text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {viewingPlan.meals.map((m) => (
                <div key={m.id} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span>{m.name} ({m.time_suggestion || '08:00'})</span>
                    <span className="text-primary font-mono font-black">{m.total_calories} kcal</span>
                  </div>
                  <div className="space-y-1">
                    {m.items.map((i) => (
                      <div key={i.id} className="flex justify-between text-[11px] text-on-surface-variant">
                        <span>• {i.name} ({i.portion_size} {i.unit})</span>
                        <span className="font-mono">{i.calories_kcal} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-surface-container-low rounded-xl text-xs text-on-surface leading-relaxed">
              <strong>Indicaciones:</strong> {viewingPlan.notes_and_recommendations}
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-outline-variant/30">
              <EcoExportActions
                patient={currentClinico}
                documentType="plan_nutricional"
                plan={viewingPlan}
                size="sm"
              />

              <button
                onClick={() => setViewingPlan(null)}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Anthropometry PDF Modal */}
      {pdfModalData && (
        <AnthropometryPdfModal
          isOpen={true}
          onClose={() => setPdfModalData(null)}
          patient={pdfModalData.patient}
          evaluation={pdfModalData.evaluation}
          historyEvaluations={evaluations}
          nutritionistName={nutritionistName}
          clinicName={tenant?.name || 'KineSys Salud'}
        />
      )}
    </div>
  );
};

