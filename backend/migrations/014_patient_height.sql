-- Add optional patient height for the core and clinical patient records.
ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5, 2);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'patients_height_positive'
          AND conrelid = 'patients'::regclass
    ) THEN
        ALTER TABLE patients
            ADD CONSTRAINT patients_height_positive
            CHECK (height_cm IS NULL OR height_cm > 0);
    END IF;
END $$;

ALTER TABLE kinesys.pacientes_clinicos
    ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5, 2);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pacientes_clinicos_height_positive'
          AND conrelid = 'kinesys.pacientes_clinicos'::regclass
    ) THEN
        ALTER TABLE kinesys.pacientes_clinicos
            ADD CONSTRAINT pacientes_clinicos_height_positive
            CHECK (height_cm IS NULL OR height_cm > 0);
    END IF;
END $$;