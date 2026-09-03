/**
 * KineSys — Repositorio de datos clínicos (Supabase Postgres real)
 */
import {
  signInWithOAuth as authSignInWithOAuth,
  signInWithOtp as authSignInWithOtp,
  verifyOtp as authVerifyOtp,
  signOut as authSignOut,
  getUser as authGetUser,
  getSession as authGetSession,
  onAuthStateChange as authOnAuthStateChange,
  isAuthConfigured,
} from './supabaseAuth';
import { supabaseDataClient, isSupabaseConfigured, clinicalFrom } from './supabaseDataClient';
import { getNativeAuth } from './supabaseAuth';
import { assertSupabaseOk } from '../utils/supabaseErrors';
import {
  User,
  UserRole,
  Tenant,
  Appointment,
  PainObservation,
  PricingPlanConfig,
  PacienteClinico,
  HistoriaClinica,
  KinesiologyEvaluation,
  ConsultaSOP,
  PrescripcionMedica,
  EvaluacionAntropometrica,
  PlanNutricional,
  OrdenNutricionFHIR,
  ProfessionalProfile,
  Review,
  ProfessionalWithDetails,
  ProfessionalAvailability,
  ProfessionalAvailabilityException,
  AvailabilityTimeSlot,
  AppModule,
} from '../types';
import {
  getAvailableSlots as computeAvailableSlots,
  isTimeWithinPublishedAvailability,
  isSlotBooked,
} from '../utils/availabilityUtils';

// ─── Config estática ───────────────────────────────────────────────────────────

