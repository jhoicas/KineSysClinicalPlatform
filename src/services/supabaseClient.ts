import { createClient } from '@supabase/supabase-js';
import { 
  User, 
  Tenant, 
  Appointment, 
  PainObservation, 
  BodyCompositionRecord, 
  GeneralMedicalRecord, 
  PricingPlanConfig,
  TeamInvitation,
  PacienteClinico,
  ConsultaSOP,
  PrescripcionMedica,
  EvaluacionAntropometrica,
  PlanNutricional,
  OrdenNutricionFHIR,
  ProfessionalProfile,
  Review,
  ProfessionalWithDetails
} from '../types';
import { 
  INITIAL_NUTRITION_PLANS, 
  INITIAL_FHIR_NUTRITION_ORDERS 
} from '../data/nutritionCatalog';

// Default initial tenant with 7 days trial & Wompi integration fields
const DEFAULT_TENANT_ID = 'tenant_kine_001';

// Calculate trial end date (7 days from now)
const defaultTrialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

export const INITIAL_TENANT: Tenant = {
  id: DEFAULT_TENANT_ID,
  name: 'Centro Kinésico & Salud KineSys',
  slug: 'kinesys-salud',
  timezone: 'America/Bogota (UTC-5)',
  cancellation_window_hours: 24,
  email: 'contacto@kinesys-salud.co',
  phone: '+57 300 123 4567',
  address: 'Calle 100 # 19-61, Piso 6, Bogotá, Colombia',
  currency: 'COP',
  appointment_duration_minutes: 45,
  subscription_plan: 'growth',
  subscription_status: 'trialing',
  max_users: 5,
  trial_ends_at: defaultTrialEndDate,
  wompi_public_key: 'pub_test_Q123456789WompiKeySample',
  wompi_private_key: 'prv_test_987654321WompiPrivateKey',
  wompi_integrity_secret: 'prod_integrity_secret_xyz123',
  is_wompi_sandbox: true,
  logo_url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150&auto=format&fit=crop&q=80',
  primary_color: '#004870',
  settings: {
    theme: 'light',
    brand_name_display: 'both',
    accent_color: '#006c49',
  },
  created_at: '2025-01-01T00:00:00Z',
};

export const PRICING_PLANS: PricingPlanConfig[] = [
  {
    id: 'starter',
    name: 'Starter Plan',
    tagline: 'Ideal para profesionales independientes o consultorios individuales.',
    price_cop: 119000,
    price_clp: 24990,
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
    price_clp: 69990,
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
    price_clp: 159990,
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

// Initial demo users with distinct RBAC roles
export const INITIAL_USERS: User[] = [
  {
    id: 'user_superadmin_01',
    email: 'superadmin@kinesys.cloud',
    full_name: 'Dr. Alejandro Silva (Super Admin SaaS)',
    role: 'super_admin',
    phone: '+56 9 1111 2222',
    tenant_id: 'system_global',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'user_admin_01',
    email: 'directora@kinesys-salud.cl',
    full_name: 'Dra. Marcela Lagos (Clinic Admin)',
    role: 'clinic_admin',
    phone: '+56 9 8888 7777',
    tenant_id: DEFAULT_TENANT_ID,
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    license_number: 'COL-MED-9941',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'prof_mateo_01',
    email: 'mateo.gomez@kinesys-salud.cl',
    full_name: 'Klgo. Mateo Gómez V. (Fisioterapeuta)',
    role: 'fisioterapeuta',
    specialty: 'Kinesiología & Rehabilitación Deportiva',
    phone: '+56 9 9123 4567',
    tenant_id: DEFAULT_TENANT_ID,
    avatar_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    rut_or_dni: '16.890.342-K',
    license_number: 'COL-KIN-4502',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'prof_nutri_01',
    email: 'valeria.nutri@kinesys-salud.cl',
    full_name: 'Nut. Valeria Benítez (Nutricionista)',
    role: 'nutricionista',
    specialty: 'Nutrición Clínica & Composición Corporal',
    phone: '+56 9 8234 5678',
    tenant_id: DEFAULT_TENANT_ID,
    avatar_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    rut_or_dni: '17.441.229-3',
    license_number: 'COL-NUT-3199',
    created_at: '2025-01-05T00:00:00Z',
  },
  {
    id: 'prof_doctor_01',
    email: 'dr.castillo@kinesys-salud.cl',
    full_name: 'Dr. Fernando Castillo (Médico General)',
    role: 'medico_general',
    specialty: 'Medicina General & Salud Preventiva',
    phone: '+56 9 7345 6789',
    tenant_id: DEFAULT_TENANT_ID,
    avatar_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    rut_or_dni: '15.228.910-8',
    license_number: 'COL-MED-8420',
    created_at: '2025-01-08T00:00:00Z',
  },
  {
    id: 'pat_camila_01',
    email: 'camila.soto@email.com',
    full_name: 'Camila Soto Valenzuela',
    role: 'patient',
    phone: '+56 9 8451 2299',
    tenant_id: DEFAULT_TENANT_ID,
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    rut_or_dni: '19.452.128-4',
    birth_date: '1995-04-12',
    gender: 'Femenino',
    medical_conditions: ['Tendinitis rotuliana', 'Cirugía LCA (2023)'],
    allergies: ['Penicilina'],
    emergency_contact: {
      name: 'Carlos Soto (Padre)',
      phone: '+56 9 7712 3456',
      relationship: 'Padre',
    },
    created_at: '2025-01-10T10:00:00Z',
  },
  {
    id: 'pat_rodrigo_02',
    email: 'rodrigo.mendoza@email.com',
    full_name: 'Rodrigo Mendoza Tapia',
    role: 'patient',
    phone: '+56 9 7622 1100',
    tenant_id: DEFAULT_TENANT_ID,
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    rut_or_dni: '14.231.890-7',
    birth_date: '1988-11-23',
    gender: 'Masculino',
    medical_conditions: ['Hernia discal lumbar L4-L5', 'Hipertensión leve'],
    allergies: ['Ninguna conocida'],
    emergency_contact: {
      name: 'Elena Morales (Cónyuge)',
      phone: '+56 9 6543 2198',
      relationship: 'Cónyuge',
    },
    created_at: '2025-01-12T14:30:00Z',
  },
  {
    id: 'pat_valentina_03',
    email: 'valentina.rios@email.com',
    full_name: 'Valentina Ríos Castro',
    role: 'patient',
    phone: '+56 9 5544 3322',
    tenant_id: DEFAULT_TENANT_ID,
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    rut_or_dni: '18.904.551-9',
    birth_date: '1992-08-17',
    gender: 'Femenino',
    medical_conditions: ['Pinzamiento subacromial derecho'],
    allergies: ['Ibuprofeno'],
    emergency_contact: {
      name: 'Javier Ríos',
      phone: '+56 9 4433 2211',
      relationship: 'Hermano',
    },
    created_at: '2025-01-15T09:00:00Z',
  },
  {
    id: 'pat_diego_04',
    email: 'diego.alarcon@email.com',
    full_name: 'Diego Alarcón Herrera',
    role: 'patient',
    phone: '+56 9 9887 6655',
    tenant_id: DEFAULT_TENANT_ID,
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    rut_or_dni: '17.334.882-1',
    birth_date: '1990-03-05',
    gender: 'Masculino',
    medical_conditions: ['Esguince de tobillo grado II (lateral)'],
    allergies: ['Ninguna'],
    emergency_contact: {
      name: 'Marcela Herrera',
      phone: '+56 9 3322 1100',
      relationship: 'Madre',
    },
    created_at: '2025-01-20T11:15:00Z',
  },
  {
    id: 'pat_lucia_05',
    email: 'lucia.pardo@email.com',
    full_name: 'Dra. Lucía Pardo Silva',
    role: 'patient',
    phone: '+56 9 6112 3344',
    tenant_id: DEFAULT_TENANT_ID,
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    rut_or_dni: '15.678.901-3',
    birth_date: '1984-06-29',
    gender: 'Femenino',
    medical_conditions: ['Cervicobraquialgia derecha', 'Bruxismo severo'],
    allergies: ['Látex'],
    emergency_contact: {
      name: 'Andrés Pardo',
      phone: '+56 9 1122 3344',
      relationship: 'Esposo',
    },
    created_at: '2025-02-01T16:00:00Z',
  },
];

export const INITIAL_PROFESSIONAL = INITIAL_USERS[2]; // Klgo Mateo
export const INITIAL_PATIENTS = INITIAL_USERS.filter((u) => u.role === 'patient');

const todayStr = new Date().toISOString().split('T')[0];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'appt_001',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_mateo_01',
    patient_id: 'pat_camila_01',
    start_time: `${todayStr}T09:00:00Z`,
    end_time: `${todayStr}T09:45:00Z`,
    status: 'booked',
    reason: 'Rehabilitación post-quirúrgica LCA - Sesión 8',
    notes: 'Control de flexión activa y fortalecimiento de cuádriceps.',
    room_or_box: 'Box 3 - Gimnasio',
    professional_type: 'fisioterapeuta',
    patient: {
      full_name: 'Camila Soto Valenzuela',
      email: 'camila.soto@email.com',
      phone: '+56 9 8451 2299',
      avatar_url: INITIAL_USERS[5].avatar_url,
    },
    professional: {
      full_name: 'Klgo. Mateo Gómez V.',
      email: 'mateo.gomez@kinesys-salud.cl',
      role: 'fisioterapeuta',
      specialty: 'Kinesiología Deportiva',
    },
  },
  {
    id: 'appt_002',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_mateo_01',
    patient_id: 'pat_rodrigo_02',
    start_time: `${todayStr}T10:30:00Z`,
    end_time: `${todayStr}T11:15:00Z`,
    status: 'confirmed',
    reason: 'Terapia descompresiva lumbar y ejercicios McKenzie',
    notes: 'Paciente refiere disminución de irradiación a glúteo.',
    room_or_box: 'Box 1',
    professional_type: 'fisioterapeuta',
    patient: {
      full_name: 'Rodrigo Mendoza Tapia',
      email: 'rodrigo.mendoza@email.com',
      phone: '+56 9 7622 1100',
      avatar_url: INITIAL_USERS[6].avatar_url,
    },
    professional: {
      full_name: 'Klgo. Mateo Gómez V.',
      email: 'mateo.gomez@kinesys-salud.cl',
      role: 'fisioterapeuta',
    },
  },
  {
    id: 'appt_003',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_nutri_01',
    patient_id: 'pat_valentina_03',
    start_time: `${todayStr}T11:30:00Z`,
    end_time: `${todayStr}T12:15:00Z`,
    status: 'confirmed',
    reason: 'Evaluación InBody y ajuste calórico déficit leve',
    notes: 'Plan adaptado a entrenamiento de fuerza 4x semana.',
    room_or_box: 'Box Nutrición 2',
    professional_type: 'nutricionista',
    patient: {
      full_name: 'Valentina Ríos Castro',
      email: 'valentina.rios@email.com',
      phone: '+56 9 5544 3322',
      avatar_url: INITIAL_USERS[7].avatar_url,
    },
    professional: {
      full_name: 'Nut. Valeria Benítez',
      email: 'valeria.nutri@kinesys-salud.cl',
      role: 'nutricionista',
      specialty: 'Nutrición Clínica',
    },
  },
  {
    id: 'appt_004',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_doctor_01',
    patient_id: 'pat_diego_04',
    start_time: `${todayStr}T14:00:00Z`,
    end_time: `${todayStr}T14:45:00Z`,
    status: 'completed',
    reason: 'Chequeo preventivo anual y orden de laboratorio',
    notes: 'Presión 120/80 mmHg. Se solicitan perfil lipídico y glicemia.',
    room_or_box: 'Box Médico 1',
    professional_type: 'medico_general',
    patient: {
      full_name: 'Diego Alarcón Herrera',
      email: 'diego.alarcon@email.com',
      phone: '+56 9 9887 6655',
      avatar_url: INITIAL_USERS[8].avatar_url,
    },
    professional: {
      full_name: 'Dr. Fernando Castillo',
      email: 'dr.castillo@kinesys-salud.cl',
      role: 'medico_general',
      specialty: 'Medicina General',
    },
  },
];

