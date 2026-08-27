import React, { useState, useEffect } from 'react';
import { User, AppointmentStatus } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../app/providers/AuthProvider';
import { useI18n } from '../../app/providers/I18nProvider';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: string;
}

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultDate,
}) => {
  const { user, tenantId } = useAuth();
  const { t } = useI18n();
  const [patients, setPatients] = useState<User[]>([]);
  const [patientId, setPatientId] = useState('');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('11:00');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [status, setStatus] = useState<AppointmentStatus>('booked');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [room, setRoom] = useState('Box 1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPatients();
    }
  }, [isOpen]);

  useEffect(() => {
    if (defaultDate) {
      setDate(defaultDate);
    }
  }, [defaultDate]);

  const fetchPatients = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, email, phone')
      .eq('role', 'patient')
      .eq('tenant_id', tenantId);

    if (data && data.length > 0) {
      setPatients(data);
      if (!patientId) {
        setPatientId(data[0].id);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !user) return;
    setSaving(true);

    try {
      const startDateTime = `${date}T${time}:00Z`;
      const startDate = new Date(startDateTime);
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
      const endDateTime = endDate.toISOString();

      const { error } = await supabase.from('appointments').insert({
        tenant_id: tenantId,
        professional_id: user.id,
        patient_id: patientId,
        start_time: startDateTime,
        end_time: endDateTime,
        status,
        reason: reason || 'Consulta Kinésica General',
        notes,
        room_or_box: room,
      });

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating appointment:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl w-full max-w-lg clinical-shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/20 bg-surface-container-low/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">event_available</span>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-on-surface">
                {t('calendar.modal_title', 'Agendar Nueva Cita')}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {t('nav.live_data', 'Sincronización en Tiempo Real')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Patient Selector */}
          <div>
            <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
              {t('calendar.patient', 'Paciente Asignado')}
            </label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-sm font-semibold text-on-surface outline-none focus:border-primary transition-all"
              required
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.email})
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                {t('calendar.date', 'Fecha')}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-sm font-semibold text-on-surface outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                {t('calendar.start_time', 'Hora de Inicio')}
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-sm font-semibold text-on-surface outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          {/* Duration & Room */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                {t('calendar.duration', 'Duración (minutos)')}
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-sm font-semibold text-on-surface outline-none focus:border-primary"
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                {t('common.filter', 'Estado')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-sm font-semibold text-on-surface outline-none focus:border-primary"
              >
                <option value="booked">{t('calendar.status_pending', 'Reservada / Pendiente')}</option>
                <option value="confirmed">{t('calendar.status_confirmed', 'Confirmada')}</option>
                <option value="completed">{t('calendar.status_attended', 'Atendida / Realizada')}</option>
                <option value="cancelled">{t('calendar.status_cancelled', 'Cancelada')}</option>
                <option value="no_show">{t('calendar.status_no_show', 'Inasistencia')}</option>
              </select>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
              {t('calendar.reason', 'Motivo de Consulta')}
            </label>
            <input
              type="text"
              placeholder={t('calendar.reason', 'Motivo de la cita')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-sm text-on-surface outline-none focus:border-primary"
            />
          </div>

          {/* Clinical Notes */}
          <div>
            <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
              {t('calendar.notes', 'Notas Internas')}
            </label>
            <input
              type="text"
              placeholder={t('calendar.room', 'Box / Indicaciones previas')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-sm text-on-surface outline-none focus:border-primary"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
            >
              {t('common.cancel', 'Cancelar')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary hover:bg-primary-container text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                  {t('calendar.saving', 'Guardando...')}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">check</span>
                  {t('calendar.save_appointment', 'Confirmar Cita')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
