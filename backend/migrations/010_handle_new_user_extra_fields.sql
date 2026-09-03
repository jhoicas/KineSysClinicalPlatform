-- 010_handle_new_user_extra_fields.sql
-- Extiende handle_new_user para persistir phone / license_number / rut_or_dni desde metadata.
-- Aplicar si ya corriste 009; es idempotente (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, kinesys
AS $$
DECLARE
    v_tenant_id UUID;
    v_role TEXT;
    v_full_name TEXT;
    v_phone TEXT;
    v_license TEXT;
    v_rut TEXT;
BEGIN
    BEGIN
        v_tenant_id := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'tenant_id', '')), '')::uuid;
    EXCEPTION
        WHEN invalid_text_representation THEN
            v_tenant_id := NULL;
    END;

    v_role := lower(COALESCE(NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'role', '')), ''), 'patient'));
    IF v_role IN ('clinic_admin', 'tenant_admin', 'admin', 'clinicadmin') THEN
        v_role := 'clinic_admin';
    END IF;

    v_full_name := COALESCE(
        NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
        split_part(COALESCE(NEW.email, 'usuario'), '@', 1)
    );
    v_phone := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
    v_license := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'license_number', '')), '');
    v_rut := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'rut_or_dni', '')), '');

    IF v_tenant_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO kinesys.users (
        id, tenant_id, email, full_name, role, phone, license_number, rut_or_dni, is_active
    )
    VALUES (
        NEW.id, v_tenant_id, NEW.email, v_full_name, v_role, v_phone, v_license, v_rut, TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        phone = COALESCE(EXCLUDED.phone, kinesys.users.phone),
        license_number = COALESCE(EXCLUDED.license_number, kinesys.users.license_number),
        rut_or_dni = COALESCE(EXCLUDED.rut_or_dni, kinesys.users.rut_or_dni),
        is_active = TRUE,
        updated_at = NOW();

    INSERT INTO kinesys.profiles (id, tenant_id, email, full_name, role, is_active)
    VALUES (NEW.id, v_tenant_id, NEW.email, v_full_name, v_role, TRUE)
    ON CONFLICT (id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = TRUE,
        updated_at = NOW();

    RETURN NEW;
END;
$$;
