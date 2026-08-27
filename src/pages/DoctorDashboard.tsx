import React, { useState, useEffect } from 'react';
import { useAuth } from '../app/providers/AuthProvider';
import { useI18n } from '../app/providers/I18nProvider';
import { supabase } from '../services/supabaseClient';
import {
  PacienteClinico,
  ConsultaSOP,
  PrescripcionMedica,
} from '../types';
import { PatientListModule } from '../components/medical/PatientListModule';
import { SoapEditorModule } from '../components/medical/SoapEditorModule';
import { PrescriptionModule } from '../components/medical/PrescriptionModule';
import { RoleSwitcherBanner } from '../components/layout/RoleSwitcherBanner';
import { PdfViewer } from '../components/common/PdfViewer';
import { getSoapPdfBlob } from '../utils/soapPdfExport';

interface DoctorDashboardProps {
  onNavigate: (path: string) => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ onNavigate }) => {
  const { user, tenant } = useAuth();
  const { t } = useI18n();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'patients' | 'soap' | 'prescription' | 'history' | 'sql_schema'>('patients');

  // Patients State
  const [patients, setPatients] = useState<PacienteClinico[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PacienteClinico | null>(null);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | undefined>(undefined);

  // Clinical Encounters & Prescriptions History
  const [encounters, setEncounters] = useState<ConsultaSOP[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescripcionMedica[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal for Viewing Full SOAP Encounter details
  const [viewingEncounter, setViewingEncounter] = useState<ConsultaSOP | null>(null);
  const [viewingPdfEncounter, setViewingPdfEncounter] = useState<ConsultaSOP | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const tenantId = tenant?.id || 'tenant_kine_001';
  const doctorId = user?.id || 'prof_doctor_01';
  const doctorName = user?.full_name || 'Dr. Fernando Castillo';
  const doctorLicense = user?.license_number || 'COL-MED-8420';

  // Load Data
  const loadClinicalData = async () => {
    setIsLoading(true);
    try {
      // 1. Patients
      const { data: patData } = await supabase
        .from('pacientes_clinicos')
        .select('*')
        .eq('tenant_id', tenantId);

      if (patData && patData.length > 0) {
        setPatients(patData);
        if (!selectedPatient) {
          setSelectedPatient(patData[0]);
        }
      }

      // 2. SOAP Encounters
      const { data: soapData } = await supabase
        .from('consultas_soap')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (soapData) {
        setEncounters(soapData);
      }

      // 3. Prescriptions
      const { data: rxData } = await supabase
        .from('prescripciones')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (rxData) {
        setPrescriptions(rxData);
      }
    } catch (err) {
      console.error('Error loading clinical dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClinicalData();

    const handleDataUpdate = () => {
      loadClinicalData();
    };

    window.addEventListener('kinesys_data_updated', handleDataUpdate);
    return () => window.removeEventListener('kinesys_data_updated', handleDataUpdate);
  }, [tenantId]);

  // Handlers
  const handleSelectPatient = (patient: PacienteClinico) => {
    setSelectedPatient(patient);
  };

  const handleStartSoap = (patient: PacienteClinico) => {
    setSelectedPatient(patient);
    setSelectedEncounterId(undefined);
    setActiveTab('soap');
  };

  const handleStartPrescription = (patient: PacienteClinico, encounterId?: string) => {
    setSelectedPatient(patient);
    setSelectedEncounterId(encounterId);
    setActiveTab('prescription');
  };

  const handleAddNewPatient = async (newPatient: PacienteClinico) => {
    try {
      await supabase.from('pacientes_clinicos').insert(newPatient);
      setPatients([newPatient, ...patients]);
      setSelectedPatient(newPatient);
    } catch (e) {
      console.error('Error adding new patient:', e);
    }
  };

  const handleSaveSoap = async (record: ConsultaSOP) => {
    try {
      await supabase.from('consultas_soap').insert(record);
      setEncounters([record, ...encounters]);
    } catch (e) {
      console.error('Error saving SOAP encounter:', e);
      throw e;
    }
  };

  const handleSavePrescription = async (presc: PrescripcionMedica) => {
    try {
      await supabase.from('prescripciones').insert(presc);
      setPrescriptions([presc, ...prescriptions]);
    } catch (e) {
      console.error('Error saving prescription:', e);
      throw e;
    }
  };

  // SQL Schema Script for Supabase / PostgreSQL Migrations
  const SQL_MIGRATION_SCRIPT = `-- ==============================================================================
-- MIGRACIÓN SUPABASE: PERFIL MÉDICO GENERAL & HISTORIA CLÍNICA FHIR INTEROPERABLE
-- TABLAS: pacientes_clinicos, consultas_soap, prescripciones
-- SEGURIDAD: Multi-Tenancy con Row Level Security (RLS) habilitado
-- ==============================================================================

-- 1. EXTENSIONES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLA: pacientes_clinicos (Mapeo a HL7 FHIR R4 Patient)
CREATE TABLE IF NOT EXISTS public.pacientes_clinicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    fhir_resource_id VARCHAR(100),
    identifier_type VARCHAR(20) NOT NULL DEFAULT 'CC', -- 'CC', 'RUT', 'DNI', 'PASSPORT', 'CE'
    identifier_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(120) NOT NULL,
    last_name VARCHAR(120) NOT NULL,
    gender VARCHAR(20) NOT NULL DEFAULT 'unknown', -- 'male', 'female', 'other', 'unknown'
    birth_date DATE NOT NULL,
    telecom_phone VARCHAR(50),
    telecom_email VARCHAR(150),
    address_line TEXT,
    blood_type VARCHAR(10) DEFAULT 'O+', -- 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
    known_allergies TEXT[] DEFAULT ARRAY['Ninguna conocida']::TEXT[],
    chronic_conditions TEXT[] DEFAULT ARRAY[]::TEXT[],
    emergency_contact JSONB,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_patient_tenant_identifier UNIQUE (tenant_id, identifier_type, identifier_number)
);

CREATE INDEX IF NOT EXISTS idx_pacientes_tenant ON public.pacientes_clinicos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_doc ON public.pacientes_clinicos(identifier_number);
CREATE INDEX IF NOT EXISTS idx_pacientes_name ON public.pacientes_clinicos(last_name, first_name);

-- 3. TABLA: consultas_soap (Mapeo a HL7 FHIR R4 Encounter & Composition)
CREATE TABLE IF NOT EXISTS public.consultas_soap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.pacientes_clinicos(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    encounter_type VARCHAR(50) NOT NULL DEFAULT 'control', -- 'primera_vez', 'control', 'urgencia_menor', 'teleconsulta'
    encounter_date DATE DEFAULT CURRENT_DATE,
    
    -- S: Subjetivo
    subjective JSONB NOT NULL DEFAULT '{
        "chief_complaint": "",
        "current_illness_history": "",
        "review_of_systems": "",
        "past_medical_history": ""
    }'::JSONB,

    -- O: Objetivo
    objective JSONB NOT NULL DEFAULT '{
        "vitals": {
            "blood_pressure_systolic": 120,
            "blood_pressure_diastolic": 80,
            "heart_rate_bpm": 72,
            "respiratory_rate_rpm": 16,
            "temp_celsius": 36.6,
            "oxygen_saturation_pct": 98,
            "weight_kg": 70,
            "height_cm": 170,
            "bmi": 24.2
        },
        "physical_exam": "",
        "cardiopulmonary_exam": "",
        "musculoskeletal_exam": ""
    }'::JSONB,

    -- A: Análisis & Evaluación
    assessment JSONB NOT NULL DEFAULT '{
        "diagnoses": [],
        "clinical_reasoning": "",
        "prognosis": "favorable"
    }'::JSONB,

    -- P: Plan
    plan JSONB NOT NULL DEFAULT '{
        "treatment_goals": "",
        "lab_orders": [],
        "imaging_orders": [],
        "referrals": [],
        "patient_instructions": "",
        "follow_up_days": 15,
        "alarm_signs": ""
    }'::JSONB,

    status VARCHAR(30) DEFAULT 'completed', -- 'draft', 'completed', 'signed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soap_tenant_patient ON public.consultas_soap(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_soap_created ON public.consultas_soap(created_at DESC);

-- 4. TABLA: prescripciones (Mapeo a HL7 FHIR R4 MedicationRequest)
CREATE TABLE IF NOT EXISTS public.prescripciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.pacientes_clinicos(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES public.consultas_soap(id) ON DELETE SET NULL,
    practitioner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    prescription_date DATE DEFAULT CURRENT_DATE,
    valid_until DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    medications JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array de MedicationItem con chequeo de alergias
    general_instructions TEXT,
    status VARCHAR(30) DEFAULT 'active', -- 'active', 'dispensed', 'cancelled'
    digital_signature_hash VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presc_tenant_patient ON public.prescripciones(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_presc_encounter ON public.prescripciones(encounter_id);

-- ==============================================================================
-- SEGURIDAD: HABILITACIÓN DE ROW LEVEL SECURITY (RLS) MULTITENANT
-- ==============================================================================

ALTER TABLE public.pacientes_clinicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultas_soap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescripciones ENABLE ROW LEVEL SECURITY;

-- Helper policy function para obtener tenant_id del JWT
CREATE OR REPLACE FUNCTION auth.jwt_tenant_id()
RETURNS UUID AS $$
    SELECT COALESCE(
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id')::UUID,
        (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::UUID,
        '00000000-0000-0000-0000-000000000000'::UUID
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- POLÍTICAS RLS: pacientes_clinicos
CREATE POLICY "Tenant isolation for pacientes_clinicos (SELECT)"
    ON public.pacientes_clinicos FOR SELECT
    USING (tenant_id = auth.jwt_tenant_id() OR auth.jwt_tenant_id() = '00000000-0000-0000-0000-000000000000'::UUID);

CREATE POLICY "Tenant isolation for pacientes_clinicos (INSERT)"
    ON public.pacientes_clinicos FOR INSERT
    WITH CHECK (tenant_id = auth.jwt_tenant_id() OR auth.jwt_tenant_id() = '00000000-0000-0000-0000-000000000000'::UUID);

CREATE POLICY "Tenant isolation for pacientes_clinicos (UPDATE)"
    ON public.pacientes_clinicos FOR UPDATE
    USING (tenant_id = auth.jwt_tenant_id() OR auth.jwt_tenant_id() = '00000000-0000-0000-0000-000000000000'::UUID);

-- POLÍTICAS RLS: consultas_soap
CREATE POLICY "Tenant isolation for consultas_soap (SELECT)"
    ON public.consultas_soap FOR SELECT
    USING (tenant_id = auth.jwt_tenant_id() OR auth.jwt_tenant_id() = '00000000-0000-0000-0000-000000000000'::UUID);

CREATE POLICY "Tenant isolation for consultas_soap (INSERT)"
    ON public.consultas_soap FOR INSERT
    WITH CHECK (tenant_id = auth.jwt_tenant_id() OR auth.jwt_tenant_id() = '00000000-0000-0000-0000-000000000000'::UUID);

CREATE POLICY "Tenant isolation for consultas_soap (UPDATE)"
    ON public.consultas_soap FOR UPDATE
    USING (tenant_id = auth.jwt_tenant_id() OR auth.jwt_tenant_id() = '00000000-0000-0000-0000-000000000000'::UUID);

-- POLÍTICAS RLS: prescripciones
CREATE POLICY "Tenant isolation for prescripciones (SELECT)"
    ON public.prescripciones FOR SELECT
    USING (tenant_id = auth.jwt_tenant_id() OR auth.jwt_tenant_id() = '00000000-0000-0000-0000-000000000000'::UUID);

CREATE POLICY "Tenant isolation for prescripciones (INSERT)"
    ON public.prescripciones FOR INSERT
    WITH CHECK (tenant_id = auth.jwt_tenant_id() OR auth.jwt_tenant_id() = '00000000-0000-0000-0000-000000000000'::UUID);

CREATE POLICY "Tenant isolation for prescripciones (UPDATE)"
    ON public.prescripciones FOR UPDATE
    USING (tenant_id = auth.jwt_tenant_id() OR auth.jwt_tenant_id() = '00000000-0000-0000-0000-000000000000'::UUID);
`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SQL_MIGRATION_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans pb-24">
      {/* Top Professional App Bar */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/30 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 clinical-shadow">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-primary text-white flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-2xl">stethoscope</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-on-surface">
                {t('medicine.title', 'Módulo Médico General')}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                Rol: general_doctor
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Clínica: <strong>{tenant?.name || 'Centro Kinésico & Salud KineSys'}</strong> • Profesional: <strong>{doctorName}</strong>
            </p>
          </div>
        </div>

        {/* Selected Patient Mini Quick-Bar */}
        {selectedPatient && (
          <div className="flex items-center gap-3 bg-surface-container-low px-3.5 py-1.5 rounded-2xl border border-outline-variant/30 text-xs">
            <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-xs">
              {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
            </div>
            <div>
              <div className="font-extrabold text-on-surface leading-tight">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </div>
              <div className="text-[10px] text-on-surface-variant font-mono">
                {selectedPatient.identifier_type}: {selectedPatient.identifier_number}
              </div>
            </div>
            {selectedPatient.known_allergies.length > 0 && !selectedPatient.known_allergies.includes('Ninguna') && (
              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[9px] font-black flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[11px]">warning</span>
                <span>Alergias</span>
              </span>
            )}
          </div>
        )}
      </header>

      {/* Navigation Tabs */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/30 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-2.5">
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'patients'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-base">groups</span>
            <span>Gestión de Pacientes ({patients.length})</span>
          </button>

          <button
            onClick={() => {
              if (selectedPatient) setActiveTab('soap');
            }}
            disabled={!selectedPatient}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'soap'
                ? 'bg-primary text-white shadow-xs'
                : selectedPatient
                ? 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                : 'text-on-surface-variant/40 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-base">clinical_notes</span>
            <span>Documentación SOAP {selectedPatient && `(${selectedPatient.first_name})`}</span>
          </button>

          <button
            onClick={() => {
              if (selectedPatient) setActiveTab('prescription');
            }}
            disabled={!selectedPatient}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'prescription'
                ? 'bg-primary text-white shadow-xs'
                : selectedPatient
                ? 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                : 'text-on-surface-variant/40 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-base">medication</span>
            <span>Prescripción Electrónica</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-base">history</span>
            <span>Historial Clínico ({encounters.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sql_schema')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'sql_schema'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-base">database</span>
            <span>Migración SQL / RLS</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1">
        {/* TAB 1: PACIENTES */}
        {activeTab === 'patients' && (
          <PatientListModule
            patients={patients}
            selectedPatient={selectedPatient}
            onSelectPatient={handleSelectPatient}
            onStartSoap={handleStartSoap}
            onStartPrescription={handleStartPrescription}
            onAddNewPatient={handleAddNewPatient}
          />
        )}

        {/* TAB 2: DOCUMENTACIÓN SOAP */}
        {activeTab === 'soap' && selectedPatient && (
          <SoapEditorModule
            patient={selectedPatient}
            doctorId={doctorId}
            tenantId={tenantId}
            onSaveSoap={handleSaveSoap}
            onGoToPrescription={handleStartPrescription}
          />
        )}

        {/* TAB 3: PRESCRIPCIÓN ELECTRÓNICA */}
        {activeTab === 'prescription' && selectedPatient && (
          <PrescriptionModule
            patient={selectedPatient}
            doctorId={doctorId}
            doctorName={doctorName}
            doctorLicense={doctorLicense}
            tenantId={tenantId}
            encounterId={selectedEncounterId}
            onSavePrescription={handleSavePrescription}
          />
        )}

        {/* TAB 4: HISTORIAL CLÍNICO & TRAZABILIDAD */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 clinical-shadow flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-on-surface">Historial de Consultas SOAP & Prescripciones</h3>
                <p className="text-xs text-on-surface-variant">
                  Registro cronológico con trazabilidad FHIR, constantes vitales y evolución nosológica.
                </p>
              </div>
              <span className="px-3 py-1 bg-surface-container-high text-on-surface font-mono font-bold text-xs rounded-xl">
                {encounters.length} Consultas Registradas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {encounters.map((enc) => {
                const patientObj = patients.find((p) => p.id === enc.patient_id);
                const relatedPresc = prescriptions.find((p) => p.encounter_id === enc.id || p.patient_id === enc.patient_id);

                return (
                  <div
                    key={enc.id}
                    className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-5 space-y-3 clinical-shadow hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => setViewingEncounter(enc)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-mono">
                          {enc.encounter_type}
                        </span>
                        <h4 className="font-extrabold text-sm text-on-surface mt-1">
                          {patientObj ? `${patientObj.first_name} ${patientObj.last_name}` : `Paciente ${enc.patient_id}`}
                        </h4>
                        <p className="text-[11px] text-on-surface-variant font-mono">
                          Fecha: {enc.encounter_date}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] font-bold text-primary font-mono">
                          PA: {enc.objective?.vitals?.blood_pressure_systolic}/{enc.objective?.vitals?.blood_pressure_diastolic}
                        </span>
                        <p className="text-[10px] text-on-surface-variant">
                          FC: {enc.objective?.vitals?.heart_rate_bpm} lpm • Sat: {enc.objective?.vitals?.oxygen_saturation_pct}%
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-surface-container-low rounded-2xl text-xs space-y-1">
                      <div className="font-bold text-on-surface">
                        <strong>Diagnóstico:</strong>{' '}
                        {enc.assessment?.diagnoses?.map((d) => `${d.code} - ${d.description}`).join(', ') || 'Sin codificar'}
                      </div>
                      <p className="text-on-surface-variant line-clamp-2">
                        <strong>Motivo:</strong> {enc.subjective?.chief_complaint}
                      </p>
                    </div>

                    {relatedPresc && (
                      <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-900 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-sky-700">medication</span>
                          <span className="font-bold">
                            {relatedPresc.medications.length} medicamento(s) prescrito(s)
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-sky-700 font-bold">
                          {relatedPresc.digital_signature_hash}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 text-xs">
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        <span>Completada</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingEncounter(enc);
                        }}
                        className="text-primary hover:underline font-extrabold text-[11px]"
                      >
                        Ver Detalle SOAP →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {encounters.length === 0 && (
              <div className="p-12 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/30 space-y-2">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/60">history_edu</span>
                <h4 className="font-extrabold text-sm text-on-surface">No hay consultas registradas aún</h4>
                <p className="text-xs text-on-surface-variant">
                  Selecciona un paciente del directorio e inicia su evolución clínica SOAP.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SQL MIGRATIONS & RLS POLICIES */}
        {activeTab === 'sql_schema' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 clinical-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">database</span>
                  <h3 className="text-base font-black text-on-surface">
                    Migraciones SQL & Políticas Row Level Security (RLS)
                  </h3>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Esquema completo para las tablas <code className="text-primary font-bold">pacientes_clinicos</code>, <code className="text-primary font-bold">consultas_soap</code> y <code className="text-primary font-bold">prescripciones</code> con aislamiento multitenant y compatibilidad HL7 FHIR.
                </p>
              </div>

              <button
                onClick={copySqlToClipboard}
                className="px-4 py-2.5 bg-primary hover:bg-primary-container text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-base">
                  {copiedSql ? 'check' : 'content_copy'}
                </span>
                <span>{copiedSql ? '¡Copiado al Portapapeles!' : 'Copiar Script SQL'}</span>
              </button>
            </div>

            <div className="bg-slate-950 text-emerald-400 p-5 rounded-3xl font-mono text-xs leading-relaxed overflow-x-auto border border-slate-800 select-all shadow-inner">
              <pre>{SQL_MIGRATION_SCRIPT}</pre>
            </div>
          </div>
        )}
      </main>

      {/* Modal for viewing detailed SOAP Encounter */}
      {viewingEncounter && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-2xl w-full rounded-3xl p-6 border border-outline-variant/30 clinical-shadow space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-primary/10 text-primary rounded-xl material-symbols-outlined text-lg">
                  clinical_notes
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-on-surface">Detalle de Consulta SOAP</h3>
                  <p className="text-[11px] text-on-surface-variant font-mono">ID: {viewingEncounter.id} • {viewingEncounter.encounter_date}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingEncounter(null)}
                className="text-on-surface-variant hover:text-on-surface text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-surface-container-low rounded-2xl">
                <span className="text-[10px] font-black uppercase text-sky-800 block mb-1">S - Subjetivo</span>
                <p><strong>Motivo:</strong> {viewingEncounter.subjective?.chief_complaint}</p>
                <p className="mt-1 text-on-surface-variant">{viewingEncounter.subjective?.current_illness_history}</p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-2xl">
                <span className="text-[10px] font-black uppercase text-emerald-800 block mb-1">O - Objetivo</span>
                <p>
                  <strong>PA:</strong> {viewingEncounter.objective?.vitals?.blood_pressure_systolic}/{viewingEncounter.objective?.vitals?.blood_pressure_diastolic} mmHg •{' '}
                  <strong>FC:</strong> {viewingEncounter.objective?.vitals?.heart_rate_bpm} lpm •{' '}
                  <strong>SatO2:</strong> {viewingEncounter.objective?.vitals?.oxygen_saturation_pct}%
                </p>
                <p className="mt-1 text-on-surface-variant">{viewingEncounter.objective?.physical_exam}</p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-2xl">
                <span className="text-[10px] font-black uppercase text-amber-800 block mb-1">A - Análisis</span>
                <p><strong>Diagnósticos CIE-10:</strong> {viewingEncounter.assessment?.diagnoses?.map((d) => `${d.code} (${d.description})`).join(', ')}</p>
                <p className="mt-1 text-on-surface-variant">{viewingEncounter.assessment?.clinical_reasoning}</p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-2xl">
                <span className="text-[10px] font-black uppercase text-purple-800 block mb-1">P - Plan</span>
                <p><strong>Objetivos:</strong> {viewingEncounter.plan?.treatment_goals}</p>
                <p className="mt-1 text-on-surface-variant"><strong>Órdenes:</strong> {viewingEncounter.plan?.lab_orders?.join(', ')}</p>
                <p className="mt-1 text-on-surface-variant"><strong>Instrucciones:</strong> {viewingEncounter.plan?.patient_instructions}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => {
                  setViewingPdfEncounter(viewingEncounter);
                  setViewingEncounter(null);
                }}
                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                <span>Ver Informe Oficial (PDF)</span>
              </button>

              <button
                onClick={() => setViewingEncounter(null)}
                className="px-5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-extrabold text-xs rounded-xl border border-outline-variant/40 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for PDF Viewer of SOAP Consultation */}
      {viewingPdfEncounter && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-4xl h-[88vh] rounded-3xl border border-outline-variant/40 shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">
                  picture_as_pdf
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-on-surface">
                    Informe de Consulta Médica (SOAP)
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Paciente: {selectedPatient.first_name} {selectedPatient.last_name} • Fecha: {viewingPdfEncounter.encounter_date}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingPdfEncounter(null)}
                className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Viewer Component */}
            <div className="flex-1 w-full h-full min-h-[500px] overflow-hidden">
              <PdfViewer
                generatePdf={() =>
                  getSoapPdfBlob({
                    patient: selectedPatient,
                    encounter: viewingPdfEncounter,
                    doctorName,
                    doctorLicense,
                    clinicName: tenant?.name || 'KineSys Salud - Centro Clínico Integral',
                  })
                }
                title={`Consulta SOAP - ${selectedPatient.first_name} ${selectedPatient.last_name}`}
                fileName={`Consulta_SOAP_${(selectedPatient.last_name || 'Paciente').replace(/\s+/g, '_')}_${viewingPdfEncounter.encounter_date || 'fecha'}.pdf`}
                height="h-full w-full min-h-[500px]"
                showToolbar={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Role Switcher Banner */}
      <RoleSwitcherBanner onNavigate={onNavigate} currentPath="/medicina-general" />
    </div>
  );
};
