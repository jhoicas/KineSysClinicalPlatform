export type UserRole = 
  | 'super_admin' 
  | 'clinic_admin' 
  | 'fisioterapeuta' 
  | 'nutricionista' 
  | 'medico_general' 
  | 'patient' 
  | 'receptionist'
  | 'professional'; // backwards compatibility

export type SubscriptionPlan = 'starter' | 'growth' | 'enterprise';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'incomplete';

export type AppointmentStatus = 'booked' | 'confirmed' | 'cancelled' | 'no_show' | 'completed';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  tenant_id: string;
  avatar_url?: string;
  rut_or_dni?: string;
  specialty?: string;
  license_number?: string;
  birth_date?: string;
  gender?: string;
  medical_conditions?: string[];
  allergies?: string[];
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  timezone: string;
  cancellation_window_hours: number;
  email?: string;
  phone?: string;
  address?: string;
  currency?: string;
  appointment_duration_minutes?: number;
  
  // SaaS, Wompi & Subscription fields
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  max_users: number;
  trial_ends_at: string; // ISO date string (7 days trial)
  wompi_public_key?: string;
  wompi_private_key?: string;
  wompi_integrity_secret?: string;
  wompi_merchant_id?: string;
  is_wompi_sandbox?: boolean;
  
  created_at?: string;

  // White-labeling & Branding fields
  logo_url?: string;
  primary_color?: string; // HEX e.g. '#004870'
  settings?: {
    theme?: string;
    custom_css?: string;
    brand_name_display?: 'name_only' | 'logo_only' | 'both';
    accent_color?: string;
    [key: string]: any;
  };
}

export interface PricingPlanConfig {
  id: SubscriptionPlan;
  name: string;
  tagline: string;
  price_cop: number;
  price_clp?: number;
  price_usd: number;
  max_users: number;
  trial_days: number;
  popular?: boolean;
  features: string[];
}

export interface Appointment {
  id: string;
  tenant_id: string;
  professional_id: string;
  patient_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  room_or_box?: string;
  professional_type?: 'fisioterapeuta' | 'nutricionista' | 'medico_general';
  patient?: {
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
    rut_or_dni?: string;
  };
  professional?: {
    full_name: string;
    email: string;
    role?: UserRole;
    specialty?: string;
  };
}

export interface PainObservation {
  id: string;
  tenant_id: string;
  patient_id: string;
  professional_id: string;
  pain_level: number; // 1 - 10
  pain_type?: 'punzante' | 'urente' | 'sordo' | 'opresivo' | 'irradiado' | 'pulsatil' | 'agudo';
  body_region: string; // e.g. "Hombro Derecho", "Lumbar L4-L5", "Rodilla Izquierda"
  body_side: 'front' | 'back';
  coordinates_x: number; // 0 - 100%
  coordinates_y: number; // 0 - 100%
  clinical_notes: string;
  tags?: string[];
  created_at: string;
}

export interface BodyCompositionRecord {
  id: string;
  tenant_id: string;
  patient_id: string;
  nutritionist_id: string;
  weight_kg: number;
  height_cm: number;
  body_fat_percentage: number;
  muscle_mass_kg: number;
  visceral_fat_level: number;
  bmr_kcal: number;
  metabolic_age: number;
  dietary_plan: string;
  caloric_target_kcal: number;
  macros: {
    protein_grams: number;
    carbs_grams: number;
    fats_grams: number;
  };
  clinical_notes: string;
  created_at: string;
}

export interface GeneralMedicalRecord {
  id: string;
  tenant_id: string;
  patient_id: string;
  doctor_id: string;
  vital_signs: {
    blood_pressure: string; // e.g. "120/80"
    heart_rate_bpm: number;
    temp_celsius: number;
    oxygen_saturation: number;
  };
  chief_complaint: string;
  physical_examination: string;
  diagnosis_icd10: string;
  prescriptions: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  lab_orders: string[];
  evolution_notes: string;
  created_at: string;
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  professional_id: string;
  tenant_id: string;
  created_at: string;
  diagnosis: string;
  treatment_plan: string;
  evolution_notes: string;
  rom_measurement?: string; // Range of motion
  eva_score?: number; // 1-10
}

export interface TeamInvitation {
  id: string;
  tenant_id: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'accepted' | 'expired';
  invited_by: string;
  created_at: string;
  expires_at: string;
}

// ==========================================
// FHIR-ALIGNED CLINICAL ARCHITECTURE TYPES
// ==========================================