export const PRICING_PLANS: PricingPlanConfig[] = [
  {
    id: 'starter',
    name: 'Starter Plan',
    tagline: 'Ideal para profesionales independientes o consultorios individuales.',
    price_cop: 119000,
    price_usd: 29,
    max_users: 1,
    trial_days: 7,
    features: [
      '1 Usuario profesional con acceso total',
      'Agenda médica interactiva con recordatorios',
      'Ficha clínica y Mapa de Dolor 2D',
      'Portal del Paciente para auto-agendamiento',
      'Pasarela de pagos Wompi integrada (COP)',
      'Soporte por email 24/7',
    ],
  },
  {
    id: 'growth',
    name: 'Growth Clinic',
    tagline: 'El plan más elegido por clínicas y centros multidisciplinarios en crecimiento.',
    price_cop: 299000,
    price_usd: 75,
    max_users: 5,
    trial_days: 7,
    popular: true,
    features: [
      'Hasta 5 Profesionales (Fisio, Nutri, Médicos)',
      'Control de Acceso Basado en Roles (RBAC)',
      'Módulo Nutricional (Composición e InBody)',
      'Módulo Médico General (Recetas y Laboratorio)',
      'Invitaciones de equipo con un clic',
      'Métricas de facturación y pagos Wompi (COP)',
      'Soporte prioritario por WhatsApp & Email',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Salud',
    tagline: 'Para redes de clínicas, hospitales de día y centros de alto volumen.',
    price_cop: 699000,
    price_usd: 175,
    max_users: 25,
    trial_days: 7,
    features: [
      'Usuarios Ilimitados (10+ profesionales)',
      'Múltiples sucursales y sincronización multi-sede',
      'Integración API personalizada (ERP / Facturación)',
      'Customización de marca blanca completa',
      'Acuerdo de nivel de servicio (SLA 99.9%)',
      'Gerente de cuenta y onboarding dedicado',
    ],
  },
];

/** Fallback mínimo si RBAC aún no está en DB */
export const DEFAULT_APP_MODULES: AppModule[] = [
  { id: 'mod_calendario', name: 'Agenda & Citas', path_route: '/calendario', icon: 'calendar_month', display_order: 1 },
  { id: 'mod_pacientes', name: 'Pacientes', path_route: '/pacientes', icon: 'group', display_order: 2 },
  { id: 'mod_historia_clinica', name: 'Historia Clínica', path_route: '/historia-clinica', icon: 'clinical_notes', display_order: 3 },
  { id: 'mod_evaluacion_kinesica', name: 'Evaluación Kinésica', path_route: '/evaluacion-kinesica', icon: 'physical_therapy', display_order: 4 },
  { id: 'mod_configuracion', name: 'Gestión de Clínica', path_route: '/configuracion', icon: 'settings', display_order: 7 },
];

// ─── Cliente Supabase (real) ───────────────────────────────────────────────────
// Proxy: NO mutar supabaseDataClient.auth con Object.assign (causa recursión en onAuthStateChange).

const nativeAuthApi = getNativeAuth();

const supabaseAuthFacade = {
  getUser: authGetUser,
  getSession: authGetSession,
  signInWithOAuth: authSignInWithOAuth,
  signInWithOtp: authSignInWithOtp,
  verifyOtp: authVerifyOtp,
  signOut: authSignOut,
  onAuthStateChange: authOnAuthStateChange,
  signUp: (credentials: { email: string; password: string; options?: Record<string, unknown> }) => {
    if (!nativeAuthApi) {
      return Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase Auth no está configurado.' } });
    }
    return nativeAuthApi.signUp(credentials);
  },
};

export const supabase = new Proxy(supabaseDataClient, {
  get(target, prop, receiver) {
    if (prop === 'from') {
      return (table: string) => clinicalFrom(table);
    }
    if (prop === 'auth') {
      return supabaseAuthFacade;
    }
    if (prop === 'isUsingLocalEngine') {
      return () => !isSupabaseConfigured();
    }
    return Reflect.get(target, prop, receiver);
  },
}) as typeof supabaseDataClient & {
  from: typeof clinicalFrom;
  auth: typeof supabaseAuthFacade;
  isUsingLocalEngine: () => boolean;
};

// ─── CRUD Pacientes ────────────────────────────────────────────────────────────

export async function getPatients(tenantId: string): Promise<PacienteClinico[]> {
  const { data, error } = await supabase
    .from('pacientes_clinicos')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('last_name', { ascending: true });
  if (error) throw error;
  return (data as PacienteClinico[]) || [];
}

export async function createPatient(
  tenantId: string,
  patient: Omit<PacienteClinico, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
): Promise<PacienteClinico> {
  const { data, error } = await supabase
    .from('pacientes_clinicos')
    .insert([{ ...patient, tenant_id: tenantId }])
    .select()
    .single();
  return assertSupabaseOk({ data, error }) as PacienteClinico;
}

// ─── CRUD Citas ────────────────────────────────────────────────────────────────

export async function getAppointments(
  tenantId: string,
  filters?: { professionalId?: string; patientId?: string }
): Promise<Appointment[]> {
  let query = supabase
    .from('appointments')
    .select('*, paciente:pacientes_clinicos(id, first_name, last_name, telecom_email, telecom_phone)')
    .eq('tenant_id', tenantId)
    .order('start_time', { ascending: true });

  if (filters?.professionalId) query = query.eq('professional_id', filters.professionalId);
  if (filters?.patientId) query = query.eq('patient_id', filters.patientId);

  const { data, error } = await query;
  if (error) throw error;

  return ((data as Record<string, unknown>[]) || []).map((row) => {
    const paciente = row.paciente as { first_name?: string; last_name?: string; telecom_email?: string; telecom_phone?: string } | null;
    return {
      ...row,
      patient: paciente
        ? {
            full_name: `${paciente.first_name || ''} ${paciente.last_name || ''}`.trim(),
            email: paciente.telecom_email || '',
            phone: paciente.telecom_phone,
          }
        : undefined,
    } as Appointment;
  });
}

export async function createAppointment(
  data: Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'patient' | 'professional'>
): Promise<Appointment> {
  const { data: row, error } = await supabase.from('appointments').insert([data]).select().single();
  return assertSupabaseOk({ data: row, error }) as Appointment;
}

export async function updateAppointment(
  id: string,
  updates: Partial<Appointment>
): Promise<Appointment> {
  const { data, error } = await supabase.from('appointments').update(updates).eq('id', id).select().single();
  return assertSupabaseOk({ data, error }) as Appointment;
}

export async function deleteAppointment(id: string): Promise<void> {
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) throw error;
}