export const INITIAL_PAIN_OBSERVATIONS: PainObservation[] = [
  {
    id: 'pain_obs_01',
    tenant_id: DEFAULT_TENANT_ID,
    patient_id: 'pat_camila_01',
    professional_id: 'prof_mateo_01',
    pain_level: 6,
    pain_type: 'punzante',
    body_region: 'Rodilla Derecha (Tendón Rotuliano)',
    body_side: 'front',
    coordinates_x: 42,
    coordinates_y: 68,
    clinical_notes: 'Dolor agudo al realizar sentadilla unipodal y bajar escaleras. Sin derrame articular evidente.',
    tags: ['Tendinitis', 'Post-ejercicio', 'Rodilla'],
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'pain_obs_02',
    tenant_id: DEFAULT_TENANT_ID,
    patient_id: 'pat_rodrigo_02',
    professional_id: 'prof_mateo_01',
    pain_level: 8,
    pain_type: 'irradiado',
    body_region: 'Zona Lumbar Baja (L4-L5)',
    body_side: 'back',
    coordinates_x: 50,
    coordinates_y: 48,
    clinical_notes: 'Dolor urente con irradiación hacia dermatoma L5 derecho tras sedestación prolongada (+45 min).',
    tags: ['Lumbalgia', 'Irradiación L5', 'Sedestación'],
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

export const INITIAL_BODY_COMPOSITIONS: BodyCompositionRecord[] = [
  {
    id: 'body_comp_01',
    tenant_id: DEFAULT_TENANT_ID,
    patient_id: 'pat_valentina_03',
    nutritionist_id: 'prof_nutri_01',
    weight_kg: 62.4,
    height_cm: 167,
    body_fat_percentage: 22.1,
    muscle_mass_kg: 27.8,
    visceral_fat_level: 4,
    bmr_kcal: 1420,
    metabolic_age: 26,
    dietary_plan: 'Pauta hiperproteica 1.8g/kg para recomposición corporal y entrenamiento de fuerza.',
    caloric_target_kcal: 1850,
    macros: {
      protein_grams: 115,
      carbs_grams: 195,
      fats_grams: 55,
    },
    clinical_notes: 'Excelente adherencia al consumo hídrico. Se redujo porcentaje graso en 1.2% respecto al mes anterior.',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];

export const INITIAL_MEDICAL_RECORDS: GeneralMedicalRecord[] = [
  {
    id: 'med_rec_01',
    tenant_id: DEFAULT_TENANT_ID,
    patient_id: 'pat_diego_04',
    doctor_id: 'prof_doctor_01',
    vital_signs: {
      blood_pressure: '120/80',
      heart_rate_bpm: 68,
      temp_celsius: 36.6,
      oxygen_saturation: 99,
    },
    chief_complaint: 'Control preventivo general y evaluación de aptitud física deportiva.',
    physical_examination: 'Paciente normolíneo, orientado en tiempo y espacio. Ruidos cardíacos rítmicos sin soplos. Murmullo pulmonar conservado bilateralmente.',
    diagnosis_icd10: 'Z00.0 - Examen médico general',
    prescriptions: [
      {
        medication: 'Vitamina D3 50.000 UI',
        dosage: '1 cápsula',
        frequency: 'Cada 15 días',
        duration: '3 meses',
      },
    ],
    lab_orders: ['Hemograma completo', 'Perfil Lipídico', 'Glicemia en ayunas', 'TSH y T4 libre'],
    evolution_notes: 'Paciente en excelente condición hemodinámica general. Próximo control con exámenes.',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

export const INITIAL_INVITATIONS: TeamInvitation[] = [
  {
    id: 'inv_001',
    tenant_id: DEFAULT_TENANT_ID,
    email: 'kine.andres@kinesys-salud.cl',
    role: 'fisioterapeuta',
    status: 'pending',
    invited_by: 'user_admin_01',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  },
];

// FHIR R4 Patient simulation records
export const INITIAL_PACIENTES_CLINICOS: PacienteClinico[] = [
  {
    id: 'pat_camila_01',
    tenant_id: DEFAULT_TENANT_ID,
    fhir_resource_id: 'Patient/19452128-4',
    identifier_type: 'CC',
    identifier_number: '19.452.128-4',
    first_name: 'Camila',
    last_name: 'Soto Valenzuela',
    gender: 'female',
    birth_date: '1995-04-12',
    telecom_phone: '+57 300 845 2299',
    telecom_email: 'camila.soto@email.com',
    blood_type: 'A+',
    known_allergies: ['Penicilina', 'Amoxicilina'],
    chronic_conditions: ['Tendinitis rotuliana crónica', 'Rinitis alérgica'],
    emergency_contact: {
      name: 'Carlos Soto',
      phone: '+57 300 771 3456',
      relationship: 'Padre',
    },
    active: true,
    created_at: '2025-01-10T10:00:00Z',
  },
  {
    id: 'pat_rodrigo_02',
    tenant_id: DEFAULT_TENANT_ID,
    fhir_resource_id: 'Patient/14231890-7',
    identifier_type: 'CC',
    identifier_number: '14.231.890-7',
    first_name: 'Rodrigo',
    last_name: 'Mendoza Tapia',
    gender: 'male',
    birth_date: '1988-11-23',
    telecom_phone: '+57 312 762 1100',
    telecom_email: 'rodrigo.mendoza@email.com',
    blood_type: 'O+',
    known_allergies: ['Ninguna'],
    chronic_conditions: ['Hernia discal lumbar L4-L5', 'Hipertensión arterial estadio 1'],
    emergency_contact: {
      name: 'Elena Morales',
      phone: '+57 310 654 2198',
      relationship: 'Cónyuge',
    },
    active: true,
    created_at: '2025-01-12T14:30:00Z',
  },
  {
    id: 'pat_valentina_03',
    tenant_id: DEFAULT_TENANT_ID,
    fhir_resource_id: 'Patient/18904551-9',
    identifier_type: 'CC',
    identifier_number: '18.904.551-9',
    first_name: 'Valentina',
    last_name: 'Ríos Castro',
    gender: 'female',
    birth_date: '1992-08-17',
    telecom_phone: '+57 315 554 3322',
    telecom_email: 'valentina.rios@email.com',
    blood_type: 'B+',
    known_allergies: ['Ibuprofeno', 'Ketorolaco', 'AINEs'],
    chronic_conditions: ['Pinzamiento subacromial derecho'],
    emergency_contact: {
      name: 'Javier Ríos',
      phone: '+57 311 443 2211',
      relationship: 'Hermano',
    },
    active: true,
    created_at: '2025-01-15T09:00:00Z',
  },
  {
    id: 'pat_diego_04',
    tenant_id: DEFAULT_TENANT_ID,
    fhir_resource_id: 'Patient/17334882-1',
    identifier_type: 'CC',
    identifier_number: '17.334.882-1',
    first_name: 'Diego',
    last_name: 'Alarcón Herrera',
    gender: 'male',
    birth_date: '1990-03-05',
    telecom_phone: '+57 318 988 6655',
    telecom_email: 'diego.alarcon@email.com',
    blood_type: 'O-',
    known_allergies: ['Ninguna conocida'],
    chronic_conditions: ['Esguince de tobillo grado II lateral'],
    emergency_contact: {
      name: 'Marcela Herrera',
      phone: '+57 320 332 1100',
      relationship: 'Madre',
    },
    active: true,
    created_at: '2025-01-20T11:15:00Z',
  },
];

// Initial SOAP Encounter records
export const INITIAL_CONSULTAS_SOAP: ConsultaSOP[] = [
  {
    id: 'soap_demo_01',
    tenant_id: DEFAULT_TENANT_ID,
    patient_id: 'pat_rodrigo_02',
    practitioner_id: 'prof_doctor_01',
    encounter_type: 'control',
    encounter_date: '2025-02-15',
    subjective: {
      chief_complaint: 'Control por lumbago mecánico recurrente y evaluación de cifras tensionales.',
      current_illness_history: 'Paciente refiere mejoría parcial con analgesia de rescate, pero persiste rigidez matutina lumbar de 15 minutos de duración.',
      review_of_systems: 'Sin cefalea ni tinitus. Afebril.',
      past_medical_history: 'HTA diagnosticada hace 2 años, hernia L4-L5.',
    },
    objective: {
      vitals: {
        blood_pressure_systolic: 125,
        blood_pressure_diastolic: 82,
        heart_rate_bpm: 70,
        respiratory_rate_rpm: 16,
        temp_celsius: 36.5,
        oxygen_saturation_pct: 99,
        weight_kg: 78,
        height_cm: 175,
        bmi: 25.5,
      },
      physical_exam: 'Lúcido, afebril, eupneico. Ruidos cardiacos rítmicos sin soplos.',
      musculoskeletal_exam: 'Contractura paravertebral lumbar leve. Lasègue negativo bilateral. Rango de flexión anterior 75°.',
    },
    assessment: {
      diagnoses: [
        { code: 'M54.5', description: 'Lumbago no especificado / Dolor lumbar mecánico', type: 'primary' },
        { code: 'I10', description: 'Hipertensión esencial (primaria)', type: 'secondary' },
      ],
      clinical_reasoning: 'Lumbago crónico agudizado en paciente hipertenso bien compensado.',
      prognosis: 'favorable',
    },
    plan: {
      treatment_goals: 'Optimizar postura laboral, continuar esquema antihipertensivo y kinesioterapia de columna.',
      lab_orders: ['Perfil Lipídico', 'Creatinina sérica', 'Uroanálisis'],
      imaging_orders: ['Rx Columna Lumbosacra AP y Lateral'],
      referrals: ['Fisioterapia y Kinesiología Lumbar (10 sesiones)'],
      patient_instructions: 'Evitar sobrecargas de flexión y mantener pausas activas.',
      follow_up_days: 30,
      alarm_signs: 'Urgencias si presenta parestesias progresivas o déficit motor en pies.',
    },
    status: 'completed',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

// Initial electronic prescriptions
export const INITIAL_PRESCRIPCIONES: PrescripcionMedica[] = [
  {
    id: 'rx_demo_01',
    tenant_id: DEFAULT_TENANT_ID,
    patient_id: 'pat_rodrigo_02',
    encounter_id: 'soap_demo_01',
    practitioner_id: 'prof_doctor_01',
    prescription_date: '2025-02-15',
    valid_until: '2025-03-15',
    medications: [
      {
        id: 'med_rx_01',
        medication_name: 'Paracetamol',
        generic_name: 'Acetaminofén',
        pharmaceutical_form: 'tableta',
        strength_concentration: '500 mg',
        dosage_instruction: '1 tableta',
        route: 'oral',
        frequency: 'Cada 8 horas en caso de dolor',
        duration: '5 días',
        quantity_to_dispense: 15,
        clinical_indication: 'Manejo analgésico de rescate para dolor lumbar',
      },
      {
        id: 'med_rx_02',
        medication_name: 'Losartán',
        generic_name: 'Losartán Potásico',
        pharmaceutical_form: 'tableta',
        strength_concentration: '500 mg',
        dosage_instruction: '1 tableta (50 mg)',
        route: 'oral',
        frequency: 'Cada 24 horas en ayunas (Mañana)',
        duration: '30 días (Crónico)',
        quantity_to_dispense: 30,
        clinical_indication: 'Tratamiento antihipertensivo de mantenimiento',
      },
    ],
    general_instructions: 'Tomar con suficiente agua. Mantener control de presión arterial una vez por semana.',
    status: 'active',
    digital_signature_hash: 'SIG-HL7-D8420-7492A',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

// Initial anthropometric evaluations (Mifflin-St Jeor & Skinfolds)
export const INITIAL_EVALUACIONES_ANTROPOMETRICAS: EvaluacionAntropometrica[] = [
  // --- HISTORIAL PACIENTE: RODRIGO MENDOZA (pat_rodrigo_02) ---
  {
    id: 'antropo_rodrigo_01',
    tenant_id: DEFAULT_TENANT_ID,
    patient_id: 'pat_rodrigo_02',
    nutritionist_id: 'prof_nutri_01',
    evaluation_date: '2024-11-15',
    age: 36,
    gender: 'male',
    weight_kg: 82.5,
    height_cm: 175,
    activity_factor: 1.2, // Sedentario inicial
    skinfold_triceps_mm: 17.0,
    skinfold_subscapular_mm: 21.5,
    skinfold_suprailiac_mm: 23.0,
    skinfold_abdominal_mm: 26.5,
    skinfold_biceps_mm: 10.0,
    skinfold_thigh_mm: 18.5,
    skinfold_calf_mm: 12.5,
    waist_cm: 93.0,
    hip_cm: 100.0,
    relaxed_arm_cm: 33.0,
    contracted_arm_cm: 34.5,
    thigh_cm: 58.0,
    calf_cm: 38.0,
    neck_cm: 39.5,
    bmi: 26.9,
    bmr_kcal: 1754,
    tdee_kcal: 2105,
    waist_hip_ratio: 0.93,
    body_fat_percentage: 23.4,
    fat_mass_kg: 19.3,
    fat_free_mass_kg: 63.2,
    cardiovascular_risk_level: 'moderado',
    clinical_notes: 'Primera consulta antropométrica. Paciente con sobrepeso leve e HTA diagnosticada. Presenta perímetro de cintura elevado con riesgo metabólico. Se inicia plan hiposódico y restricción de ultraprocesados.',
    created_at: '2024-11-15T10:00:00Z',
  },
  {
    id: 'antropo_rodrigo_02',
    tenant_id: DEFAULT_TENANT_ID,
    patient_id: 'pat_rodrigo_02',
    nutritionist_id: 'prof_nutri_01',
    evaluation_date: '2024-12-20',
    age: 36,
    gender: 'male',
    weight_kg: 80.2,
    height_cm: 175,
    activity_factor: 1.375, // Inicio caminatas ligeras
    skinfold_triceps_mm: 15.5,
    skinfold_subscapular_mm: 19.5,
    skinfold_suprailiac_mm: 21.0,
    skinfold_abdominal_mm: 24.0,
    skinfold_biceps_mm: 9.0,
    skinfold_thigh_mm: 17.5,
    skinfold_calf_mm: 12.0,
    waist_cm: 90.5,
    hip_cm: 99.0,
    relaxed_arm_cm: 32.8,
    contracted_arm_cm: 34.8,
    thigh_cm: 57.0,
    calf_cm: 37.8,
    neck_cm: 39.2,
    bmi: 26.2,
    bmr_kcal: 1731,
    tdee_kcal: 2380,
    waist_hip_ratio: 0.91,
    body_fat_percentage: 22.0,
    fat_mass_kg: 17.6,
    fat_free_mass_kg: 62.6,
    cardiovascular_risk_level: 'moderado',
    clinical_notes: 'Control mes 1. Buena adherencia al plan alimentario. Reducción de 2.3 kg con disminución marcada en perímetro abdominal (-2.5 cm). Presión arterial más estable.',
    created_at: '2024-12-20T11:15:00Z',
  },
  {
    id: 'antropo_rodrigo_03',
    tenant_id: DEFAULT_TENANT_ID,
    patient_id: 'pat_rodrigo_02',
    nutritionist_id: 'prof_nutri_01',
    evaluation_date: '2025-01-22',
    age: 36,
    gender: 'male',
    weight_kg: 78.8,
    height_cm: 175,
    activity_factor: 1.375,
    skinfold_triceps_mm: 15.0,
    skinfold_subscapular_mm: 18.5,
    skinfold_suprailiac_mm: 20.0,
    skinfold_abdominal_mm: 22.8,
    skinfold_biceps_mm: 8.8,
    skinfold_thigh_mm: 16.5,
    skinfold_calf_mm: 11.5,
    waist_cm: 89.0,
    hip_cm: 98.5,
    relaxed_arm_cm: 32.6,
    contracted_arm_cm: 35.0,
    thigh_cm: 56.5,
    calf_cm: 37.6,
    neck_cm: 39.0,
    bmi: 25.7,
    bmr_kcal: 1717,
    tdee_kcal: 2361,
    waist_hip_ratio: 0.90,
    body_fat_percentage: 21.2,
    fat_mass_kg: 16.7,
    fat_free_mass_kg: 62.1,
    cardiovascular_risk_level: 'moderado',
    clinical_notes: 'Control mes 2. Progreso continuo. Masa libre de grasa preservada con éxito. Se ajusta la prescripción energética para continuar descenso progresivo sin fatiga.',
    created_at: '2025-01-22T09:30:00Z',
  },
  {
    id: 'antropo_demo_01',
    tenant_id: DEFAULT_TENANT_ID,
    patient_id: 'pat_rodrigo_02',
    nutritionist_id: 'prof_nutri_01',
    evaluation_date: '2025-02-15',
    age: 36,
    gender: 'male',
    weight_kg: 78.0,
    height_cm: 175,
    activity_factor: 1.375, // Ligero
    skinfold_triceps_mm: 14.5,
    skinfold_subscapular_mm: 18.0,
    skinfold_suprailiac_mm: 19.5,
    skinfold_abdominal_mm: 22.0,
    skinfold_biceps_mm: 8.5,
    skinfold_thigh_mm: 16.0,
    skinfold_calf_mm: 11.0,
    waist_cm: 88.0,
    hip_cm: 98.0,
    relaxed_arm_cm: 32.5,
    contracted_arm_cm: 35.0,
    thigh_cm: 56.0,
    calf_cm: 37.5,
    neck_cm: 39.0,
    bmi: 25.5,
    bmr_kcal: 1709,
    tdee_kcal: 2350,
    waist_hip_ratio: 0.90,
    body_fat_percentage: 20.8,
    fat_mass_kg: 16.2,
    fat_free_mass_kg: 61.8,
    cardiovascular_risk_level: 'moderado',
    clinical_notes: 'Evaluación de control mes 3. Acumula pérdida neta de 4.5 kg desde la consulta basal. Perímetro de cintura se sitúa bajo 88 cm. Excelente adaptación a la dieta DASH con FHIR NutritionOrder activa.',
    created_at: '2025-02-15T10:30:00Z',
  },

  // --- HISTORIAL PACIENTE: CAMILA SOTO (pat_camila_01) ---
  {
    id: 'antropo_camila_01',
    tenant_id: DEFAULT_TENANT_ID,
    patient_id: 'pat_camila_01',
    nutritionist_id: 'prof_nutri_01',
    evaluation_date: '2024-12-10',
    age: 29,
    gender: 'female',
    weight_kg: 66.0,
    height_cm: 165,
    activity_factor: 1.375,
    skinfold_triceps_mm: 18.5,
    skinfold_subscapular_mm: 16.5,
    skinfold_suprailiac_mm: 17.0,
    skinfold_abdominal_mm: 20.0,
    skinfold_biceps_mm: 10.5,
    skinfold_thigh_mm: 22.0,
    skinfold_calf_mm: 14.5,
    waist_cm: 74.0,
    hip_cm: 98.0,
    relaxed_arm_cm: 28.5,
    contracted_arm_cm: 29.8,
    thigh_cm: 56.0,
    calf_cm: 36.0,
    neck_cm: 33.0,
    bmi: 24.2,
    bmr_kcal: 1395,
    tdee_kcal: 1918,
    waist_hip_ratio: 0.76,
    body_fat_percentage: 25.2,
    fat_mass_kg: 16.6,
    fat_free_mass_kg: 49.4,
    cardiovascular_risk_level: 'bajo',
    clinical_notes: 'Consulta inicial. Paciente con tendinitis rotuliana en rehabilitación. Se busca optimizar composición corporal para disminuir impacto articular en rodilla.',
    created_at: '2024-12-10T09:00:00Z',
  },
  {
    id: 'antropo_camila_02',
    tenant_id: DEFAULT_TENANT_ID,
    patient_id: 'pat_camila_01',
    nutritionist_id: 'prof_nutri_01',
    evaluation_date: '2025-01-18',
    age: 29,
    gender: 'female',
    weight_kg: 64.2,
    height_cm: 165,
    activity_factor: 1.55, // Retorno progresivo a deporte
    skinfold_triceps_mm: 17.0,
    skinfold_subscapular_mm: 15.0,
    skinfold_suprailiac_mm: 15.5,
    skinfold_abdominal_mm: 18.0,
    skinfold_biceps_mm: 9.5,
    skinfold_thigh_mm: 20.5,
    skinfold_calf_mm: 13.5,
    waist_cm: 71.5,
    hip_cm: 96.5,
    relaxed_arm_cm: 28.0,
    contracted_arm_cm: 29.5,
    thigh_cm: 54.5,
    calf_cm: 35.5,
    neck_cm: 32.5,
    bmi: 23.6,
    bmr_kcal: 1377,
    tdee_kcal: 2134,
    waist_hip_ratio: 0.74,
    body_fat_percentage: 23.8,
    fat_mass_kg: 15.3,
    fat_free_mass_kg: 48.9,
    cardiovascular_risk_level: 'bajo',
    clinical_notes: 'Control evolutivo. Buena respuesta al tratamiento kinesiologico y nutricional. Se incrementa ingesta proteica post-ejercicio a 1.6 g/kg.',
    created_at: '2025-01-18T10:15:00Z',
  },
  {
    id: 'antropo_camila_03',
    tenant_id: DEFAULT_TENANT_ID,
    patient_id: 'pat_camila_01',
    nutritionist_id: 'prof_nutri_01',
    evaluation_date: '2025-02-12',
    age: 29,
    gender: 'female',
    weight_kg: 62.8,
    height_cm: 165,
    activity_factor: 1.55,
    skinfold_triceps_mm: 15.5,
    skinfold_subscapular_mm: 14.0,
    skinfold_suprailiac_mm: 14.5,
    skinfold_abdominal_mm: 16.5,
    skinfold_biceps_mm: 8.8,
    skinfold_thigh_mm: 19.5,
    skinfold_calf_mm: 12.8,
    waist_cm: 69.5,
    hip_cm: 95.0,
    relaxed_arm_cm: 27.5,
    contracted_arm_cm: 29.2,
    thigh_cm: 53.5,
    calf_cm: 35.0,
    neck_cm: 32.0,
    bmi: 23.1,
    bmr_kcal: 1363,
    tdee_kcal: 2112,
    waist_hip_ratio: 0.73,
    body_fat_percentage: 22.5,
    fat_mass_kg: 14.1,
    fat_free_mass_kg: 48.7,
    cardiovascular_risk_level: 'bajo',
    clinical_notes: 'Control mes 2. Excelente progreso: reducción de 3.2 kg de peso y descenso de 2.7% en grasa corporal. Sin dolor de rodilla durante actividades de carga.',
    created_at: '2025-02-12T11:00:00Z',
  },

  // --- HISTORIAL PACIENTE: VALENTINA RÍOS (pat_valentina_03) ---
  {
    id: 'antropo_valentina_01',
    tenant_id: DEFAULT_TENANT_ID,
    patient_id: 'pat_valentina_03',
    nutritionist_id: 'prof_nutri_01',
    evaluation_date: '2024-11-28',
    age: 32,
    gender: 'female',
    weight_kg: 64.5,
    height_cm: 167,
    activity_factor: 1.375,
    skinfold_triceps_mm: 17.5,
    skinfold_subscapular_mm: 16.0,
    skinfold_suprailiac_mm: 16.5,
    skinfold_abdominal_mm: 19.0,
    skinfold_biceps_mm: 10.0,
    skinfold_thigh_mm: 21.5,
    skinfold_calf_mm: 14.0,
    waist_cm: 73.0,
    hip_cm: 97.5,
    relaxed_arm_cm: 28.0,
    contracted_arm_cm: 29.2,
    thigh_cm: 55.0,
    calf_cm: 35.5,
    neck_cm: 33.0,
    bmi: 23.1,
    bmr_kcal: 1368,
    tdee_kcal: 1881,
    waist_hip_ratio: 0.75,
    body_fat_percentage: 23.8,
    fat_mass_kg: 15.3,
    fat_free_mass_kg: 49.2,
    cardiovascular_risk_level: 'bajo',
    clinical_notes: 'Evaluación inicial. Paciente con pinzamiento de hombro. Plan enfocado en alimentos antiinflamatorios y protección digestiva.',
    created_at: '2024-11-28T09:30:00Z',
  },
  {
    id: 'antropo_demo_02',
    tenant_id: DEFAULT_TENANT_ID,
    patient_id: 'pat_valentina_03',
    nutritionist_id: 'prof_nutri_01',
    evaluation_date: '2025-02-14',
    age: 32,
    gender: 'female',
    weight_kg: 62.4,
    height_cm: 167,
    activity_factor: 1.55, // Moderado
    skinfold_triceps_mm: 16.0,
    skinfold_subscapular_mm: 14.5,
    skinfold_suprailiac_mm: 15.0,
    skinfold_abdominal_mm: 17.5,
    skinfold_biceps_mm: 9.0,
    skinfold_thigh_mm: 20.5,
    skinfold_calf_mm: 13.0,
    waist_cm: 70.0,
    hip_cm: 96.0,
    relaxed_arm_cm: 27.5,
    contracted_arm_cm: 29.0,
    thigh_cm: 54.0,
    calf_cm: 35.0,
    neck_cm: 32.5,
    bmi: 22.4,
    bmr_kcal: 1347,
    tdee_kcal: 2088,
    waist_hip_ratio: 0.73,
    body_fat_percentage: 22.1,
    fat_mass_kg: 13.8,
    fat_free_mass_kg: 48.6,
    cardiovascular_risk_level: 'bajo',
    clinical_notes: 'Paciente con excelente evolución clínica. Recomposición corporal exitosa con descenso de 2.1 kg de masa grasa.',
    created_at: '2025-02-14T09:45:00Z',
  },

  // --- HISTORIAL PACIENTE: DIEGO ALARCÓN (pat_diego_04) ---
  {
    id: 'antropo_diego_01',
    tenant_id: DEFAULT_TENANT_ID,
    patient_id: 'pat_diego_04',
    nutritionist_id: 'prof_nutri_01',
    evaluation_date: '2025-01-08',
    age: 34,
    gender: 'male',
    weight_kg: 84.0,
    height_cm: 180,
    activity_factor: 1.375,
    skinfold_triceps_mm: 14.0,
    skinfold_subscapular_mm: 16.5,
    skinfold_suprailiac_mm: 18.0,
    skinfold_abdominal_mm: 20.5,
    skinfold_biceps_mm: 8.0,
    skinfold_thigh_mm: 16.0,
    skinfold_calf_mm: 11.5,
    waist_cm: 86.0,
    hip_cm: 101.0,
    relaxed_arm_cm: 34.0,
    contracted_arm_cm: 36.5,
    thigh_cm: 59.0,
    calf_cm: 39.0,
    neck_cm: 40.0,
    bmi: 25.9,
    bmr_kcal: 1835,
    tdee_kcal: 2523,
    waist_hip_ratio: 0.85,
    body_fat_percentage: 19.5,
    fat_mass_kg: 16.4,
    fat_free_mass_kg: 67.6,
    cardiovascular_risk_level: 'bajo',
    clinical_notes: 'Evaluación durante rehabilitación de esguince de tobillo. Deportista amateur. Se busca preservar masa muscular mientras está con carga física reducida.',
    created_at: '2025-01-08T15:00:00Z',
  },
  {
    id: 'antropo_diego_02',
    tenant_id: DEFAULT_TENANT_ID,
    patient_id: 'pat_diego_04',
    nutritionist_id: 'prof_nutri_01',
    evaluation_date: '2025-02-10',
    age: 34,
    gender: 'male',
    weight_kg: 82.3,
    height_cm: 180,
    activity_factor: 1.55,
    skinfold_triceps_mm: 13.0,
    skinfold_subscapular_mm: 15.0,
    skinfold_suprailiac_mm: 16.5,
    skinfold_abdominal_mm: 18.5,
    skinfold_biceps_mm: 7.5,
    skinfold_thigh_mm: 15.0,
    skinfold_calf_mm: 11.0,
    waist_cm: 83.5,
    hip_cm: 99.5,
    relaxed_arm_cm: 34.2,
    contracted_arm_cm: 36.8,
    thigh_cm: 58.5,
    calf_cm: 39.0,
    neck_cm: 39.8,
    bmi: 25.4,
    bmr_kcal: 1818,
    tdee_kcal: 2818,
    waist_hip_ratio: 0.84,
    body_fat_percentage: 18.2,
    fat_mass_kg: 15.0,
    fat_free_mass_kg: 67.3,
    cardiovascular_risk_level: 'bajo',
    clinical_notes: 'Alta kine y retorno a entrenamientos completos. Masa muscular intacta con reducción de 1.4 kg de tejido graso.',
    created_at: '2025-02-10T16:30:00Z',
  },
];

// Initial Professional Profiles (Bio, Alma Mater, Graduation Year, Social Links)
export const INITIAL_PROFESSIONAL_PROFILES: ProfessionalProfile[] = [
  {
    id: 'prof_profile_mateo',
    user_id: 'prof_mateo_01',
    tenant_id: DEFAULT_TENANT_ID,
    bio: 'Kinesiólogo y Fisioterapeuta especialista en rehabilitación biomecánica, terapia manual ortopédica (OMT) y readaptación funcional deportiva. Con más de 11 años de experiencia guiando a deportistas profesionales y personas con patologías musculoesqueléticas complejas (columna, rodilla y hombro) a recuperar su máxima funcionalidad.',
    alma_mater: 'Universidad Nacional de Colombia',
    graduation_year: 2014,
    years_of_experience: 11,
    social_links: {
      instagram: 'https://instagram.com/klgo.mateogomez',
      linkedin: 'https://linkedin.com/in/mateo-gomez-kine',
      x: 'https://x.com/mateog_kine',
      website: 'https://kinesys.health/prof/mateo',
      whatsapp: '+56991234567',
    },
    languages: ['Español (Nativo)', 'Inglés (Fluido C1)'],
    certifications: [
      'Certificación FIFA en Medicina del Fútbol y Prevención de Lesiones',
      'Especialista en Terapia Manual Ortopédica (OMT - Kaltenborn)',
      'Certificación Internacional en Punción Seca y Neuromodulación',
      'Protocolos Avanzados de Readaptación Post-Cirugía de Ligamento Cruzado Anterior (LCA)',
    ],
    consultation_fee: 45000,
    currency: 'COP',
    rating_average: 4.9,
    reviews_count: 5,
    is_verified: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'prof_profile_valeria',
    user_id: 'prof_nutri_01',
    tenant_id: DEFAULT_TENANT_ID,
    bio: 'Nutricionista clínica y deportiva con certificación internacional ISAK Nivel 2 en cineantropometría. Especializada en recomposición corporal, planes metabólicos personalizados para alto rendimiento y abordaje terapéutico integral de patologías cardiovasculares y digestivas.',
    alma_mater: 'Pontificia Universidad Javeriana',
    graduation_year: 2017,
    years_of_experience: 8,
    social_links: {
      instagram: 'https://instagram.com/valerianutri.fit',
      linkedin: 'https://linkedin.com/in/valeria-benitez-nutri',
      website: 'https://valerianutricion.co',
      whatsapp: '+56982345678',
    },
    languages: ['Español (Nativo)', 'Inglés (Avanzado)', 'Portugués (Intermedio)'],
    certifications: [
      'Certificación Internacional en Antropometría ISAK Nivel 2',
      'Diplomado en Nutrición Clínica y Metabolismo Energético Humano',
      'Especialista en Protocolos FODMAP y Salud de la Microbiota Intestinal',
      'Prescripción de Dieta DASH para Manejo de Hipertensión Arterial',
    ],
    consultation_fee: 42000,
    currency: 'COP',
    rating_average: 4.8,
    reviews_count: 4,
    is_verified: true,
    created_at: '2025-01-05T00:00:00Z',
  },
  {
    id: 'prof_profile_fernando',
    user_id: 'prof_doctor_01',
    tenant_id: DEFAULT_TENANT_ID,
    bio: 'Médico Cirujano con sólida formación en medicina preventiva del adulto, control de enfermedades crónicas no transmisibles (hipertensión, dislipidemia, diabetes mellitus) y chequeos ejecutivos. Práctica clínica rigurosa, basada en la evidencia y caracterizada por la empatía y la escucha activa.',
    alma_mater: 'Universidad de Antioquia',
    graduation_year: 2012,
    years_of_experience: 13,
    social_links: {
      linkedin: 'https://linkedin.com/in/dr-fernando-castillo',
      website: 'https://drfernandocastillo.com',
      twitter: 'https://twitter.com/dr_castillo_salud',
      whatsapp: '+56973456789',
    },
    languages: ['Español (Nativo)', 'Inglés (Profesional B2)'],
    certifications: [
      'Diplomado en Medicina Cardiovascular Preventiva y Riesgo Global',
      'Soporte Vital Cardiovascular Avanzado (ACLS - American Heart Association)',
      'Auditoría Médica y Gestión de Calidad en Atención Primaria',
      'Receta Médica Electrónica y Buenas Prácticas Farmacológicas',
    ],
    consultation_fee: 50000,
    currency: 'COP',
    rating_average: 5.0,
    reviews_count: 4,
    is_verified: true,
    created_at: '2025-01-08T00:00:00Z',
  },
  {
    id: 'prof_profile_marcela',
    user_id: 'user_admin_01',
    tenant_id: DEFAULT_TENANT_ID,
    bio: 'Médica especialista en Administración de Salud y Dirección Clínica. Lidera equipos interdisciplinarios orientados a la excelencia asistencial, medicina centrada en el paciente y transformación digital de servicios médicos.',
    alma_mater: 'Universidad del Rosario',
    graduation_year: 2008,
    years_of_experience: 17,
    social_links: {
      linkedin: 'https://linkedin.com/in/dra-marcela-lagos',
      website: 'https://kinesys-salud.co',
    },
    languages: ['Español', 'Inglés', 'Francés'],
    certifications: [
      'Magíster en Gestión y Administración de Instituciones de Salud',
      'Especialista en Seguridad del Paciente y Calidad Asistencial',
    ],
    consultation_fee: 55000,
    currency: 'COP',
    rating_average: 5.0,
    reviews_count: 2,
    is_verified: true,
    created_at: '2025-01-01T00:00:00Z',
  },
];

// Initial Patient Reviews (rating 1-5, moderated status 'approved', privacy formatted)
export const INITIAL_REVIEWS: Review[] = [
  // --- RESEÑAS MATEO GÓMEZ (prof_mateo_01) ---
  {
    id: 'rev_mateo_01',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_mateo_01',
    patient_id: 'pat_camila_01',
    patient_name: 'Camila Soto Valenzuela',
    rating: 5,
    comment: '¡Un profesional extraordinario! Llegué con una rotura de ligamento cruzado anterior y mucho temor de no volver a trotar. Mateo estructuró un plan con mapa de dolor sesión a sesión y hoy, 8 semanas después, me siento fuerte, estable y sin molestias. Muy agradecida.',
    status: 'approved',
    consultation_date: '2025-02-10',
    treatment_category: 'Kinesiología Deportiva / Post-Op LCA',
    helpful_votes: 12,
    created_at: '2025-02-11T14:20:00Z',
  },
  {
    id: 'rev_mateo_02',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_mateo_01',
    patient_id: 'pat_rodrigo_02',
    patient_name: 'Rodrigo Mendoza Tapia',
    rating: 5,
    comment: 'Padecía un dolor lumbar con irradiación por hernia L4-L5 que me impedía estar más de 20 minutos sentado en la oficina. Mateo aplicó técnicas de descompresión y ejercicios que me devolvieron la calidad de vida. Excelente trato y puntualidad.',
    status: 'approved',
    consultation_date: '2025-02-05',
    treatment_category: 'Terapia Manual Lumbar',
    helpful_votes: 8,
    created_at: '2025-02-06T18:30:00Z',
  },
  {
    id: 'rev_mateo_03',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_mateo_01',
    patient_id: 'pat_diego_04',
    patient_name: 'Diego Alarcón Herrera',
    rating: 5,
    comment: 'Me recuperó de un esguince grado II en el tobillo en tiempo récord. El trabajo en gimnasio fue súper completo y me dio mucha confianza para volver a entrenar fútbol.',
    status: 'approved',
    consultation_date: '2025-01-28',
    treatment_category: 'Rehabilitación Tobillo',
    helpful_votes: 5,
    created_at: '2025-01-29T10:15:00Z',
  },
  {
    id: 'rev_mateo_04',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_mateo_01',
    patient_name: 'Andrés Morales Castro',
    rating: 4,
    comment: 'Muy dedicado, metódico y cordial. Las instalaciones son excelentes y el seguimiento por la plataforma digital facilita mucho agendar los controles.',
    status: 'approved',
    consultation_date: '2025-01-15',
    treatment_category: 'Fisioterapia General',
    helpful_votes: 3,
    created_at: '2025-01-16T16:45:00Z',
  },
  {
    id: 'rev_mateo_05',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_mateo_01',
    patient_id: 'pat_valentina_03',
    patient_name: 'Valentina Ríos Castro',
    rating: 5,
    comment: 'Su paciencia para explicar el origen anatómico del dolor de hombro y cómo corregir la postura me cambió por completo el día a día. Súper recomendado.',
    status: 'approved',
    consultation_date: '2025-01-10',
    treatment_category: 'Hombro / Pinzamiento',
    helpful_votes: 7,
    created_at: '2025-01-11T11:00:00Z',
  },

  // --- RESEÑAS VALERIA BENÍTEZ (prof_nutri_01) ---
  {
    id: 'rev_nutri_01',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_nutri_01',
    patient_id: 'pat_valentina_03',
    patient_name: 'Valentina Ríos Castro',
    rating: 5,
    comment: 'La mejor experiencia con una nutricionista. La medición con pliegues ISAK fue muy minuciosa y la pauta de comidas es variada, fácil de preparar y adaptada a mis horarios. ¡Bajé grasa ganando músculo!',
    status: 'approved',
    consultation_date: '2025-02-14',
    treatment_category: 'Composición Corporal ISAK',
    helpful_votes: 9,
    created_at: '2025-02-15T09:30:00Z',
  },
  {
    id: 'rev_nutri_02',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_nutri_01',
    patient_id: 'pat_rodrigo_02',
    patient_name: 'Rodrigo Mendoza Tapia',
    rating: 5,
    comment: 'Reduje 4.5 kg en 3 meses siguiendo su plan DASH para hipertensión y mis niveles de presión se normalizaron. El informe clínico en PDF que entrega es completísimo.',
    status: 'approved',
    consultation_date: '2025-02-12',
    treatment_category: 'Nutrición Clínica / DASH',
    helpful_votes: 6,
    created_at: '2025-02-13T12:00:00Z',
  },
  {
    id: 'rev_nutri_03',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_nutri_01',
    patient_id: 'pat_camila_01',
    patient_name: 'Camila Soto Valenzuela',
    rating: 4,
    comment: 'Excelente apoyo nutricional durante mi recuperación de rodilla. Ajustó mis requerimientos de proteína para no perder masa muscular durante el reposo. Muy empática.',
    status: 'approved',
    consultation_date: '2025-01-20',
    treatment_category: 'Nutrición Deportiva',
    helpful_votes: 4,
    created_at: '2025-01-21T15:20:00Z',
  },
  {
    id: 'rev_nutri_04',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_nutri_01',
    patient_name: 'Lucía Pardo Silva',
    rating: 5,
    comment: 'Valeria te enseña a comer sin culpas ni restricciones absurdas. Las recetas sugeridas son deliciosas y los resultados se notan desde el primer mes.',
    status: 'approved',
    consultation_date: '2025-01-18',
    treatment_category: 'Recomposición Corporal',
    helpful_votes: 5,
    created_at: '2025-01-19T17:10:00Z',
  },

  // --- RESEÑAS DR. FERNANDO CASTILLO (prof_doctor_01) ---
  {
    id: 'rev_doc_01',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_doctor_01',
    patient_id: 'pat_diego_04',
    patient_name: 'Diego Alarcón Herrera',
    rating: 5,
    comment: 'Un médico con verdadera vocación. Se tomó el tiempo de revisar todos mis exámenes de laboratorio, escuchar mis síntomas y explicarme con manzanitas el diagnóstico. 10 de 10.',
    status: 'approved',
    consultation_date: '2025-02-10',
    treatment_category: 'Chequeo Preventivo',
    helpful_votes: 11,
    created_at: '2025-02-11T10:00:00Z',
  },
  {
    id: 'rev_doc_02',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_doctor_01',
    patient_id: 'pat_rodrigo_02',
    patient_name: 'Rodrigo Mendoza Tapia',
    rating: 5,
    comment: 'Atención médica impecable. El control de mi hipertensión fue riguroso y me coordinó directamente con el área de kinesiología y nutrición para un manejo integral.',
    status: 'approved',
    consultation_date: '2025-02-15',
    treatment_category: 'Medicina General / HTA',
    helpful_votes: 8,
    created_at: '2025-02-16T08:45:00Z',
  },
  {
    id: 'rev_doc_03',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_doctor_01',
    patient_name: 'Carlos Gutiérrez Salgado',
    rating: 5,
    comment: 'Puntual, atento y muy asertivo en sus diagnósticos y recetas. La receta electrónica con firma digital es muy cómoda para comprar en farmacias.',
    status: 'approved',
    consultation_date: '2025-01-25',
    treatment_category: 'Consulta General',
    helpful_votes: 6,
    created_at: '2025-01-26T14:30:00Z',
  },
  {
    id: 'rev_doc_04',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_doctor_01',
    patient_name: 'Marcela Lagos',
    rating: 5,
    comment: 'Destaco la rigurosidad científica y la calidez en el trato. Un profesional de primer nivel para toda la familia.',
    status: 'approved',
    consultation_date: '2025-01-12',
    treatment_category: 'Salud Familiar',
    helpful_votes: 4,
    created_at: '2025-01-13T19:00:00Z',
  },

  // --- RESEÑA EN REVISIÓN (PENDING) PARA TESTEAR FILTRADO DE MODERACIÓN ---
  {
    id: 'rev_pending_01',
    tenant_id: DEFAULT_TENANT_ID,
    professional_id: 'prof_mateo_01',
    patient_name: 'Usuario Anónimo Prueba',
    rating: 5,
    comment: 'Comentario recién enviado en proceso de moderación por el equipo clínico.',
    status: 'pending',
    treatment_category: 'En Moderación',
    helpful_votes: 0,
    created_at: '2025-02-20T10:00:00Z',
  },
];

// Multi-tenant demo list for Super Admin
export const ALL_DEMO_TENANTS: Tenant[] = [
  INITIAL_TENANT,
  {
    id: 'tenant_clinica_norte',
    name: 'Clínica KinesioNorte',
    slug: 'kinesio-norte',
    timezone: 'America/Bogota (UTC-5)',
    cancellation_window_hours: 12,
    email: 'contacto@kinesionorte.co',
    phone: '+57 310 999 8811',
    address: 'Av. El Poblado # 5A-110, Medellín',
    currency: 'COP',
    subscription_plan: 'enterprise',
    subscription_status: 'active',
    max_users: 15,
    trial_ends_at: '2025-01-15T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'tenant_rehab_sur',
    name: 'Centro de Rehabilitación Integral Sur',
    slug: 'rehab-sur',
    timezone: 'America/Bogota (UTC-5)',
    cancellation_window_hours: 24,
    email: 'admin@rehabsur.co',
    phone: '+57 320 234 5678',
    address: 'Calle 53 # 45-80, Cali',
    currency: 'COP',
    subscription_plan: 'starter',
    subscription_status: 'past_due',
    max_users: 1,
    trial_ends_at: '2025-02-10T00:00:00Z',
    created_at: '2025-01-10T00:00:00Z',
  },
];

// Local storage keys
const STORAGE_KEYS = {
  TENANT: 'kinesys_tenant_v2',
  ALL_TENANTS: 'kinesys_all_tenants_v2',
  USERS: 'kinesys_users_v2',
  APPOINTMENTS: 'kinesys_appointments_v2',
  PAIN_OBSERVATIONS: 'kinesys_pain_obs_v2',
  BODY_COMPOSITIONS: 'kinesys_body_comp_v2',
  MEDICAL_RECORDS: 'kinesys_med_rec_v2',
  PACIENTES_CLINICOS: 'kinesys_pacientes_clinicos_v2',
  CONSULTAS_SOAP: 'kinesys_consultas_soap_v2',
  PRESCRIPCIONES: 'kinesys_prescripciones_v2',
  EVALUACIONES_ANTROPOMETRICAS: 'kinesys_evaluaciones_antropometricas_v2',
  PLANES_NUTRICIONALES: 'kinesys_planes_nutricionales_v2',
  ORDENES_NUTRICION_FHIR: 'kinesys_ordenes_nutricion_fhir_v2',
  PROFESSIONAL_PROFILES: 'kinesys_professional_profiles_v2',
  REVIEWS: 'kinesys_reviews_v2',
  INVITATIONS: 'kinesys_invitations_v2',
  PRICING_PLANS: 'kinesys_pricing_plans_v2',
  ACTIVE_USER_ID: 'kinesys_active_user_id_v2',
  SUPABASE_URL: 'kinesys_supabase_url',
  SUPABASE_KEY: 'kinesys_supabase_key',
};

class LocalStore {
  static get<T>(key: string, defaultVal: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  static set<T>(key: string, val: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }
}

class LocalQueryBuilder {
  private tableName: string;
  private filters: Array<(item: any) => boolean> = [];
  private orderField?: string;
  private orderAscending: boolean = true;
  private limitCount?: number;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string = '*') {
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((item) => {
      if (column === 'role') return item.role === value;
      if (column === 'tenant_id') return item.tenant_id === value;
      if (column === 'professional_id') return item.professional_id === value;
      if (column === 'patient_id') return item.patient_id === value;
      if (column === 'user_id') return item.user_id === value;
      if (column === 'status') return item.status === value;
      if (column === 'id') return item.id === value;
      return item[column] === value;
    });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push((item) => item[column] !== value);
    return this;
  }

  ilike(column: string, pattern: string) {
    const cleanPattern = pattern.replace(/%/g, '').toLowerCase();
    this.filters.push((item) => {
      const val = item[column];
      if (typeof val !== 'string') return false;
      return val.toLowerCase().includes(cleanPattern);
    });
    return this;
  }

  like(column: string, pattern: string) {
    return this.ilike(column, pattern);
  }

  or(filtersString: string) {
    // Format: 'full_name.ilike.%query%,email.ilike.%query%,rut_or_dni.ilike.%query%'
    const subFilters = filtersString.split(',').map((f) => f.trim());
    this.filters.push((item) => {
      return subFilters.some((sub) => {
        const parts = sub.split('.');
        if (parts.length >= 3) {
          const col = parts[0];
          const op = parts[1];
          const val = parts.slice(2).join('.').replace(/%/g, '').toLowerCase();
          const itemVal = (item[col] || '').toString().toLowerCase();
          if (op === 'ilike' || op === 'like') {
            return itemVal.includes(val);
          }
          if (op === 'eq') {
            return itemVal === val;
          }
        }
        return false;
      });
    });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  gte(column: string, value: string) {
    this.filters.push((item) => {
      if (!item[column]) return false;
      return new Date(item[column]) >= new Date(value);
    });
    return this;
  }

  lte(column: string, value: string) {
    this.filters.push((item) => {
      if (!item[column]) return false;
      return new Date(item[column]) <= new Date(value);
    });
    return this;
  }

  order(column: string, { ascending = true }: { ascending?: boolean } = {}) {
    this.orderField = column;
    this.orderAscending = ascending;
    return this;
  }

  async single() {
    const { data, error } = await this.executeSelect();
    if (error) return { data: null, error };
    return { data: (data && data.length > 0) ? data[0] : null, error: null };
  }

  async then(resolve: (val: { data: any; error: any }) => void) {
    const result = await this.executeSelect();
    resolve(result);
  }

  private async executeSelect(): Promise<{ data: any; error: any }> {
    try {
      let rawData: any[] = [];
      const users = LocalStore.get<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);

      if (this.tableName === 'appointments') {
        const appointments = LocalStore.get<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
        rawData = appointments.map((appt) => {
          const patientUser = users.find((u) => u.id === appt.patient_id);
          const profUser = users.find((u) => u.id === appt.professional_id);
          return {
            ...appt,
            patient: patientUser ? {
              full_name: patientUser.full_name,
              email: patientUser.email,
              phone: patientUser.phone,
              avatar_url: patientUser.avatar_url,
              rut_or_dni: patientUser.rut_or_dni,
            } : appt.patient,
            professional: profUser ? {
              full_name: profUser.full_name,
              email: profUser.email,
              role: profUser.role,
              specialty: profUser.specialty,
            } : appt.professional,
          };
        });
      } else if (this.tableName === 'users') {
        const profiles = LocalStore.get<ProfessionalProfile[]>(STORAGE_KEYS.PROFESSIONAL_PROFILES, INITIAL_PROFESSIONAL_PROFILES);
        const reviews = LocalStore.get<Review[]>(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
        rawData = users.map((u) => {
          const userProfile = profiles.find((p) => p.user_id === u.id);
          const userReviews = reviews.filter((r) => r.professional_id === u.id && r.status === 'approved');
          return {
            ...u,
            professional_profiles: userProfile ? [userProfile] : [],
            reviews: userReviews,
          };
        });
      } else if (this.tableName === 'tenants') {
        rawData = LocalStore.get<Tenant[]>(STORAGE_KEYS.ALL_TENANTS, ALL_DEMO_TENANTS);
      } else if (this.tableName === 'pain_observations') {
        rawData = LocalStore.get<PainObservation[]>(STORAGE_KEYS.PAIN_OBSERVATIONS, INITIAL_PAIN_OBSERVATIONS);
      } else if (this.tableName === 'body_compositions') {
        rawData = LocalStore.get<BodyCompositionRecord[]>(STORAGE_KEYS.BODY_COMPOSITIONS, INITIAL_BODY_COMPOSITIONS);
      } else if (this.tableName === 'general_medical_records') {
        rawData = LocalStore.get<GeneralMedicalRecord[]>(STORAGE_KEYS.MEDICAL_RECORDS, INITIAL_MEDICAL_RECORDS);
      } else if (this.tableName === 'pacientes_clinicos') {
        rawData = LocalStore.get<PacienteClinico[]>(STORAGE_KEYS.PACIENTES_CLINICOS, INITIAL_PACIENTES_CLINICOS);
      } else if (this.tableName === 'consultas_soap') {
        rawData = LocalStore.get<ConsultaSOP[]>(STORAGE_KEYS.CONSULTAS_SOAP, INITIAL_CONSULTAS_SOAP);
      } else if (this.tableName === 'prescripciones') {
        rawData = LocalStore.get<PrescripcionMedica[]>(STORAGE_KEYS.PRESCRIPCIONES, INITIAL_PRESCRIPCIONES);
      } else if (this.tableName === 'evaluaciones_antropometricas') {
        rawData = LocalStore.get<EvaluacionAntropometrica[]>(STORAGE_KEYS.EVALUACIONES_ANTROPOMETRICAS, INITIAL_EVALUACIONES_ANTROPOMETRICAS);
      } else if (this.tableName === 'planes_nutricionales') {
        rawData = LocalStore.get<PlanNutricional[]>(STORAGE_KEYS.PLANES_NUTRICIONALES, INITIAL_NUTRITION_PLANS);
      } else if (this.tableName === 'ordenes_nutricion_fhir' || this.tableName === 'nutrition_orders') {
        rawData = LocalStore.get<OrdenNutricionFHIR[]>(STORAGE_KEYS.ORDENES_NUTRICION_FHIR, INITIAL_FHIR_NUTRITION_ORDERS);
      } else if (this.tableName === 'team_invitations') {
        rawData = LocalStore.get<TeamInvitation[]>(STORAGE_KEYS.INVITATIONS, INITIAL_INVITATIONS);
      } else if (this.tableName === 'pricing_plans') {
        rawData = LocalStore.get<PricingPlanConfig[]>(STORAGE_KEYS.PRICING_PLANS, PRICING_PLANS);
      } else if (this.tableName === 'professional_profiles') {
        rawData = LocalStore.get<ProfessionalProfile[]>(STORAGE_KEYS.PROFESSIONAL_PROFILES, INITIAL_PROFESSIONAL_PROFILES);
      } else if (this.tableName === 'reviews') {
        rawData = LocalStore.get<Review[]>(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
      }

      let filtered = rawData;
      for (const fn of this.filters) {
        filtered = filtered.filter(fn);
      }

      if (this.orderField) {
        const field = this.orderField;
        filtered.sort((a, b) => {
          const valA = a[field];
          const valB = b[field];
          if (valA < valB) return this.orderAscending ? -1 : 1;
          if (valA > valB) return this.orderAscending ? 1 : -1;
          return 0;
        });
      }

      if (this.limitCount && this.limitCount > 0) {
        filtered = filtered.slice(0, this.limitCount);
      }

      return { data: filtered, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async insert(records: any | any[]) {
    try {
      const items = Array.isArray(records) ? records : [records];
      const users = LocalStore.get<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);

      if (this.tableName === 'tenants') {
        const allTenants = LocalStore.get<Tenant[]>(STORAGE_KEYS.ALL_TENANTS, ALL_DEMO_TENANTS);
        const newTenants: Tenant[] = items.map((item) => ({
          id: item.id || `tenant_${Date.now()}`,
          subscription_plan: item.subscription_plan || 'starter',
          subscription_status: item.subscription_status || 'trialing',
          max_users: item.max_users || 1,
          trial_ends_at: item.trial_ends_at || new Date(Date.now() + 7 * 86400000).toISOString(),
          cancellation_window_hours: item.cancellation_window_hours ?? 24,
          timezone: item.timezone || 'America/Santiago (UTC-3)',
          ...item,
        }));
        LocalStore.set(STORAGE_KEYS.ALL_TENANTS, [...allTenants, ...newTenants]);
        LocalStore.set(STORAGE_KEYS.TENANT, newTenants[0]);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'tenants' } }));
        return { data: newTenants, error: null };
      }

      if (this.tableName === 'users') {
        const newUsers: User[] = items.map((item) => ({
          id: item.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          created_at: item.created_at || new Date().toISOString(),
          tenant_id: item.tenant_id || DEFAULT_TENANT_ID,
          role: item.role || 'patient',
          ...item,
        }));
        LocalStore.set(STORAGE_KEYS.USERS, [...users, ...newUsers]);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'users' } }));
        return { data: newUsers, error: null };
      }

      if (this.tableName === 'appointments') {
        const current = LocalStore.get<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
        const newAppts: Appointment[] = items.map((item) => ({
          id: item.id || `appt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          tenant_id: item.tenant_id || DEFAULT_TENANT_ID,
          status: item.status || 'booked',
          ...item,
        }));
        LocalStore.set(STORAGE_KEYS.APPOINTMENTS, [...newAppts, ...current]);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'appointments' } }));
        return { data: newAppts, error: null };
      }

      if (this.tableName === 'pain_observations') {
        const current = LocalStore.get<PainObservation[]>(STORAGE_KEYS.PAIN_OBSERVATIONS, INITIAL_PAIN_OBSERVATIONS);
        const newObs: PainObservation[] = items.map((item) => ({
          id: item.id || `pain_obs_${Date.now()}`,
          created_at: item.created_at || new Date().toISOString(),
          ...item,
        }));
        LocalStore.set(STORAGE_KEYS.PAIN_OBSERVATIONS, [newObs[0], ...current]);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'pain_observations' } }));
        return { data: newObs, error: null };
      }

      if (this.tableName === 'body_compositions') {
        const current = LocalStore.get<BodyCompositionRecord[]>(STORAGE_KEYS.BODY_COMPOSITIONS, INITIAL_BODY_COMPOSITIONS);
        const newRecs: BodyCompositionRecord[] = items.map((item) => ({
          id: item.id || `body_comp_${Date.now()}`,
          created_at: item.created_at || new Date().toISOString(),
          ...item,
        }));
        LocalStore.set(STORAGE_KEYS.BODY_COMPOSITIONS, [newRecs[0], ...current]);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'body_compositions' } }));
        return { data: newRecs, error: null };
      }

      if (this.tableName === 'general_medical_records') {
        const current = LocalStore.get<GeneralMedicalRecord[]>(STORAGE_KEYS.MEDICAL_RECORDS, INITIAL_MEDICAL_RECORDS);
        const newRecs: GeneralMedicalRecord[] = items.map((item) => ({
          id: item.id || `med_rec_${Date.now()}`,
          created_at: item.created_at || new Date().toISOString(),
          ...item,
        }));
        LocalStore.set(STORAGE_KEYS.MEDICAL_RECORDS, [newRecs[0], ...current]);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'general_medical_records' } }));
        return { data: newRecs, error: null };
      }

      if (this.tableName === 'pacientes_clinicos') {
        const current = LocalStore.get<PacienteClinico[]>(STORAGE_KEYS.PACIENTES_CLINICOS, INITIAL_PACIENTES_CLINICOS);
        const newPatients: PacienteClinico[] = items.map((item) => ({
          id: item.id || `pat_cli_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          created_at: item.created_at || new Date().toISOString(),
          active: item.active ?? true,
          ...item,
        }));
        LocalStore.set(STORAGE_KEYS.PACIENTES_CLINICOS, [...newPatients, ...current]);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'pacientes_clinicos' } }));
        return { data: newPatients, error: null };
      }

      if (this.tableName === 'consultas_soap') {
        const current = LocalStore.get<ConsultaSOP[]>(STORAGE_KEYS.CONSULTAS_SOAP, INITIAL_CONSULTAS_SOAP);
        const newEncounters: ConsultaSOP[] = items.map((item) => ({
          id: item.id || `soap_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          created_at: item.created_at || new Date().toISOString(),
          status: item.status || 'completed',
          ...item,
        }));
        LocalStore.set(STORAGE_KEYS.CONSULTAS_SOAP, [...newEncounters, ...current]);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'consultas_soap' } }));
        return { data: newEncounters, error: null };
      }

      if (this.tableName === 'prescripciones') {
        const current = LocalStore.get<PrescripcionMedica[]>(STORAGE_KEYS.PRESCRIPCIONES, INITIAL_PRESCRIPCIONES);
        const newPrescriptions: PrescripcionMedica[] = items.map((item) => ({
          id: item.id || `rx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          created_at: item.created_at || new Date().toISOString(),
          status: item.status || 'active',
          ...item,
        }));
        LocalStore.set(STORAGE_KEYS.PRESCRIPCIONES, [...newPrescriptions, ...current]);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'prescripciones' } }));
        return { data: newPrescriptions, error: null };
      }

      if (this.tableName === 'evaluaciones_antropometricas') {
        const current = LocalStore.get<EvaluacionAntropometrica[]>(STORAGE_KEYS.EVALUACIONES_ANTROPOMETRICAS, INITIAL_EVALUACIONES_ANTROPOMETRICAS);
        const newAntropos: EvaluacionAntropometrica[] = items.map((item) => ({
          id: item.id || `antropo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          created_at: item.created_at || new Date().toISOString(),
          ...item,
        }));
        LocalStore.set(STORAGE_KEYS.EVALUACIONES_ANTROPOMETRICAS, [...newAntropos, ...current]);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'evaluaciones_antropometricas' } }));
        return { data: newAntropos, error: null };
      }

      if (this.tableName === 'planes_nutricionales') {
        const current = LocalStore.get<PlanNutricional[]>(STORAGE_KEYS.PLANES_NUTRICIONALES, INITIAL_NUTRITION_PLANS);
        const newPlans: PlanNutricional[] = items.map((item) => ({
          id: item.id || `plan_nutri_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          created_at: item.created_at || new Date().toISOString(),
          status: item.status || 'active',
          ...item,
        }));
        LocalStore.set(STORAGE_KEYS.PLANES_NUTRICIONALES, [...newPlans, ...current]);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'planes_nutricionales' } }));
        return { data: newPlans, error: null };
      }

      if (this.tableName === 'ordenes_nutricion_fhir' || this.tableName === 'nutrition_orders') {
        const current = LocalStore.get<OrdenNutricionFHIR[]>(STORAGE_KEYS.ORDENES_NUTRICION_FHIR, INITIAL_FHIR_NUTRITION_ORDERS);
        const newOrders: OrdenNutricionFHIR[] = items.map((item) => ({
          id: item.id || `fhir_order_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          created_at: item.created_at || new Date().toISOString(),
          status: item.status || 'active',
          ...item,
        }));
        LocalStore.set(STORAGE_KEYS.ORDENES_NUTRICION_FHIR, [...newOrders, ...current]);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'ordenes_nutricion_fhir' } }));
        return { data: newOrders, error: null };
      }

      if (this.tableName === 'team_invitations') {
        const current = LocalStore.get<TeamInvitation[]>(STORAGE_KEYS.INVITATIONS, INITIAL_INVITATIONS);
        const newInvs: TeamInvitation[] = items.map((item) => ({
          id: item.id || `inv_${Date.now()}`,
          created_at: item.created_at || new Date().toISOString(),
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
          ...item,
        }));
        LocalStore.set(STORAGE_KEYS.INVITATIONS, [...newInvs, ...current]);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'team_invitations' } }));
        return { data: newInvs, error: null };
      }

      if (this.tableName === 'professional_profiles') {
        const current = LocalStore.get<ProfessionalProfile[]>(STORAGE_KEYS.PROFESSIONAL_PROFILES, INITIAL_PROFESSIONAL_PROFILES);
        const newProfiles: ProfessionalProfile[] = items.map((item) => ({
          id: item.id || `prof_profile_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          created_at: item.created_at || new Date().toISOString(),
          social_links: item.social_links || {},
          ...item,
        }));
        LocalStore.set(STORAGE_KEYS.PROFESSIONAL_PROFILES, [...newProfiles, ...current]);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'professional_profiles' } }));
        return { data: newProfiles, error: null };
      }

      if (this.tableName === 'reviews') {
        const current = LocalStore.get<Review[]>(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
        const newReviews: Review[] = items.map((item) => ({
          id: item.id || `rev_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          created_at: item.created_at || new Date().toISOString(),
          status: item.status || 'approved', // Auto-approved for patient portal demonstration or per configuration
          helpful_votes: item.helpful_votes || 0,
          ...item,
        }));
        LocalStore.set(STORAGE_KEYS.REVIEWS, [...newReviews, ...current]);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'reviews' } }));
        return { data: newReviews, error: null };
      }

      return { data: items, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async update(updates: any) {
    try {
      if (this.tableName === 'tenants') {
        const allTenants = LocalStore.get<Tenant[]>(STORAGE_KEYS.ALL_TENANTS, ALL_DEMO_TENANTS);
        const updatedTenants = allTenants.map((t) => {
          const matches = this.filters.every((fn) => fn(t));
          return matches ? { ...t, ...updates } : t;
        });
        LocalStore.set(STORAGE_KEYS.ALL_TENANTS, updatedTenants);
        const current = LocalStore.get<Tenant>(STORAGE_KEYS.TENANT, INITIAL_TENANT);
        if (this.filters.some((fn) => fn(current))) {
          LocalStore.set(STORAGE_KEYS.TENANT, { ...current, ...updates });
        }
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'tenants' } }));
        return { data: updates, error: null };
      }

      if (this.tableName === 'pricing_plans') {
        const plans = LocalStore.get<PricingPlanConfig[]>(STORAGE_KEYS.PRICING_PLANS, PRICING_PLANS);
        const updated = plans.map((p) => {
          const matches = this.filters.every((fn) => fn(p));
          return matches ? { ...p, ...updates } : p;
        });
        LocalStore.set(STORAGE_KEYS.PRICING_PLANS, updated);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'pricing_plans' } }));
        return { data: updated, error: null };
      }

      if (this.tableName === 'appointments') {
        const current = LocalStore.get<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
        const updated = current.map((appt) => {
          const matches = this.filters.every((fn) => fn(appt));
          return matches ? { ...appt, ...updates } : appt;
        });
        LocalStore.set(STORAGE_KEYS.APPOINTMENTS, updated);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'appointments' } }));
        return { data: updated, error: null };
      }

      return { data: updates, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async delete() {
    try {
      if (this.tableName === 'appointments') {
        const current = LocalStore.get<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
        const updated = current.filter((appt) => !this.filters.every((fn) => fn(appt)));
        LocalStore.set(STORAGE_KEYS.APPOINTMENTS, updated);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'appointments' } }));
        return { error: null };
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  }
}

function createSupabaseProxy() {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || localStorage.getItem(STORAGE_KEYS.SUPABASE_URL);
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || localStorage.getItem(STORAGE_KEYS.SUPABASE_KEY);

  let realClient: any = null;
  if (envUrl && envKey && envUrl.startsWith('http')) {
    try {
      realClient = createClient(envUrl, envKey);
    } catch (e) {
      console.warn('Real Supabase init fallback:', e);
    }
  }

  return {
    from: (table: string) => {
      if (realClient && (realClient as any).from) {
        return (realClient as any).from(table);
      }
      return new LocalQueryBuilder(table);
    },
    auth: {
      getUser: async () => {
        if (realClient?.auth) {
          return await realClient.auth.getUser();
        }
        const activeId = localStorage.getItem('kinesys_active_user_id') || 'prof_mateo_01';
        const user = INITIAL_USERS.find((u) => u.id === activeId) || INITIAL_PROFESSIONAL;
        return { data: { user }, error: null };
      },
      getSession: async () => {
        if (realClient?.auth) {
          return await realClient.auth.getSession();
        }
        const activeId = localStorage.getItem('kinesys_active_user_id') || 'prof_mateo_01';
        const user = INITIAL_USERS.find((u) => u.id === activeId) || INITIAL_PROFESSIONAL;
        return { data: { session: { user, access_token: 'mock_jwt_token_sample' } }, error: null };
      },
      signInWithOAuth: async ({ provider, options }: { provider: string; options?: any }) => {
        if (realClient?.auth) {
          return await realClient.auth.signInWithOAuth({ provider: provider as any, options });
        }
        // Simulated OAuth Delay & Flow
        await new Promise((resolve) => setTimeout(resolve, 900));
        // Find or assign demo user based on provider or mock profile
        const activeUser = INITIAL_USERS[2]; // Klgo Mateo
        localStorage.setItem('kinesys_active_user_id', activeUser.id);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'users' } }));
        return { 
          data: { 
            provider, 
            url: window.location.origin + window.location.pathname + '#/calendario',
            user: activeUser 
          }, 
          error: null 
        };
      },
      signInWithOtp: async ({ email, options }: { email: string; options?: any }) => {
        if (realClient?.auth) {
          return await realClient.auth.signInWithOtp({ email, options });
        }
        // Simulated OTP Delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        // Check if user with that email exists in initial users, or generate session
        const existing = INITIAL_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
          localStorage.setItem('kinesys_active_user_id', existing.id);
        }
        return { 
          data: { 
            user: existing || null, 
            session: null, 
            message: `Magic link enviado satisfactoriamente a ${email}` 
          }, 
          error: null 
        };
      },
      verifyOtp: async ({ email, token, type }: { email: string; token: string; type: string }) => {
        if (realClient?.auth) {
          return await realClient.auth.verifyOtp({ email, token, type: type as any });
        }
        await new Promise((resolve) => setTimeout(resolve, 600));
        const found = INITIAL_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase()) || INITIAL_USERS[2];
        localStorage.setItem('kinesys_active_user_id', found.id);
        window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'users' } }));
        return { data: { user: found, session: { user: found } }, error: null };
      },
      signOut: async () => {
        if (realClient?.auth) {
          return await realClient.auth.signOut();
        }
        return { error: null };
      },
      onAuthStateChange: (callback?: any) => {
        if (realClient?.auth) {
          return realClient.auth.onAuthStateChange(callback);
        }
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
    storage: {
      from: (bucketId: string) => {
        if (realClient && (realClient as any).storage) {
          return (realClient as any).storage.from(bucketId);
        }
        return {
          upload: async (filePath: string, file: File | Blob, _options?: any) => {
            try {
              const reader = new FileReader();
              const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
              const dataUrl = await base64Promise;
              const storageKey = `kinesys_storage_${bucketId}_${filePath}`;
              try {
                localStorage.setItem(storageKey, dataUrl);
              } catch (e) {
                console.warn('LocalStorage image quota reached, using in-memory reference:', e);
              }
              return {
                data: { path: filePath, fullPath: `${bucketId}/${filePath}` },
                error: null,
              };
            } catch (err: any) {
              return { data: null, error: err };
            }
          },
          getPublicUrl: (filePath: string) => {
            const storageKey = `kinesys_storage_${bucketId}_${filePath}`;
            const stored = localStorage.getItem(storageKey);
            if (stored) {
              return { data: { publicUrl: stored } };
            }
            return {
              data: {
                publicUrl: `https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300&auto=format&fit=crop&q=80`,
              },
            };
          },
          remove: async (paths: string[]) => {
            paths.forEach((p) => {
              localStorage.removeItem(`kinesys_storage_${bucketId}_${p}`);
            });
            return { data: paths, error: null };
          },
          list: async () => {
            return { data: [], error: null };
          },
        };
      },
    },
    functions: {
      invoke: async (functionName: string, options?: { body?: any; headers?: Record<string, string> }) => {
        if (realClient && (realClient as any).functions) {
          return (realClient as any).functions.invoke(functionName, options);
        }

        // Local simulation / fallback for Edge Functions (e.g. send-patient-document)
        await new Promise((resolve) => setTimeout(resolve, 750));
        const body = options?.body || {};

        if (functionName === 'send-patient-document') {
          const toEmail = body.to_email || 'paciente@ejemplo.com';
          const filename = body.filename || 'Documento_Clinico.pdf';
          const patientName = body.patient_name || 'Paciente';

          console.log(`[Supabase Edge Function Mock: ${functionName}] Email successfully dispatched to ${toEmail} with attachment "${filename}" for ${patientName}`);

          return {
            data: {
              success: true,
              messageId: `eco_msg_${Date.now()}`,
              recipient: toEmail,
              document_type: body.document_type || 'Plan Nutricional',
              eco_saved: { paper_sheets: 2, water_liters: 20 },
              message: `El documento fue enviado exitosamente al correo ${toEmail}.`,
            },
            error: null,
          };
        }

        return {
          data: { success: true, message: `Function ${functionName} executed successfully.` },
          error: null,
        };
      },
    },
    resetLocalDatabase: () => {
      localStorage.removeItem(STORAGE_KEYS.TENANT);
      localStorage.removeItem(STORAGE_KEYS.ALL_TENANTS);
      localStorage.removeItem(STORAGE_KEYS.USERS);
      localStorage.removeItem(STORAGE_KEYS.APPOINTMENTS);
      localStorage.removeItem(STORAGE_KEYS.PAIN_OBSERVATIONS);
      localStorage.removeItem(STORAGE_KEYS.BODY_COMPOSITIONS);
      localStorage.removeItem(STORAGE_KEYS.MEDICAL_RECORDS);
      localStorage.removeItem(STORAGE_KEYS.PLANES_NUTRICIONALES);
      localStorage.removeItem(STORAGE_KEYS.ORDENES_NUTRICION_FHIR);
      localStorage.removeItem(STORAGE_KEYS.PROFESSIONAL_PROFILES);
      localStorage.removeItem(STORAGE_KEYS.REVIEWS);
      localStorage.removeItem(STORAGE_KEYS.INVITATIONS);
      localStorage.removeItem(STORAGE_KEYS.PRICING_PLANS);
      window.dispatchEvent(new CustomEvent('kinesys_data_updated', { detail: { table: 'all' } }));
    },
    isUsingLocalEngine: () => !realClient,
  };
}

export const supabase = createSupabaseProxy();

/**
 * Formats patient full name for privacy on public review lists (e.g. "Camila Soto Valenzuela" -> "Camila S.")
 */
export function formatPatientNameForPrivacy(fullName?: string): string {
  if (!fullName || typeof fullName !== 'string') return 'Paciente KineSys';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

/**
 * Fetches all active professionals with joined profiles and moderated reviews
 */
export async function fetchProfessionalsWithFullDetails(): Promise<ProfessionalWithDetails[]> {
  try {
    const { data: usersData, error: usersErr } = await supabase.from('users').select('*');
    if (usersErr || !usersData) throw usersErr || new Error('Failed to fetch users');

    const professionals = usersData.filter((u: User) =>
      ['fisioterapeuta', 'nutricionista', 'medico_general', 'professional', 'clinic_admin'].includes(u.role)
    );

    const { data: profilesData } = await supabase.from('professional_profiles').select('*');
    const { data: reviewsData } = await supabase.from('reviews').select('*');

    const approvedReviews = (reviewsData || []).filter((r: Review) => r.status === 'approved');

    return professionals.map((prof: User) => {
      const profile = (profilesData || []).find((p: ProfessionalProfile) => p.user_id === prof.id);
      const profReviews = approvedReviews.filter((r: Review) => r.professional_id === prof.id);
      
      const totalRatings = profReviews.reduce((sum: number, r: Review) => sum + r.rating, 0);
      const ratingAverage = profReviews.length > 0 ? Number((totalRatings / profReviews.length).toFixed(1)) : (profile?.rating_average || 5.0);
      const reviewsCount = profReviews.length > 0 ? profReviews.length : (profile?.reviews_count || 0);

      return {
        ...prof,
        profile: profile || undefined,
        reviews: profReviews,
        rating_average: ratingAverage,
        reviews_count: reviewsCount,
      };
    });
  } catch (e) {
    console.error('Error fetching professionals with details:', e);
    return [];
  }
}

/**
 * Fetches a single professional's full profile and approved reviews
 */
export async function fetchProfessionalDetails(userId: string): Promise<ProfessionalWithDetails | null> {
  try {
    const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!userData) return null;

    const { data: profileData } = await supabase.from('professional_profiles').select('*').eq('user_id', userId).single();
    const { data: reviewsData } = await supabase.from('reviews').select('*').eq('professional_id', userId);

    const approvedReviews = (reviewsData || []).filter((r: Review) => r.status === 'approved');
    const totalRatings = approvedReviews.reduce((sum: number, r: Review) => sum + r.rating, 0);
    const ratingAverage = approvedReviews.length > 0 ? Number((totalRatings / approvedReviews.length).toFixed(1)) : (profileData?.rating_average || 5.0);

    return {
      ...userData,
      profile: profileData || undefined,
      reviews: approvedReviews,
      rating_average: ratingAverage,
      reviews_count: approvedReviews.length,
    };
  } catch (e) {
    console.error('Error fetching single professional details:', e);
    return null;
  }
}

/**
 * Submits a new review from a patient
 */
export async function submitProfessionalReview(review: Omit<Review, 'id' | 'created_at'>): Promise<{ success: boolean; data?: Review; error?: string }> {
  try {
    const newRev: Partial<Review> = {
      ...review,
      status: review.status || 'approved',
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('reviews').insert(newRev);
    if (error) return { success: false, error: error.message || 'Error al guardar la reseña' };
    return { success: true, data: Array.isArray(data) ? data[0] : data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error inesperado' };
  }
}

