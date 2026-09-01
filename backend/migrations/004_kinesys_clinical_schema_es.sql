-- 004_kinesys_clinical_schema_es.sql
-- Esquema clínico KineSys (multi-tenant) en schema `kinesys`
-- Evita conflicto con tablas ERP existentes en public (users, companies, etc.)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS kinesys;

GRANT USAGE ON SCHEMA kinesys TO anon, authenticated, service_role;

-- ==========================================
-- Helpers RLS
-- ==========================================

CREATE OR REPLACE FUNCTION kinesys.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = kinesys
AS $$
  SELECT tenant_id FROM kinesys.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION kinesys.is_clinic_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = kinesys
AS $$
  SELECT EXISTS (
    SELECT 1 FROM kinesys.profiles
    WHERE id = auth.uid()
      AND role IN ('clinic_admin', 'super_admin', 'CLINIC_ADMIN', 'SUPER_ADMIN')
      AND is_active = TRUE
  )
$$;

-- ==========================================
-- 1. TENANTS
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    timezone VARCHAR(100) DEFAULT 'America/Bogota',
    cancellation_window_hours INTEGER DEFAULT 24,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    currency VARCHAR(10) DEFAULT 'COP',
    appointment_duration_minutes INTEGER DEFAULT 45,
    subscription_plan VARCHAR(50) DEFAULT 'starter',
    subscription_status VARCHAR(50) DEFAULT 'trialing',
    max_users INTEGER DEFAULT 5,
    trial_ends_at TIMESTAMPTZ,
    wompi_public_key TEXT,
    wompi_private_key TEXT,
    wompi_integrity_secret TEXT,
    wompi_merchant_id TEXT,
    is_wompi_sandbox BOOLEAN DEFAULT TRUE,
    logo_url TEXT,
    primary_color VARCHAR(20),
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. USERS (staff clínico, 1:1 auth.users)
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'fisioterapeuta',
    phone VARCHAR(50),
    license_number VARCHAR(100),
    specialty VARCHAR(255),
    avatar_url TEXT,
    rut_or_dni VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kinesys_users_tenant ON kinesys.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kinesys_users_email ON kinesys.users(email);

-- ==========================================
-- 3. PROFILES (RBAC espejo)
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'fisioterapeuta',
    is_active BOOLEAN DEFAULT TRUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kinesys_profiles_tenant ON kinesys.profiles(tenant_id);

-- ==========================================
-- 4. PACIENTES CLÍNICOS
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.pacientes_clinicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    fhir_resource_id VARCHAR(100),
    identifier_type VARCHAR(20) DEFAULT 'CC',
    identifier_number VARCHAR(50),
    first_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(150) NOT NULL,
    gender VARCHAR(20) DEFAULT 'unknown',
    birth_date DATE,
    telecom_phone VARCHAR(50),
    telecom_email VARCHAR(255),
    address_line TEXT,
    blood_type VARCHAR(10),
    known_allergies JSONB DEFAULT '[]'::jsonb,
    chronic_conditions JSONB DEFAULT '[]'::jsonb,
    emergency_contact JSONB,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kinesys_pacientes_tenant ON kinesys.pacientes_clinicos(tenant_id);

-- ==========================================
-- 5. APPOINTMENTS
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES kinesys.users(id),
    patient_id UUID NOT NULL REFERENCES kinesys.pacientes_clinicos(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) DEFAULT 'booked',
    reason TEXT,
    notes TEXT,
    room_or_box VARCHAR(100),
    professional_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kinesys_appointments_tenant ON kinesys.appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kinesys_appointments_professional ON kinesys.appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_kinesys_appointments_start ON kinesys.appointments(start_time);

