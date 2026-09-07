-- Alcance multi-tenant para ejercicios personalizados.
ALTER TABLE kinesys.exercises
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES kinesys.tenants(id) ON DELETE CASCADE;

ALTER TABLE kinesys.exercises
    DROP CONSTRAINT IF EXISTS exercises_custom_tenant_check;
ALTER TABLE kinesys.exercises
    ADD CONSTRAINT exercises_custom_tenant_check CHECK (is_system OR tenant_id IS NOT NULL);

DROP POLICY IF EXISTS exercises_select_catalog ON kinesys.exercises;
CREATE POLICY exercises_select_catalog ON kinesys.exercises
    FOR SELECT TO authenticated
    USING (
        tenant_id = kinesys.current_tenant_id()
        AND (is_system IS TRUE OR user_id = (select auth.uid()))
    );

DROP POLICY IF EXISTS exercises_insert_owned ON kinesys.exercises;
CREATE POLICY exercises_insert_owned ON kinesys.exercises
    FOR INSERT TO authenticated
    WITH CHECK (
        is_system IS FALSE
        AND user_id = (select auth.uid())
        AND tenant_id = kinesys.current_tenant_id()
    );

DROP POLICY IF EXISTS exercises_update_owned ON kinesys.exercises;
CREATE POLICY exercises_update_owned ON kinesys.exercises
    FOR UPDATE TO authenticated
    USING (is_system IS FALSE AND user_id = (select auth.uid()) AND tenant_id = kinesys.current_tenant_id())
    WITH CHECK (is_system IS FALSE AND user_id = (select auth.uid()) AND tenant_id = kinesys.current_tenant_id());

DROP POLICY IF EXISTS exercises_delete_owned ON kinesys.exercises;
CREATE POLICY exercises_delete_owned ON kinesys.exercises
    FOR DELETE TO authenticated
    USING (is_system IS FALSE AND user_id = (select auth.uid()) AND tenant_id = kinesys.current_tenant_id());

CREATE INDEX IF NOT EXISTS idx_exercises_tenant_name
    ON kinesys.exercises (tenant_id, name);