export interface PacienteClinico {
  id: string;
  tenant_id: string;
  fhir_resource_id?: string;
  identifier_type: 'CC' | 'RUT' | 'DNI' | 'PASSPORT' | 'TI' | 'CE';
  identifier_number: string;
  first_name: string;
  last_name: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birth_date: string;
  telecom_phone: string;
  telecom_email: string;
  address_line?: string;
  blood_type?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  known_allergies: string[];
  chronic_conditions: string[];
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface VitalSignsObservation {
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  heart_rate_bpm: number;
  respiratory_rate_rpm?: number;
  temp_celsius: number;
  oxygen_saturation_pct: number;
  weight_kg?: number;
  height_cm?: number;
  bmi?: number;
}

export interface Icd10Diagnosis {
  code: string;
  description: string;
  type: 'primary' | 'secondary' | 'differential';
}

export interface ConsultaSOP {
  id: string;
  tenant_id: string;
  patient_id: string;
  practitioner_id: string;
  encounter_type: 'primera_vez' | 'control' | 'urgencia_menor' | 'teleconsulta';
  encounter_date: string;
  
  // S - Subjetivo (Anamnesis, motivo de consulta, enfermedad actual, antecedentes)
  subjective: {
    chief_complaint: string;
    current_illness_history: string;
    review_of_systems?: string;
    past_medical_history?: string;
  };

  // O - Objetivo (Examen físico segmentario y constantes vitales)
  objective: {
    vitals: VitalSignsObservation;
    physical_exam: string;
    neurological_exam?: string;
    cardiopulmonary_exam?: string;
    abdomen_exam?: string;
    musculoskeletal_exam?: string;
  };

  // A - Análisis / Evaluación (Diagnósticos CIE-10, juicio clínico, evolución)
  assessment: {
    diagnoses: Icd10Diagnosis[];
    clinical_reasoning: string;
    prognosis?: 'favorable' | 'reservado' | 'desfavorable';
  };

  // P - Plan (Terapéutica, órdenes de laboratorio/imágenes, interconsultas, alarma)
  plan: {
    treatment_goals: string;
    lab_orders: string[];
    imaging_orders: string[];
    referrals?: string[];
    patient_instructions: string;
    follow_up_days?: number;
    alarm_signs: string;
  };

  status: 'draft' | 'completed' | 'signed';
  created_at: string;
  updated_at?: string;
}

export interface MedicationItem {
  id: string;
  medication_code?: string;
  medication_name: string;
  generic_name: string;
  pharmaceutical_form: 'tableta' | 'capsula' | 'jarabe' | 'ampolla' | 'crema' | 'gotas' | 'inhalador';
  strength_concentration: string; // e.g. "500 mg", "1 g", "10 mg/ml"
  dosage_instruction: string; // e.g. "1 tableta"
  route: 'oral' | 'intravenosa' | 'intramuscular' | 'subcutanea' | 'topica' | 'oftalmica' | 'inhalatoria';
  frequency: string; // e.g. "Cada 8 horas", "Cada 12 horas", "Cada 24 horas", "En caso de dolor"
  duration: string; // e.g. "5 días", "7 días", "30 días (Crónico)"
  quantity_to_dispense: number;
  clinical_indication: string; // e.g. "Manejo del dolor agudo"
  allergy_warning?: {
    detected: boolean;
    allergen_match: string;
    severity: 'high' | 'critical' | 'moderate';
    reason: string;
    overridden?: boolean;
    override_reason?: string;
  };
}

export interface PrescripcionMedica {
  id: string;
  tenant_id: string;
  patient_id: string;
  encounter_id?: string;
  practitioner_id: string;
  prescription_date: string;
  valid_until: string;
  medications: MedicationItem[];
  general_instructions: string;
  status: 'active' | 'dispensed' | 'cancelled';
  digital_signature_hash?: string;
  created_at: string;
}

// ==========================================
// FASE 2: PERFIL NUTRICIONISTA & METABÓLICO
// ==========================================

export interface EvaluacionAntropometrica {
  id: string;
  tenant_id: string;
  patient_id: string;
  nutritionist_id: string;
  evaluation_date: string;
  
  // Datos base
  age: number;
  gender: 'male' | 'female' | 'other';
  weight_kg: number;
  height_cm: number;
  activity_factor: number; // 1.2, 1.375, 1.55, 1.725, 1.9

  // Pliegues cutáneos (mm)
  skinfold_triceps_mm: number;
  skinfold_subscapular_mm: number;
  skinfold_suprailiac_mm: number;
  skinfold_abdominal_mm: number;
  skinfold_biceps_mm?: number;
  skinfold_thigh_mm?: number;
  skinfold_calf_mm?: number;

  // Perímetros (cm)
  waist_cm: number;
  hip_cm: number;
  relaxed_arm_cm?: number;
  contracted_arm_cm?: number;
  thigh_cm?: number;
  calf_cm?: number;
  neck_cm?: number;

  // Resultados calculados (Termodinámica & Antropometría)
  bmi: number;
  bmr_kcal: number; // Mifflin-St Jeor
  tdee_kcal: number; // Gasto energético total
  waist_hip_ratio: number;
  body_fat_percentage: number;
  fat_mass_kg: number;
  fat_free_mass_kg: number;
  cardiovascular_risk_level: 'bajo' | 'moderado' | 'alto' | 'muy_alto';

