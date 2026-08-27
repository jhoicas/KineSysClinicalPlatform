import React, { useState, useEffect } from 'react';
import { useAuth } from '../app/providers/AuthProvider';
import { useI18n } from '../app/providers/I18nProvider';
import { supabase } from '../services/supabaseClient';
import { SideNavBar } from '../components/layout/SideNavBar';
import { TopNavBar } from '../components/layout/TopNavBar';
import { PatientSearchCombobox } from '../components/common/PatientSearchCombobox';
import { formatDateTime } from '../utils/dateUtils';
import { NewAppointmentModal } from '../components/calendar/NewAppointmentModal';
import { MedicalHistoryModal } from '../components/patients/MedicalHistoryModal';
import { ToastContainer, ToastMessage } from '../components/common/Toast';
import { useAppStore } from '../store/useAppStore';
import { User, AppointmentStatus } from '../types';

interface AppointmentWithPatient {
  id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  room_or_box?: string;
  patient_id?: string;
  patient?: {
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
    rut_or_dni?: string;
  };
}

interface CalendarPageProps {
  onNavigate?: (path: string) => void;
}

export function CalendarPage({ onNavigate }: CalendarPageProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { activePatient, setActivePatient } = useAppStore();
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<User | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    fetchAppointments();

    const handleDataUpdate = (e: any) => {
      if (e.detail?.table === 'appointments' || e.detail?.table === 'all') {
        fetchAppointments();
      }
    };
    window.addEventListener('kinesys_data_updated', handleDataUpdate);
    return () => window.removeEventListener('kinesys_data_updated', handleDataUpdate);
  }, [selectedDate, user]);

  const fetchAppointments = async () => {
    if (!user) return;
    setLoading(true);

    const startOfDay = `${selectedDate}T00:00:00Z`;
    const endOfDay = `${selectedDate}T23:59:59Z`;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          reason,
          notes,
          room_or_box,
          patient_id,
          patient:users!patient_id (
            full_name,
            email,
            phone,
            avatar_url,
            rut_or_dni
          )
        `)
        .eq('professional_id', user.id)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAppointments((data as any) || []);
    } catch (error) {
      console.error('Error fetching calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (apptId: string, newStatus: AppointmentStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', apptId);

      if (error) throw error;
      addToast('success', t('common.success', 'Estado Actualizado'), `${newStatus.toUpperCase()}`);
      fetchAppointments();
    } catch (err) {
      console.error('Error updating appointment:', err);
      addToast('error', t('common.error', 'Error al actualizar'), 'No se pudo cambiar el estado de la cita.');
    }
  };

  const handleSelectAppointmentPatient = async (
    appt: AppointmentWithPatient,
    targetRoute?: string
  ) => {
    let patientData: any = null;

    if (appt.patient_id) {
      const { data } = await supabase.from('users').select('*').eq('id', appt.patient_id).single();
      if (data) {
        patientData = data;
      }
    }

    if (!patientData && appt.patient) {
      patientData = {
        id: appt.patient_id || 'pat_demo_selected',
        full_name: appt.patient.full_name,
        email: appt.patient.email,
        phone: appt.patient.phone,
        avatar_url: appt.patient.avatar_url,
        rut_or_dni: appt.patient.rut_or_dni,
        role: 'patient',
        tenant_id: user?.tenant_id || 'tenant_kine_001',
        created_at: new Date().toISOString(),
      };
    }

    if (patientData) {
      setActivePatient(patientData);
      addToast(
        'success',
        t('patient.active_session', 'Paciente Activo en Sesión'),
        `${patientData.full_name} (${patientData.rut_or_dni || patientData.email})`
      );

      if (targetRoute && onNavigate) {
        onNavigate(targetRoute);
      } else if (onNavigate) {
        // Redirigir según la especialidad del profesional
        if (user?.role === 'nutricionista') {
          onNavigate('/nutricion');
        } else if (user?.role === 'medico_general') {
          onNavigate('/medicina-general');
        } else {
          onNavigate('/mapa-dolor');
        }
      }
    }
  };

  const handleOpenPatientHistory = async (patientId?: string, fallbackPatient?: any) => {
    if (patientId) {
      const { data } = await supabase.from('users').select('*').eq('id', patientId).single();
      if (data) {
        setActivePatient(data);
        setSelectedPatientForHistory(data);
        setIsHistoryModalOpen(true);
        return;
      }
    }

    if (fallbackPatient) {
      const mockPatient: any = {
        id: patientId || 'pat_demo',
        full_name: fallbackPatient.full_name,
        email: fallbackPatient.email,
        phone: fallbackPatient.phone,
        role: 'patient',
        tenant_id: user?.tenant_id || 'tenant_kine_001',
        avatar_url: fallbackPatient.avatar_url,
        rut_or_dni: fallbackPatient.rut_or_dni,
        created_at: new Date().toISOString(),
      };
      setActivePatient(mockPatient);
      setSelectedPatientForHistory(mockPatient);
      setIsHistoryModalOpen(true);
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'booked':
        return 'bg-primary/10 text-primary border-primary/30';
      case 'confirmed':
        return 'bg-secondary-container text-on-secondary-container border-secondary/20';
      case 'completed':
        return 'bg-surface-container-highest text-on-surface-variant border-outline-variant/40';
      case 'cancelled':
        return 'bg-error-container text-on-error-container border-error/20';
      case 'no_show':
        return 'bg-amber-500/20 text-on-surface border-amber-500/30';
      default:
        return 'bg-surface-container-high text-on-surface-variant border-outline-variant';
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    if (statusFilter === 'all') return true;
    return appt.status === statusFilter;
  });

  return (
    <div className="min-h-screen flex bg-background font-sans text-on-background overflow-hidden">
      <SideNavBar currentPath="/calendario" onNavigate={onNavigate} />

      <main className="flex-1 ml-0 md:ml-72 flex flex-col h-screen overflow-hidden">
        <TopNavBar
          currentPath="/calendario"
          onNavigate={onNavigate}
          onOpenNewAppointment={() => setIsNewModalOpen(true)}
        />

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto pt-[80px] pb-12 px-6 md:px-10">
          {/* Calendar Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary/10 text-primary material-symbols-outlined text-2xl">
                  calendar_month
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight">
                  {t('calendar.title', 'Agenda y Calendario Clínico')}
                </h2>
              </div>
              <p className="text-sm text-on-surface-variant mt-1">
                {t('calendar.subtitle', 'Gestión de consultas kinésicas, evaluaciones y citas.')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Patient Quick Context Combobox */}
              <div className="w-full sm:w-72">
                <PatientSearchCombobox
                  variant="compact"
                  placeholder="Buscar y activar paciente..."
                  onSelectPatient={(p) => {
                    addToast(
                      'success',
                      t('patient.active_session', 'Paciente Activo'),
                      `${p.full_name} seleccionado en sesión.`
                    );
                  }}
                />
              </div>

              {/* Date Selector Tool */}
              <div className="flex items-center gap-2 bg-surface-container-lowest p-2 rounded-2xl clinical-shadow border border-outline-variant/30">
                <span className="material-symbols-outlined text-primary text-lg pl-1">today</span>
                <input
                  id="calendar-date-picker"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold text-on-surface outline-none cursor-pointer p-1"
                />
                <div className="h-6 w-px bg-outline-variant/30"></div>
                <button
                  id="btn-calendar-today"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="text-xs font-bold text-primary hover:underline px-2 cursor-pointer"
                >
                  {t('calendar.today', 'Hoy')}
                </button>
              </div>

              {/* Status Filter */}
              <select
                id="select-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/30 text-xs font-bold text-on-surface p-2.5 rounded-2xl clinical-shadow outline-none cursor-pointer"
              >
                <option value="all">{t('calendar.all_appointments', 'Todos los estados')} ({appointments.length})</option>
                <option value="booked">{t('calendar.status_booked', 'Reservada (Booked)')}</option>
                <option value="confirmed">{t('calendar.status_confirmed', 'Confirmada')}</option>
                <option value="completed">{t('calendar.status_completed', 'Realizada')}</option>
                <option value="cancelled">{t('calendar.status_cancelled', 'Cancelada')}</option>
                <option value="no_show">{t('calendar.status_no_show', 'No Asistió')}</option>
              </select>

              {/* Add Appointment Button */}
              <button
                id="btn-add-appointment"
                onClick={() => setIsNewModalOpen(true)}
                className="bg-primary hover:bg-primary-container text-white text-xs font-extrabold px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-sm shadow-primary/20 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add</span>
                {t('calendar.new_appointment', 'Nueva Cita')}
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 clinical-shadow">
              <p className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider">{t('calendar.today', 'Citas Hoy')}</p>
              <p className="text-2xl font-black text-primary mt-1">{appointments.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 clinical-shadow">
              <p className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider">{t('calendar.status_confirmed', 'Confirmadas')}</p>
              <p className="text-2xl font-black text-secondary mt-1">
                {appointments.filter((a) => a.status === 'confirmed').length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 clinical-shadow">
              <p className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider">{t('calendar.status_completed', 'Realizadas')}</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {appointments.filter((a) => a.status === 'completed').length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 clinical-shadow">
              <p className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider">{t('calendar.status_cancelled', 'Canceladas')}</p>
              <p className="text-2xl font-black text-red-500 mt-1">
                {appointments.filter((a) => a.status === 'cancelled' || a.status === 'no_show').length}
              </p>
            </div>
          </div>

          {/* Appointments Grid/List */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center py-20 opacity-70">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
                <p className="text-xs font-bold mt-2 text-on-surface-variant">{t('common.loading', 'Sincronizando agenda...')}</p>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="bg-surface-container-low border border-dashed border-outline-variant rounded-3xl py-20 flex flex-col items-center justify-center text-on-surface-variant text-center px-4">
                <span className="material-symbols-outlined text-5xl mb-2 text-primary/40">calendar_today</span>
                <p className="text-base font-bold text-on-surface">{t('calendar.no_appointments', 'No hay citas registradas para este día')}</p>
                <p className="text-xs text-on-surface-variant mt-1 max-w-sm">
                  {t('calendar.schedule_new_desc', 'Selecciona otra fecha o pulsa el botón para agendar una nueva consulta.')}
                </p>
                <button
                  id="btn-empty-create-appointment"
                  onClick={() => setIsNewModalOpen(true)}
                  className="mt-5 text-white bg-primary hover:bg-primary-container text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span> {t('calendar.new_appointment', 'Nueva Cita')}
                </button>
              </div>
            ) : (
              filteredAppointments.map((appt) => (
                <div
                  key={appt.id}
                  id={`appointment-card-${appt.id}`}
                  className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 clinical-shadow flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:border-primary/40 transition-all group"
                >
                  {/* Time & Patient Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-5 w-full lg:w-auto">
                    {/* Time block */}
                    <div className="text-left sm:text-center min-w-[90px] bg-surface-container-low sm:bg-transparent p-2.5 sm:p-0 rounded-xl">
                      <p className="text-lg font-black text-primary leading-none">
                        {new Date(appt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-tight mt-1">
                        - {new Date(appt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {appt.room_or_box && (
                        <span className="inline-block mt-1 text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {appt.room_or_box}
                        </span>
                      )}
                    </div>

                    <div className="h-10 w-px bg-outline-variant/30 hidden sm:block"></div>

                    {/* Patient detail */}
                    <div
                      onClick={() => handleSelectAppointmentPatient(appt)}
                      className="flex items-center gap-3.5 cursor-pointer"
                      title="Activar paciente en sesión"
                    >
                      <div className="relative">
                        <img
                          src={
                            appt.patient?.avatar_url ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                          }
                          alt="Avatar"
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-outline-variant/30 group-hover:border-primary transition-colors"
                        />
                        {activePatient?.id === appt.patient_id && (
                          <span
                            className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-surface-container-lowest rounded-full"
                            title="Paciente activo en sesión"
                          />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-on-surface text-base group-hover:text-primary transition-colors flex items-center gap-1.5">
                            <span>{appt.patient?.full_name || 'Paciente'}</span>
                            {activePatient?.id === appt.patient_id && (
                              <span className="text-[10px] bg-primary/10 text-primary font-black px-1.5 py-0.5 rounded">
                                ACTIVO
                              </span>
                            )}
                          </h4>
                        </div>
                        <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[13px] text-outline">mail</span>
                          {appt.patient?.email || 'Sin correo'}
                        </p>
                        {appt.reason && (
                          <p className="text-xs font-medium text-on-surface/80 mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-primary">clinical_notes</span>
                            {appt.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions, Quick Status & Buttons */}
                  <div className="flex flex-wrap items-center justify-between w-full lg:w-auto lg:justify-end gap-2.5 border-t lg:border-t-0 pt-4 lg:pt-0">
                    {/* Status Pill & Quick Change */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`px-3.5 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-wider ${getStatusStyles(
                          appt.status
                        )}`}
                      >
                        {appt.status.replace('_', ' ')}
                      </div>

                      {/* Quick Status dropdown */}
                      <select
                        value={appt.status}
                        onChange={(e) =>
                          updateAppointmentStatus(appt.id, e.target.value as AppointmentStatus)
                        }
                        className="text-[11px] font-bold bg-surface-container-low border border-outline-variant/30 rounded-xl px-2 py-1 text-on-surface outline-none cursor-pointer hover:bg-surface-container"
                        title="Cambiar estado"
                      >
                        <option value="booked">Booked</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No Show</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Iniciar Consulta / Activar Paciente CTA */}
                      <button
                        id={`btn-attend-${appt.id}`}
                        onClick={() => handleSelectAppointmentPatient(appt)}
                        className="px-3 py-1.5 bg-primary text-white hover:bg-primary-container rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="Activar paciente e ir al dashboard clínico"
                      >
                        <span className="material-symbols-outlined text-base">play_arrow</span>
                        <span>{t('calendar.attend', 'Atender')}</span>
                      </button>

                      {/* Medical History Trigger */}
                      <button
                        id={`btn-history-${appt.id}`}
                        onClick={() => handleOpenPatientHistory(appt.patient_id, appt.patient)}
                        className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Ver Historia Clínica"
                      >
                        <span className="material-symbols-outlined text-base">clinical_notes</span>
                        <span className="hidden sm:inline">{t('patients.view_history', 'Ficha')}</span>
                      </button>

                      {/* Mapa de Dolor Shortcut */}
                      <button
                        onClick={() => handleSelectAppointmentPatient(appt, '/mapa-dolor')}
                        className="p-2 bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-primary rounded-xl transition-colors cursor-pointer"
                        title="Ir a Mapa de Dolor con este paciente"
                      >
                        <span className="material-symbols-outlined text-lg">accessibility_new</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* New Appointment Modal */}
      <NewAppointmentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        defaultDate={selectedDate}
        onSuccess={() => {
          fetchAppointments();
          addToast('success', t('calendar.new_appointment', 'Cita Agendada'), 'La consulta fue guardada exitosamente.');
        }}
      />

      {/* Medical History Modal */}
      <MedicalHistoryModal
        patient={selectedPatientForHistory}
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
