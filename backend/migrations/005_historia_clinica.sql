-- 005_historia_clinica.sql
-- Historia clínica (fisioterapia y nutrición) en schema kinesys

CREATE TABLE IF NOT EXISTS kinesys.historias_clinicas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES kinesys.pacientes_clinicos(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES kinesys.users(id),
    ocupacion VARCHAR(255),
    motivo_consulta TEXT,
    deporte_practica VARCHAR(255),
    nivel_deporte VARCHAR(50) CHECK (nivel_deporte IS NULL OR nivel_deporte IN ('recreativo', 'amateur', 'competitivo')),
    frecuencia_semanal VARCHAR(50),
    lesiones_anteriores TEXT,
    habitos_estilo_vida TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_kinesys_historias_tenant ON kinesys.historias_clinicas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kinesys_historias_patient ON kinesys.historias_clinicas(patient_id);

ALTER TABLE kinesys.historias_clinicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select ON kinesys.historias_clinicas;
CREATE POLICY tenant_isolation_select ON kinesys.historias_clinicas
    FOR SELECT TO authenticated
    USING (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_insert ON kinesys.historias_clinicas;
CREATE POLICY tenant_isolation_insert ON kinesys.historias_clinicas
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_update ON kinesys.historias_clinicas;
CREATE POLICY tenant_isolation_update ON kinesys.historias_clinicas
    FOR UPDATE TO authenticated
    USING (tenant_id = kinesys.current_tenant_id())
    WITH CHECK (tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_delete ON kinesys.historias_clinicas;
CREATE POLICY tenant_isolation_delete ON kinesys.historias_clinicas
    FOR DELETE TO authenticated
    USING (tenant_id = kinesys.current_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.historias_clinicas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.historias_clinicas TO service_role;

INSERT INTO kinesys.app_modules (id, name, path_route, icon, badge, display_order) VALUES
    ('mod_historia_clinica', 'Historia Clínica', '/historia-clinica', 'clinical_notes', 'HC', 10)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    path_route = EXCLUDED.path_route,
    icon = EXCLUDED.icon,
    badge = EXCLUDED.badge,
    display_order = EXCLUDED.display_order;

INSERT INTO kinesys.role_permissions (role_id, module_id) VALUES
    ('fisioterapeuta', 'mod_historia_clinica'),
    ('nutricionista', 'mod_historia_clinica'),
    ('clinic_admin', 'mod_historia_clinica'),
    ('super_admin', 'mod_historia_clinica')
ON CONFLICT DO NOTHING;
