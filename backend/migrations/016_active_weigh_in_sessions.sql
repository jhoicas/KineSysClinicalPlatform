-- 016_active_weigh_in_sessions.sql

CREATE TABLE IF NOT EXISTS active_weigh_in_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'expired'
    metrics_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for fast lookup
CREATE INDEX IF NOT EXISTS idx_active_weigh_in_sessions_tenant_id ON active_weigh_in_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_active_weigh_in_sessions_patient_id ON active_weigh_in_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_active_weigh_in_sessions_status ON active_weigh_in_sessions(status);

-- RLS
ALTER TABLE active_weigh_in_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_weigh_in_sessions" ON active_weigh_in_sessions
    FOR ALL
    USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- Grant permissions to roles
GRANT SELECT, INSERT, UPDATE, DELETE ON active_weigh_in_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON active_weigh_in_sessions TO service_role;
