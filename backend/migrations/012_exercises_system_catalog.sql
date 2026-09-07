-- Catálogo global de ejercicios sincronizado desde Wger y ExerciseDB.
CREATE TABLE IF NOT EXISTS kinesys.exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'mobility',
    media_url TEXT NOT NULL DEFAULT '',
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    author_attribution TEXT NOT NULL DEFAULT '',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_muscle TEXT,
    difficulty TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT exercises_system_owner_check CHECK (is_system OR user_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_exercises_system_category
    ON kinesys.exercises (category, name)
    WHERE is_system IS TRUE;

ALTER TABLE kinesys.exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exercises_select_catalog ON kinesys.exercises;
CREATE POLICY exercises_select_catalog ON kinesys.exercises
    FOR SELECT TO authenticated
    USING (is_system IS TRUE OR user_id = (select auth.uid()));

DROP POLICY IF EXISTS exercises_insert_owned ON kinesys.exercises;
CREATE POLICY exercises_insert_owned ON kinesys.exercises
    FOR INSERT TO authenticated
    WITH CHECK (is_system IS FALSE AND user_id = (select auth.uid()));

DROP POLICY IF EXISTS exercises_update_owned ON kinesys.exercises;
CREATE POLICY exercises_update_owned ON kinesys.exercises
    FOR UPDATE TO authenticated
    USING (is_system IS FALSE AND user_id = (select auth.uid()))
    WITH CHECK (is_system IS FALSE AND user_id = (select auth.uid()));

DROP POLICY IF EXISTS exercises_delete_owned ON kinesys.exercises;
CREATE POLICY exercises_delete_owned ON kinesys.exercises
    FOR DELETE TO authenticated
    USING (is_system IS FALSE AND user_id = (select auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.exercises TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.exercises TO service_role;