// ─── Clínico ───────────────────────────────────────────────────────────────────

export async function getHistoriaClinicaByPatient(
  tenantId: string,
  patientId: string
): Promise<HistoriaClinica | null> {
  const { data, error } = await supabase
    .from('historias_clinicas')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('patient_id', patientId)
    .maybeSingle();
  if (error) throw error;
  return (data as HistoriaClinica) || null;
}

export async function saveHistoriaClinica(
  data: Omit<HistoriaClinica, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<HistoriaClinica> {
  const payload = {
    tenant_id: data.tenant_id,
    patient_id: data.patient_id,
    professional_id: data.professional_id,
    ocupacion: data.ocupacion || null,
    motivo_consulta: data.motivo_consulta || null,
    deporte_practica: data.deporte_practica || null,
    nivel_deporte: data.nivel_deporte || null,
    frecuencia_semanal: data.frecuencia_semanal || null,
    lesiones_anteriores: data.lesiones_anteriores || null,
    habitos_estilo_vida: data.habitos_estilo_vida || null,
    updated_at: new Date().toISOString(),
  };

  if (data.id) {
    const { data: row, error } = await supabase
      .from('historias_clinicas')
      .update(payload)
      .eq('id', data.id)
      .select()
      .single();
    return assertSupabaseOk({ data: row, error }) as HistoriaClinica;
  }

  const { data: row, error } = await supabase
    .from('historias_clinicas')
    .upsert(payload, { onConflict: 'tenant_id,patient_id' })
    .select()
    .single();
  return assertSupabaseOk({ data: row, error }) as HistoriaClinica;
}

export async function getKinesiologyEvaluations(
  tenantId: string,
  patientId: string
): Promise<KinesiologyEvaluation[]> {
  const { data, error } = await supabase
    .from('evaluaciones_kinesicas')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as KinesiologyEvaluation[]) || [];
}

