-- 006_evaluacion_kinesica.sql
-- Bitácora de evaluaciones kinésicas (postura, movilidad, fuerza, gestos)

CREATE TABLE IF NOT EXISTS kinesys.evaluaciones_kinesicas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES kinesys.pacientes_clinicos(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES kinesys.users(id),
    postura JSONB NOT NULL DEFAULT '{}'::jsonb,
    movilidad JSONB NOT NULL DEFAULT '[]'::jsonb,
    fuerza JSONB NOT NULL DEFAULT '[]'::jsonb,
    gestos_movimiento JSONB NOT NULL DEFAULT '[]'::jsonb,
    diagnostico_kinesico TEXT,
    plan_tratamiento TEXT,
    observaciones_generales TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kinesys_eval_kine_patient_created
    ON kinesys.evaluaciones_kinesicas (tenant_id, patient_id, created_at DESC);

ALTER TABLE kinesys.evaluaciones_kinesicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select ON kinesys.evaluaciones_kinesicas;
CREATE POLICY tenant_isolation_select ON kinesys.evaluaciones_kinesicas
    FOR SELECT TO authenticated
    USING (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_insert ON kinesys.evaluaciones_kinesicas;
CREATE POLICY tenant_isolation_insert ON kinesys.evaluaciones_kinesicas
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_update ON kinesys.evaluaciones_kinesicas;
CREATE POLICY tenant_isolation_update ON kinesys.evaluaciones_kinesicas
    FOR UPDATE TO authenticated
    USING (tenant_id = kinesys.current_tenant_id())
    WITH CHECK (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_delete ON kinesys.evaluaciones_kinesicas;
CREATE POLICY tenant_isolation_delete ON kinesys.evaluaciones_kinesicas
    FOR DELETE TO authenticated
    USING (tenant_id = kinesys.current_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.evaluaciones_kinesicas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.evaluaciones_kinesicas TO service_role;

INSERT INTO kinesys.app_modules (id, name, path_route, icon, badge, display_order) VALUES
    ('mod_evaluacion_kinesica', 'Evaluación Kinésica', '/evaluacion-kinesica', 'physical_therapy', 'Eval', 11)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    path_route = EXCLUDED.path_route,
    icon = EXCLUDED.icon,
    badge = EXCLUDED.badge,
    display_order = EXCLUDED.display_order;

INSERT INTO kinesys.role_permissions (role_id, module_id) VALUES
    ('fisioterapeuta', 'mod_evaluacion_kinesica'),
    ('clinic_admin', 'mod_evaluacion_kinesica'),
    ('super_admin', 'mod_evaluacion_kinesica')
ON CONFLICT DO NOTHING;