-- ==========================================
-- 6. CONSULTAS SOAP
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.consultas_soap (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES kinesys.pacientes_clinicos(id),
    practitioner_id UUID NOT NULL REFERENCES kinesys.users(id),
    encounter_type VARCHAR(50) DEFAULT 'control',
    encounter_date TIMESTAMPTZ DEFAULT NOW(),
    subjective JSONB NOT NULL DEFAULT '{}'::jsonb,
    objective JSONB NOT NULL DEFAULT '{}'::jsonb,
    assessment JSONB NOT NULL DEFAULT '{}'::jsonb,
    plan JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 7. PRESCRIPCIONES
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.prescripciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES kinesys.pacientes_clinicos(id),
    encounter_id UUID REFERENCES kinesys.consultas_soap(id),
    practitioner_id UUID NOT NULL REFERENCES kinesys.users(id),
    prescription_date TIMESTAMPTZ DEFAULT NOW(),
    valid_until DATE,
    medications JSONB NOT NULL DEFAULT '[]'::jsonb,
    general_instructions TEXT,
    status VARCHAR(20) DEFAULT 'active',
    digital_signature_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 8. EVALUACIONES ANTROPOMÉTRICAS
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.evaluaciones_antropometricas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES kinesys.pacientes_clinicos(id),
    nutritionist_id UUID NOT NULL REFERENCES kinesys.users(id),
    evaluation_date TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 9. PLANES NUTRICIONALES
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.planes_nutricionales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES kinesys.pacientes_clinicos(id),
    nutritionist_id UUID NOT NULL REFERENCES kinesys.users(id),
    plan_name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 10. ÓRDENES NUTRICIÓN FHIR
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.ordenes_nutricion_fhir (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES kinesys.pacientes_clinicos(id),
    practitioner_id UUID NOT NULL REFERENCES kinesys.users(id),
    order_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 11. PERFILES PROFESIONALES
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.professional_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES kinesys.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    bio TEXT,
    specialties JSONB DEFAULT '[]'::jsonb,
    social_links JSONB DEFAULT '{}'::jsonb,
    rating_average NUMERIC(3,2) DEFAULT 5.0,
    reviews_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ==========================================
-- 12. INVITACIONES EQUIPO
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    invited_by UUID REFERENCES kinesys.users(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 13. OBSERVACIONES DE DOLOR
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.pain_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES kinesys.pacientes_clinicos(id),
    professional_id UUID NOT NULL REFERENCES kinesys.users(id),
    pain_level SMALLINT CHECK (pain_level BETWEEN 1 AND 10),
    pain_type VARCHAR(30),
    body_region VARCHAR(100),
    body_side VARCHAR(10),
    coordinates_x NUMERIC(5,2),
    coordinates_y NUMERIC(5,2),
    clinical_notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 14. RESEÑAS
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES kinesys.users(id),
    patient_id UUID REFERENCES kinesys.pacientes_clinicos(id),
    patient_name VARCHAR(255),
    rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    status VARCHAR(20) DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 15. REGISTROS MÉDICOS GENERALES
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.general_medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES kinesys.pacientes_clinicos(id),
    doctor_id UUID NOT NULL REFERENCES kinesys.users(id),
    vital_signs JSONB,
    chief_complaint TEXT,
    physical_examination TEXT,
    diagnosis_icd10 VARCHAR(50),
    prescriptions JSONB DEFAULT '[]'::jsonb,
    lab_orders JSONB DEFAULT '[]'::jsonb,
    evolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 16. RBAC
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.app_roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kinesys.app_modules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    path_route VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50) NOT NULL,
    badge VARCHAR(50),
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kinesys.role_permissions (
    role_id VARCHAR(50) NOT NULL REFERENCES kinesys.app_roles(id) ON DELETE CASCADE,
    module_id VARCHAR(50) NOT NULL REFERENCES kinesys.app_modules(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (role_id, module_id)
);

-- ==========================================
-- RLS — habilitar en todas las tablas
-- ==========================================

ALTER TABLE kinesys.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.pacientes_clinicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.consultas_soap ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.prescripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.evaluaciones_antropometricas ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.planes_nutricionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.ordenes_nutricion_fhir ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.pain_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.general_medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.app_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.role_permissions ENABLE ROW LEVEL SECURITY;

-- Política base por tenant
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','profiles','pacientes_clinicos','appointments','consultas_soap',
    'prescripciones','evaluaciones_antropometricas','planes_nutricionales',
    'ordenes_nutricion_fhir','professional_profiles','team_invitations',
    'pain_observations','reviews','general_medical_records'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_select ON kinesys.%I', t);
    EXECUTE format('CREATE POLICY tenant_isolation_select ON kinesys.%I FOR SELECT TO authenticated USING (tenant_id = kinesys.current_tenant_id())', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_insert ON kinesys.%I', t);
    EXECUTE format('CREATE POLICY tenant_isolation_insert ON kinesys.%I FOR INSERT TO authenticated WITH CHECK (tenant_id = kinesys.current_tenant_id())', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_update ON kinesys.%I', t);
    EXECUTE format('CREATE POLICY tenant_isolation_update ON kinesys.%I FOR UPDATE TO authenticated USING (tenant_id = kinesys.current_tenant_id()) WITH CHECK (tenant_id = kinesys.current_tenant_id())', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_delete ON kinesys.%I', t);
    EXECUTE format('CREATE POLICY tenant_isolation_delete ON kinesys.%I FOR DELETE TO authenticated USING (tenant_id = kinesys.current_tenant_id())', t);
  END LOOP;
END $$;

-- Tenants: miembros leen su tenant; admins actualizan
DROP POLICY IF EXISTS tenants_select ON kinesys.tenants;
CREATE POLICY tenants_select ON kinesys.tenants FOR SELECT TO authenticated
  USING (id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenants_update ON kinesys.tenants;
CREATE POLICY tenants_update ON kinesys.tenants FOR UPDATE TO authenticated
  USING (id = kinesys.current_tenant_id() AND kinesys.is_clinic_admin())
  WITH CHECK (id = kinesys.current_tenant_id());

-- Onboarding: insertar tenant sin perfil previo (service role o política especial)
DROP POLICY IF EXISTS tenants_insert_onboarding ON kinesys.tenants;
CREATE POLICY tenants_insert_onboarding ON kinesys.tenants FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS users_insert_self ON kinesys.users;
CREATE POLICY users_insert_self ON kinesys.users FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_self ON kinesys.profiles;
CREATE POLICY profiles_insert_self ON kinesys.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_select_self ON kinesys.profiles;
CREATE POLICY profiles_select_self ON kinesys.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR tenant_id = kinesys.current_tenant_id());

-- RBAC lectura abierta autenticados
DROP POLICY IF EXISTS app_roles_select ON kinesys.app_roles;
CREATE POLICY app_roles_select ON kinesys.app_roles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS app_modules_select ON kinesys.app_modules;
CREATE POLICY app_modules_select ON kinesys.app_modules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS role_permissions_select ON kinesys.role_permissions;
CREATE POLICY role_permissions_select ON kinesys.role_permissions FOR SELECT TO authenticated USING (true);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA kinesys TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA kinesys TO authenticated;

-- ==========================================
-- Trigger sync profiles on auth user created (fallback)
-- ==========================================

CREATE OR REPLACE FUNCTION kinesys.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kinesys
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- ==========================================
-- SEED RBAC
-- ==========================================

INSERT INTO kinesys.app_roles (id, name, description) VALUES
    ('super_admin', 'Super Administrador SaaS', 'Control total multi-tenant'),
    ('clinic_admin', 'Administrador de Clínica', 'Gestión de profesionales y configuración'),
    ('fisioterapeuta', 'Kinesiólogo / Fisioterapeuta', 'Rehabilitación física'),
    ('nutricionista', 'Nutricionista', 'Antropometría y planes nutricionales'),
    ('medico_general', 'Médico General', 'Consultas SOAP y prescripciones'),
    ('patient', 'Paciente', 'Portal del paciente'),
    ('receptionist', 'Recepcionista', 'Agenda y recepción')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO kinesys.app_modules (id, name, path_route, icon, badge, display_order) VALUES
    ('mod_calendario', 'Agenda & Citas', '/calendario', 'calendar_month', 'Hoy', 1),
    ('mod_pacientes', 'Pacientes', '/pacientes', 'group', 'Activos', 2),
    ('mod_mapa_dolor', 'Mapa de Dolor', '/mapa-dolor', 'accessibility_new', 'Fisio', 3),
    ('mod_nutricion', 'Nutrición & InBody', '/nutricion', 'nutrition', 'Nutri', 4),
    ('mod_medicina_general', 'Medicina General', '/medicina-general', 'stethoscope', 'Médico', 5),
    ('mod_portal_paciente', 'Portal del Paciente', '/portal-paciente', 'person', 'B2C', 6),
    ('mod_configuracion', 'Gestión de Clínica', '/configuracion', 'settings', 'Admin', 7),
    ('mod_admin_access', 'Control de Accesos RBAC', '/admin-access', 'security', 'Seguridad', 8),
    ('mod_super_admin', 'Super Admin SaaS', '/super-admin', 'shield_person', 'SaaS', 9)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, path_route = EXCLUDED.path_route;

INSERT INTO kinesys.role_permissions (role_id, module_id) VALUES
    ('super_admin', 'mod_super_admin'), ('super_admin', 'mod_admin_access'), ('super_admin', 'mod_configuracion'),
    ('super_admin', 'mod_calendario'), ('super_admin', 'mod_pacientes'), ('super_admin', 'mod_mapa_dolor'),
    ('super_admin', 'mod_nutricion'), ('super_admin', 'mod_medicina_general'), ('super_admin', 'mod_portal_paciente'),
    ('clinic_admin', 'mod_configuracion'), ('clinic_admin', 'mod_admin_access'), ('clinic_admin', 'mod_calendario'),
    ('clinic_admin', 'mod_pacientes'), ('clinic_admin', 'mod_mapa_dolor'), ('clinic_admin', 'mod_nutricion'),
    ('clinic_admin', 'mod_medicina_general'),
    ('fisioterapeuta', 'mod_calendario'), ('fisioterapeuta', 'mod_pacientes'), ('fisioterapeuta', 'mod_mapa_dolor'),
    ('fisioterapeuta', 'mod_nutricion'), ('fisioterapeuta', 'mod_medicina_general'), ('fisioterapeuta', 'mod_configuracion'),
    ('nutricionista', 'mod_nutricion'), ('nutricionista', 'mod_calendario'), ('nutricionista', 'mod_pacientes'),
    ('nutricionista', 'mod_portal_paciente'),
    ('medico_general', 'mod_medicina_general'), ('medico_general', 'mod_calendario'), ('medico_general', 'mod_pacientes'),
    ('medico_general', 'mod_portal_paciente'),
    ('patient', 'mod_portal_paciente'), ('patient', 'mod_calendario'),
    ('receptionist', 'mod_calendario'), ('receptionist', 'mod_pacientes'), ('receptionist', 'mod_portal_paciente')
ON CONFLICT DO NOTHING;

-- Actualizar professional_availability (public) — políticas con UUID
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'professional_availability') THEN
    DROP POLICY IF EXISTS "Professionals manage own availability" ON public.professional_availability;
    CREATE POLICY "Professionals manage own availability" ON public.professional_availability
      FOR ALL TO authenticated
      USING (user_id = auth.uid()::text)
      WITH CHECK (user_id = auth.uid()::text);

    DROP POLICY IF EXISTS "Professionals manage own availability exceptions" ON public.professional_availability_exceptions;
    CREATE POLICY "Professionals manage own availability exceptions" ON public.professional_availability_exceptions
      FOR ALL TO authenticated
      USING (user_id = auth.uid()::text)
      WITH CHECK (user_id = auth.uid()::text);
  END IF;
END $$;
