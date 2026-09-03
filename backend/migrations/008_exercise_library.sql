-- 008_exercise_library.sql
-- Banco de ejercicios por tenant + plan_tratamiento como JSONB en evaluación kinésica

CREATE TABLE IF NOT EXISTS kinesys.exercise_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    target_muscle TEXT,
    difficulty TEXT,
    series TEXT,
    reps TEXT,
    rest_time TEXT,
    frequency TEXT,
    image_url TEXT,
    biomechanical_notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_library_tenant_active
    ON kinesys.exercise_library (tenant_id, is_active)
    WHERE is_active IS TRUE;

CREATE INDEX IF NOT EXISTS idx_exercise_library_tenant_name
    ON kinesys.exercise_library (tenant_id, name);

ALTER TABLE kinesys.exercise_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select ON kinesys.exercise_library;
CREATE POLICY tenant_isolation_select ON kinesys.exercise_library
    FOR SELECT TO authenticated
    USING (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_insert ON kinesys.exercise_library;
CREATE POLICY tenant_isolation_insert ON kinesys.exercise_library
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_update ON kinesys.exercise_library;
CREATE POLICY tenant_isolation_update ON kinesys.exercise_library
    FOR UPDATE TO authenticated
    USING (tenant_id = kinesys.current_tenant_id())
    WITH CHECK (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_delete ON kinesys.exercise_library;
CREATE POLICY tenant_isolation_delete ON kinesys.exercise_library
    FOR DELETE TO authenticated
    USING (tenant_id = kinesys.current_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.exercise_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.exercise_library TO service_role;

-- El plan de tratamiento de la evaluación kinésica pasa a JSONB (objeto TreatmentPlan)
ALTER TABLE kinesys.evaluaciones_kinesicas
    ALTER COLUMN plan_tratamiento TYPE JSONB
    USING CASE
        WHEN plan_tratamiento IS NULL OR btrim(plan_tratamiento::text) = '' THEN '{}'::jsonb
        WHEN left(btrim(plan_tratamiento::text), 1) IN ('{', '[') THEN plan_tratamiento::jsonb
        ELSE jsonb_build_object('clinicalNotes', plan_tratamiento::text, 'exercises', '[]'::jsonb)
    END;

ALTER TABLE kinesys.evaluaciones_kinesicas
    ALTER COLUMN plan_tratamiento SET DEFAULT '{}'::jsonb;