export async function saveKinesiologyEvaluation(
  data: Omit<KinesiologyEvaluation, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<KinesiologyEvaluation> {
  const payload = {
    tenant_id: data.tenant_id,
    patient_id: data.patient_id,
    professional_id: data.professional_id,
    postura: data.postura ?? {},
    movilidad: data.movilidad ?? [],
    fuerza: data.fuerza ?? [],
    gestos_movimiento: data.gestos_movimiento ?? [],
    diagnostico_kinesico: data.diagnostico_kinesico || null,
    plan_tratamiento: data.plan_tratamiento || null,
    observaciones_generales: data.observaciones_generales || null,
    updated_at: new Date().toISOString(),
  };

  if (data.id) {
    const { data: row, error } = await supabase
      .from('evaluaciones_kinesicas')
      .update(payload)
      .eq('id', data.id)
      .select()
      .single();
    return assertSupabaseOk({ data: row, error }) as KinesiologyEvaluation;
  }

  const { data: row, error } = await supabase
    .from('evaluaciones_kinesicas')
    .insert([payload])
    .select()
    .single();
  return assertSupabaseOk({ data: row, error }) as KinesiologyEvaluation;
}

export async function saveSoapEncounter(data: Omit<ConsultaSOP, 'id' | 'created_at' | 'updated_at'>): Promise<ConsultaSOP> {
  const { data: row, error } = await supabase.from('consultas_soap').insert([data]).select().single();
  return assertSupabaseOk({ data: row, error }) as ConsultaSOP;
}

export async function saveAnthropometry(
  tenantId: string,
  patientId: string,
  nutritionistId: string,
  record: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from('evaluaciones_antropometricas').insert([
    { tenant_id: tenantId, patient_id: patientId, nutritionist_id: nutritionistId, data: record },
  ]);
  if (error) throw error;
}

export async function saveNutritionalPlan(
  tenantId: string,
  patientId: string,
  nutritionistId: string,
  planName: string,
  planType: string,
  data: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from('planes_nutricionales').insert([
    {
      tenant_id: tenantId,
      patient_id: patientId,
      nutritionist_id: nutritionistId,
      plan_name: planName,
      plan_type: planType,
      data,
    },
  ]);
  if (error) throw error;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function formatPatientNameForPrivacy(fullName?: string): string {
  if (!fullName || typeof fullName !== 'string') return 'Paciente KineSys';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
}

export async function fetchProfessionalsWithFullDetails(tenantId?: string): Promise<ProfessionalWithDetails[]> {
  let query = supabase.from('users').select('*');
  if (tenantId) query = query.eq('tenant_id', tenantId);

  const { data: usersData, error: usersErr } = await query;
  if (usersErr) throw usersErr;

  const professionals = (usersData as User[]).filter((u) =>
    ['fisioterapeuta', 'nutricionista', 'medico_general', 'professional', 'clinic_admin'].includes(u.role)
  );

  const { data: profilesData } = await supabase.from('professional_profiles').select('*');
  const { data: reviewsData } = await supabase.from('reviews').select('*');

  const approvedReviews = (reviewsData as Review[] || []).filter((r) => r.status === 'approved');

  return professionals.map((prof) => {
    const profile = (profilesData as ProfessionalProfile[] || []).find((p) => p.user_id === prof.id);
    const profReviews = approvedReviews.filter((r) => r.professional_id === prof.id);
    const totalRatings = profReviews.reduce((sum, r) => sum + r.rating, 0);
    const ratingAverage =
      profReviews.length > 0 ? Number((totalRatings / profReviews.length).toFixed(1)) : profile?.rating_average || 5.0;

    return {
      ...prof,
      profile: profile || undefined,
      reviews: profReviews,
      rating_average: ratingAverage,
      reviews_count: profReviews.length || profile?.reviews_count || 0,
    };
  });
}

export async function fetchProfessionalDetails(userId: string): Promise<ProfessionalWithDetails | null> {
  const { data: userData, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error || !userData) return null;

  const { data: profileData } = await supabase.from('professional_profiles').select('*').eq('user_id', userId).single();
  const { data: reviewsData } = await supabase.from('reviews').select('*').eq('professional_id', userId);

  const approvedReviews = (reviewsData as Review[] || []).filter((r) => r.status === 'approved');
  const totalRatings = approvedReviews.reduce((sum, r) => sum + r.rating, 0);

  return {
    ...(userData as User),
    profile: (profileData as ProfessionalProfile) || undefined,
    reviews: approvedReviews,
    rating_average:
      approvedReviews.length > 0
        ? Number((totalRatings / approvedReviews.length).toFixed(1))
        : (profileData as ProfessionalProfile)?.rating_average || 5.0,
    reviews_count: approvedReviews.length,
  };
}

function isMissingRelationError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === 'PGRST205' || (error.message || '').includes('schema cache');
}

export async function fetchProfessionalAvailability(userId: string): Promise<ProfessionalAvailability[]> {
  try {
    const { data, error } = await supabase
      .from('professional_availability')
      .select('*')
      .eq('user_id', userId)
      .order('day_of_week', { ascending: true });

    if (error) {
      if (isMissingRelationError(error)) return [];
      throw error;
    }
    return (data as ProfessionalAvailability[]) || [];
  } catch (e) {
    console.warn('Agenda no disponible:', e);
    return [];
  }
}

export async function saveProfessionalWeeklyAvailability(
  userId: string,
  blocks: Omit<ProfessionalAvailability, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase.from('professional_availability').delete().eq('user_id', userId);
    if (blocks.length === 0) return { success: true };

    const payload = blocks.map((block) => ({
      ...block,
      user_id: userId,
      is_active: block.is_active ?? true,
      slot_duration: block.slot_duration ?? 45,
    }));

    const { error } = await supabase.from('professional_availability').insert(payload);
    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'No se pudo guardar la disponibilidad' };
  }
}

