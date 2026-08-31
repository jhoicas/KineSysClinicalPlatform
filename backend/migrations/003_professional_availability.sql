-- 003_professional_availability.sql
-- Horarios publicados por profesional y excepciones (vacaciones / días bloqueados)

CREATE TABLE IF NOT EXISTS professional_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) NOT NULL,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time VARCHAR(5) NOT NULL,
    end_time VARCHAR(5) NOT NULL,
    slot_duration INTEGER NOT NULL DEFAULT 45 CHECK (slot_duration > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professional_availability_user_id
    ON professional_availability(user_id);

CREATE INDEX IF NOT EXISTS idx_professional_availability_user_day
    ON professional_availability(user_id, day_of_week);

CREATE TABLE IF NOT EXISTS professional_availability_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) NOT NULL,
    exception_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, exception_date)
);

CREATE INDEX IF NOT EXISTS idx_professional_availability_exceptions_user_id
    ON professional_availability_exceptions(user_id);

ALTER TABLE professional_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_availability_exceptions ENABLE ROW LEVEL SECURITY;

-- Profesionales gestionan su propia disponibilidad; admins del tenant pueden leer todo
CREATE POLICY "Professionals manage own availability"
    ON professional_availability
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Professionals manage own availability exceptions"
    ON professional_availability_exceptions
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON professional_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON professional_availability_exceptions TO authenticated;
