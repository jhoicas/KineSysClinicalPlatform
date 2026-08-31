import React from 'react';
import { Appointment, ProfessionalAvailability, ProfessionalAvailabilityException } from '../../types';
import {
  HOUR_END,
  HOUR_START,
  getDayOfWeekFromDate,
  isDateBlocked,
  parseTimeToMinutes,
} from '../../utils/availabilityUtils';

interface CalendarDayViewProps {
  date: string;
  appointments: Appointment[];
  availability: ProfessionalAvailability[];
  exceptions: ProfessionalAvailabilityException[];
  professionalId?: string;
  onAppointmentClick?: (appt: Appointment) => void;
  onSlotClick?: (time: string) => void;
}

const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

export function CalendarDayView({
  date,
  appointments,
  availability,
  exceptions,
  professionalId,
  onAppointmentClick,
  onSlotClick,
}: CalendarDayViewProps) {
  const dayOfWeek = getDayOfWeekFromDate(date);
  const blocked = isDateBlocked(exceptions, date);

  const dayAvailability = availability.filter(
    (a) =>
      a.is_active &&
      a.day_of_week === dayOfWeek &&
      (!professionalId || a.user_id === professionalId)
  );

  const dayAppointments = appointments.filter((a) => {
    const d = new Date(a.start_time);
    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return local === date;
  });

  const getTopPercent = (time: string) => {
    const mins = parseTimeToMinutes(time) - HOUR_START * 60;
    const total = (HOUR_END - HOUR_START) * 60;
    return Math.max(0, Math.min(100, (mins / total) * 100));
  };

  const getHeightPercent = (start: string, end: string) => {
    const duration = parseTimeToMinutes(end) - parseTimeToMinutes(start);
    const total = (HOUR_END - HOUR_START) * 60;
    return Math.max(2, (duration / total) * 100);
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden">
      {blocked && (
        <div className="px-4 py-2 bg-amber-50 text-amber-800 text-xs font-bold border-b border-amber-200">
          Día bloqueado — sin atención programada
        </div>
      )}

      <div className="grid grid-cols-[56px_1fr] min-h-[640px]">
        <div className="border-r border-outline-variant/20 bg-surface-container-low/40">
          {HOURS.map((h) => (
            <div
              key={h}
              className="h-14 flex items-start justify-end pr-2 pt-1 text-[10px] font-bold text-on-surface-variant"
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        <div className="relative">
          {HOURS.map((h) => (
            <div key={h} className="h-14 border-b border-outline-variant/10" />
          ))}

          {!blocked &&
            dayAvailability.map((block, idx) => (
              <div
                key={`avail_${idx}`}
                className="absolute left-1 right-1 rounded-lg bg-emerald-500/10 border border-emerald-400/30 pointer-events-none"
                style={{
                  top: `${getTopPercent(block.start_time)}%`,
                  height: `${getHeightPercent(block.start_time, block.end_time)}%`,
                }}
                title={`Disponible ${block.start_time} - ${block.end_time}`}
              />
            ))}

          {dayAppointments.map((appt) => {
            const start = new Date(appt.start_time);
            const end = new Date(appt.end_time);
            const startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
            const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

            return (
              <button
                key={appt.id}
                type="button"
                onClick={() => onAppointmentClick?.(appt)}
                className="absolute left-2 right-2 rounded-xl bg-primary/90 hover:bg-primary text-white text-left p-2 shadow-sm z-10 cursor-pointer overflow-hidden"
                style={{
                  top: `${getTopPercent(startTime)}%`,
                  height: `${getHeightPercent(startTime, endTime)}%`,
                  minHeight: '2.5rem',
                }}
              >
                <p className="text-[11px] font-black truncate">
                  {startTime} — {appt.patient?.full_name || 'Paciente'}
                </p>
                <p className="text-[10px] opacity-90 truncate">{appt.reason}</p>
              </button>
            );
          })}

          {!blocked &&
            onSlotClick &&
            HOURS.map((h) => (
              <button
                key={`slot_${h}`}
                type="button"
                onClick={() => onSlotClick(`${String(h).padStart(2, '0')}:00`)}
                className="absolute left-0 right-0 h-14 opacity-0 hover:opacity-100 hover:bg-primary/5 z-0 cursor-pointer"
                style={{ top: `${((h - HOUR_START) / (HOUR_END - HOUR_START + 1)) * 100}%` }}
                title="Agendar en esta hora"
              />
            ))}
        </div>
      </div>
    </div>
  );
}
