-- 018_fix_active_weigh_in_sessions_rls.sql
-- Deshabilitar RLS en active_weigh_in_sessions para permitir que webhooks y polling de hardware
-- sincronicen sin bloqueos de contexto de usuario.

ALTER TABLE kinesys.active_weigh_in_sessions DISABLE ROW LEVEL SECURITY;

GRANT ALL ON kinesys.active_weigh_in_sessions TO postgres;
GRANT ALL ON kinesys.active_weigh_in_sessions TO authenticated;
GRANT ALL ON kinesys.active_weigh_in_sessions TO service_role;
GRANT ALL ON kinesys.active_weigh_in_sessions TO anon;
