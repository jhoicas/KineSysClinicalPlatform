import React, { useState } from 'react';
import { Appointment } from '../../types';
import { getMonthCalendarDays, toLocalDateString } from '../../utils/availabilityUtils';

interface CalendarMonthViewProps {
  anchorDate: string;
  appointments: Appointment[];
  onDaySelect?: (date: string) => void;
  onViewDay?: (date: string) => void;
}

export function CalendarMonthView({
  anchorDate,
  appointments,
  onDaySelect,
  onViewDay,
}: CalendarMonthViewProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const monthDays = getMonthCalendarDays(anchorDate);
  const today = toLocalDateString(new Date());

  const countByDay = appointments.reduce<Record<string, number>>((acc, appt) => {
    const d = new Date(appt.start_time);
    const key = toLocalDateString(d);
    if (appt.status !== 'cancelled') {
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {});

  const [year, month] = anchorDate.split('-').map(Number);
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const selectedAppointments = selectedDay
    ? appointments.filter((a) => {
        const d = new Date(a.start_time);
        return toLocalDateString(d) === selectedDay;
      })
    : [];

  const handleDayClick = (date: string) => {
    setSelectedDay(date);
    onDaySelect?.(date);
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-4">
        <h3 className="text-sm font-extrabold text-on-surface capitalize mb-4">{monthLabel}</h3>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-on-surface-variant py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthDays.map(({ date, inMonth }) => {
            const count = countByDay[date] || 0;
            const isToday = date === today;
            const isSelected = date === selectedDay;

            return (
              <button
                key={date}
                type="button"
                onClick={() => handleDayClick(date)}
                onDoubleClick={() => onViewDay?.(date)}
                className={`min-h-[72px] p-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                  inMonth
                    ? 'bg-surface-container-low border-outline-variant/30 hover:border-primary/40'
                    : 'bg-surface-container-low/30 border-transparent opacity-50'
                } ${isToday ? 'ring-2 ring-primary/40' : ''} ${
                  isSelected ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <span
                  className={`text-xs font-black ${isToday ? 'text-primary' : 'text-on-surface'}`}
                >
                  {Number(date.split('-')[2])}
                </span>
                {count > 0 && (
                  <span className="mt-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-white text-[10px] font-black">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-extrabold text-on-surface">
              Citas del {selectedDay}
            </h4>
            <button
              type="button"
              onClick={() => onViewDay?.(selectedDay)}
              className="text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              Ver día completo →
            </button>
          </div>

          {selectedAppointments.length === 0 ? (
            <p className="text-xs text-on-surface-variant">Sin citas para este día.</p>
          ) : (
            <ul className="space-y-2">
              {selectedAppointments.map((appt) => {
                const start = new Date(appt.start_time);
                const time = start.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <li
                    key={appt.id}
                    className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs"
                  >
                    <span className="font-black text-primary">{time}</span>
                    <span className="mx-2 text-on-surface-variant">•</span>
                    <span className="font-bold text-on-surface">
                      {appt.patient?.full_name || 'Paciente'}
                    </span>
                    {appt.reason && (
                      <p className="text-on-surface-variant mt-1">{appt.reason}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
