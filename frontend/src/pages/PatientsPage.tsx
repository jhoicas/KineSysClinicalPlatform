import React, { useState, useEffect } from 'react';
import { useAuth } from '../app/providers/AuthProvider';
import { useI18n } from '../app/providers/I18nProvider';
import { getPatients, createPatient } from '../services/supabaseClient';
import { PacienteClinico } from '../types';
import { SideNavBar } from '../components/layout/SideNavBar';
import { TopNavBar } from '../components/layout/TopNavBar';
import { MedicalHistoryModal } from '../components/patients/MedicalHistoryModal';
import { PatientRegistrationModal } from '../components/patients/PatientRegistrationModal';
import { PatientRegistrationFormData } from '../schemas/patientSchema';
import { ToastContainer, ToastMessage } from '../components/common/Toast';
import { User } from '../types';

interface PatientsPageProps {
  onNavigate?: (path: string) => void;
}

export function PatientsPage({ onNavigate }: PatientsPageProps) {
  const { tenantId } = useAuth();
  const { t } = useI18n();
  const [patients, setPatients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<User | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    fetchPatients();

    const handleDataUpdate = (e: any) => {
      if (e.detail?.table === 'pacientes_clinicos' || e.detail?.table === 'all') {
        fetchPatients();
      }
    };
    window.addEventListener('kinesys_data_updated', handleDataUpdate);
    return () => window.removeEventListener('kinesys_data_updated', handleDataUpdate);
  }, [tenantId]);

  const mapPatientToUser = (p: PacienteClinico): User => ({
    id: p.id,
    full_name: `${p.first_name} ${p.last_name}`.trim(),
    email: p.telecom_email,
    phone: p.telecom_phone,
    role: 'patient',
    tenant_id: p.tenant_id,
    rut_or_dni: p.identifier_number,
    gender: p.gender,
    birth_date: p.birth_date,
    medical_conditions: p.chronic_conditions,
    allergies: p.known_allergies,
    emergency_contact: p.emergency_contact,
    created_at: p.created_at,
  });

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const data = await getPatients(tenantId);
      setPatients(data.map(mapPatientToUser));
    } catch (error) {
      console.error('Error fetching patients:', error);
      addToast('error', t('common.error', 'Error al cargar pacientes'), 'No se pudieron obtener los pacientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatientValidated = async (formData: PatientRegistrationFormData) => {
    try {
      const nameParts = formData.full_name.trim().split(/\s+/);
      const firstName = nameParts[0] || formData.full_name;
      const lastName = nameParts.slice(1).join(' ') || firstName;

      await createPatient(tenantId, {
        identifier_type: 'CC',
        identifier_number: formData.rut_or_dni,
        first_name: firstName,
        last_name: lastName,
        gender: (formData.gender as PacienteClinico['gender']) || 'unknown',
        birth_date: formData.birth_date || '',
        telecom_phone: formData.phone,
        telecom_email: formData.email,
        known_allergies: formData.allergies ? [formData.allergies] : [],
        chronic_conditions: formData.medical_conditions ? [formData.medical_conditions] : [],
        emergency_contact: formData.emergency_contact_name
          ? {
              name: formData.emergency_contact_name,
              phone: formData.emergency_contact_phone || '',
              relationship: 'contacto',
            }
          : undefined,
        active: true,
      });

      addToast(
        'success',
        t('patients.add_patient', 'Paciente Registrado'),
        `${formData.full_name} guardado con éxito en el sistema.`
      );
      fetchPatients();
    } catch (err: any) {
      console.error('Error creating patient:', err);
      addToast(
        'error',
        t('common.error', 'Error al crear paciente'),
        err?.message || 'Revisa los campos e intenta nuevamente.'
      );
      throw err;
    }
  };

  const handleOpenHistory = (patient: User) => {
    setSelectedPatient(patient);
    setIsHistoryModalOpen(true);
  };

  const filteredPatients = patients.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(query) ||
      p.email.toLowerCase().includes(query) ||
      (p.phone && p.phone.toLowerCase().includes(query)) ||
      (p.rut_or_dni && p.rut_or_dni.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen flex bg-background font-sans text-on-background overflow-hidden">
      <SideNavBar currentPath="/pacientes" onNavigate={onNavigate} />

      <main className="flex-1 ml-0 md:ml-72 flex flex-col h-screen overflow-hidden">
        <TopNavBar currentPath="/pacientes" onNavigate={onNavigate} />

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto pt-[80px] pb-12 px-6 md:px-10">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary/10 text-primary material-symbols-outlined text-2xl">
                  group
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight">
                  {t('patients.title', 'Directorio de Pacientes')}
                </h2>
              </div>
              <p className="text-sm text-on-surface-variant mt-1">
                {t('patients.subtitle', 'Gestión integral de fichas clínicas, antecedentes y trazabilidad anatómica.')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-72 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 clinical-shadow flex items-center px-3">
                <span className="material-symbols-outlined text-outline text-xl">search</span>
                <input
                  id="search-patients-input"
                  type="text"
                  placeholder={t('patients.search_placeholder', 'Buscar por nombre, RUT, email...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent p-2.5 text-xs font-semibold text-on-surface outline-none placeholder:text-outline"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>

              {/* Add Patient Button */}
              <button
                id="btn-add-new-patient"
                onClick={() => setIsNewPatientModalOpen(true)}
                className="bg-primary hover:bg-primary-container text-white text-xs font-extrabold px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-sm shadow-primary/20 transition-all cursor-pointer whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                {t('patients.add_patient', 'Nuevo Paciente')}
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 clinical-shadow flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">how_to_reg</span>
              </div>
              <div>
                <p className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider">
                  {t('patients.total_registered', 'Total Registrados')}
                </p>
                <p className="text-2xl font-black text-primary">{patients.length}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 clinical-shadow flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">medical_information</span>
              </div>
              <div>
                <p className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider">
                  {t('patients.active_history', 'Con Ficha Activa')}
                </p>
                <p className="text-2xl font-black text-secondary">{patients.length}</p>
              </div>
            </div>
          </div>

          {/* Patients Table Card */}
          <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 clinical-shadow overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center py-24 opacity-70">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
                <p className="text-xs font-bold mt-2 text-on-surface-variant">{t('common.loading', 'Cargando pacientes...')}</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-16 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl mb-2 text-outline/50">person_off</span>
                <p className="text-base font-bold text-on-surface">{t('patients.no_patients', 'No se encontraron pacientes')}</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {searchQuery ? t('patients.try_other_search', 'Prueba con otro término de búsqueda.') : t('patients.create_first_patient', 'Crea tu primer paciente usando el botón superior.')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table id="patients-data-table" className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/20 bg-surface-container-low/60 text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant">
                      <th className="py-4 px-6">{t('patients.name', 'Paciente')}</th>
                      <th className="py-4 px-6">{t('patients.contact', 'Contacto')}</th>
                      <th className="py-4 px-6">{t('patients.diagnosis', 'Condición Principal')}</th>
                      <th className="py-4 px-6 text-center">{t('patients.status', 'Estado')}</th>
                      <th className="py-4 px-6 text-right">{t('patients.actions', 'Acción Clínica')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 text-sm">
                    {filteredPatients.map((patient) => (
                      <tr
                        key={patient.id}
                        id={`patient-row-${patient.id}`}
                        className="hover:bg-surface-container-low/40 transition-colors group"
                      >
                        {/* Paciente / Nombre / ID */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <img
                              src={
                                patient.avatar_url ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                              }
                              alt={patient.full_name}
                              className="w-11 h-11 rounded-2xl object-cover border-2 border-outline-variant/30"
                            />
                            <div>
                              <p className="font-extrabold text-on-surface group-hover:text-primary transition-colors">
                                {patient.full_name}
                              </p>
                              <p className="text-[11px] text-on-surface-variant font-mono">
                                {t('patients.rut', 'ID')}: {patient.rut_or_dni || 'Sin RUT'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Contacto: Email & Teléfono */}
                        <td className="py-4 px-6">
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[14px] text-outline">mail</span>
                              {patient.email}
                            </p>
                            <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[14px] text-outline">call</span>
                              {patient.phone || 'No registrado'}
                            </p>
                          </div>
                        </td>

                        {/* Condición / Diagnóstico */}
                        <td className="py-4 px-6">
                          {patient.medical_conditions && patient.medical_conditions.length > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                              {patient.medical_conditions[0]}
                            </span>
                          ) : (
                            <span className="text-xs text-on-surface-variant italic">Kinesiología General</span>
                          )}
                        </td>

                        {/* Rol / Status */}
                        <td className="py-4 px-6 text-center">
                          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            {t('patients.active_status', 'Activo')}
                          </span>
                        </td>

                        {/* Botón Simulado: Ver Historia Clínica */}
                        <td className="py-4 px-6 text-right">
                          <button
                            id={`btn-view-history-${patient.id}`}
                            onClick={() => handleOpenHistory(patient)}
                            className="bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-base">clinical_notes</span>
                            <span>{t('patients.view_history', 'Ver Historia Clínica')}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Patient Modal powered by React Hook Form & Zod */}
      <PatientRegistrationModal
        isOpen={isNewPatientModalOpen}
        onClose={() => setIsNewPatientModalOpen(false)}
        onSubmitPatient={handleCreatePatientValidated}
        tenantId={tenantId}
      />

      {/* Medical History Modal */}
      <MedicalHistoryModal
        patient={selectedPatient}
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onNavigateToPainMap={() => {
          if (onNavigate) onNavigate('/mapa-dolor');
        }}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
