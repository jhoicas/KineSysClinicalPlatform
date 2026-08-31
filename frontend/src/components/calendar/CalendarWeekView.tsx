import React from 'react';
import { Appointment, ProfessionalAvailability, ProfessionalAvailabilityException } from '../../types';
import {
  DAY_LABELS,
  HOUR_END,
  HOUR_START,
  getDayOfWeekFromDate,
  getWeekDays,
  isDateBlocked,
  toLocalDateString,
} from '../../utils/availabilityUtils';

interface CalendarWeekViewProps {
  anchorDate: string;
  appointments: Appointment[];
  availability: ProfessionalAvailability[];
  exceptions: ProfessionalAvailabilityException[];
  professionalId?: string;
  onDaySelect?: (date: string) => void;
  onAppointmentClick?: (appt: Appointment) => void;
}

const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

export function CalendarWeekView({
  anchorDate,
  appointments,
  availability,
  exceptions,
  professionalId,
  onDaySelect,
  onAppointmentClick,
}: CalendarWeekViewProps) {
  const weekDays = getWeekDays(anchorDate);
  const today = toLocalDateString(new Date());

  const apptsByDay = weekDays.reduce<Record<string, Appointment[]>>((acc, day) => {
    acc[day] = appointments.filter((a) => {
      const d = new Date(a.start_time);
      const local = toLocalDateString(d);
      return local === day;
    });
    return acc;
  }, {});

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-8 border-b border-outline-variant/20 bg-surface-container-low/50">
          <div className="p-2 text-[10px] font-bold text-on-surface-variant" />
          {weekDays.map((day) => {
            const blocked = isDateBlocked(exceptions, day);
            const isToday = day === today;
            return (
              <button
                key={day}
                type="button"
                onClick={() => onDaySelect?.(day)}
                className={`p-2 text-center border-l border-outline-variant/20 cursor-pointer hover:bg-surface-container-high transition-colors ${
                  isToday ? 'bg-primary/10' : ''
                }`}
              >
                <p className="text-[10px] font-bold text-on-surface-variant uppercase">
                  {DAY_LABELS[getDayOfWeekFromDate(day)]}
                </p>
                <p className={`text-sm font-black ${isToday ? 'text-primary' : 'text-on-surface'}`}>
                  {day.split('-')[2]}
                </p>
                {blocked && (
                  <span className="text-[9px] font-bold text-amber-700">Bloqueado</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-8">
          <div className="border-r border-outline-variant/20">
            {HOURS.map((h) => (
              <div
                key={h}
                className="h-12 flex items-start justify-end pr-1.5 pt-0.5 text-[9px] font-bold text-on-surface-variant border-b border-outline-variant/10"
              >
                {h}:00
              </div>
            ))}
          </div>

          {weekDays.map((day) => {
            const dayOfWeek = getDayOfWeekFromDate(day);
            const hasAvailability = availability.some(
              (a) =>
                a.is_active &&
                a.day_of_week === dayOfWeek &&
                (!professionalId || a.user_id === professionalId)
            );
            const blocked = isDateBlocked(exceptions, day);
            const dayAppts = apptsByDay[day] || [];

            return (
              <div key={day} className="border-r border-outline-variant/20 relative">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className={`h-12 border-b border-outline-variant/10 ${
                      !blocked && hasAvailability ? 'bg-emerald-500/[0.04]' : ''
                    }`}
                  />
                ))}

                <div className="absolute inset-1 space-y-1 pointer-events-none">
                  {dayAppts.slice(0, 4).map((appt) => {
                    const start = new Date(appt.start_time);
                    const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
                    return (
                      <button
                        key={appt.id}
                        type="button"
                        onClick={() => onAppointmentClick?.(appt)}
                        className="pointer-events-auto w-full text-left p-1 rounded-md bg-primary/90 text-white text-[9px] font-bold truncate cursor-pointer"
                      >
                        {time} {appt.patient?.full_name?.split(' ')[0]}
                      </button>
                    );
                  })}
                  {dayAppts.length > 4 && (
                    <span className="text-[9px] font-bold text-primary">
                      +{dayAppts.length - 4} más
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
