import React, { useState, useEffect } from 'react';
import { User, AppointmentStatus, Appointment } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { fetchAvailableTimeSlots, validateAppointmentSlot } from '../../services/dataService';
import { useAuth } from '../../app/providers/AuthProvider';
import { useI18n } from '../../app/providers/I18nProvider';

export interface AppointmentToEdit extends Partial<Appointment> {
  id: string;
}

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: string;
  appointmentToEdit?: AppointmentToEdit | null;
}

const COMMON_REASONS = [
  'Kinesiología & Rehabilitación Musculoesquelética',
  'Evaluación Kinésica Inicial & Mapa de Dolor 2D',
  'Evaluación Nutricional & Composición Corporal',
  'Consulta Médica General & Diagnóstico',
  'Control & Seguimiento Terapéutico',
  'Terapia Manual & Descarga Muscular',
  'Rehabilitación Post-Quirúrgica',
  'Teleconsulta / Telemedicina',
];

const ROOMS_OPTIONS = [
  'Box 1 - Kinesiología',
  'Box 2 - Terapia Manual',
  'Box 3 - Nutrición Clínica',
  'Consultorio Médico General',
  'Gimnasio de Readaptación',
  'Sala de Fisioterapia A',
  'Telemedicina (Virtual)',
];

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultDate,
  appointmentToEdit,
}) => {
  const { user, tenantId } = useAuth();
  const { t } = useI18n();

  // Data lists
  const [patients, setPatients] = useState<User[]>([]);
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);

  // Form states
  const [patientId, setPatientId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [status, setStatus] = useState<AppointmentStatus>('booked');
  const [reason, setReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [room, setRoom] = useState(ROOMS_OPTIONS[0]);
  const [channel, setChannel] = useState<'presencial' | 'virtual'>('presencial');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<{ startTime: string; endTime: string; label: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  const isEditing = Boolean(appointmentToEdit?.id);

  useEffect(() => {
    if (isOpen) {
      fetchPatientsAndProfessionals();
    }
  }, [isOpen]);

  useEffect(() => {
    if (appointmentToEdit) {
      setPatientId(appointmentToEdit.patient_id || '');
      setProfessionalId(appointmentToEdit.professional_id || user?.id || '');
      setStatus(appointmentToEdit.status || 'booked');
      setNotes(appointmentToEdit.notes || '');
      setRoom(appointmentToEdit.room_or_box || ROOMS_OPTIONS[0]);

      if (appointmentToEdit.reason) {
        if (COMMON_REASONS.includes(appointmentToEdit.reason)) {
          setReason(appointmentToEdit.reason);
          setCustomReason('');
        } else {
          setReason('custom');
          setCustomReason(appointmentToEdit.reason);
        }
      }

      if (appointmentToEdit.start_time) {
        const start = new Date(appointmentToEdit.start_time);
        const yyyy = start.getFullYear();
        const mm = String(start.getMonth() + 1).padStart(2, '0');
        const dd = String(start.getDate()).padStart(2, '0');
        setDate(`${yyyy}-${mm}-${dd}`);

        const hh = String(start.getHours()).padStart(2, '0');
        const min = String(start.getMinutes()).padStart(2, '0');
        setTime(`${hh}:${min}`);

        if (appointmentToEdit.end_time) {
          const end = new Date(appointmentToEdit.end_time);
          const diffMins = Math.round((end.getTime() - start.getTime()) / 60000);
          if (diffMins > 0) setDurationMinutes(diffMins);
        }
      }

      if (appointmentToEdit.room_or_box?.toLowerCase().includes('virtual') || appointmentToEdit.room_or_box?.toLowerCase().includes('telemedicina')) {
        setChannel('virtual');
      } else {
        setChannel('presencial');
      }
    } else {
      // Reset for create
      setPatientId('');
      setProfessionalId(user?.id || '');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setTime('09:00');
      setDurationMinutes(45);
      setStatus('booked');
      setReason(COMMON_REASONS[0]);
      setCustomReason('');
      setNotes('');
      setRoom(ROOMS_OPTIONS[0]);
      setChannel('presencial');
    }
  }, [appointmentToEdit, defaultDate, isOpen, user]);

  useEffect(() => {
    if (!isOpen || !professionalId || !date) return;

    const loadSlots = async () => {
      setSlotsLoading(true);
      setSlotError(null);
      const slots = await fetchAvailableTimeSlots(
        professionalId,
        date,
        appointmentToEdit?.id
      );
      setAvailableSlots(slots);
      if (slots.length > 0 && !slots.some((s) => s.startTime === time)) {
        setTime(slots[0].startTime);
        const duration = Math.max(
          15,
          (() => {
            const [sh, sm] = slots[0].startTime.split(':').map(Number);
            const [eh, em] = slots[0].endTime.split(':').map(Number);
            return eh * 60 + em - (sh * 60 + sm);
          })()
        );
        setDurationMinutes(duration);
      }
      if (slots.length === 0) {
        setSlotError('No hay horarios disponibles publicados para esta fecha.');
      }
      setSlotsLoading(false);
    };

    loadSlots();
  }, [isOpen, professionalId, date, appointmentToEdit?.id]);

  const fetchPatientsAndProfessionals = async () => {
    setLoadingLists(true);
    try {
      // 1. Fetch patients
      const { data: dbUsers } = await supabase.from('users').select('*');
      const allUsers: User[] = dbUsers || [];

      // Filter patients
      const patientUsers = allUsers.filter(
        (u) => u.role === 'patient' || (!u.role && u.email?.includes('paciente'))
      );

      // Also try fetching from pacientes_clinicos table if available
      const { data: clinicPatients } = await supabase.from('pacientes_clinicos').select('*');
      if (clinicPatients && clinicPatients.length > 0) {
        const formattedFromClinic: User[] = clinicPatients.map((cp: any) => ({
          id: cp.id,
          full_name: cp.full_name || cp.nombre_completo || 'Paciente Clínico',
          email: cp.email || 'paciente@clinica.com',
          phone: cp.phone || cp.telefono || '',
          rut_or_dni: cp.rut_or_dni || cp.documento_identidad || '',
          role: 'patient',
          tenant_id: tenantId || 'tenant_kine_001',
          created_at: cp.created_at || new Date().toISOString(),
        }));

        const mergedMap = new Map<string, User>();
        patientUsers.forEach((p) => mergedMap.set(p.id, p));
        formattedFromClinic.forEach((p) => {
          if (!mergedMap.has(p.id)) mergedMap.set(p.id, p);
        });
        const mergedPatients = Array.from(mergedMap.values());
        setPatients(mergedPatients);
        if (!isEditing && mergedPatients.length > 0 && !patientId) {
          setPatientId(mergedPatients[0].id);
        }
      } else {
        setPatients(patientUsers);
        if (!isEditing && patientUsers.length > 0 && !patientId) {
          setPatientId(patientUsers[0].id);
        }
      }

      // 2. Filter clinical professionals
      const profs = allUsers.filter(
        (u) =>
          u.role === 'fisioterapeuta' ||
          u.role === 'nutricionista' ||
          u.role === 'medico_general' ||
          u.role === 'clinic_admin' ||
          u.role === 'super_admin'
      );
      setProfessionals(profs);
      if (!isEditing && !professionalId) {
        setProfessionalId(user?.id || (profs.length > 0 ? profs[0].id : ''));
      }
    } catch (err) {
      console.warn('Error fetching patients or professionals for appointment modal:', err);
    } finally {
      setLoadingLists(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !user) return;
    setSaving(true);

    try {
      const finalReason = reason === 'custom' ? (customReason.trim() || 'Consulta Kinésica General') : reason;
      const finalRoom = channel === 'virtual' ? 'Telemedicina (Virtual)' : room;

      const validation = await validateAppointmentSlot({
        professionalId: professionalId || user.id,
        dateStr: date,
        startTime: time,
        durationMinutes,
        excludeAppointmentId: appointmentToEdit?.id,
      });

      if (!validation.valid) {
        setSlotError(validation.error || 'Horario no disponible.');
        setSaving(false);
        return;
      }

      const [hours, minutes] = time.split(':').map(Number);
      const [year, month, day] = date.split('-').map(Number);
      const startDate = new Date(year, month - 1, day, hours, minutes, 0);
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

      const startDateTime = startDate.toISOString();
      const endDateTime = endDate.toISOString();

      if (isEditing && appointmentToEdit?.id) {
        // UPDATE existing appointment
        const { error } = await supabase
          .from('appointments')
          .eq('id', appointmentToEdit.id)
          .update({
            patient_id: patientId,
            professional_id: professionalId || user.id,
            start_time: startDateTime,
            end_time: endDateTime,
            status,
            reason: finalReason,
            notes,
            room_or_box: finalRoom,
          });

        if (error) throw error;
      } else {
        // INSERT new appointment
        const { error } = await supabase.from('appointments').insert({
          tenant_id: tenantId || 'tenant_kine_001',
          professional_id: professionalId || user.id,
          patient_id: patientId,
          start_time: startDateTime,
          end_time: endDateTime,
          status,
          reason: finalReason,
          notes,
          room_or_box: finalRoom,
        });

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving appointment:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!appointmentToEdit?.id) return;
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta cita de la agenda?')) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentToEdit.id);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error deleting appointment:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl w-full max-w-xl clinical-shadow-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-outline-variant/20 bg-surface-container-low/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl">
                {isEditing ? 'edit_calendar' : 'event_available'}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-black text-on-surface tracking-tight">
                {isEditing ? 'Editar / Reprogramar Cita' : t('calendar.modal_title', 'Agendar Nueva Cita')}
              </h3>
              <p className="text-xs text-on-surface-variant">
                Persistencia en tiempo real en Supabase con sincronización clínica
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Patient and Professional Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Patient Selector */}
            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                {t('calendar.patient', 'Paciente Asignado')} <span className="text-red-500">*</span>
              </label>
              {loadingLists ? (
                <div className="p-3 text-xs text-on-surface-variant bg-surface-container-low rounded-xl animate-pulse">
                  Cargando pacientes...
                </div>
              ) : (
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs font-bold text-on-surface outline-none focus:border-primary transition-all cursor-pointer"
                  required
                >
                  <option value="" disabled>
                    -- Selecciona un paciente --
                  </option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} {p.rut_or_dni ? `(${p.rut_or_dni})` : `(${p.email})`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Professional Selector */}
            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                Profesional Responsable <span className="text-red-500">*</span>
              </label>
              <select
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs font-bold text-on-surface outline-none focus:border-primary transition-all cursor-pointer"
                required
              >
                {professionals.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.full_name} ({prof.role || 'Especialista'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Consultation Type / Reason */}
          <div>
            <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
              {t('calendar.reason', 'Tipo de Consulta / Especialidad')} <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs font-bold text-on-surface outline-none focus:border-primary transition-all cursor-pointer"
            >
              {COMMON_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="custom">Otro motivo personalizado...</option>
            </select>

            {reason === 'custom' && (
              <input
                type="text"
                autoComplete="off"
                placeholder="Escribe el motivo de la consulta..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full mt-2 bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs font-medium text-on-surface outline-none focus:border-primary animate-fadeIn"
                required
              />
            )}
          </div>

          {/* Date, Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                {t('calendar.date', 'Fecha')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-bold text-on-surface outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                {t('calendar.start_time', 'Hora de Inicio')} <span className="text-red-500">*</span>
              </label>
              {slotsLoading ? (
                <div className="p-2.5 text-xs text-on-surface-variant bg-surface-container-low rounded-xl animate-pulse">
                  Consultando disponibilidad...
                </div>
              ) : availableSlots.length > 0 ? (
                <select
                  value={time}
                  onChange={(e) => {
                    const selected = availableSlots.find((s) => s.startTime === e.target.value);
                    setTime(e.target.value);
                    if (selected) {
                      const [sh, sm] = selected.startTime.split(':').map(Number);
                      const [eh, em] = selected.endTime.split(':').map(Number);
                      setDurationMinutes(eh * 60 + em - (sh * 60 + sm));
                    }
                    setSlotError(null);
                  }}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
                  required
                >
                  {availableSlots.map((slot) => (
                    <option key={slot.startTime} value={slot.startTime}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-bold text-on-surface outline-none focus:border-primary"
                  required
                  disabled
                />
              )}
              {slotError && (
                <p className="text-[11px] font-bold text-red-600 mt-1">{slotError}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                {t('calendar.duration', 'Duración')}
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
              >
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>60 minutos (1h)</option>
                <option value={90}>90 minutos (1.5h)</option>
              </select>
            </div>
          </div>

          {/* Modality, Room & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Modalidad */}
            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                Modalidad
              </label>
              <div className="grid grid-cols-2 gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setChannel('presencial')}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    channel === 'presencial'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">apartment</span>
                  Presencial
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('virtual')}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    channel === 'virtual'
                      ? 'bg-secondary text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">videocam</span>
                  Virtual
                </button>
              </div>
            </div>

            {/* Room / Box */}
            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                Box / Espacio Clínico
              </label>
              <select
                disabled={channel === 'virtual'}
                value={channel === 'virtual' ? 'Telemedicina (Virtual)' : room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer disabled:opacity-60"
              >
                {ROOMS_OPTIONS.map((rm) => (
                  <option key={rm} value={rm}>
                    {rm}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                {t('common.filter', 'Estado')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
              >
                <option value="booked">{t('calendar.status_pending', 'Reservada / Pendiente')}</option>
                <option value="confirmed">{t('calendar.status_confirmed', 'Confirmada')}</option>
                <option value="completed">{t('calendar.status_attended', 'Atendida / Realizada')}</option>
                <option value="cancelled">{t('calendar.status_cancelled', 'Cancelada')}</option>
                <option value="no_show">{t('calendar.status_no_show', 'Inasistencia')}</option>
              </select>
            </div>
          </div>

          {/* Clinical & Internal Notes */}
          <div>
            <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
              {t('calendar.notes', 'Notas Clínicas / Indicaciones Previas')} (Opcional)
            </label>
            <textarea
              rows={2}
              autoComplete="off"
              placeholder="Ej: Paciente asiste con orden médica y resonancia lumbar. Traer ropa deportiva."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs text-on-surface outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-between gap-3">
            <div>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="px-3.5 py-2 rounded-xl text-xs font-extrabold text-red-600 bg-error-container/30 hover:bg-error-container/60 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Eliminar cita definitivamente"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  <span>{deleting ? 'Eliminando...' : 'Eliminar Cita'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                type="submit"
                disabled={saving || deleting}
                className="bg-primary hover:bg-primary-container text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-primary/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    <span>Guardando en Supabase...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">
                      {isEditing ? 'save' : 'check'}
                    </span>
                    <span>{isEditing ? 'Guardar Cambios' : t('calendar.save_appointment', 'Confirmar Cita')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

