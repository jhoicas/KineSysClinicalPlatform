import React, { useState, useEffect } from 'react';
import { useAuth } from '../app/providers/AuthProvider';
import { useI18n } from '../app/providers/I18nProvider';
import { supabase } from '../services/supabaseClient';
import { SideNavBar } from '../components/layout/SideNavBar';
import { TopNavBar } from '../components/layout/TopNavBar';
import { PatientSearchCombobox } from '../components/common/PatientSearchCombobox';
import { NewAppointmentModal, AppointmentToEdit } from '../components/calendar/NewAppointmentModal';
import { MedicalHistoryModal } from '../components/patients/MedicalHistoryModal';
import { ToastContainer, ToastMessage } from '../components/common/Toast';
import { useAppStore } from '../store/useAppStore';
import { User, AppointmentStatus, Appointment } from '../types';

export function CalendarPage({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const { user, tenantId } = useAuth();
  const { t } = useI18n();
  const { activePatient, setActivePatient } = useAppStore();

  // Appointments & Filter state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentToEdit | null>(null);
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<User | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Fetch professionals on mount
  useEffect(() => {
    fetchProfessionals();
  }, [tenantId]);

  // Fetch appointments when date, professional or user changes
  useEffect(() => {
    fetchAppointments();

    const handleDataUpdate = (e: any) => {
      if (e.detail?.table === 'appointments' || e.detail?.table === 'all') {
        fetchAppointments();
      }
    };
    window.addEventListener('kinesys_data_updated', handleDataUpdate);
    return () => window.removeEventListener('kinesys_data_updated', handleDataUpdate);
  }, [selectedDate, selectedProfessionalId, user, tenantId]);

  const fetchProfessionals = async () => {
    try {
      const { data } = await supabase.from('users').select('*');
      if (data) {
        const clinicalUsers = (data as User[]).filter(
          (u) =>
            u.role === 'fisioterapeuta' ||
            u.role === 'nutricionista' ||
            u.role === 'medico_general' ||
            u.role === 'clinic_admin' ||
            u.role === 'super_admin'
        );
        setProfessionals(clinicalUsers);
      }
    } catch (err) {
      console.warn('Error fetching professionals:', err);
    }
  };

  const fetchAppointments = async () => {
    if (!user) return;
    setLoading(true);

    const startOfDay = `${selectedDate}T00:00:00Z`;
    const endOfDay = `${selectedDate}T23:59:59Z`;

    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .order('start_time', { ascending: true });

      if (selectedProfessionalId !== 'all') {
        query = query.eq('professional_id', selectedProfessionalId);
      } else if (user.role === 'fisioterapeuta' || user.role === 'nutricionista' || user.role === 'medico_general') {
        // By default show this professional's appointments unless set to all
        // Let user see all if they change filter
      }

      const { data, error } = await query;
      if (error) throw error;
      setAppointments((data as Appointment[]) || []);
    } catch (error) {
      console.error('Error fetching calendar appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Date stepper helpers
  const handleStepDay = (direction: 'prev' | 'next') => {
    const current = new Date(selectedDate + 'T12:00:00');
    if (direction === 'prev') {
      current.setDate(current.getDate() - 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const updateAppointmentStatus = async (apptId: string, newStatus: AppointmentStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .eq('id', apptId)
        .update({ status: newStatus });

      if (error) throw error;
      addToast(
        'success',
        t('common.success', 'Estado Actualizado'),
        `Cita marcada como: ${newStatus.toUpperCase()}`
      );
      fetchAppointments();
    } catch (err) {
      console.error('Error updating appointment:', err);
      addToast('error', t('common.error', 'Error al actualizar'), 'No se pudo cambiar el estado de la cita.');
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    if (!window.confirm('¿Deseas marcar esta cita como CANCELADA?')) return;
    await updateAppointmentStatus(apptId, 'cancelled');
  };

  const handleOpenEditModal = (appt: Appointment) => {
    setEditingAppointment(appt);
    setIsNewModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingAppointment(null);
    setIsNewModalOpen(true);
  };

  const handleSelectAppointmentPatient = async (
    appt: Appointment,
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
        id: appt.patient_id || 'pat_selected',
        full_name: appt.patient.full_name,
        email: appt.patient.email,
        phone: appt.patient.phone,
        avatar_url: appt.patient.avatar_url,
        rut_or_dni: appt.patient.rut_or_dni,
        role: 'patient',
        tenant_id: tenantId || 'tenant_kine_001',
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
        // Redirigir según el motivo de la cita o rol del profesional
        const reasonLower = (appt.reason || '').toLowerCase();
        if (reasonLower.includes('nutri') || user?.role === 'nutricionista') {
          onNavigate('/nutricion');
        } else if (reasonLower.includes('médic') || reasonLower.includes('medic') || user?.role === 'medico_general') {
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
        tenant_id: tenantId || 'tenant_kine_001',
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
        return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
      case 'confirmed':
        return 'bg-secondary/15 text-secondary border-secondary/30 font-extrabold';
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800';
      case 'no_show':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      default:
        return 'bg-surface-container-high text-on-surface-variant border-outline-variant';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'booked':
        return 'Reservada';
      case 'confirmed':
        return 'Confirmada';
      case 'completed':
        return 'Atendida';
      case 'cancelled':
        return 'Cancelada';
      case 'no_show':
        return 'Inasistencia';
      default:
        return status;
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    if (statusFilter !== 'all' && appt.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const patientName = (appt.patient?.full_name || '').toLowerCase();
      const patientEmail = (appt.patient?.email || '').toLowerCase();
      const patientDoc = (appt.patient?.rut_or_dni || '').toLowerCase();
      const reasonText = (appt.reason || '').toLowerCase();
      const profName = (appt.professional?.full_name || '').toLowerCase();
      return (
        patientName.includes(q) ||
        patientEmail.includes(q) ||
        patientDoc.includes(q) ||
        reasonText.includes(q) ||
        profName.includes(q)
      );
    }
    return true;
  });

  const formattedDateHeader = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen flex bg-background font-sans text-on-background overflow-hidden">
      <SideNavBar currentPath="/calendario" onNavigate={onNavigate} />

      <main className="flex-1 ml-0 md:ml-72 flex flex-col h-screen overflow-hidden">
        <TopNavBar
          currentPath="/calendario"
          onNavigate={onNavigate}
          onOpenNewAppointment={handleOpenCreateModal}
        />

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto pt-[80px] pb-12 px-6 md:px-10">
          {/* Calendar Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary/10 text-primary material-symbols-outlined text-2xl">
                  calendar_month
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight">
                  {t('calendar.title', 'Agenda y Calendario Clínico')}
                </h2>
              </div>
              <p className="text-xs md:text-sm text-on-surface-variant mt-1 capitalize">
                {formattedDateHeader} • Sincronización en tiempo real con Supabase
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Patient Quick Context Combobox */}
              <div className="w-full sm:w-64">
                <PatientSearchCombobox
                  variant="compact"
                  placeholder="Buscar paciente..."
                  onSelectPatient={(p) => {
                    setActivePatient(p);
                    addToast(
                      'success',
                      t('patient.active_session', 'Paciente Activo'),
                      `${p.full_name} seleccionado en sesión.`
                    );
                  }}
                />
              </div>

              {/* Date Stepper Tool */}
              <div className="flex items-center bg-surface-container-lowest p-1.5 rounded-2xl clinical-shadow border border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => handleStepDay('prev')}
                  className="p-1.5 hover:bg-surface-container-high rounded-xl text-on-surface-variant transition-colors cursor-pointer"
                  title="Día anterior"
                >
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>

                <button
                  id="btn-calendar-today"
                  type="button"
                  onClick={handleSetToday}
                  className="px-2.5 py-1 text-xs font-black text-primary hover:bg-primary/10 rounded-xl transition-colors cursor-pointer"
                >
                  {t('calendar.today', 'Hoy')}
                </button>

                <input
                  id="calendar-date-picker"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-on-surface outline-none cursor-pointer px-2"
                />

                <button
                  type="button"
                  onClick={() => handleStepDay('next')}
                  className="p-1.5 hover:bg-surface-container-high rounded-xl text-on-surface-variant transition-colors cursor-pointer"
                  title="Día siguiente"
                >
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              </div>

              {/* Add Appointment Button */}
              <button
                id="btn-add-appointment"
                onClick={handleOpenCreateModal}
                className="bg-primary hover:bg-primary-container text-white text-xs font-black px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-sm shadow-primary/20 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add</span>
                {t('calendar.new_appointment', 'Nueva Cita')}
              </button>
            </div>
          </div>

          {/* Filtering and Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 bg-surface-container-low/60 p-3 rounded-2xl border border-outline-variant/30">
            {/* Filter by Professional */}
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-primary">stethoscope</span>
              <label className="text-xs font-bold text-on-surface-variant whitespace-nowrap">
                Profesional:
              </label>
              <select
                value={selectedProfessionalId}
                onChange={(e) => setSelectedProfessionalId(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface py-1.5 px-3 rounded-xl outline-none cursor-pointer focus:border-primary"
              >
                <option value="all">Todos los profesionales ({professionals.length})</option>
                {professionals.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.full_name} ({prof.role || 'Especialista'})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Status & Text Search */}
            <div className="flex items-center gap-2 flex-1 justify-end">
              {/* Status Filter */}
              <select
                id="select-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface py-1.5 px-3 rounded-xl outline-none cursor-pointer focus:border-primary"
              >
                <option value="all">{t('calendar.all_appointments', 'Todos los estados')} ({appointments.length})</option>
                <option value="booked">Reservada / Pendiente</option>
                <option value="confirmed">Confirmada</option>
                <option value="completed">Atendida / Realizada</option>
                <option value="cancelled">Cancelada</option>
                <option value="no_show">Inasistencia</option>
              </select>

              {/* Search in view */}
              <div className="relative w-full sm:w-48">
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Filtrar por nombre, motivo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 text-xs font-medium text-on-surface pl-7 pr-2.5 py-1.5 rounded-xl outline-none focus:border-primary"
                />
                <span className="material-symbols-outlined text-xs text-on-surface-variant absolute left-2 top-2">
                  search
                </span>
              </div>
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
              <p className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider">{t('calendar.status_completed', 'Atendidas')}</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {appointments.filter((a) => a.status === 'completed').length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 clinical-shadow">
              <p className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider">{t('calendar.status_cancelled', 'Canceladas / No Show')}</p>
              <p className="text-2xl font-black text-red-500 mt-1">
                {appointments.filter((a) => a.status === 'cancelled' || a.status === 'no_show').length}
              </p>
            </div>
          </div>

          {/* Appointments Grid/List */}
          <div className="space-y-3.5">
            {loading ? (
              <div className="flex flex-col items-center py-20 opacity-70">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
                <p className="text-xs font-bold mt-2 text-on-surface-variant">{t('common.loading', 'Sincronizando agenda con Supabase...')}</p>
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
                  onClick={handleOpenCreateModal}
                  className="mt-5 text-white bg-primary hover:bg-primary-container text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span> {t('calendar.new_appointment', 'Nueva Cita')}
                </button>
              </div>
            ) : (
              filteredAppointments.map((appt) => {
                const isVirtual =
                  appt.room_or_box?.toLowerCase().includes('virtual') ||
                  appt.room_or_box?.toLowerCase().includes('telemedicina');

                return (
                  <div
                    key={appt.id}
                    id={`appointment-card-${appt.id}`}
                    className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 clinical-shadow flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:border-primary/40 transition-all group"
                  >
                    {/* Time & Patient Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-5 w-full lg:w-auto">
                      {/* Time block */}
                      <div className="text-left sm:text-center min-w-[100px] bg-surface-container-low sm:bg-transparent p-2.5 sm:p-0 rounded-xl">
                        <p className="text-lg font-black text-primary leading-none">
                          {new Date(appt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-tight mt-1">
                          - {new Date(appt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {/* Modality Badge */}
                        <div className="mt-1.5">
                          {isVirtual ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-black bg-secondary/15 text-secondary px-2 py-0.5 rounded-md border border-secondary/20">
                              <span className="material-symbols-outlined text-[11px]">videocam</span>
                              Virtual
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">
                              <span className="material-symbols-outlined text-[11px]">apartment</span>
                              {appt.room_or_box || 'Presencial'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="h-12 w-px bg-outline-variant/30 hidden sm:block"></div>

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

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-on-surface-variant mt-0.5">
                            {appt.patient?.rut_or_dni && (
                              <span className="font-mono font-bold text-on-surface/80">
                                {appt.patient.rut_or_dni}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px] text-outline">mail</span>
                              {appt.patient?.email || 'Sin correo'}
                            </span>
                            {appt.patient?.phone && (
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-outline">call</span>
                                {appt.patient.phone}
                              </span>
                            )}
                          </div>

                          {/* Reason & Professional Assigned */}
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {appt.reason && (
                              <span className="text-xs font-semibold text-on-surface flex items-center gap-1 bg-surface-container-low px-2 py-0.5 rounded-lg border border-outline-variant/30">
                                <span className="material-symbols-outlined text-[13px] text-primary">clinical_notes</span>
                                {appt.reason}
                              </span>
                            )}
                            {appt.professional?.full_name && (
                              <span className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1 bg-surface-container-low px-2 py-0.5 rounded-lg">
                                <span className="material-symbols-outlined text-[13px] text-secondary">stethoscope</span>
                                {appt.professional.full_name}
                              </span>
                            )}
                          </div>

                          {/* Notes if present */}
                          {appt.notes && (
                            <p className="text-[11px] text-on-surface-variant italic mt-1 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 px-2 py-1 rounded-md border border-amber-200/50 dark:border-amber-800/40 inline-block">
                              Nota: {appt.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions, Quick Status & Buttons */}
                    <div className="flex flex-wrap items-center justify-between w-full lg:w-auto lg:justify-end gap-2 border-t lg:border-t-0 pt-4 lg:pt-0">
                      {/* Status Pill & Quick Change */}
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider ${getStatusStyles(
                            appt.status
                          )}`}
                        >
                          {getStatusLabel(appt.status)}
                        </div>

                        {/* Quick Status Dropdown */}
                        <select
                          value={appt.status}
                          onChange={(e) =>
                            updateAppointmentStatus(appt.id, e.target.value as AppointmentStatus)
                          }
                          className="text-[11px] font-bold bg-surface-container-low border border-outline-variant/40 rounded-xl px-2 py-1 text-on-surface outline-none cursor-pointer hover:bg-surface-container transition-colors"
                          title="Cambiar estado en vivo"
                        >
                          <option value="booked">Reservada</option>
                          <option value="confirmed">Confirmada</option>
                          <option value="completed">Atendida</option>
                          <option value="cancelled">Cancelada</option>
                          <option value="no_show">Inasistencia</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Iniciar Consulta / Activar Paciente CTA */}
                        <button
                          id={`btn-attend-${appt.id}`}
                          onClick={() => handleSelectAppointmentPatient(appt)}
                          className="px-3 py-1.5 bg-primary text-white hover:bg-primary-container rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shadow-primary/20"
                          title="Activar paciente e ir al dashboard clínico"
                        >
                          <span className="material-symbols-outlined text-base">play_arrow</span>
                          <span>{t('calendar.attend', 'Atender')}</span>
                        </button>

                        {/* Edit / Reprogramar Trigger */}
                        <button
                          id={`btn-edit-${appt.id}`}
                          onClick={() => handleOpenEditModal(appt)}
                          className="px-2.5 py-1.5 bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-primary rounded-xl text-xs font-bold border border-outline-variant/30 transition-all flex items-center gap-1 cursor-pointer"
                          title="Editar fecha, hora o detalles de la cita"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                          <span className="hidden sm:inline">Editar</span>
                        </button>

                        {/* Medical History Trigger */}
                        <button
                          id={`btn-history-${appt.id}`}
                          onClick={() => handleOpenPatientHistory(appt.patient_id, appt.patient)}
                          className="p-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                          title="Ver Ficha / Historia Clínica"
                        >
                          <span className="material-symbols-outlined text-base">clinical_notes</span>
                        </button>

                        {/* Quick Cancel Shortcut */}
                        {appt.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancelAppointment(appt.id)}
                            className="p-1.5 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white dark:bg-red-950/40 dark:hover:bg-red-600 rounded-xl text-xs transition-colors cursor-pointer"
                            title="Cancelar cita"
                          >
                            <span className="material-symbols-outlined text-base">cancel</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* New & Edit Appointment Modal */}
      <NewAppointmentModal
        isOpen={isNewModalOpen}
        onClose={() => {
          setIsNewModalOpen(false);
          setEditingAppointment(null);
        }}
        defaultDate={selectedDate}
        appointmentToEdit={editingAppointment}
        onSuccess={() => {
          fetchAppointments();
          addToast(
            'success',
            editingAppointment ? 'Cita Actualizada' : t('calendar.new_appointment', 'Cita Agendada'),
            editingAppointment ? 'Los cambios fueron guardados exitosamente.' : 'La consulta fue guardada exitosamente en Supabase.'
          );
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

