import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../app/providers/AuthProvider';
import { useI18n } from '../app/providers/I18nProvider';
import { supabase } from '../services/supabaseClient';
import {
  PacienteClinico,
  EvaluacionAntropometrica,
  PlanNutricional,
  OrdenNutricionFHIR,
  User,
} from '../types';
import { AnthropometryModule } from '../components/nutrition/AnthropometryModule';
import { BodyCompositionModule } from '../components/nutrition/BodyCompositionModule';
import type { AnthropometryDraftForm, BodyCompositionBIA } from '../types/coreBodyNutrition';
import { NutritionPlanningModule } from '../components/nutrition/NutritionPlanningModule';
import { FhirNutritionOrderModule } from '../components/nutrition/FhirNutritionOrderModule';
import { AnthropometryPdfModal } from '../components/nutrition/AnthropometryPdfModal';
import {
  toCoreBodyPatient,
  coreBodyAnthroToKinesys,
  coreBodyPlanToKinesys,
  biaToKinesys,
  hasIsakMeasurements,
} from '../utils/coreBodyAdapters';
import { buildLiveReportSnapshot, hasBiaValues } from '../utils/nutritionReportLive';
import { useAppStore, ActivePatient } from '../store/useAppStore';
import { logSupabaseError } from '../utils/supabaseErrors';
import {
  mapAnthropometryFromDb,
  mapFhirOrderFromDb,
  mapNutritionPlanFromDb,
  toAnthropometryInsert,
  toFhirOrderInsert,
  toNutritionPlanInsert,
} from '../utils/nutritionDbMappers';
import { SideNavBar } from '../components/layout/SideNavBar';
import { TopNavBar } from '../components/layout/TopNavBar';
import { PatientSearchCombobox } from '../components/common/PatientSearchCombobox';
import { EcoExportActions } from '../components/common/EcoExportActions';
import { MedicalHistoryModal } from '../components/patients/MedicalHistoryModal';
import { api } from '../services/apiClient';
import { useNutritionReportExport } from '../hooks/useNutritionReportExport';
import {
  anthropometryDraftApi,
  getAnthropometryDraft,
  getPatientById,
  updatePatient,
} from '../services/dataService';
import {
  createAnthropometryDraftSaver,
  type AnthropometryDraftSaver,
} from '../services/nutrition/AnthropometryDraftService';

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
    height_cm: active.height_cm && active.height_cm > 0 ? active.height_cm : undefined,
    active: true,
    created_at: active.created_at || new Date().toISOString(),
  };
}

