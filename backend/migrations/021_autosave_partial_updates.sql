-- 021_autosave_partial_updates.sql
-- Autoguardado y guardado parcial (fisioterapia y nutrición).
--   1. updated_at automático vía trigger (el cliente deja de enviarlo).
--   2. evaluaciones_antropometricas: status (draft | completed), updated_at y
--      un único borrador por paciente/nutricionista.
--   3. RPC para fusionar campos sueltos en el JSONB `data` sin sobrescribirlo.
--   4. Límite superior de estatura (alineado con patientSchema.ts: <= 300 cm).
--   5. Índices de FK en las tablas con escritura frecuente.
--
-- Todas las operaciones son idempotentes. Las políticas RLS existentes
-- (tenant_isolation_*) ya cubren UPDATE; las funciones nuevas son SECURITY
-- INVOKER para que RLS se siga aplicando al usuario autenticado.

-- ==========================================
-- 1. updated_at automático (schema kinesys)
-- ==========================================

CREATE OR REPLACE FUNCTION kinesys.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ==========================================
-- 2. evaluaciones_antropometricas: borradores
-- ==========================================

-- Default constante: PostgreSQL no reescribe la tabla; las filas existentes
-- quedan como 'completed'.
ALTER TABLE kinesys.evaluaciones_antropometricas
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'evaluaciones_antropometricas_status_check'
          AND conrelid = 'kinesys.evaluaciones_antropometricas'::regclass
    ) THEN
        ALTER TABLE kinesys.evaluaciones_antropometricas
            ADD CONSTRAINT evaluaciones_antropometricas_status_check
            CHECK (status IN ('draft', 'completed')) NOT VALID;
        -- Las filas existentes ya cumplen el check; VALIDATE usa un lock ligero.
        ALTER TABLE kinesys.evaluaciones_antropometricas
            VALIDATE CONSTRAINT evaluaciones_antropometricas_status_check;
    END IF;
END $$;

-- Un único borrador por paciente y nutricionista: evita duplicados cuando dos
-- pestañas o dos guardados concurrentes intentan crear el borrador.
CREATE UNIQUE INDEX IF NOT EXISTS uq_kinesys_antro_one_draft
    ON kinesys.evaluaciones_antropometricas (tenant_id, patient_id, nutritionist_id)
    WHERE status = 'draft';

-- Historial por paciente (columnas de RLS primero, orden por fecha).
CREATE INDEX IF NOT EXISTS idx_kinesys_antro_tenant_patient_date
    ON kinesys.evaluaciones_antropometricas (tenant_id, patient_id, evaluation_date DESC);

-- FK sin índice: borrados/actualizaciones en users escanean la tabla completa.
CREATE INDEX IF NOT EXISTS idx_kinesys_antro_nutritionist
    ON kinesys.evaluaciones_antropometricas (nutritionist_id);

-- ==========================================
-- 3. Triggers updated_at
-- ==========================================

DROP TRIGGER IF EXISTS set_updated_at ON kinesys.historias_clinicas;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON kinesys.historias_clinicas
    FOR EACH ROW EXECUTE FUNCTION kinesys.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON kinesys.evaluaciones_kinesicas;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON kinesys.evaluaciones_kinesicas
    FOR EACH ROW EXECUTE FUNCTION kinesys.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON kinesys.pacientes_clinicos;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON kinesys.pacientes_clinicos
    FOR EACH ROW EXECUTE FUNCTION kinesys.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON kinesys.evaluaciones_antropometricas;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON kinesys.evaluaciones_antropometricas
    FOR EACH ROW EXECUTE FUNCTION kinesys.set_updated_at();

-- public.patients ya tiene set_patients_updated_at (001_initial_schema.sql).

-- ==========================================
-- 4. RPC: fusión parcial del JSONB `data`
-- ==========================================
-- PATCH sobre una columna JSONB la reemplaza completa. Esta función fusiona
-- solo las claves de primer nivel recibidas (data || p_patch) y únicamente
-- sobre borradores. Es SECURITY INVOKER: RLS filtra por tenant.

CREATE OR REPLACE FUNCTION kinesys.patch_antropometria_draft(
    p_id UUID,
    p_patch JSONB
)
RETURNS SETOF kinesys.evaluaciones_antropometricas
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    UPDATE kinesys.evaluaciones_antropometricas
       SET data = data || p_patch
     WHERE id = p_id
       AND status = 'draft'
       AND jsonb_typeof(p_patch) = 'object'
    RETURNING *;
$$;

REVOKE EXECUTE ON FUNCTION kinesys.patch_antropometria_draft(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION kinesys.patch_antropometria_draft(UUID, JSONB) TO authenticated;

-- ==========================================
-- 5. Estatura: límite superior
-- ==========================================
-- NOT VALID: se aplica a escrituras nuevas sin escanear ni bloquear la tabla.
-- Tras revisar datos existentes: ALTER TABLE ... VALIDATE CONSTRAINT <nombre>;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'patients_height_max'
          AND conrelid = 'public.patients'::regclass
    ) THEN
        ALTER TABLE public.patients
            ADD CONSTRAINT patients_height_max
            CHECK (height_cm IS NULL OR height_cm <= 300) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pacientes_clinicos_height_max'
          AND conrelid = 'kinesys.pacientes_clinicos'::regclass
    ) THEN
        ALTER TABLE kinesys.pacientes_clinicos
            ADD CONSTRAINT pacientes_clinicos_height_max
            CHECK (height_cm IS NULL OR height_cm <= 300) NOT VALID;
    END IF;
END $$;

-- ==========================================
-- 6. Índices de FK (tablas con escritura frecuente)
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_kinesys_historias_professional
    ON kinesys.historias_clinicas (professional_id);

CREATE INDEX IF NOT EXISTS idx_kinesys_eval_kine_professional
    ON kinesys.evaluaciones_kinesicas (professional_id);

COMMENT ON COLUMN kinesys.evaluaciones_antropometricas.status IS
    'draft: autoguardado en curso (uno por paciente y nutricionista). completed: evaluación cerrada.';
