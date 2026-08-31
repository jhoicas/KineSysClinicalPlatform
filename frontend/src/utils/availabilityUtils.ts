import {
  Appointment,
  ProfessionalAvailability,
  ProfessionalAvailabilityException,
  AvailabilityTimeSlot,
} from '../types';

export const CLINICAL_PROFESSIONAL_ROLES = [
  'fisioterapeuta',
  'nutricionista',
  'medico_general',
] as const;

export const CLINIC_ADMIN_ROLES = ['clinic_admin', 'super_admin', 'receptionist'] as const;

export function isClinicalProfessional(role?: string): boolean {
  return CLINICAL_PROFESSIONAL_ROLES.includes(role as (typeof CLINICAL_PROFESSIONAL_ROLES)[number]);
}

export function isClinicAdmin(role?: string): boolean {
  return CLINIC_ADMIN_ROLES.includes(role as (typeof CLINIC_ADMIN_ROLES)[number]);
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getDayOfWeekFromDate(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00`).getDay();
}

export function toLocalDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function generateSlotsForDay(
  availabilityBlocks: ProfessionalAvailability[],
  dayOfWeek: number,
  slotDurationOverride?: number
): AvailabilityTimeSlot[] {
  const activeBlocks = availabilityBlocks.filter(
    (b) => b.is_active && b.day_of_week === dayOfWeek
  );

  const slots: AvailabilityTimeSlot[] = [];

  for (const block of activeBlocks) {
    const duration = slotDurationOverride ?? block.slot_duration;
    const startMin = parseTimeToMinutes(block.start_time);
    const endMin = parseTimeToMinutes(block.end_time);

    for (let t = startMin; t + duration <= endMin; t += duration) {
      const startTime = formatMinutesToTime(t);
      const endTime = formatMinutesToTime(t + duration);
      slots.push({
        startTime,
        endTime,
        label: `${startTime} - ${endTime}`,
      });
    }
  }

  return slots.sort(
    (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
  );
}

export function isDateBlocked(
  exceptions: ProfessionalAvailabilityException[],
  dateStr: string
): boolean {
  return exceptions.some((e) => e.exception_date === dateStr);
}

export function buildLocalDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0);
}

export function isSlotBooked(
  appointments: Appointment[],
  dateStr: string,
  startTime: string,
  durationMinutes: number,
  excludeAppointmentId?: string
): boolean {
  const slotStart = buildLocalDateTime(dateStr, startTime);
  const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

  return appointments.some((appt) => {
    if (appt.status === 'cancelled') return false;
    if (excludeAppointmentId && appt.id === excludeAppointmentId) return false;

    const apptStart = new Date(appt.start_time);
    const apptEnd = new Date(appt.end_time);
    const localDate = toLocalDateString(apptStart);
    if (localDate !== dateStr) return false;

    return slotStart < apptEnd && slotEnd > apptStart;
  });
}

export function getSlotDurationForDay(
  availability: ProfessionalAvailability[],
  professionalId: string,
  dayOfWeek: number
): number {
  const block = availability.find(
    (a) => a.user_id === professionalId && a.day_of_week === dayOfWeek && a.is_active
  );
  return block?.slot_duration ?? 45;
}

export function getAvailableSlots(
  availability: ProfessionalAvailability[],
  exceptions: ProfessionalAvailabilityException[],
  appointments: Appointment[],
  dateStr: string,
  professionalId: string,
  excludeAppointmentId?: string
): AvailabilityTimeSlot[] {
  if (isDateBlocked(exceptions, dateStr)) return [];

  const dayOfWeek = getDayOfWeekFromDate(dateStr);
  const profBlocks = availability.filter((a) => a.user_id === professionalId);
  const slots = generateSlotsForDay(profBlocks, dayOfWeek);
  const duration = getSlotDurationForDay(availability, professionalId, dayOfWeek);
  const profAppts = appointments.filter((a) => a.professional_id === professionalId);

  return slots.filter(
    (slot) =>
      !isSlotBooked(profAppts, dateStr, slot.startTime, duration, excludeAppointmentId)
  );
}

export function isTimeWithinPublishedAvailability(
  availability: ProfessionalAvailability[],
  exceptions: ProfessionalAvailabilityException[],
  dateStr: string,
  startTime: string,
  durationMinutes: number,
  professionalId: string
): boolean {
  if (isDateBlocked(exceptions, dateStr)) return false;

  const dayOfWeek = getDayOfWeekFromDate(dateStr);
  const profBlocks = availability.filter(
    (a) => a.user_id === professionalId && a.is_active && a.day_of_week === dayOfWeek
  );
  if (profBlocks.length === 0) return false;

  const startMin = parseTimeToMinutes(startTime);
  const endMin = startMin + durationMinutes;

  return profBlocks.some((block) => {
    const blockStart = parseTimeToMinutes(block.start_time);
    const blockEnd = parseTimeToMinutes(block.end_time);
    return startMin >= blockStart && endMin <= blockEnd;
  });
}

export function getWeekRange(dateStr: string): { start: string; end: string } {
  const date = new Date(`${dateStr}T12:00:00`);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toLocalDateString(monday), end: toLocalDateString(sunday) };
}

export function getMonthRange(dateStr: string): { start: string; end: string } {
  const [year, month] = dateStr.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start: toLocalDateString(start), end: toLocalDateString(end) };
}

export function getWeekDays(dateStr: string): string[] {
  const { start } = getWeekRange(dateStr);
  const days: string[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  for (let i = 0; i < 7; i++) {
    days.push(toLocalDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function getMonthCalendarDays(dateStr: string): { date: string; inMonth: boolean }[] {
  const [year, month] = dateStr.split('-').map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);
  const startPad = firstOfMonth.getDay() === 0 ? 6 : firstOfMonth.getDay() - 1;

  const days: { date: string; inMonth: boolean }[] = [];
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - startPad);

  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push({
      date: toLocalDateString(d),
      inMonth: d.getMonth() === month - 1,
    });
  }

  // Trim trailing week if entirely outside month
  while (days.length > 35) {
    const lastWeek = days.slice(-7);
    if (lastWeek.every((d) => !d.inMonth)) {
      days.splice(-7);
    } else {
      break;
    }
  }

  return days;
}

export const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DAY_LABELS_FULL = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export const HOUR_START = 7;
export const HOUR_END = 21;
