-- 001_initial_schema.sql
-- KineSys Clinical Platform Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TENANTS & RBAC (Multi-tenancy)
-- ==========================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE,
    subscription_plan VARCHAR(50) DEFAULT 'free',
    subscription_status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- auth.users (Managed by Supabase Auth)
-- We map it to public.profiles

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'professional', -- super_admin, tenant_admin, professional, assistant
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);

-- ==========================================
-- 2. CLINICAL CORE (Patients & Encounters)
-- ==========================================

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rut_or_dni VARCHAR(50),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    birth_date DATE,
    gender VARCHAR(20),
    blood_type VARCHAR(10),
    medical_conditions TEXT,
    allergies TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_patients_tenant_id ON patients(tenant_id);

CREATE TABLE medical_encounters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES profiles(id),
    encounter_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    encounter_type VARCHAR(50) NOT NULL, -- SOAP, FOLLOW_UP, INITIAL
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    vital_signs JSONB, -- { blood_pressure: "120/80", heart_rate: 75, temperature: 36.5 }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_encounters_patient_id ON medical_encounters(patient_id);
CREATE INDEX idx_encounters_tenant_id ON medical_encounters(tenant_id);

CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES medical_encounters(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES profiles(id),
    medications JSONB NOT NULL, -- Array of medication items
    instructions TEXT,
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. NUTRITION & ANTHROPOMETRY
-- ==========================================

CREATE TABLE anthropometric_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES profiles(id),
    evaluation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    weight_kg DECIMAL(5,2),
    height_cm DECIMAL(5,2),
    bmi DECIMAL(5,2),
    body_fat_percentage DECIMAL(5,2),
    muscle_mass_kg DECIMAL(5,2),
    skinfolds JSONB, -- triceps, biceps, subscapular, suprailiac
    circumferences JSONB, -- waist, hip, arm, calf
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE nutrition_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES profiles(id),
    plan_name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50), -- deficit, surplus, maintenance
    caloric_target_kcal INTEGER,
    macros_pct JSONB, -- { protein: 30, carbs: 40, fats: 30 }
    meals JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. AUDIT LOGS
-- ==========================================

CREATE TABLE clinical_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthropometric_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_audit_logs ENABLE ROW LEVEL SECURITY;

-- Tenants: users can only see their own tenant
CREATE POLICY "Users can view their own tenant" ON tenants
    FOR SELECT USING (
        id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- Profiles: users can see profiles in their tenant
CREATE POLICY "Users can view profiles in their tenant" ON profiles
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- Profiles: users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Generic Tenant Isolation Policy Template (applied to all clinical tables)
-- Patients
CREATE POLICY "Tenant isolation for patients" ON patients
    FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Encounters
CREATE POLICY "Tenant isolation for encounters" ON medical_encounters
    FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Prescriptions
CREATE POLICY "Tenant isolation for prescriptions" ON prescriptions
    FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Anthropometric
CREATE POLICY "Tenant isolation for anthropometry" ON anthropometric_evaluations
    FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Nutrition Plans
CREATE POLICY "Tenant isolation for nutrition plans" ON nutrition_plans
    FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Audit Logs (Insert only, Select for admins)
CREATE POLICY "Users can insert audit logs for their tenant" ON clinical_audit_logs
    FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can view audit logs" ON clinical_audit_logs
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role IN ('tenant_admin', 'super_admin'))
    );

-- ==========================================
-- 6. TRIGGERS (updated_at & user sync)
-- ==========================================

-- Function to automatically update 'updated_at' column
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER set_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_encounters_updated_at BEFORE UPDATE ON medical_encounters FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_prescriptions_updated_at BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_anthropometry_updated_at BEFORE UPDATE ON anthropometric_evaluations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_nutrition_updated_at BEFORE UPDATE ON nutrition_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Function to sync Supabase Auth users to clinical rows (kinesys)
-- NOTE: tenant_id y role deben venir en raw_user_meta_data en signUp (onboarding de clínica).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_role TEXT;
  v_full_name TEXT;
BEGIN
  BEGIN
    v_tenant_id := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'tenant_id', '')), '')::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_tenant_id := NULL;
  END;

  v_role := COALESCE(NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'role', '')), ''), 'patient');
  v_full_name := COALESCE(
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
    'Nuevo Usuario'
  );

  -- Legacy public.profiles (nullable tenant_id) — no fallar si falta tenant
  INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
  VALUES (NEW.id, NEW.email, v_full_name, v_role, v_tenant_id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger on auth.users (runs in Supabase automatically when a user signs up)
-- NOTE: In Supabase, this trigger is attached to auth.users.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