  clinical_notes?: string;
  created_at: string;
}

export interface AlimentoItem {
  id: string;
  food_id?: string;
  name: string;
  category: 'proteina' | 'carbohidrato' | 'grasa' | 'vegetal' | 'fruta' | 'lacteo' | 'bebida' | 'suplemento';
  portion_size: number;
  unit: 'g' | 'ml' | 'unidad' | 'taza' | 'cda' | 'scoop';
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  sodium_mg: number;
  potassium_mg?: number;
  fiber_g?: number;
  sugars_g?: number;
  allergens?: string[];
}

export interface TiempoComida {
  id: string;
  name: string; // "Desayuno", "Colación Mañana", "Almuerzo", "Merienda", "Cena", etc.
  time_suggestion?: string; // "08:00"
  items: AlimentoItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
  total_sodium: number;
}

export interface PlanNutricional {
  id: string;
  tenant_id: string;
  patient_id: string;
  nutritionist_id: string;
  nutritionist_name?: string;
  plan_name: string;
  plan_type: 'recomposicion' | 'deficit_controlado' | 'superavit_magro' | 'mantenimiento' | 'terapeutico_clinico' | 'dieta_dash' | 'blanda_gastrica';
  status: 'active' | 'archived' | 'draft';
  
  // Objetivos calóricos & distribución de macronutrientes
  caloric_target_kcal: number;
  macros_target: {
    protein_grams: number;
    protein_pct: number;
    carbs_grams: number;
    carbs_pct: number;
    fats_grams: number;
    fats_pct: number;
    fiber_grams_target?: number;
    sodium_mg_max?: number;
  };

  // Tiempos de comida y alimentos
  meals: TiempoComida[];

  // Restricciones clínicas asociadas
  clinical_restrictions: string[];
  active_fhir_order_id?: string;
  
  notes_and_recommendations: string;
  hydration_target_liters: number;
  created_at: string;
  updated_at?: string;
}

export interface ClinicalDietRestriction {
  id: string;
  type: 'sodium_limit' | 'carbohydrate_limit' | 'protein_limit' | 'potassium_limit' | 'texture_modification' | 'allergen_exclusion' | 'fluid_consistency';
  label: string;
  max_limit_value?: number;
  unit?: string;
  enforced: boolean;
  description: string;
}

export interface OrdenNutricionFHIR {
  id: string;
  tenant_id: string;
  patient_id: string;
  practitioner_id: string;
  practitioner_name: string;
  order_date: string;
  status: 'active' | 'completed' | 'on_hold' | 'revoked';
  diet_category: 'therapeutic' | 'texture_modified' | 'supplement' | 'fasting';
  clinical_indication: string; // e.g. "Hipertensión Arterial Estadio 2 - Dieta Hiposódica Estricta"
  restrictions: ClinicalDietRestriction[];
  oral_diet_details: {
    type_description: string; // e.g. "Líquidos claros", "Hiposódica (< 1500mg Na)", "Blanda gástrica", "Normoproteica 1.0g/kg"
    nutrient_modifications?: string[];
    texture?: 'regular' | 'pureed' | 'mechanical_soft' | 'clear_liquids' | 'full_liquids';
    fluid_consistency_type?: 'thin' | 'nectar_thick' | 'honey_thick' | 'pudding_thick';
  };
  fhir_json?: Record<string, unknown>;
  created_at: string;
}

// ----------------------------------------------------
// PORTAL DEL PACIENTE: PERFILES PROFESIONALES Y RESEÑAS
// ----------------------------------------------------

export interface ProfessionalSocialLinks {
  instagram?: string;
  linkedin?: string;
  x?: string;
  twitter?: string;
  facebook?: string;
  youtube?: string;
  website?: string;
  github?: string;
  whatsapp?: string;
}

export interface ProfessionalProfile {
  id: string;
  user_id: string;
  tenant_id: string;
  bio: string;
  alma_mater: string;
  graduation_year: number;
  years_of_experience: number;
  social_links: ProfessionalSocialLinks;
  languages?: string[];
  certifications?: string[];
  consultation_fee?: number;
  currency?: string;
  rating_average?: number;
  reviews_count?: number;
  is_verified?: boolean;
  created_at: string;
  updated_at?: string;
}

export type ReviewStatus = 'approved' | 'pending' | 'rejected';

export interface Review {
  id: string;
  tenant_id: string;
  professional_id: string;
  patient_id?: string;
  patient_name: string;
  rating: number; // 1 to 5 stars
  comment: string;
  status: ReviewStatus;
  consultation_date?: string;
  treatment_category?: string;
  helpful_votes?: number;
  created_at: string;
}

export interface ProfessionalWithDetails extends User {
  profile?: ProfessionalProfile;
  reviews?: Review[];
  rating_average: number;
  reviews_count: number;
}