export async function fetchProfessionalAvailabilityExceptions(
  userId: string
): Promise<ProfessionalAvailabilityException[]> {
  try {
    const { data, error } = await supabase
      .from('professional_availability_exceptions')
      .select('*')
      .eq('user_id', userId)
      .order('exception_date', { ascending: true });

    if (error) {
      if (isMissingRelationError(error)) return [];
      throw error;
    }
    return (data as ProfessionalAvailabilityException[]) || [];
  } catch (e) {
    console.warn('Excepciones de agenda no disponibles:', e);
    return [];
  }
}

export async function saveProfessionalAvailabilityExceptions(
  userId: string,
  exceptions: Omit<ProfessionalAvailabilityException, 'id' | 'user_id' | 'created_at'>[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase.from('professional_availability_exceptions').delete().eq('user_id', userId);
    if (exceptions.length === 0) return { success: true };

    const payload = exceptions.map((exc) => ({ ...exc, user_id: userId }));
    const { error } = await supabase.from('professional_availability_exceptions').insert(payload);
    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'No se pudieron guardar las excepciones' };
  }
}

export async function fetchAvailableTimeSlots(
  professionalId: string,
  dateStr: string,
  tenantId?: string,
  excludeAppointmentId?: string
): Promise<AvailabilityTimeSlot[]> {
  try {
    const [availability, exceptions, appointmentsResult] = await Promise.all([
      fetchProfessionalAvailability(professionalId),
      fetchProfessionalAvailabilityExceptions(professionalId),
      tenantId
        ? supabase.from('appointments').select('*').eq('tenant_id', tenantId)
        : supabase.from('appointments').select('*'),
    ]);

    if (appointmentsResult.error) {
      if (isMissingRelationError(appointmentsResult.error)) {
        return computeAvailableSlots(availability, exceptions, [], dateStr, professionalId, excludeAppointmentId);
      }
      console.warn('Citas no disponibles para calcular slots:', appointmentsResult.error);
      return computeAvailableSlots(availability, exceptions, [], dateStr, professionalId, excludeAppointmentId);
    }

    const appointments = (appointmentsResult.data as Appointment[]) || [];
    return computeAvailableSlots(availability, exceptions, appointments, dateStr, professionalId, excludeAppointmentId);
  } catch (e) {
    console.warn('Agenda no disponible:', e);
    return [];
  }
}

export async function validateAppointmentSlot(params: {
  professionalId: string;
  dateStr: string;
  startTime: string;
  durationMinutes: number;
  tenantId?: string;
  excludeAppointmentId?: string;
}): Promise<{ valid: boolean; error?: string }> {
  const { professionalId, dateStr, startTime, durationMinutes, tenantId, excludeAppointmentId } = params;

  const [availability, exceptions, appointmentsResult] = await Promise.all([
    fetchProfessionalAvailability(professionalId),
    fetchProfessionalAvailabilityExceptions(professionalId),
    tenantId
      ? supabase.from('appointments').select('*').eq('tenant_id', tenantId)
      : supabase.from('appointments').select('*'),
  ]);

  const appointments = (appointmentsResult.data as Appointment[]) || [];
  const profAppts = appointments.filter((a) => a.professional_id === professionalId);

  if (!isTimeWithinPublishedAvailability(availability, exceptions, dateStr, startTime, durationMinutes, professionalId)) {
    return { valid: false, error: 'El horario seleccionado no está dentro de la disponibilidad publicada del profesional.' };
  }

  if (isSlotBooked(profAppts, dateStr, startTime, durationMinutes, excludeAppointmentId)) {
    return { valid: false, error: 'Ya existe una cita reservada en ese horario.' };
  }

  return { valid: true };
}

