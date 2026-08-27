import { Appointment } from '../types';

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startTime: string | Date;
  endTime?: string | Date;
  timeZone?: string;
  organizer?: {
    name?: string;
    email?: string;
  };
  url?: string;
}

export interface AppointmentCalendarOptions {
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  defaultDurationMinutes?: number;
  timeZone?: string;
  customTitle?: string;
  customDescription?: string;
}

export interface CalendarLinksResult {
  google: string;
  outlook: string;
  office365: string;
  yahoo: string;
  icsDataUrl: string;
  icsContent: string;
}

/**
 * Obtiene la zona horaria del sistema o navegador como fallback seguro.
 */
export function getDefaultTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Santiago';
  } catch {
    return 'America/Santiago';
  }
}

/**
 * Convierte un Date o string de fecha a un objeto Date válido.
 */
function toValidDate(d: string | Date): Date {
  if (d instanceof Date) {
    return isNaN(d.getTime()) ? new Date() : d;
  }
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Formatea una fecha a la representación UTC requerida por Google Calendar e iCal: YYYYMMDDTHHmmssZ
 */
function formatUtcCompact(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

/**
 * Parsea y calcula fechas de inicio y fin válidas respetando duraciones por defecto.
 */
export function normalizeEventDates(
  startTime: string | Date,
  endTime?: string | Date,
  defaultDurationMinutes: number = 45
): { start: Date; end: Date } {
  const start = toValidDate(startTime);
  let end: Date;

  if (endTime) {
    end = toValidDate(endTime);
    if (end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + defaultDurationMinutes * 60 * 1000);
    }
  } else {
    end = new Date(start.getTime() + defaultDurationMinutes * 60 * 1000);
  }

  return { start, end };
}

/**
 * Genera la URL para agregar el evento a Google Calendar.
 * Respeta la zona horaria indicada mediante los parámetros UTC y 'ctz'.
 *
 * @param event Datos del evento o cita
 * @returns URL de Google Calendar
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const { start, end } = normalizeEventDates(event.startTime, event.endTime);
  const timeZone = event.timeZone || getDefaultTimeZone();

  const startUtc = formatUtcCompact(start);
  const endUtc = formatUtcCompact(end);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startUtc}/${endUtc}`,
  });

  if (event.description) {
    params.set('details', event.description);
  }

  if (event.location) {
    params.set('location', event.location);
  }

  if (timeZone) {
    params.set('ctz', timeZone);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Genera la URL para agregar el evento a Outlook Web (Outlook.com / Live o Microsoft 365).
 * Utiliza formato ISO-8601 estándar con información horaria.
 *
 * @param event Datos del evento o cita
 * @param isOffice365 Si es true genera enlace para portal corporativo office.com
 * @returns URL de Outlook Calendar
 */
export function generateOutlookCalendarUrl(event: CalendarEvent, isOffice365: boolean = false): string {
  const { start, end } = normalizeEventDates(event.startTime, event.endTime);
  const baseUrl = isOffice365
    ? 'https://outlook.office.com/calendar/0/deeplink/compose'
    : 'https://outlook.live.com/calendar/0/deeplink/compose';

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
  });

  if (event.description) {
    params.set('body', event.description);
  }

  if (event.location) {
    params.set('location', event.location);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Alias directo para generar URL de Microsoft / Office 365.
 */
export function generateOffice365CalendarUrl(event: CalendarEvent): string {
  return generateOutlookCalendarUrl(event, true);
}

/**
 * Genera la URL para agregar el evento a Yahoo Calendar.
 */
export function generateYahooCalendarUrl(event: CalendarEvent): string {
  const { start, end } = normalizeEventDates(event.startTime, event.endTime);
  const startUtc = formatUtcCompact(start);
  const endUtc = formatUtcCompact(end);

  const params = new URLSearchParams({
    v: '60',
    view: 'd',
    type: '20',
    title: event.title,
    st: startUtc,
    et: endUtc,
  });

  if (event.description) {
    params.set('desc', event.description);
  }

  if (event.location) {
    params.set('in_loc', event.location);
  }

  return `https://calendar.yahoo.com/?${params.toString()}`;
}

/**
 * Genera el contenido en formato iCalendar (.ics - RFC 5545) compatible con Apple Calendar,
 * Microsoft Outlook de escritorio, Google Calendar y clientes móviles.
 */
export function generateIcsFileContent(event: CalendarEvent): string {
  const { start, end } = normalizeEventDates(event.startTime, event.endTime);
  const timeZone = event.timeZone || getDefaultTimeZone();
  const startUtc = formatUtcCompact(start);
  const endUtc = formatUtcCompact(end);
  const nowUtc = formatUtcCompact(new Date());
  const uid = `kinesys-cita-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@kinesys.health`;

  // Escape special iCalendar characters
  const escapeIcs = (str?: string) =>
    (str || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KineSys Health//Clinical Calendar System//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${escapeIcs(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeIcs(event.location)}`);
  }

  if (timeZone) {
    lines.push(`TZID:${timeZone}`);
  }

  if (event.organizer?.name || event.organizer?.email) {
    const orgName = event.organizer.name ? `CN=${escapeIcs(event.organizer.name)}:` : ':';
    const orgEmail = event.organizer.email ? `mailto:${event.organizer.email}` : 'mailto:citas@kinesys.health';
    lines.push(`ORGANIZER;${orgName}${orgEmail}`);
  }

  lines.push('STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Genera el Data URL para descarga de archivo .ics en el navegador.
 */
export function generateIcsDataUrl(event: CalendarEvent): string {
  const content = generateIcsFileContent(event);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
}

/**
 * Descarga automáticamente el archivo .ics en el navegador del usuario.
 */
export function downloadIcsFile(event: CalendarEvent, filename?: string): void {
  const content = generateIcsFileContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `cita_${Date.now()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Genera todos los enlaces de calendarios disponibles (Google, Outlook, Office 365, Yahoo, e iCal .ics).
 */
export function getAllCalendarLinks(event: CalendarEvent): CalendarLinksResult {
  return {
    google: generateGoogleCalendarUrl(event),
    outlook: generateOutlookCalendarUrl(event, false),
    office365: generateOutlookCalendarUrl(event, true),
    yahoo: generateYahooCalendarUrl(event),
    icsDataUrl: generateIcsDataUrl(event),
    icsContent: generateIcsFileContent(event),
  };
}

/**
 * Convierte un objeto Cita / Appointment de la aplicación en un CalendarEvent estructurado
 * y genera todas las URLs de sincronización de calendario respetando la zona horaria del usuario o clínica.
 *
 * @param appointment Objeto de cita médica/clínica
 * @param options Opciones adicionales como nombre de clínica, dirección o zona horaria
 */
export function generateCalendarLinksFromAppointment(
  appointment: Partial<Appointment>,
  options: AppointmentCalendarOptions = {}
): CalendarLinksResult {
  const {
    clinicName = 'KineSys Salud',
    clinicAddress = 'Centro Clínico Integral',
    clinicPhone,
    timeZone = getDefaultTimeZone(),
    customTitle,
    customDescription,
  } = options;

  const profName = appointment.professional?.full_name || 'Especialista';
  const profRole = appointment.professional?.specialty || appointment.professional_type || 'Kinesiología / Nutrición';
  const patientName = appointment.patient?.full_name || 'Paciente';
  const reason = appointment.reason || 'Consulta y Control Clínico';
  const room = appointment.room_or_box ? `Box/Sala: ${appointment.room_or_box}` : '';

  // Título del evento
  const title =
    customTitle ||
    `Cita Clínica: ${profRole} - ${clinicName}`;

  // Descripción detallada
  const descriptionLines = [
    `📅 CITA CLÍNICA CONFIRMADA - ${clinicName.toUpperCase()}`,
    `--------------------------------------------------`,
    `👨‍⚕️ Profesional: ${profName} (${profRole})`,
    `👤 Paciente: ${patientName}`,
    `📋 Motivo: ${reason}`,
  ];

  if (room) {
    descriptionLines.push(`🚪 ${room}`);
  }

  if (appointment.notes) {
    descriptionLines.push(`📝 Indicaciones: ${appointment.notes}`);
  }

  if (clinicPhone) {
    descriptionLines.push(`📞 Teléfono de Contacto: ${clinicPhone}`);
  }

  descriptionLines.push(
    `--------------------------------------------------`,
    `Por favor llegar con 10 minutos de anticipación.`,
    `Generado por KineSys Healthcare Platform`
  );

  const description = customDescription || descriptionLines.join('\n');

  // Ubicación
  const locationParts = [clinicName];
  if (clinicAddress) locationParts.push(clinicAddress);
  if (room) locationParts.push(room);
  const location = locationParts.join(', ');

  const event: CalendarEvent = {
    title,
    description,
    location,
    startTime: appointment.start_time || new Date().toISOString(),
    endTime: appointment.end_time,
    timeZone,
    organizer: {
      name: clinicName,
      email: appointment.professional?.email || 'citas@kinesys.health',
    },
  };

  return getAllCalendarLinks(event);
}
