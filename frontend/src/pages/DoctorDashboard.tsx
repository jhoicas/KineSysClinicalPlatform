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
import { SideNavBar } from '../components/layout/SideNavBar';
import { TopNavBar } from '../components/layout/TopNavBar';
import { PdfViewer } from '../components/common/PdfViewer';
import { getSoapPdfBlob } from '../utils/soapPdfExport';

interface DoctorDashboardProps {
  onNavigate: (path: string) => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ onNavigate }) => {
  const { user, tenant } = useAuth();
  const { t } = useI18n();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'patients' | 'soap' | 'prescription' | 'history'>('patients');

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

  return (
    <div className="min-h-screen flex bg-background font-sans text-on-background overflow-hidden">
      <SideNavBar currentPath="/medicina-general" onNavigate={onNavigate} />
      <main className="flex-1 ml-0 md:ml-72 flex flex-col h-screen overflow-hidden">
        <TopNavBar currentPath="/medicina-general" onNavigate={onNavigate} />
        <div className="flex-1 overflow-y-auto pb-24 bg-surface mt-16">
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


        </div>
      </main>
    </div>
  );
};
