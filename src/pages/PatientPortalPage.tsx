import React, { useState, useEffect } from 'react';
import { useAuth } from '../app/providers/AuthProvider';
import { useI18n } from '../app/providers/I18nProvider';
import { supabase } from '../services/supabaseClient';
import { fetchProfessionalsWithJoinedDetails } from '../services/patientPortalService';
import { Appointment, ProfessionalWithDetails } from '../types';
import { SideNavBar } from '../components/layout/SideNavBar';
import { TopNavBar } from '../components/layout/TopNavBar';
import { RoleSwitcherBanner } from '../components/layout/RoleSwitcherBanner';
import { PhoneInputWithCountry } from '../components/common/PhoneInputWithCountry';
import { ProfessionalProfileModal } from '../components/patient/ProfessionalProfileModal';
import { ProfessionalCard } from '../components/patient/ProfessionalCard';
import { generateCalendarLinksFromAppointment } from '../utils/calendarLinks';
import { 
  Calendar, 
  CalendarPlus, 
  Star, 
  Users, 
  Award, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight, 
  Search,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

interface PatientPortalPageProps {
  onNavigate: (path: string) => void;
}

export const PatientPortalPage: React.FC<PatientPortalPageProps> = ({ onNavigate }) => {
  const { tenant } = useAuth();
  const { t } = useI18n();

  const [professionals, setProfessionals] = useState<ProfessionalWithDetails[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [selectedProfId, setSelectedProfId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('10:00');
  const [bookingReason, setBookingReason] = useState<string>('Evaluación inicial y diagnóstico funcional');
  const [patientName, setPatientName] = useState<string>('Camila Soto');
  const [patientEmail, setPatientEmail] = useState<string>('camila.soto@email.com');
  const [patientPhone, setPatientPhone] = useState<string>('+57 300 123 4567');
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [modalProfessional, setModalProfessional] = useState<ProfessionalWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Booking Success State with Calendar Links
  const [lastBookedAppointment, setLastBookedAppointment] = useState<Appointment | null>(null);
  const [bookedSuccess, setBookedSuccess] = useState<boolean>(false);

  useEffect(() => {
    loadProfessionals();
    loadAppointments();
  }, []);

  const loadProfessionals = async () => {
    const profs = await fetchProfessionalsWithJoinedDetails({ tenantId: tenant?.id });
    setProfessionals(profs);
    if (profs.length > 0 && !selectedProfId) {
      setSelectedProfId(profs[0].id);
    }
  };

  const loadAppointments = async () => {
    const { data } = await supabase.from('appointments').select('*').order('start_time', { ascending: true });
    if (data) {
      setPatientAppointments(data);
    }
  };

  const filteredProfessionals = professionals.filter((p) => {
    const matchSpecialty = selectedSpecialty === 'all' || p.role === selectedSpecialty;
    const matchSearch =
      !searchQuery.trim() ||
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.specialty && p.specialty.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.profile?.alma_mater && p.profile.alma_mater.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSpecialty && matchSearch;
  });

  const selectedProfessional = professionals.find((p) => p.id === selectedProfId) || professionals[0];

  const handleOpenDetails = (prof: ProfessionalWithDetails) => {
    setModalProfessional(prof);
    setIsModalOpen(true);
  };

  const handleSelectFromModal = (profId: string) => {
    setSelectedProfId(profId);
    // Smoothly scroll to booking form
    const bookingFormEl = document.getElementById('booking-section');
    if (bookingFormEl) {
      bookingFormEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const prof = professionals.find((p) => p.id === selectedProfId) || professionals[0];
    const startIso = `${selectedDate}T${selectedTime}:00Z`;
    const endIso = `${selectedDate}T${selectedTime.split(':')[0]}:45:00Z`;

    const newAppt: Partial<Appointment> = {
      tenant_id: tenant?.id || 'tenant_kine_001',
      professional_id: selectedProfId,
      patient_id: 'pat_camila_01',
      start_time: startIso,
      end_time: endIso,
      status: 'booked',
      reason: bookingReason,
      professional_type: prof?.role as any,
      patient: {
        full_name: patientName,
        email: patientEmail,
        phone: patientPhone,
      },
      professional: {
        full_name: prof?.full_name || 'Especialista',
        email: prof?.email || 'prof@kinesys.health',
        role: prof?.role || 'fisioterapeuta',
        specialty: prof?.specialty || 'Kinesiología',
      },
    };

    const { data } = await supabase.from('appointments').insert(newAppt);
    const created = Array.isArray(data) ? data[0] : (newAppt as Appointment);
    setLastBookedAppointment(created);
    setBookedSuccess(true);
    loadAppointments();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row text-slate-800 dark:text-slate-200">
      <SideNavBar currentPath="/portal-paciente" onNavigate={onNavigate} />

      <main className="flex-1 md:ml-72 pt-16 pb-20 px-4 sm:px-8 max-w-7xl mx-auto w-full space-y-8">
        <TopNavBar currentPath="/portal-paciente" onNavigate={onNavigate} />

        {/* Portal Hero Banner */}
        <div className="pt-2">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-lg border border-indigo-800/40">
            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-black uppercase tracking-wider">
                  {t('portal.title', 'Portal del Paciente')}
                </span>
                <span className="text-xs font-semibold text-indigo-300">
                  {tenant?.name || 'Clínica KineSys Salud Integral'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Nuestros Especialistas, Hojas de Vida & Reseñas
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                Conoce la trayectoria académica, certificaciones y valoraciones de nuestros profesionales de la salud. Consulta testimonios 100% moderados y agenda tu cita en línea.
              </p>
            </div>

            {/* Subtle background decoration */}
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-8 translate-y-8">
              <Sparkles className="w-64 h-64 text-indigo-300" />
            </div>
          </div>
        </div>

        {/* Section 1: Professional Profiles Catalog with Reviews and Filters */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Equipo Clínico Disponible</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Haz clic en cualquier tarjeta para ver su biografía completa, universidad y opiniones de pacientes.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o universidad..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Specialty Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Todas las Especialidades' },
              { id: 'fisioterapeuta', label: 'Fisioterapia & Kinesiología' },
              { id: 'nutricionista', label: 'Nutrición Clínica & Deportiva' },
              { id: 'medico_general', label: 'Medicina General' },
            ].map((spec) => (
              <button
                key={spec.id}
                type="button"
                onClick={() => setSelectedSpecialty(spec.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedSpecialty === spec.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                {spec.label}
              </button>
            ))}
          </div>

          {/* Professionals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProfessionals.map((prof) => (
              <ProfessionalCard
                key={prof.id}
                professional={prof}
                isSelected={selectedProfId === prof.id}
                onSelect={(id) => {
                  setSelectedProfId(id);
                  handleSelectFromModal(id);
                }}
                onOpenDetails={handleOpenDetails}
              />
            ))}
          </div>
        </section>

        {/* Section 2: Booking Form & Active Professional Summary */}
        <section id="booking-section" className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4 border-t border-slate-200 dark:border-slate-800">
          {/* Left / Center (2 cols): Booking Form */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>{t('portal.book_new_appointment', 'Agendar Nueva Consulta')}</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Selecciona la fecha, hora y confirma tus datos de contacto para la cita.
                </p>
              </div>

              {selectedProfessional && (
                <button
                  type="button"
                  onClick={() => handleOpenDetails(selectedProfessional)}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>Ver Hoja de Vida</span>
                </button>
              )}
            </div>

            {/* Selected Professional Preview Banner */}
            {selectedProfessional && (
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={selectedProfessional.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150'}
                    alt={selectedProfessional.full_name}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-500/20"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {selectedProfessional.full_name}
                      </p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-200/60 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                        {selectedProfessional.specialty || selectedProfessional.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      🎓 {selectedProfessional.profile?.alma_mater || 'Universidad de Ciencias de la Salud'} • ⭐ {selectedProfessional.rating_average || 5.0} ({selectedProfessional.reviews_count || 0} reseñas)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenDetails(selectedProfessional)}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer"
                >
                  Ver Reseñas
                </button>
              </div>
            )}

            {/* Booking Form */}
            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('calendar.date', 'Fecha de la Consulta')}
                  </label>
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('portal.select_time', 'Horario Disponible')}
                  </label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="08:30">08:30 - 09:15</option>
                    <option value="09:30">09:30 - 10:15</option>
                    <option value="10:00">10:00 - 10:45</option>
                    <option value="11:30">11:30 - 12:15</option>
                    <option value="14:00">14:00 - 14:45</option>
                    <option value="15:30">15:30 - 16:15</option>
                    <option value="16:30">16:30 - 17:15</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('portal.reason', 'Motivo de Consulta / Síntomas Principales')}
                </label>
                <input
                  type="text"
                  required
                  value={bookingReason}
                  onChange={(e) => setBookingReason(e.target.value)}
                  placeholder="Ej: Dolor lumbar irradiado, evaluación nutricional, control médico..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('patients.name', 'Nombre del Paciente')}
                  </label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('patients.email', 'Email de Confirmación')}
                  </label>
                  <input
                    type="email"
                    required
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <PhoneInputWithCountry
                    label={t('patients.phone', 'Teléfono de Contacto')}
                    value={patientPhone}
                    onChange={(fullNumber) => setPatientPhone(fullNumber)}
                    placeholder="300 123 4567"
                    defaultCountryCode="CO"
                  />
                </div>
              </div>

              {/* Booking Success Banner with Instant Calendar Integration */}
              {bookedSuccess && lastBookedAppointment && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>¡Cita confirmada exitosamente con {selectedProfessional?.full_name}!</span>
                  </div>

                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Fecha: <strong>{selectedDate}</strong> a las <strong>{selectedTime} hrs</strong>. Hemos enviado el comprobante a <strong>{patientEmail}</strong>.
                  </p>

                  {/* Calendar Sync Buttons */}
                  <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                      Sincronizar con tu calendario:
                    </span>
                    {(() => {
                      const calLinks = generateCalendarLinksFromAppointment(lastBookedAppointment, {
                        clinicName: tenant?.name || 'Clínica KineSys',
                        clinicAddress: tenant?.address || 'Sede Principal',
                      });
                      return (
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={calLinks.google}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                          >
                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                            <span>Google Calendar</span>
                          </a>
                          <a
                            href={calLinks.outlook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                            <span>Outlook / Microsoft</span>
                          </a>
                          <a
                            href={calLinks.icsDataUrl}
                            download="cita_kinesys.ics"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                          >
                            <span>Descargar .ICS (Apple / iCal)</span>
                          </a>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              <button
                id="btn-submit-booking"
                type="submit"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>{t('portal.confirm_booking', 'Confirmar Reserva de Cita')}</span>
              </button>
            </form>
          </div>

          {/* Right Column: Upcoming Sessions & Patient Support */}
          <div className="space-y-5">
            {/* Upcoming Appointments Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{t('portal.my_appointments', 'Mis Citas & Historial')}</span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {patientAppointments.length} citas
                </span>
              </h3>

              <div className="space-y-3">
                {patientAppointments.slice(0, 4).map((appt) => (
                  <div
                    key={appt.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {appt.reason || t('calendar.consultation', 'Consulta')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 uppercase">
                        {appt.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                      👨‍⚕️ {appt.professional?.full_name || 'Especialista KineSys'}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-indigo-500" />
                        <span>
                          {new Date(appt.start_time).toLocaleString('es-ES', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinic Info Box */}
            <div className="p-5 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-4 h-4" />
                <p className="font-bold">{t('portal.patient_support', 'Atención y Seguridad del Paciente')}</p>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                {tenant?.name || 'Clínica KineSys'} • {tenant?.address || 'Av. El Poblado # 5A-110'}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {t('portal.cancellation_policy', 'Cancelaciones permitidas hasta 24 horas antes sin recargo.')}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Professional Profile & Reviews Modal */}
      {modalProfessional && (
        <ProfessionalProfileModal
          professional={modalProfessional}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelectForBooking={handleSelectFromModal}
          onReviewAdded={() => {
            loadProfessionals();
          }}
        />
      )}

      <RoleSwitcherBanner onNavigate={onNavigate} currentPath="/portal-paciente" />
    </div>
  );
};
