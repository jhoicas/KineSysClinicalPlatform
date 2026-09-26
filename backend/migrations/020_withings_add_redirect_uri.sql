-- 020_withings_add_redirect_uri.sql
-- Agrega columna redirect_uri y permite credenciales previas a la autenticación OAuth

ALTER TABLE kinesys.withings_integrations ADD COLUMN IF NOT EXISTS redirect_uri TEXT;

-- Permitir valores nulos o vacíos en tokens y withings_user_id antes de que el usuario haga OAuth
ALTER TABLE kinesys.withings_integrations ALTER COLUMN withings_user_id DROP NOT NULL;
ALTER TABLE kinesys.withings_integrations ALTER COLUMN access_token DROP NOT NULL;
ALTER TABLE kinesys.withings_integrations ALTER COLUMN refresh_token DROP NOT NULL;
ALTER TABLE kinesys.withings_integrations ALTER COLUMN expires_at DROP NOT NULL;

-- Asegurar restricción única para (tenant_id, nutritionist_id) para soportar UPSERT de credenciales por nutricionista
CREATE UNIQUE INDEX IF NOT EXISTS uq_withings_integrations_tenant_nutritionist
    ON kinesys.withings_integrations(tenant_id, nutritionist_id);
