-- 015_enforce_production_rls.sql
-- Fase 4: Auditoría de Seguridad y Supabase RLS (Ruta A)
-- Corrección de aislamiento multi-tenant para el esquema public

DO $$ 
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'pacientes_clinicos',
            'evaluaciones_antropometricas',
            'planes_nutricionales',
            'ordenes_nutricion_fhir',
            'consultas_soap',
            'prescripciones',
            'medical_records',
            'pain_observations',
            'appointments',
            'exercise_library'
        ])
    LOOP
        -- 1. Habilitar RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);

        -- 2. Crear Política SELECT
        EXECUTE format('
            CREATE POLICY "tenant_isolation_select" ON public.%I 
            FOR SELECT TO authenticated 
            USING (tenant_id = (auth.jwt()->>''tenant_id'')::uuid);
        ', t_name);

        -- 3. Crear Política INSERT
        EXECUTE format('
            CREATE POLICY "tenant_isolation_insert" ON public.%I 
            FOR INSERT TO authenticated 
            WITH CHECK (tenant_id = (auth.jwt()->>''tenant_id'')::uuid);
        ', t_name);

        -- 4. Crear Política UPDATE
        EXECUTE format('
            CREATE POLICY "tenant_isolation_update" ON public.%I 
            FOR UPDATE TO authenticated 
            USING (tenant_id = (auth.jwt()->>''tenant_id'')::uuid)
            WITH CHECK (tenant_id = (auth.jwt()->>''tenant_id'')::uuid);
        ', t_name);

        -- 5. Crear Política DELETE
        EXECUTE format('
            CREATE POLICY "tenant_isolation_delete" ON public.%I 
            FOR DELETE TO authenticated 
            USING (tenant_id = (auth.jwt()->>''tenant_id'')::uuid);
        ', t_name);

    END LOOP;
END $$;
