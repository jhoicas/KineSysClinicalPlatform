-- 019_withings_multi_tenant_integrations.sql
-- Arquitectura Multi-Tenant y OAuth para Básculas Withings

CREATE TABLE IF NOT EXISTS kinesys.withings_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    nutritionist_id UUID NOT NULL REFERENCES kinesys.users(id) ON DELETE CASCADE,
    withings_user_id VARCHAR(100) NOT NULL UNIQUE,
    client_id TEXT,
    client_secret TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para búsquedas de alta concurrencia
CREATE INDEX IF NOT EXISTS idx_withings_integrations_tenant_id ON kinesys.withings_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_withings_integrations_nutritionist_id ON kinesys.withings_integrations(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_withings_integrations_withings_user_id ON kinesys.withings_integrations(withings_user_id);
CREATE INDEX IF NOT EXISTS idx_withings_integrations_tenant_nutri ON kinesys.withings_integrations(tenant_id, nutritionist_id);

-- Agregar nutritionist_id a active_weigh_in_sessions para soporte multi-nutricionista
ALTER TABLE kinesys.active_weigh_in_sessions 
ADD COLUMN IF NOT EXISTS nutritionist_id UUID REFERENCES kinesys.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_active_weigh_in_sessions_tenant_nutri ON kinesys.active_weigh_in_sessions(tenant_id, nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_active_weigh_in_sessions_nutritionist_id ON kinesys.active_weigh_in_sessions(nutritionist_id);

-- RLS y Permisos
ALTER TABLE kinesys.withings_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_withings_integrations ON kinesys.withings_integrations;
CREATE POLICY tenant_isolation_withings_integrations ON kinesys.withings_integrations
    FOR ALL
    USING (
        tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.withings_integrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.withings_integrations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.withings_integrations TO postgres;
GRANT ALL ON kinesys.withings_integrations TO anon;
