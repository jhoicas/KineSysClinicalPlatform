-- 017_withings_oauth_tokens.sql
-- Persistencia de tokens OAuth2 para integración Withings

CREATE TABLE IF NOT EXISTS kinesys.withings_oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES kinesys.pacientes_clinicos(id) ON DELETE SET NULL,
    userid VARCHAR(100) NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withings_oauth_tokens_patient_id ON kinesys.withings_oauth_tokens(patient_id);
CREATE INDEX IF NOT EXISTS idx_withings_oauth_tokens_userid ON kinesys.withings_oauth_tokens(userid);
CREATE INDEX IF NOT EXISTS idx_withings_oauth_tokens_tenant_id ON kinesys.withings_oauth_tokens(tenant_id);

-- RLS
ALTER TABLE kinesys.withings_oauth_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_withings_oauth_tokens ON kinesys.withings_oauth_tokens;
CREATE POLICY tenant_isolation_withings_oauth_tokens ON kinesys.withings_oauth_tokens
    FOR ALL
    USING (
        tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.withings_oauth_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.withings_oauth_tokens TO service_role;