export const CLINIC_STAFF_ROLES: UserRole[] = ['fisioterapeuta', 'nutricionista', 'medico_general', 'clinic_admin'];

export interface CreateProfessionalInput {
  full_name: string;
  email: string;
  role: UserRole;
  phone?: string;
  license_number?: string;
  specialty?: string;
}

const ROLE_SPECIALTY_MAP: Record<string, string> = {
  fisioterapeuta: 'Kinesiología & Fisioterapia',
  nutricionista: 'Nutrición Clínica',
  medico_general: 'Medicina General',
  clinic_admin: 'Administración Clínica',
};

export function getProfessionalRoleLabel(role: UserRole | string): string {
  switch (role) {
    case 'fisioterapeuta':
      return 'Fisioterapeuta';
    case 'nutricionista':
      return 'Nutricionista';
    case 'medico_general':
      return 'Médico General';
    case 'clinic_admin':
      return 'Administrador de Clínica';
    case 'super_admin':
      return 'Super Administrador';
    case 'receptionist':
      return 'Recepcionista';
    default:
      return String(role);
  }
}

export async function fetchClinicProfessionals(tenantId: string): Promise<User[]> {
  const { data, error } = await supabase.from('users').select('*').eq('tenant_id', tenantId);
  if (error) throw error;
  return ((data as User[]) || [])
    .filter((u) => CLINIC_STAFF_ROLES.includes(u.role))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export async function createProfessional(
  tenantId: string,
  input: CreateProfessionalInput,
  invitedBy?: string
): Promise<{ success: boolean; data?: User; error?: string }> {
  try {
    const normalizedEmail = input.email.trim().toLowerCase();

    const { data: existing } = await supabase.from('users').select('id').eq('email', normalizedEmail).maybeSingle();
    if (existing) {
      return { success: false, error: 'Ya existe un usuario registrado con ese correo electrónico.' };
    }

    const supabaseUrl = (import.meta as { env?: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      const { data: inviteData, error: inviteError } = await supabaseDataClient.functions.invoke(
        'invite-professional',
        {
          body: {
            email: normalizedEmail,
            full_name: input.full_name.trim(),
            role: input.role,
            tenant_id: tenantId,
            phone: input.phone?.trim(),
            license_number: input.license_number?.trim(),
            specialty: input.specialty?.trim() || ROLE_SPECIALTY_MAP[input.role] || '',
            invited_by: invitedBy,
          },
        }
      );
      if (!inviteError && inviteData?.user) {
        return { success: true, data: inviteData.user as User };
      }
    }

    return {
      success: false,
      error:
        'No se pudo invitar al profesional. Verifique que la Edge Function invite-professional esté desplegada.',
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'No se pudo crear el profesional.' };
  }
}

export async function updateProfessionalRole(
  userId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: userErr } = await supabase
      .from('users')
      .update({ role: newRole, specialty: ROLE_SPECIALTY_MAP[newRole] || undefined })
      .eq('id', userId);
    if (userErr) throw userErr;

    const { error: profileErr } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (profileErr) throw profileErr;

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'No se pudo actualizar el rol.' };
  }
}

export async function deactivateProfessional(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: userErr } = await supabase.from('users').update({ is_active: false }).eq('id', userId);
    if (userErr) throw userErr;
    const { error: profileErr } = await supabase.from('profiles').update({ is_active: false }).eq('id', userId);
    if (profileErr) throw profileErr;
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'No se pudo revocar el acceso.' };
  }
}

export async function reactivateProfessional(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: userErr } = await supabase.from('users').update({ is_active: true }).eq('id', userId);
    if (userErr) throw userErr;
    const { error: profileErr } = await supabase.from('profiles').update({ is_active: true }).eq('id', userId);
    if (profileErr) throw profileErr;
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'No se pudo reactivar el acceso.' };
  }
}

