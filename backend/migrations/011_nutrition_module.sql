-- 011_nutrition_module.sql
-- Fase 1 (PLAN_NUTRICION): nutrition_evaluations, diet_plans, diet_meals, diet_items + RLS

-- ==========================================
-- ENUM: origen de la evaluación (multi-hardware)
-- ==========================================

DO $$
BEGIN
    CREATE TYPE kinesys.nutrition_eval_source AS ENUM (
        'MANUAL_ISAK',
        'WITHINGS',
        'INBODY'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- 1.1 nutrition_evaluations
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.nutrition_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES kinesys.pacientes_clinicos(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES kinesys.users(id) ON DELETE SET NULL,
    evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source kinesys.nutrition_eval_source NOT NULL DEFAULT 'MANUAL_ISAK',
    -- Métricas globales
    weight_kg NUMERIC(8, 3),
    height_cm NUMERIC(6, 2),
    body_fat_pct NUMERIC(5, 2),
    visceral_fat_index NUMERIC(6, 2),
    bmr NUMERIC(8, 2),
    -- Payloads flexibles multi-hardware / ISAK
    measurements_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    segmental_composition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    somatotype_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT nutrition_evaluations_weight_positive
        CHECK (weight_kg IS NULL OR weight_kg > 0),
    CONSTRAINT nutrition_evaluations_height_positive
        CHECK (height_cm IS NULL OR height_cm > 0),
    CONSTRAINT nutrition_evaluations_bf_range
        CHECK (body_fat_pct IS NULL OR (body_fat_pct >= 0 AND body_fat_pct <= 100))
);

CREATE INDEX IF NOT EXISTS idx_nutrition_eval_tenant_patient_date
    ON kinesys.nutrition_evaluations (tenant_id, patient_id, evaluation_date DESC);

CREATE INDEX IF NOT EXISTS idx_nutrition_eval_tenant_source
    ON kinesys.nutrition_evaluations (tenant_id, source);

CREATE INDEX IF NOT EXISTS idx_nutrition_eval_measurements_gin
    ON kinesys.nutrition_evaluations USING GIN (measurements_json);

COMMENT ON TABLE kinesys.nutrition_evaluations IS
    'Evaluaciones antropométricas tri-modales (ISAK / Withings / InBody).';
COMMENT ON COLUMN kinesys.nutrition_evaluations.evaluation_date IS
    'Fecha clínica de la medición (campo "date" del plan).';
COMMENT ON COLUMN kinesys.nutrition_evaluations.measurements_json IS
    'Pliegues, perímetros y diámetros ISAK (u origen manual).';
COMMENT ON COLUMN kinesys.nutrition_evaluations.segmental_composition_json IS
    'Composición segmental (brazos, piernas, tronco) desde hardware o cálculo.';
COMMENT ON COLUMN kinesys.nutrition_evaluations.somatotype_json IS
    'Somatotipo Heath-Carter: endo, meso, ecto.';

-- ==========================================
-- 1.2 diet_plans / diet_meals / diet_items
-- ==========================================

CREATE TABLE IF NOT EXISTS kinesys.diet_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES kinesys.pacientes_clinicos(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES kinesys.users(id) ON DELETE SET NULL,
    evaluation_id UUID REFERENCES kinesys.nutrition_evaluations(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    target_kcal NUMERIC(10, 2),
    total_kcal NUMERIC(10, 2) DEFAULT 0,
    total_cost NUMERIC(12, 2) DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT diet_plans_target_kcal_nonneg
        CHECK (target_kcal IS NULL OR target_kcal >= 0),
    CONSTRAINT diet_plans_total_kcal_nonneg
        CHECK (total_kcal IS NULL OR total_kcal >= 0),
    CONSTRAINT diet_plans_total_cost_nonneg
        CHECK (total_cost IS NULL OR total_cost >= 0)
);

CREATE INDEX IF NOT EXISTS idx_diet_plans_tenant_patient
    ON kinesys.diet_plans (tenant_id, patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_diet_plans_tenant_active
    ON kinesys.diet_plans (tenant_id, is_active)
    WHERE is_active IS TRUE;

COMMENT ON TABLE kinesys.diet_plans IS
    'Planes dietéticos por paciente; totales de kcal y costo se recalculan en Fase 2.';

CREATE TABLE IF NOT EXISTS kinesys.diet_meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES kinesys.diet_plans(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT diet_meals_order_nonneg CHECK (order_index >= 0)
);

CREATE INDEX IF NOT EXISTS idx_diet_meals_plan_order
    ON kinesys.diet_meals (plan_id, order_index);

CREATE INDEX IF NOT EXISTS idx_diet_meals_tenant
    ON kinesys.diet_meals (tenant_id);

COMMENT ON TABLE kinesys.diet_meals IS
    'Comidas del plan (Desayuno, Almuerzo, Cena, Snacks, etc.).';

CREATE TABLE IF NOT EXISTS kinesys.diet_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    meal_id UUID NOT NULL REFERENCES kinesys.diet_meals(id) ON DELETE CASCADE,
    food_id VARCHAR(50) NOT NULL REFERENCES kinesys.food_catalog(id),
    portion_g NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT diet_items_portion_positive CHECK (portion_g > 0)
);

CREATE INDEX IF NOT EXISTS idx_diet_items_meal
    ON kinesys.diet_items (meal_id);

CREATE INDEX IF NOT EXISTS idx_diet_items_food
    ON kinesys.diet_items (food_id);

CREATE INDEX IF NOT EXISTS idx_diet_items_tenant
    ON kinesys.diet_items (tenant_id);

COMMENT ON TABLE kinesys.diet_items IS
    'Ítems de comida vinculados al catálogo TCA (food_catalog).';
COMMENT ON COLUMN kinesys.diet_items.portion_g IS
    'Porción en gramos; base 100 g para regla de tres de macros/costo.';

-- ==========================================
-- 1.3 RLS — aislamiento por tenant_id
-- ==========================================

ALTER TABLE kinesys.nutrition_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.diet_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesys.diet_items ENABLE ROW LEVEL SECURITY;

-- nutrition_evaluations
DROP POLICY IF EXISTS tenant_isolation_select ON kinesys.nutrition_evaluations;
CREATE POLICY tenant_isolation_select ON kinesys.nutrition_evaluations
    FOR SELECT TO authenticated
    USING (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_insert ON kinesys.nutrition_evaluations;
CREATE POLICY tenant_isolation_insert ON kinesys.nutrition_evaluations
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_update ON kinesys.nutrition_evaluations;
CREATE POLICY tenant_isolation_update ON kinesys.nutrition_evaluations
    FOR UPDATE TO authenticated
    USING (tenant_id = kinesys.current_tenant_id())
    WITH CHECK (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_delete ON kinesys.nutrition_evaluations;
CREATE POLICY tenant_isolation_delete ON kinesys.nutrition_evaluations
    FOR DELETE TO authenticated
    USING (tenant_id = kinesys.current_tenant_id());

-- diet_plans
DROP POLICY IF EXISTS tenant_isolation_select ON kinesys.diet_plans;
CREATE POLICY tenant_isolation_select ON kinesys.diet_plans
    FOR SELECT TO authenticated
    USING (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_insert ON kinesys.diet_plans;
CREATE POLICY tenant_isolation_insert ON kinesys.diet_plans
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_update ON kinesys.diet_plans;
CREATE POLICY tenant_isolation_update ON kinesys.diet_plans
    FOR UPDATE TO authenticated
    USING (tenant_id = kinesys.current_tenant_id())
    WITH CHECK (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_delete ON kinesys.diet_plans;
CREATE POLICY tenant_isolation_delete ON kinesys.diet_plans
    FOR DELETE TO authenticated
    USING (tenant_id = kinesys.current_tenant_id());

-- diet_meals
DROP POLICY IF EXISTS tenant_isolation_select ON kinesys.diet_meals;
CREATE POLICY tenant_isolation_select ON kinesys.diet_meals
    FOR SELECT TO authenticated
    USING (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_insert ON kinesys.diet_meals;
CREATE POLICY tenant_isolation_insert ON kinesys.diet_meals
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_update ON kinesys.diet_meals;
CREATE POLICY tenant_isolation_update ON kinesys.diet_meals
    FOR UPDATE TO authenticated
    USING (tenant_id = kinesys.current_tenant_id())
    WITH CHECK (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_delete ON kinesys.diet_meals;
CREATE POLICY tenant_isolation_delete ON kinesys.diet_meals
    FOR DELETE TO authenticated
    USING (tenant_id = kinesys.current_tenant_id());

-- diet_items
DROP POLICY IF EXISTS tenant_isolation_select ON kinesys.diet_items;
CREATE POLICY tenant_isolation_select ON kinesys.diet_items
    FOR SELECT TO authenticated
    USING (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_insert ON kinesys.diet_items;
CREATE POLICY tenant_isolation_insert ON kinesys.diet_items
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_update ON kinesys.diet_items;
CREATE POLICY tenant_isolation_update ON kinesys.diet_items
    FOR UPDATE TO authenticated
    USING (tenant_id = kinesys.current_tenant_id())
    WITH CHECK (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_delete ON kinesys.diet_items;
CREATE POLICY tenant_isolation_delete ON kinesys.diet_items
    FOR DELETE TO authenticated
    USING (tenant_id = kinesys.current_tenant_id());

-- Grants (API Data / roles)
GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.nutrition_evaluations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.diet_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.diet_meals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.diet_items TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.nutrition_evaluations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.diet_plans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.diet_meals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.diet_items TO service_role;

-- Uso del enum desde clientes autenticados
GRANT USAGE ON TYPE kinesys.nutrition_eval_source TO authenticated;
GRANT USAGE ON TYPE kinesys.nutrition_eval_source TO service_role;
