import React, { useState } from 'react';

export const NutritionSqlMigrationTab: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const sqlMigrationCode = `-- ==============================================================================
-- FASE 2: MIGRACIÓN SUPABASE / POSTGRESQL PARA PERFIL NUTRICIONISTA & METABÓLICO
-- Módulos: Evaluaciones Antropométricas (Mifflin-St Jeor, Pliegues, Perímetros),
--          Planes Nutricionales & Órdenes Dietoterapéuticas FHIR R4 (NutritionOrder)
-- Multi-Tenancy estricto & Row Level Security (RLS) habilitado.
-- ==============================================================================

-- 1. EXTENSIONES Y FUNCIONES AUXILIARES (Si no existen)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: EVALUACIONES ANTROPOMÉTRICAS Y TERMODINÁMICA METABÓLICA
CREATE TABLE IF NOT EXISTS public.evaluaciones_antropometricas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES public.pacientes_clinicos(id) ON DELETE CASCADE,
    nutritionist_id TEXT NOT NULL,
    evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Parámetros biométricos base
    age INTEGER NOT NULL CHECK (age >= 0),
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    weight_kg NUMERIC(5,2) NOT NULL CHECK (weight_kg > 0),
    height_cm NUMERIC(5,2) NOT NULL CHECK (height_cm > 0),
    activity_factor NUMERIC(3,2) NOT NULL DEFAULT 1.375, -- Factor PAL (1.2 - 1.9)
    
    -- Pliegues cutáneos (Plicómetro en mm)
    skinfold_triceps_mm NUMERIC(4,1) NOT NULL,
    skinfold_subscapular_mm NUMERIC(4,1) NOT NULL,
    skinfold_suprailiac_mm NUMERIC(4,1) NOT NULL,
    skinfold_abdominal_mm NUMERIC(4,1) NOT NULL,
    skinfold_biceps_mm NUMERIC(4,1),
    skinfold_thigh_mm NUMERIC(4,1),
    skinfold_calf_mm NUMERIC(4,1),
    
    -- Perímetros antropométricos (Cinta métrica en cm)
    waist_cm NUMERIC(5,1) NOT NULL,
    hip_cm NUMERIC(5,1) NOT NULL,
    relaxed_arm_cm NUMERIC(4,1),
    contracted_arm_cm NUMERIC(4,1),
    thigh_cm NUMERIC(4,1),
    calf_cm NUMERIC(4,1),
    neck_cm NUMERIC(4,1),
    
    -- Cálculos termodinámicos computacionales
    bmi NUMERIC(4,1) NOT NULL,
    bmr_kcal INTEGER NOT NULL, -- Mifflin-St Jeor equation result
    tdee_kcal INTEGER NOT NULL, -- Total Daily Energy Expenditure (BMR * PAL)
    waist_hip_ratio NUMERIC(3,2) NOT NULL,
    body_fat_percentage NUMERIC(4,1) NOT NULL, -- Durnin & Womersley / Siri formula
    fat_mass_kg NUMERIC(5,2) NOT NULL,
    fat_free_mass_kg NUMERIC(5,2) NOT NULL,
    cardiovascular_risk_level TEXT NOT NULL CHECK (cardiovascular_risk_level IN ('bajo', 'moderado', 'alto', 'muy_alto')),
    
    clinical_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_antropo_tenant_patient ON public.evaluaciones_antropometricas(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_antropo_date ON public.evaluaciones_antropometricas(evaluation_date DESC);

-- 3. TABLA: PLANES NUTRICIONALES Y MENÚS TERAPÉUTICOS
CREATE TABLE IF NOT EXISTS public.planes_nutricionales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES public.pacientes_clinicos(id) ON DELETE CASCADE,
    nutritionist_id TEXT NOT NULL,
    nutritionist_name TEXT,
    plan_name TEXT NOT NULL,
    plan_type TEXT NOT NULL DEFAULT 'terapeutico_clinico',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
    
    -- Objetivos energéticos y macronutrientes
    caloric_target_kcal INTEGER NOT NULL CHECK (caloric_target_kcal > 500),
    macros_target JSONB NOT NULL, -- {protein_grams, protein_pct, carbs_grams, carbs_pct, fats_grams, fats_pct, sodium_mg_max}
    
    -- Estructura de tiempos de comida y alimentos
    meals JSONB NOT NULL, -- Array de tiempos de comida con sus items calculados
    
    -- Restricciones clínicas y enlace FHIR
    clinical_restrictions TEXT[] DEFAULT '{}',
    active_fhir_order_id TEXT,
    
    notes_and_recommendations TEXT,
    hydration_target_liters NUMERIC(3,1) DEFAULT 2.5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_planes_tenant_patient ON public.planes_nutricionales(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_planes_status ON public.planes_nutricionales(status);

-- 4. TABLA: ÓRDENES DIETÉTICAS FHIR R4 (NutritionOrder)
CREATE TABLE IF NOT EXISTS public.ordenes_nutricion_fhir (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES public.pacientes_clinicos(id) ON DELETE CASCADE,
    practitioner_id TEXT NOT NULL,
    practitioner_name TEXT NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'revoked')),
    diet_category TEXT NOT NULL DEFAULT 'therapeutic',
    clinical_indication TEXT NOT NULL,
    restrictions JSONB NOT NULL DEFAULT '[]',
    oral_diet_details JSONB NOT NULL DEFAULT '{}',
    fhir_json JSONB, -- Payload canónico HL7 FHIR R4 resourceType: NutritionOrder
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_fhir_orders_tenant_patient ON public.ordenes_nutricion_fhir(tenant_id, patient_id);

-- ==============================================================================
-- 5. POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS) MULTITENANT
-- ==============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.evaluaciones_antropometricas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes_nutricionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_nutricion_fhir ENABLE ROW LEVEL SECURITY;

-- Políticas para Evaluaciones Antropométricas
CREATE POLICY "evaluaciones_antropometricas_tenant_isolation" ON public.evaluaciones_antropometricas
    FOR ALL
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
        OR (auth.jwt() ->> 'role') = 'super_admin'
    )
    WITH CHECK (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
        OR (auth.jwt() ->> 'role') = 'super_admin'
    );

-- Políticas para Planes Nutricionales
CREATE POLICY "planes_nutricionales_tenant_isolation" ON public.planes_nutricionales
    FOR ALL
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
        OR (auth.jwt() ->> 'role') = 'super_admin'
    )
    WITH CHECK (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
        OR (auth.jwt() ->> 'role') = 'super_admin'
    );

-- Políticas para Órdenes FHIR NutritionOrder
CREATE POLICY "ordenes_nutricion_fhir_tenant_isolation" ON public.ordenes_nutricion_fhir
    FOR ALL
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
        OR (auth.jwt() ->> 'role') = 'super_admin'
    )
    WITH CHECK (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
        OR (auth.jwt() ->> 'role') = 'super_admin'
    );
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlMigrationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 clinical-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-primary-fixed/40 text-primary font-bold border border-primary-fixed-dim">
              <span className="material-symbols-outlined text-lg">database</span>
            </span>
            <h2 className="text-sm font-black text-on-surface">
              Script de Migración SQL para Supabase (PostgreSQL + RLS)
            </h2>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Tablas estructuradas para <code>evaluaciones_antropometricas</code>, <code>planes_nutricionales</code> y <code>ordenes_nutricion_fhir</code> con aislamiento multi-tenant estricto.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-primary hover:bg-primary-container text-white font-extrabold text-xs rounded-2xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-base">
            {copied ? 'check' : 'content_copy'}
          </span>
          <span>{copied ? '¡Copiado al portapapeles!' : 'Copiar Script SQL'}</span>
        </button>
      </div>

      <div className="bg-surface-container-highest/60 p-5 rounded-3xl border border-outline-variant/30 text-xs font-mono overflow-x-auto max-h-[600px] leading-relaxed">
        <pre className="text-on-surface">{sqlMigrationCode}</pre>
      </div>
    </div>
  );
};