export async function submitProfessionalReview(
  review: Omit<Review, 'id' | 'created_at'>
): Promise<{ success: boolean; data?: Review; error?: string }> {
  try {
    const { data, error } = await supabase.from('reviews').insert([review]).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Review };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado' };
  }
}

/** Onboarding: crea tenant + users + profiles tras signUp */
export async function completeOnboarding(params: {
  clinicName: string;
  slug: string;
  adminEmail: string;
  adminName: string;
  adminPhone?: string;
  adminLicense?: string;
  adminRut?: string;
  clinicPhone?: string;
  clinicAddress?: string;
  subscriptionPlan: string;
  maxUsers: number;
  password: string;
}): Promise<{ tenant: Tenant; user: User }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase no está configurado. Configure VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
  }

  const trialEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: signUpData, error: signUpError } = await nativeAuthApi!.signUp({
    email: params.adminEmail.trim().toLowerCase(),
    password: params.password,
    options: { data: { full_name: params.adminName.trim() } },
  });
  if (signUpError) throw signUpError;
  if (!signUpData.user?.id) throw new Error('No se pudo crear el usuario de autenticación.');

  const authUserId = signUpData.user.id;

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert([
      {
        name: params.clinicName.trim(),
        slug: params.slug,
        timezone: 'America/Bogota',
        email: params.adminEmail.trim(),
        phone: params.clinicPhone,
        address: params.clinicAddress,
        subscription_plan: params.subscriptionPlan,
        subscription_status: 'trialing',
        max_users: params.maxUsers,
        trial_ends_at: trialEnds,
        is_wompi_sandbox: true,
      },
    ])
    .select()
    .single();

  if (tenantError) {
    await authSignOut();
    throw tenantError;
  }

  const tenantId = (tenant as Tenant).id;

  const { error: userError } = await supabase.from('users').insert([
    {
      id: authUserId,
      tenant_id: tenantId,
      email: params.adminEmail.trim().toLowerCase(),
      full_name: params.adminName.trim(),
      role: 'clinic_admin',
      phone: params.adminPhone,
      license_number: params.adminLicense,
      rut_or_dni: params.adminRut,
      is_active: true,
    },
  ]);

  if (userError) {
    await supabase.from('tenants').delete().eq('id', tenantId);
    await authSignOut();
    throw userError;
  }

  const { error: profileError } = await supabase.from('profiles').insert([
    {
      id: authUserId,
      tenant_id: tenantId,
      email: params.adminEmail.trim().toLowerCase(),
      full_name: params.adminName.trim(),
      role: 'clinic_admin',
      is_active: true,
    },
  ]);

  if (profileError) {
    await supabase.from('users').delete().eq('id', authUserId);
    await supabase.from('tenants').delete().eq('id', tenantId);
    await authSignOut();
    throw profileError;
  }

  const user: User = {
    id: authUserId,
    email: params.adminEmail.trim().toLowerCase(),
    full_name: params.adminName.trim(),
    role: 'clinic_admin',
    phone: params.adminPhone,
    tenant_id: tenantId,
    license_number: params.adminLicense,
    rut_or_dni: params.adminRut,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  return { tenant: tenant as Tenant, user };
}

export async function loadProfileByAuthId(authUserId: string): Promise<{
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
} | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, tenant_id, email, full_name, role, is_active')
    .eq('id', authUserId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function loadUserByAuthId(authUserId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUserId)
    .maybeSingle();
  if (error || !data) return null;
  return data as User;
}

export async function loadUserByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', normalized)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) return null;
  return data as User;
}

export async function loadTenantById(tenantId: string): Promise<Tenant | null> {
  const { data, error } = await supabase.from('tenants').select('*').eq('id', tenantId).maybeSingle();
  if (error || !data) return null;
  return data as Tenant;
}

export type { PainObservation, PrescripcionMedica, EvaluacionAntropometrica, PlanNutricional, OrdenNutricionFHIR };
