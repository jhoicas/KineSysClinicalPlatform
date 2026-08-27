import React, { useState, useEffect } from 'react';
import { useAuth } from '../app/providers/AuthProvider';
import { useI18n } from '../app/providers/I18nProvider';
import { supabase } from '../services/supabaseClient';
import { GeneralMedicalRecord, User } from '../types';
import { SideNavBar } from '../components/layout/SideNavBar';
import { TopNavBar } from '../components/layout/TopNavBar';
import { RoleSwitcherBanner } from '../components/layout/RoleSwitcherBanner';

interface MedicoGeneralPageProps {
  onNavigate: (path: string) => void;
}

export const MedicoGeneralPage: React.FC<MedicoGeneralPageProps> = ({ onNavigate }) => {
  const { tenant, user } = useAuth();
  const { t } = useI18n();
  const [patients, setPatients] = useState<User[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('pat_diego_04');
  const [records, setRecords] = useState<GeneralMedicalRecord[]>([]);

  // Medical form state
  const [bloodPressure, setBloodPressure] = useState<string>('120/80');
  const [heartRate, setHeartRate] = useState<number>(72);
  const [tempCelsius, setTempCelsius] = useState<number>(36.5);
  const [oxygenSat, setOxygenSat] = useState<number>(98);
  const [chiefComplaint, setChiefComplaint] = useState<string>('Evaluación de dolor lumbar y chequeo de aptitud deportiva.');
  const [physicalExam, setPhysicalExam] = useState<string>('Paciente vigil, hidratado. Ruidos cardiacos rítmicos. Lasègue negativo bilateral.');
  const [diagnosisIcd10, setDiagnosisIcd10] = useState<string>('M54.5 - Lumbago no especificado');
  const [prescriptions, setPrescriptions] = useState<Array<{ medication: string; dosage: string; frequency: string; duration: string }>>([
    { medication: 'Paracetamol', dosage: '500 mg', frequency: 'Cada 8 horas', duration: '5 días' },
  ]);
  const [labOrders, setLabOrders] = useState<string>('Hemograma completo, Perfil Bioquímico, Resonancia Magnética Lumbar L1-S1');
  const [evolutionNotes, setEvolutionNotes] = useState<string>('Se deriva a Fisioterapia para 10 sesiones de rehabilitación y fortalecimiento de core.');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    loadPatients();
    loadRecords();
  }, []);

  const loadPatients = async () => {
    const { data } = await supabase.from('users').select('*').eq('role', 'patient');
    if (data && data.length > 0) {
      setPatients(data);
    }
  };

  const loadRecords = async () => {
    const { data } = await supabase.from('general_medical_records').select('*').order('created_at', { ascending: false });
    if (data) {
      setRecords(data);
    }
  };

  const handleAddMedication = () => {
    setPrescriptions([...prescriptions, { medication: '', dosage: '', frequency: '', duration: '' }]);
  };

  const handleSaveMedicalRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: Partial<GeneralMedicalRecord> = {
      tenant_id: tenant?.id || 'tenant_kine_001',
      patient_id: selectedPatientId,
      doctor_id: user?.id || 'prof_doctor_01',
      vital_signs: {
        blood_pressure: bloodPressure,
        heart_rate_bpm: heartRate,
        temp_celsius: tempCelsius,
        oxygen_saturation: oxygenSat,
      },
      chief_complaint: chiefComplaint,
      physical_examination: physicalExam,
      diagnosis_icd10: diagnosisIcd10,
      prescriptions,
      lab_orders: labOrders.split(',').map((s) => s.trim()),
      evolution_notes: evolutionNotes,
    };

    await supabase.from('general_medical_records').insert(newRecord);
    setIsSaved(true);
    loadRecords();
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <SideNavBar currentPath="/medicina-general" onNavigate={onNavigate} />

      <main className="flex-1 md:ml-72 pt-16 pb-20 px-4 sm:px-8 max-w-7xl mx-auto w-full space-y-8">
        <TopNavBar currentPath="/medicina-general" onNavigate={onNavigate} />

        {/* Header */}
        <div className="pt-4 border-b border-outline-variant/30 pb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-black uppercase">
              {t('nav.medicine', 'Módulo Medicina General')}
            </span>
            <span className="text-xs text-on-surface-variant font-bold">RBAC</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight mt-1">
            {t('medicine.title', 'Consulta Médica General & Prescripciones')}
          </h1>
          <p className="text-xs text-on-surface-variant">
            {t('medicine.subtitle', 'Registro de anamnesis, constantes vitales, examen físico y emisión de recetas.')}
          </p>
        </div>

        {/* Patient Selection */}
        <div className="flex items-center gap-4 bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/30">
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider">{t('nutrition.active_patient', 'Paciente')}:</span>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-1.5 text-xs font-bold text-on-surface"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.rut_or_dni || p.email})
              </option>
            ))}
          </select>
        </div>

        {/* Medical Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={handleSaveMedicalRecord} className="lg:col-span-2 space-y-6">
            {/* Vital Signs */}
            <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 space-y-4 shadow-sm">
              <h2 className="text-sm font-extrabold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-sky-600">vital_signs</span>
                <span>{t('medicine.vital_signs', 'Signos Vitales y Triaje')}</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-on-surface-variant mb-1">{t('medicine.blood_pressure', 'Presión Arterial (mmHg)')}</label>
                  <input
                    type="text"
                    value={bloodPressure}
                    onChange={(e) => setBloodPressure(e.target.value)}
                    placeholder="120/80"
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-surface"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-on-surface-variant mb-1">{t('medicine.heart_rate', 'Frecuencia Cardíaca (lpm)')}</label>
                  <input
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(Number(e.target.value))}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-surface"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-on-surface-variant mb-1">{t('medicine.temperature', 'Temperatura (°C)')}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tempCelsius}
                    onChange={(e) => setTempCelsius(Number(e.target.value))}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-surface"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-on-surface-variant mb-1">{t('medicine.oxygen_sat', 'Saturación O₂ (%)')}</label>
                  <input
                    type="number"
                    value={oxygenSat}
                    onChange={(e) => setOxygenSat(Number(e.target.value))}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-sky-700"
                  />
                </div>
              </div>
            </div>

            {/* Anamnesis & Diagnosis */}
            <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 space-y-4 shadow-sm">
              <h2 className="text-sm font-extrabold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-sky-600">description</span>
                <span>{t('medicine.chief_complaint', 'Motivo de Consulta')} & {t('medicine.diagnosis', 'Diagnóstico CIE-10')}</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-on-surface-variant mb-1">{t('medicine.chief_complaint', 'Motivo de Consulta (Anamnesis)')}</label>
                  <input
                    type="text"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs text-on-surface"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-on-surface-variant mb-1">{t('medicine.physical_exam', 'Examen Físico Segmentario')}</label>
                  <textarea
                    rows={2}
                    value={physicalExam}
                    onChange={(e) => setPhysicalExam(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl p-3 text-xs text-on-surface"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-on-surface-variant mb-1">{t('medicine.diagnosis', 'Diagnóstico Principal (CIE-10)')}</label>
                  <input
                    type="text"
                    value={diagnosisIcd10}
                    onChange={(e) => setDiagnosisIcd10(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-bold text-on-surface"
                  />
                </div>
              </div>
            </div>

            {/* Electronic Prescription */}
            <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-sky-600">medication</span>
                  <span>{t('medicine.prescription', 'Receta Médica Electrónica')}</span>
                </h2>
                <button
                  type="button"
                  onClick={handleAddMedication}
                  className="px-2.5 py-1 bg-sky-100 text-sky-800 text-[11px] font-bold rounded-lg hover:bg-sky-200 transition-colors cursor-pointer"
                >
                  + {t('medicine.add_medication', 'Agregar Medicamento')}
                </button>
              </div>

              {prescriptions.map((p, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs bg-surface-container-low p-3 rounded-2xl">
                  <input
                    type="text"
                    placeholder={t('medicine.medication_name', 'Medicamento')}
                    value={p.medication}
                    onChange={(e) => {
                      const copy = [...prescriptions];
                      copy[idx].medication = e.target.value;
                      setPrescriptions(copy);
                    }}
                    className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                  />
                  <input
                    type="text"
                    placeholder={t('medicine.dosage', 'Dosis')}
                    value={p.dosage}
                    onChange={(e) => {
                      const copy = [...prescriptions];
                      copy[idx].dosage = e.target.value;
                      setPrescriptions(copy);
                    }}
                    className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder={t('medicine.frequency', 'Frecuencia')}
                    value={p.frequency}
                    onChange={(e) => {
                      const copy = [...prescriptions];
                      copy[idx].frequency = e.target.value;
                      setPrescriptions(copy);
                    }}
                    className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder={t('medicine.duration', 'Duración')}
                    value={p.duration}
                    onChange={(e) => {
                      const copy = [...prescriptions];
                      copy[idx].duration = e.target.value;
                      setPrescriptions(copy);
                    }}
                    className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-2.5 py-1.5 text-xs"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {t('medicine.lab_orders', 'Órdenes de Exámenes e Imagenología')}
                </label>
                <input
                  type="text"
                  value={labOrders}
                  onChange={(e) => setLabOrders(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs text-on-surface"
                />
              </div>

              {isSaved && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
                  <span>{t('medicine.saved_success', '¡Consulta médica guardada!')}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-primary hover:bg-primary-container text-white rounded-2xl text-xs font-extrabold transition-all shadow-md shadow-primary/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">save</span>
                <span>{t('medicine.save_record', 'Guardar Consulta Médica')}</span>
              </button>
            </div>
          </form>

          {/* Right Column: Past Records */}
          <div className="space-y-4">
            <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-extrabold text-on-surface">{t('medicine.history_title', 'Historial de Consultas Médicas')}</h3>
              <div className="space-y-3">
                {records.map((rec) => (
                  <div key={rec.id} className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-on-surface">{rec.diagnosis_icd10}</span>
                      <span className="text-[10px] text-on-surface-variant font-mono">
                        {new Date(rec.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-on-surface-variant">
                      <p><strong>PA:</strong> {rec.vital_signs?.blood_pressure} • <strong>FC:</strong> {rec.vital_signs?.heart_rate_bpm} lpm</p>
                    </div>
                    <p className="text-[11px] text-on-surface-variant line-clamp-2">
                      {rec.evolution_notes}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <RoleSwitcherBanner onNavigate={onNavigate} currentPath="/medicina-general" />
    </div>
  );
};