export const NutritionistDashboard: React.FC<NutritionistDashboardProps> = ({ onNavigate }) => {
  const { user, tenant } = useAuth();
  const { t } = useI18n();

  // Global Active Patient Store
  const { activePatient, setActivePatient, clearActivePatient, nutritionDraft } = useAppStore();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<
    'antropometria' | 'bia' | 'planificador' | 'fhir_orders' | 'historial'
  >('antropometria');

  // Nutrition Domain Records State for Active Patient
  const [evaluations, setEvaluations] = useState<EvaluacionAntropometrica[]>([]);
  const [plans, setPlans] = useState<PlanNutricional[]>([]);
  const [fhirOrders, setFhirOrders] = useState<OrdenNutricionFHIR[]>([]);
  const [availablePatients, setAvailablePatients] = useState<PacienteClinico[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  // Borrador de antropometría del paciente activo (autoguardado en base de datos).
  const [draftSession, setDraftSession] = useState<{
    patientId: string;
    saver: AnthropometryDraftSaver;
  } | null>(null);

  // Última captura ISAK en curso (guardado progresivo): alimenta el informe/PDF sin esperar a finalizar.
  const [draftIsakForm, setDraftIsakForm] = useState<{
    patientId: string;
    form: Partial<AnthropometryDraftForm>;
    updatedAt: string;
  } | null>(null);

  // View modal states
  const [viewingEvaluation, setViewingEvaluation] = useState<EvaluacionAntropometrica | null>(null);
  const [viewingPlan, setViewingPlan] = useState<PlanNutricional | null>(null);
  const [isMedicalHistoryOpen, setIsMedicalHistoryOpen] = useState(false);
  const [pdfModalData, setPdfModalData] = useState<{
    patient: PacienteClinico;
    evaluation: EvaluacionAntropometrica;
  } | null>(null);

  // Withings Scale Live Weigh-in State
  const [isWeighInActive, setIsWeighInActive] = useState(false);
  const [withingsStatusMessage, setWithingsStatusMessage] = useState<string | null>(null);
  const [liveWithingsBia, setLiveWithingsBia] = useState<BodyCompositionBIA | null>(null);

  const tenantId = tenant?.id || user?.tenant_id || 'tenant_kine_001';
  const nutritionistId = user?.id || 'prof_nutri_01';
  const nutritionistName = user?.full_name || 'Lic. Nutricionista';

  // Load available patients list from Supabase for this tenant
  const loadAvailablePatients = async () => {
    setIsLoadingPatients(true);
    try {
      const { data: patData } = await supabase
        .from('pacientes_clinicos')
        .select('*')
        .eq('tenant_id', tenantId);

      if (patData && patData.length > 0) {
        setAvailablePatients(patData);
      } else {
        // Fallback: search patients in users table
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'patient')
          .eq('tenant_id', tenantId);

        if (usersData && usersData.length > 0) {
          const mapped = usersData.map((u: any) => mapActiveToPacienteClinico(u, tenantId));
          setAvailablePatients(mapped);
        }
      }
    } catch (err) {
      console.warn('Could not load clinical patients from DB:', err);
    } finally {
      setIsLoadingPatients(false);
    }
  };

  useEffect(() => {
    loadAvailablePatients();
  }, [tenantId]);

  // Derived current clinical patient object
  const currentClinico = useMemo<PacienteClinico | null>(() => {
    if (!activePatient) return null;
    return mapActiveToPacienteClinico(activePatient, tenantId);
  }, [activePatient, tenantId]);

  const historyPatient = useMemo<User | null>(() => {
    if (!activePatient) return null;
    return {
      id: activePatient.id,
      email: activePatient.email || '',
      full_name: activePatient.full_name,
      role: 'patient',
      tenant_id: activePatient.tenant_id || tenantId,
      phone: activePatient.phone,
      avatar_url: activePatient.avatar_url,
      rut_or_dni: activePatient.rut_or_dni,
      birth_date: activePatient.birth_date,
      gender: activePatient.gender,
      medical_conditions: activePatient.medical_conditions,
      allergies: activePatient.allergies,
      emergency_contact: activePatient.emergency_contact,
      created_at: activePatient.created_at || new Date().toISOString(),
    };
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
        .eq('status', 'completed')
        .order('evaluation_date', { ascending: false });

      if (antError) {
        logSupabaseError('evaluaciones_antropometricas.select', antError);
      }
      setEvaluations((antData || []).map((row) => mapAnthropometryFromDb(row as Record<string, unknown>)));

      // 2. Nutrition Plans filtered by active patient and tenant
      const { data: planData, error: planError } = await supabase
        .from('planes_nutricionales')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (planError) {
        logSupabaseError('planes_nutricionales.select', planError);
      }
      setPlans((planData || []).map((row) => mapNutritionPlanFromDb(row as Record<string, unknown>)));

      // 3. FHIR Nutrition Orders filtered by active patient and tenant
      const { data: orderData, error: orderError } = await supabase
        .from('ordenes_nutricion_fhir')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (orderError) {
        logSupabaseError('ordenes_nutricion_fhir.select', orderError);
      }
      setFhirOrders((orderData || []).map((row) => mapFhirOrderFromDb(row as Record<string, unknown>)));
    } catch (err) {
      console.error('Error loading patient nutrition data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Al abrir un paciente: carga su borrador de antropometría y refresca su estatura
  // registrada desde la base (el store persistido puede traerla vieja o vacía).
  useEffect(() => {
    const patientId = activePatient?.id;
    setDraftSession(null);
    setDraftIsakForm(null);
    if (!patientId) return;

    let cancelled = false;
    void (async () => {
      const [draft, freshPatient] = await Promise.all([
        getAnthropometryDraft(tenantId, patientId, nutritionistId).catch((err) => {
          logSupabaseError('evaluaciones_antropometricas.draft', err);
          return null;
        }),
        getPatientById(patientId).catch((err) => {
          logSupabaseError('pacientes_clinicos.height', err);
          return null;
        }),
      ]);
      if (cancelled) return;

      if (hasIsakMeasurements(draft?.data)) {
        setDraftIsakForm({ patientId, form: draft!.data, updatedAt: new Date().toISOString() });
      }
      setDraftSession({
        patientId,
        saver: createAnthropometryDraftSaver(
          { tenantId, patientId, nutritionistId, initialDraft: draft },
          anthropometryDraftApi,
        ),
      });

      const freshHeight = freshPatient?.height_cm;
      const current = useAppStore.getState().activePatient;
      if (freshHeight && freshHeight > 0 && current?.id === patientId && current.height_cm !== freshHeight) {
        useAppStore.getState().setActivePatient({ ...current, height_cm: freshHeight });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activePatient?.id, tenantId, nutritionistId]);

  // La estatura corregida en Nutrición se guarda en la ficha del paciente.
  const handleHeightAutosave = useCallback(async (patientId: string, heightCm: number) => {
    await updatePatient(patientId, { height_cm: heightCm });
    const { activePatient: current, setActivePatient: setStorePatient } = useAppStore.getState();
    if (current?.id === patientId) setStorePatient({ ...current, height_cm: heightCm });
  }, []);

  // Sync data whenever activePatient changes
  useEffect(() => {
    if (activePatient?.id) {
      loadPatientNutritionData(activePatient.id);
    } else {
      setEvaluations([]);
      setPlans([]);
      setFhirOrders([]);
      setLiveWithingsBia(null);
    }
  }, [activePatient?.id, tenantId]);

  // Global update listener
  useEffect(() => {
    const handleDataUpdate = () => {
      loadAvailablePatients();
      if (activePatient?.id) {
        loadPatientNutritionData(activePatient.id);
      }
    };

    window.addEventListener('kinesys_data_updated', handleDataUpdate);
    return () => window.removeEventListener('kinesys_data_updated', handleDataUpdate);
  }, [activePatient?.id, tenantId]);

  // Polling para sesión de pesaje activa en Báscula Withings
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isWeighInActive && activePatient?.id) {
      interval = setInterval(async () => {
        try {
          const response = await api.hardware.checkWithingsSession(activePatient.id);
          if (response.data?.status === 'completed') {
            let reading: any = null;
            if (response.data.metrics_payload) {
              if (typeof response.data.metrics_payload === 'object') {
                reading = response.data.metrics_payload;
              } else if (typeof response.data.metrics_payload === 'string') {
                try {
                  reading = JSON.parse(response.data.metrics_payload);
                } catch {
                  try {
                    reading = JSON.parse(atob(response.data.metrics_payload));
                  } catch (e) {
                    console.error('Error al decodificar payload Withings:', e);
                  }
                }
              }
            }

            if (reading) {
              const weight = Number(reading.weight_kg) || 0;
              const fatPct = Number(reading.fat_ratio_percent ?? reading.body_fat_percentage ?? reading.body_fat_pct) || 0;
              const muscle = Number(reading.muscle_mass_kg) || 0;
              const fatMass = Number(reading.fat_mass_kg) || (weight > 0 && fatPct > 0 ? Number(((weight * fatPct) / 100).toFixed(1)) : 0);
              const hydration = Number(reading.hydration_kg) || 0;
              const bone = Number(reading.bone_mass_kg) || 0;
              const visceral = Number(reading.visceral_fat_index) || 0;

              let protein = Number(reading.protein_kg) || 0;
              if (protein === 0) {
                if (weight > 0 && fatMass > 0 && hydration > 0 && bone > 0) {
                  protein = Math.round((weight - fatMass - hydration - bone) * 10) / 10;
                } else if (Number(reading.fat_free_mass_kg) > 0 && hydration > 0 && bone > 0) {
                  protein = Math.round((Number(reading.fat_free_mass_kg) - hydration - bone) * 10) / 10;
                }
              }
              if (protein < 0) protein = 0;

              const isFemale = currentClinico?.gender === 'female';
              const fatMin = isFemale ? 18 : 10;
              const fatMax = isFemale ? 28 : 20;

              const newBia: BodyCompositionBIA = {
                id: `bia-withings-${Date.now()}`,
                patientId: activePatient.id,
                date: new Date().toISOString().slice(0, 10),
                deviceModel: 'Withings Body Scan',
                sourceMode: 'hardware_auto',
                lastSyncTimestamp: new Date().toLocaleTimeString(),
                pesoKg: { value: weight, minNormal: 45, maxNormal: 100, unit: 'kg', status: 'Normal' },
                masaMuscularEsqueleticaKg: { value: muscle, minNormal: 18, maxNormal: 40, unit: 'kg', status: 'Normal' },
                masaGrasaKg: { value: fatMass, minNormal: 8, maxNormal: 35, unit: 'kg', status: 'Normal' },
                porcentajeGrasaCorporal: {
                  value: fatPct,
                  minNormal: fatMin,
                  maxNormal: fatMax,
                  unit: '%',
                  status: fatPct < fatMin ? 'Bajo' : fatPct <= fatMax ? 'Adecuada' : 'Elevado',
                },
                segmental: {
                  brazoIzq: { muscleKg: 0, fatKg: 0 },
                  brazoDer: { muscleKg: 0, fatKg: 0 },
                  tronco: { muscleKg: 0, fatKg: 0 },
                  piernaIzq: { muscleKg: 0, fatKg: 0 },
                  piernaDer: { muscleKg: 0, fatKg: 0 },
                },
                otherIndicators: {
                  aguaCorporalTotalL: { value: hydration, minNormal: 25, maxNormal: 45, unit: 'L', status: 'Normal' },
                  proteinaKg: { value: protein, minNormal: 6, maxNormal: 14, unit: 'kg', status: 'Normal' },
                  mineralesKg: { value: bone, minNormal: 2.2, maxNormal: 4.5, unit: 'kg', status: 'Normal' },
                  grasaVisceralNivel: { value: visceral, minNormal: 1, maxNormal: 9, unit: 'nivel', status: 'Normal' },
                },
                evaluatorNotes: 'Medición sincronizada automáticamente desde Báscula Withings',
              };

              setLiveWithingsBia(newBia);

              useAppStore.getState().patchNutritionDraft({
                patientId: activePatient.id,
                biaSource: 'WITHINGS',
                biaSnapshot: newBia as unknown as Record<string, unknown>,
                weightKg: newBia.pesoKg.value || undefined,
              });
            }

            // Recargar datos clínicos del paciente desde Supabase / Backend
            await loadPatientNutritionData(activePatient.id);

            const weightStr = reading?.weight_kg ? `${reading.weight_kg} kg` : '';
            const fatStr = (reading?.fat_ratio_percent ?? reading?.body_fat_percentage ?? reading?.body_fat_pct)
              ? `, ${reading.fat_ratio_percent ?? reading.body_fat_percentage ?? reading.body_fat_pct}% grasa`
              : '';
            
            setWithingsStatusMessage(`⚡ Medición recibida con éxito desde Báscula Withings${weightStr ? ` (${weightStr}${fatStr})` : ''}`);
            setIsWeighInActive(false);
            setActiveTab('bia');
          } else if (response.data?.status === 'expired') {
            setWithingsStatusMessage('La sesión de pesaje en la báscula Withings ha expirado (3 min).');
            setIsWeighInActive(false);
          }
        } catch (error) {
          console.error('Error en sondeo de sesión Withings:', error);
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWeighInActive, activePatient?.id, currentClinico]);

  const handleConnectWithings = async () => {
    try {
      const res = await api.hardware.getWithingsAuthorizeUrl(tenantId, nutritionistId);
      if (res.data?.url) {
        window.open(res.data.url, '_blank', 'width=650,height=750');
      } else {
        window.open(`/api/v1/hardware/withings/authorize?tenant_id=${tenantId}&user_id=${nutritionistId}`, '_blank', 'width=650,height=750');
      }
    } catch {
      window.open(`/api/v1/hardware/withings/authorize?tenant_id=${tenantId}&user_id=${nutritionistId}`, '_blank', 'width=650,height=750');
    }
  };

  const handleStartWithingsWeighIn = async () => {
    if (!activePatient?.id) return;
    setIsWeighInActive(true);
    setWithingsStatusMessage('Iniciando sesión de pesaje en báscula Withings... (3 minutos máx)');
    try {
      const response = await api.hardware.startWithingsSession(activePatient.id, nutritionistId);
      if (response.error || !response.data) {
        throw new Error(response.error || 'No se pudo iniciar la sesión de pesaje');
      }
      setWithingsStatusMessage('Báscula lista. Por favor, sube al paciente a la báscula Withings.');
    } catch (err: any) {
      console.error('Error iniciando sesión Withings:', err);
      setWithingsStatusMessage(`Error: ${err.message || 'No se pudo conectar con la báscula'}`);
      setIsWeighInActive(false);
    }
  };

  const handleCancelWeighIn = () => {
    setIsWeighInActive(false);
    setWithingsStatusMessage(null);
  };

  // Handlers: columnas fijas + data JSONB (schema 004). Log detallado si PostgREST rechaza el payload.
  const handleSaveEvaluation = async (record: EvaluacionAntropometrica) => {
    if (!activePatient) return;
    const scopedRecord: EvaluacionAntropometrica = {
      ...record,
      patient_id: activePatient.id,
      tenant_id: tenantId,
      nutritionist_id: nutritionistId,
    };
    const payload = toAnthropometryInsert(scopedRecord);

    // Si hay un borrador persistido, la misma fila pasa a definitiva (sin duplicarla).
    const completedFromDraft =
      draftSession?.patientId === activePatient.id ? await draftSession.saver.complete(payload) : false;

    if (!completedFromDraft) {
      const { error } = await supabase.from('evaluaciones_antropometricas').insert(payload);
      if (error) {
        console.error('Supabase Error:', error);
        logSupabaseError('evaluaciones_antropometricas.insert', error);
        throw error;
      }
    }
    await loadPatientNutritionData(activePatient.id);
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
    const payload = toNutritionPlanInsert({ ...scopedPlan, status: 'active' });
    const { data: inserted, error } = await supabase
      .from('planes_nutricionales')
      .insert(payload)
      .select('id')
      .single();
    if (error) {
      console.error('Supabase Error:', error);
      logSupabaseError('planes_nutricionales.insert', error);
      throw error;
    }

    // Un solo plan activo por paciente: el resto pasa a archivado.
    if (inserted?.id) {
      const { error: archiveError } = await supabase
        .from('planes_nutricionales')
        .update({ status: 'archived' })
        .eq('tenant_id', tenantId)
        .eq('patient_id', activePatient.id)
        .eq('status', 'active')
        .neq('id', inserted.id);
      if (archiveError) logSupabaseError('planes_nutricionales.archive', archiveError);
    }
    await loadPatientNutritionData(activePatient.id);
  };

  // Captura/edición manual de Withings Body Scan → fila persistida. Las lecturas automáticas
  // de la báscula ya las guarda el backend (webhook), por eso solo se persiste la entrada manual.
  // Una sola fila Withings manual por sesión: el autoguardado la actualiza en vez de duplicarla.
  const biaRowRef = useRef<{ patientId: string; id: string } | null>(null);

  /** Devuelve la medición persistida (null si no hay nada que guardar o la lectura es automática). */
  const handleSaveBia = async (
    bia: BodyCompositionBIA,
    opts: { silent?: boolean } = {},
  ): Promise<EvaluacionAntropometrica | null> => {
    if (!activePatient || !currentClinico) return null;
    useAppStore.getState().patchNutritionDraft({
      patientId: currentClinico.id,
      biaSource: 'WITHINGS',
      biaSnapshot: bia as unknown as Record<string, unknown>,
      weightKg: bia.pesoKg.value || undefined,
    });
    if (bia.sourceMode !== 'manual_entry') return null; // las lecturas automáticas ya las persiste el backend
    if (!hasBiaValues(bia)) return null;
    const record = biaToKinesys(bia, {
      tenantId,
      nutritionistId,
      patientId: activePatient.id,
      age: toCoreBodyPatient(currentClinico).age,
      gender: currentClinico.gender === 'female' ? 'female' : currentClinico.gender === 'other' ? 'other' : 'male',
      heightCm: baseHeightCm ?? 0,
    });
    const existing = biaRowRef.current?.patientId === activePatient.id ? biaRowRef.current : null;
    if (existing) record.id = existing.id;
    const payload = toAnthropometryInsert(record);
    const { error } = existing
      ? await supabase.from('evaluaciones_antropometricas').update(payload).eq('id', existing.id)
      : await supabase.from('evaluaciones_antropometricas').insert(payload);
    if (error) {
      logSupabaseError('evaluaciones_antropometricas.save(bia)', error);
      throw error;
    }
    biaRowRef.current = { patientId: activePatient.id, id: record.id };
    // El snapshot global del informe se actualiza al instante (también en el guardado explícito),
    // sin depender de que la recarga desde la base termine o devuelva la fila.
    setEvaluations((prev) => [record, ...prev.filter((e) => e.id !== record.id)]);
    useAppStore.getState().patchNutritionDraft({
      patientId: activePatient.id,
      biaSavedAt: new Date().toISOString(),
    });
    if (!opts.silent) await loadPatientNutritionData(activePatient.id);
    return record;
  };

  const handleCreateTestFhirOrder = async (order: OrdenNutricionFHIR) => {
    if (!activePatient) return;
    const scopedOrder: OrdenNutricionFHIR = {
      ...order,
      patient_id: activePatient.id,
      tenant_id: tenantId,
      practitioner_id: nutritionistId,
    };
    const payload = toFhirOrderInsert(scopedOrder, nutritionistId);
    const { error } = await supabase.from('ordenes_nutricion_fhir').insert(payload);
    if (error) {
      console.error('Supabase Error:', error);
      logSupabaseError('ordenes_nutricion_fhir.insert', error);
      throw error;
    }
    await loadPatientNutritionData(activePatient.id);
  };

  // Find latest evaluation for the active patient
  const latestEvaluation = evaluations.length > 0 ? evaluations[0] : null;

  // ── Informe consolidado (ISAK + BIA + plan): UNA sola fuente para la UI y para todos los botones ──
  // La UI lo calcula con el estado de React; los botones lo recalculan al clic con una lectura fresca
  // del store (ver `collectReportData`). Ambos pasan por `buildLiveReportSnapshot`.
  const snapshot = useMemo(
    () =>
      buildLiveReportSnapshot({
        evaluations,
        plans,
        patient: currentClinico,
        tenantId,
        nutritionistId,
        nutritionistName,
        isakForm: draftIsakForm,
        nutritionDraft,
      }),
    [evaluations, plans, currentClinico, tenantId, nutritionistId, nutritionistName, draftIsakForm, nutritionDraft],
  );
  const latestIsak = snapshot.isak;
  const latestWithings = snapshot.withings;
  const activePlan = snapshot.plan;

  // Último render disponible para la recolección al clic (evaluaciones, planes, borrador cargado, etc.).
  const reportInputsRef = useRef({ evaluations, plans, currentClinico, tenantId, nutritionistId, nutritionistName, draftIsakForm });
  reportInputsRef.current = { evaluations, plans, currentClinico, tenantId, nutritionistId, nutritionistName, draftIsakForm };

  // Los módulos ISAK/BIA registran aquí su flush: guardan lo pendiente antes de generar cualquier informe.
  const reportFlushersRef = useRef(new Set<() => Promise<void>>());
  const registerReportFlush = useCallback((flush: () => Promise<void>) => {
    reportFlushersRef.current.add(flush);
    return () => {
      reportFlushersRef.current.delete(flush);
    };
  }, []);

  /**
   * Recolección en vivo del informe, idéntica para "Descargar Reporte PDF", "Enviar Informe por Correo",
   * la vista previa (ojo) y los accesos directos de ISAK/BIA: 1) flush de los módulos montados; 2) snapshot
   * consolidado leído del store AL MOMENTO DEL CLIC (los módulos lo escriben de forma síncrona en cada cambio).
   */
  const collectReportData = useCallback(async () => {
    const results = await Promise.allSettled([...reportFlushersRef.current].map((flush) => flush()));
    results.forEach((r) => {
      if (r.status === 'rejected') console.error('No se pudo guardar un módulo antes del informe:', r.reason);
    });
    const live = reportInputsRef.current;
    return buildLiveReportSnapshot({
      evaluations: live.evaluations,
      plans: live.plans,
      patient: live.currentClinico,
      tenantId: live.tenantId,
      nutritionistId: live.nutritionistId,
      nutritionistName: live.nutritionistName,
      isakForm: live.draftIsakForm,
      nutritionDraft: useAppStore.getState().nutritionDraft,
    });
  }, []);

  // Informe PDF integral: lo comparten la barra fija, la vista previa, el correo y los accesos directos.
  const reportExport = useNutritionReportExport({
    patient: currentClinico,
    nutritionistName,
    tenant,
    isak: latestIsak,
    withings: latestWithings,
    plan: activePlan,
    collect: collectReportData,
  });

  /** ISAK/BIA publican su estado completo en cada cambio: queda en el store al instante (síncrono). */
  const handleLiveIsak = useCallback((form: AnthropometryDraftForm) => {
    const patientId = useAppStore.getState().activePatient?.id;
    if (!patientId) return;
    useAppStore.getState().patchNutritionDraft({
      patientId,
      isakDraft: form,
      equation: form.equation,
      isakSkinfolds: { ...form.skinfolds },
      isakPerimeters: { ...form.perimeters },
      isakDiameters: { ...form.diameters },
      isakSomatotype: form.somatotype ? { ...form.somatotype } : null,
    });
    setDraftIsakForm(hasIsakMeasurements(form) ? { patientId, form, updatedAt: new Date().toISOString() } : null);
  }, []);

  const handleLiveBia = useCallback((bia: BodyCompositionBIA) => {
    const patientId = useAppStore.getState().activePatient?.id;
    if (!patientId) return;
    useAppStore.getState().patchNutritionDraft({
      patientId,
      biaSource: 'WITHINGS',
      biaSnapshot: bia as unknown as Record<string, unknown>,
      weightKg: bia.pesoKg.value || undefined,
    });
  }, []);

  // La estatura registrada del paciente es la base de los cálculos; una evaluación previa
  // solo se usa si el paciente no tiene estatura registrada.
  const baseHeightCm =
    currentClinico?.height_cm && currentClinico.height_cm > 0 ? currentClinico.height_cm : latestEvaluation?.height_cm;

  // Derive BIA snapshot for BodyCompositionModule from latest evaluation (Withings or manual)
  const latestBiaData = useMemo<BodyCompositionBIA | undefined>(() => {
    const biaSource = latestWithings ?? latestEvaluation;
    if (!biaSource || !currentClinico) return undefined;
    const evAny = biaSource as any;
    const isWithings = evAny.source === 'withings_scale' || (evAny.device_model && String(evAny.device_model).includes('Withings'));
    const isFemale = currentClinico.gender === 'female';
    const fatMin = isFemale ? 18 : 10;
    const fatMax = isFemale ? 28 : 20;

    const weight = Number(biaSource.weight_kg) || Number(evAny.weight_kg) || 0;
    const fatPct = Number(biaSource.body_fat_percentage) || Number(evAny.fat_ratio_percent) || 0;
    const muscle = Number(biaSource.muscle_mass_kg) || Number(evAny.muscle_mass_kg) || 0;
    const fatMass = Number(evAny.fat_mass_kg) || (weight > 0 && fatPct > 0 ? Number(((weight * fatPct) / 100).toFixed(1)) : 0);
    const hydration = Number(evAny.hydration_kg) || 0;
    const bone = Number(evAny.bone_mass_kg) || 0;
    const visceral = Number(evAny.visceral_fat_index) || 0;

    let protein = Number(evAny.protein_kg) || 0;
    if (protein === 0 && (isWithings || evAny.source === 'withings_scale' || evAny.source === 'WITHINGS')) {
      if (weight > 0 && fatMass > 0 && hydration > 0 && bone > 0) {
        protein = Math.round((weight - fatMass - hydration - bone) * 10) / 10;
      } else if (Number(evAny.fat_free_mass_kg) > 0 && hydration > 0 && bone > 0) {
        protein = Math.round((Number(evAny.fat_free_mass_kg) - hydration - bone) * 10) / 10;
      }
    }
    if (protein < 0) protein = 0;

    if (weight === 0 && fatPct === 0) return undefined;

    return {
      id: `bia-${biaSource.id || currentClinico.id}`,
      patientId: currentClinico.id,
      date: biaSource.evaluation_date ? String(biaSource.evaluation_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      deviceModel: 'Withings Body Scan',
      sourceMode: evAny.source === 'withings_manual' || !isWithings ? 'manual_entry' : 'hardware_auto',
      lastSyncTimestamp: String(biaSource.evaluation_date || ''),
      pesoKg: { value: weight, minNormal: 45, maxNormal: 100, unit: 'kg', status: 'Normal' },
      masaMuscularEsqueleticaKg: { value: muscle, minNormal: 18, maxNormal: 40, unit: 'kg', status: 'Normal' },
      masaGrasaKg: { value: fatMass, minNormal: 8, maxNormal: 35, unit: 'kg', status: 'Normal' },
      porcentajeGrasaCorporal: {
        value: fatPct,
        minNormal: fatMin,
        maxNormal: fatMax,
        unit: '%',
        status: fatPct < fatMin ? 'Bajo' : fatPct <= fatMax ? 'Adecuada' : 'Elevado',
      },
      segmental: {
        brazoIzq: biaSource.segmental?.brazoIzq ?? { muscleKg: 0, fatKg: 0 },
        brazoDer: biaSource.segmental?.brazoDer ?? { muscleKg: 0, fatKg: 0 },
        tronco: biaSource.segmental?.tronco ?? { muscleKg: 0, fatKg: 0 },
        piernaIzq: biaSource.segmental?.piernaIzq ?? { muscleKg: 0, fatKg: 0 },
        piernaDer: biaSource.segmental?.piernaDer ?? { muscleKg: 0, fatKg: 0 },
      },
      otherIndicators: {
        aguaCorporalTotalL: { value: hydration, minNormal: 25, maxNormal: 45, unit: 'L', status: 'Normal' },
        proteinaKg: { value: protein, minNormal: 6, maxNormal: 14, unit: 'kg', status: 'Normal' },
        mineralesKg: { value: bone, minNormal: 2.2, maxNormal: 4.5, unit: 'kg', status: 'Normal' },
        grasaVisceralNivel: { value: visceral, minNormal: 1, maxNormal: 9, unit: 'nivel', status: 'Normal' },
      },
      evaluatorNotes: isWithings ? 'Medición sincronizada automáticamente desde Báscula Withings' : '',
    };
  }, [latestWithings, latestEvaluation, currentClinico]);

  return (
    <div className="min-h-screen flex bg-background font-sans text-on-background overflow-hidden">
      <SideNavBar currentPath="/nutricion" onNavigate={onNavigate} />
      <main className="flex-1 ml-0 md:ml-72 flex flex-col h-screen overflow-hidden">
        <TopNavBar currentPath="/nutricion" onNavigate={onNavigate} />
        <div className="flex-1 overflow-y-auto pb-24 bg-background mt-16">


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
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleConnectWithings}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer shadow-xs bg-surface-container-high hover:bg-surface-container-highest text-on-surface border-outline-variant/50 hover:border-primary/50 group"
              title="Vincular tu cuenta y báscula Withings vía OAuth2"
            >
              <div className="w-5 h-5 rounded-md bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-sm">link</span>
              </div>
              <span>Vincular Báscula Withings</span>
            </button>
          </div>
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

            {/* Quick-Select Real Patients from Supabase */}
            {availablePatients.length > 0 && (
              <div className="mt-8 pt-6 border-t border-outline-variant/20 text-left max-w-xl mx-auto space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Pacientes Registrados en la Clínica ({availablePatients.length})
                  </p>
                  <span className="text-[10px] text-primary font-bold">Selección Directa</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availablePatients.slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        const activeObj: ActivePatient = {
                          id: p.id,
                          full_name: `${p.first_name} ${p.last_name}`,
                          email: p.telecom_email,
                          phone: p.telecom_phone,
                          rut_or_dni: p.identifier_number,
                          gender: p.gender,
                          birth_date: p.birth_date,
                          medical_conditions: p.chronic_conditions,
                          allergies: p.known_allergies,
                          role: 'patient',
                          tenant_id: p.tenant_id,
                        };
                        setActivePatient(activeObj);
                      }}
                      className="p-3 bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 rounded-2xl text-left transition-all flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                        {p.first_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                          {p.first_name} {p.last_name}
                        </p>
                        <p className="text-[10px] font-mono text-on-surface-variant truncate">
                          {p.identifier_number}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
            {/* Barra fija: paciente seleccionado + acciones del informe (visibles en cualquier pestaña) */}
            <div
              id="nutrition-report-toolbar"
              className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-surface-container-lowest border-b border-outline-variant/40 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="material-symbols-outlined text-primary text-2xl shrink-0">account_circle</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-primary">
                      Paciente seleccionado
                    </p>
                    <h2 className="text-base font-extrabold text-on-surface truncate">
                      {activePatient.full_name}
                    </h2>
                  </div>
                </div>

                <EcoExportActions
                  variant="toolbar"
                  reportExport={reportExport}
                  patient={currentClinico}
                  documentType="informe_nutricional"
                  plan={activePlan}
                  isakEvaluation={latestIsak}
                  withingsEvaluation={latestWithings}
                  evaluation={latestIsak ?? latestWithings}
                  historyEvaluations={evaluations}
                  nutritionistName={nutritionistName}
                  tenant={tenant}
                  showPreviewOption={true}
                />
              </div>

              {/* Aviso de los accesos directos de ISAK / BIA (la barra ya avisa sus propias acciones) */}
              {reportExport.status && (
                <div
                  role="status"
                  className={`absolute right-4 sm:right-6 lg:right-8 top-full mt-2 z-40 w-[min(92vw,26rem)] shadow-lg p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                    reportExport.status.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : 'bg-error-container text-on-error-container border-error/30'
                  }`}
                >
                  <span className="font-bold">{reportExport.status.text}</span>
                  <button
                    type="button"
                    onClick={reportExport.dismissStatus}
                    aria-label="Cerrar aviso"
                    className="p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}
            </div>

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
                  onClick={handleConnectWithings}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Vincular báscula Withings del nutricionista vía OAuth2"
                >
                  <span className="material-symbols-outlined text-sm text-secondary">link</span>
                  <span>Vincular Báscula</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartWithingsWeighIn}
                  disabled={isWeighInActive}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    isWeighInActive
                      ? 'bg-amber-500/10 text-amber-700 border-amber-500/30 ring-2 ring-amber-400/40 animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                  }`}
                  title="Iniciar sesión de pesaje activa en la báscula Withings"
                >
                  <span className={`material-symbols-outlined text-sm ${isWeighInActive ? 'animate-spin' : ''}`}>
                    {isWeighInActive ? 'sync' : 'scale'}
                  </span>
                  <span>{isWeighInActive ? 'Báscula en Espera...' : 'Capturar con Báscula'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMedicalHistoryOpen(true)}
                  className="px-3 py-1.5 bg-transparent hover:bg-primary/10 text-primary rounded-xl text-xs font-bold transition-colors border border-primary/40 flex items-center gap-1.5 cursor-pointer"
                  title="Ver historia clínica del paciente activo"
                >
                  <span className="material-symbols-outlined text-sm">clinical_notes</span>
                  <span>Ver Historia Clínica</span>
                </button>
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

            {/* Notificaciones y estado de pesaje Withings */}
            {isWeighInActive && (
              <div className="bg-emerald-50 border border-emerald-300/80 rounded-2xl p-3 px-4 flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-xs animate-pulse">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-emerald-600 animate-spin text-base">sync</span>
                  <span>
                    <strong>Sesión de pesaje activa en Báscula Withings.</strong> Pídele al paciente que se suba a la báscula descalzo... (Sondeando cada 3s)
                  </span>
                </div>
                <button
                  onClick={handleCancelWeighIn}
                  className="text-2xs font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
            {withingsStatusMessage && !isWeighInActive && (
              <div className="bg-emerald-100 border border-emerald-300 rounded-2xl p-3 px-4 flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700 text-base">check_circle</span>
                  <span>{withingsStatusMessage}</span>
                </div>
                <button
                  onClick={() => setWithingsStatusMessage(null)}
                  className="text-xs text-emerald-800 hover:text-emerald-950 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

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
                <span>Antropometría ISAK (Manual)</span>
              </button>

              <button
                onClick={() => setActiveTab('bia')}
                className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'bia'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base">cardiology</span>
                <span>Informe BIA / Withings</span>
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
            </div>

            {/* Tab 1: Antropometría ISAK Manual */}
            {activeTab === 'antropometria' &&
              (draftSession?.patientId !== activePatient?.id ? (
                <p className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin text-primary text-sm">sync</span>
                  Cargando borrador de la evaluación...
                </p>
              ) : (
              <AnthropometryModule
                key={draftSession.patientId}
                draft={draftSession.saver.getData()}
                onAutosaveDraft={draftSession.saver.save}
                onAutosaveHeight={handleHeightAutosave}
                patient={toCoreBodyPatient(currentClinico, {
                  nutritionistName,
                  nutritionistId,
                  weightKg: latestEvaluation?.weight_kg,
                  heightCm: baseHeightCm,
                })}
                onSave={async (assessment) => {
                  const gender =
                    currentClinico.gender === 'female'
                      ? 'female'
                      : currentClinico.gender === 'other'
                        ? 'other'
                        : 'male';
                  const corePatient = toCoreBodyPatient(currentClinico, {
                    nutritionistName,
                    nutritionistId,
                    weightKg: latestEvaluation?.weight_kg,
                    heightCm: baseHeightCm,
                  });
                  await handleSaveEvaluation(
                    coreBodyAnthroToKinesys(assessment, {
                      tenantId,
                      nutritionistId,
                      age: corePatient.age,
                      gender,
                      weightKg: corePatient.weight_kg || 0,
                      heightCm: assessment.height_cm ?? corePatient.height_cm ?? 0,
                    }),
                  );
                  // La evaluación quedó persistida como definitiva: se cierra la "en curso" (borrador y
                  // espejo del store) para que el informe tome la fila guardada.
                  setDraftIsakForm(null);
                  useAppStore.getState().patchNutritionDraft({
                    patientId: currentClinico.id,
                    isakSkinfolds: undefined,
                    isakPerimeters: undefined,
                    isakDiameters: undefined,
                    isakSomatotype: undefined,
                    isakDraft: undefined,
                  });
                  setActiveTab('bia');
                }}
                onGenerateReport={async () => {
                  await reportExport.download();
                }}
                isGeneratingReport={reportExport.isDownloading}
                onLiveChange={handleLiveIsak}
                registerFlush={registerReportFlush}
                onSectionSaved={({ skinfolds, perimeters, diameters, equation, form }) => {
                  useAppStore.getState().patchNutritionDraft({
                    patientId: currentClinico.id,
                    equation,
                    isakSkinfolds: { ...skinfolds },
                    isakPerimeters: { ...perimeters },
                    isakDiameters: { ...diameters },
                    isakSomatotype: form.somatotype ? { ...form.somatotype } : null,
                  });
                  if (hasIsakMeasurements(form)) {
                    setDraftIsakForm({ patientId: currentClinico.id, form, updatedAt: new Date().toISOString() });
                  }
                }}
              />
              ))}

            {/* Tab 1b: Informe BIA Withings */}
            {activeTab === 'bia' && (
              <BodyCompositionModule
                patient={toCoreBodyPatient(currentClinico, {
                  nutritionistName,
                  nutritionistId,
                  weightKg: latestEvaluation?.weight_kg,
                  heightCm: baseHeightCm,
                })}
                data={liveWithingsBia || latestBiaData}
                onSave={async (bia) => {
                  await handleSaveBia(bia);
                }}
                onAutosave={async (bia) => {
                  await handleSaveBia(bia, { silent: true });
                }}
                onGenerateReport={async () => {
                  await reportExport.download();
                }}
                isGeneratingReport={reportExport.isDownloading}
                onLiveChange={handleLiveBia}
                registerFlush={registerReportFlush}
              />
            )}

            {/* Tab 2: Diet & Menu Planner TCA via food_catalog */}
            {activeTab === 'planificador' && (
              <NutritionPlanningModule
                patient={toCoreBodyPatient(currentClinico, {
                  nutritionistName,
                  nutritionistId,
                  weightKg: latestEvaluation?.weight_kg,
                  heightCm: baseHeightCm,
                })}
                clinicalPatient={currentClinico}
                tenantId={tenantId}
                onSave={async (plan) => {
                  await handleSavePlan(coreBodyPlanToKinesys(plan, { tenantId }));
                }}
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
                practitionerId={nutritionistId}
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
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-extrabold text-on-surface">
                                  {currentClinico.first_name} {currentClinico.last_name}
                                </span>
                                <span className="text-[10px] font-mono text-on-surface-variant font-bold">
                                  {ev.evaluation_date}
                                </span>
                                {((ev as any).source === 'withings_scale' || String((ev as any).device_model || '').includes('Withings')) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <span className="material-symbols-outlined text-xs">scale</span>
                                    Sincronizado desde Báscula Withings
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-on-surface-variant font-mono mt-0.5">
                                Peso: <strong>{ev.weight_kg || (ev as any).weight_kg || 0} kg</strong> • Grasa: <strong>{ev.body_fat_percentage || (ev as any).fat_ratio_percent || 0}%</strong> • M. Muscular: <strong>{ev.muscle_mass_kg || (ev as any).muscle_mass_kg || 0} kg</strong>
                                {ev.bmr_kcal ? ` • BMR: ${ev.bmr_kcal} kcal` : ''}
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
                                showPreviewOption={true}
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

      <MedicalHistoryModal
        patient={historyPatient}
        isOpen={isMedicalHistoryOpen}
        onClose={() => setIsMedicalHistoryOpen(false)}
        onNavigateToPainMap={(patientId) => {
          setIsMedicalHistoryOpen(false);
          onNavigate(`/mapa-dolor?patientId=${encodeURIComponent(patientId)}`);
        }}
      />
        </div>
      </main>
    </div>
  );
};

