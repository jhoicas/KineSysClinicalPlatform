-- 009_fix_auth_onboarding_trigger.sql
-- Corrige "Database error saving new user" en registro de clínica:
-- 1) RPC para crear tenant ANTES de auth.signUp (anon no puede INSERT por RLS)
-- 2) handle_new_user lee tenant_id + role de raw_user_meta_data y escribe en kinesys.*

-- ==========================================
-- RPC: crear tenant durante onboarding (sin sesión)
-- ==========================================

CREATE OR REPLACE FUNCTION public.create_tenant_onboarding(
    p_name TEXT,
    p_slug TEXT,
    p_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_subscription_plan TEXT DEFAULT 'starter',
    p_max_users INTEGER DEFAULT 5,
    p_trial_ends_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS kinesys.tenants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kinesys, public
AS $$
DECLARE
    v_row kinesys.tenants;
    v_slug TEXT;
BEGIN
    IF p_name IS NULL OR btrim(p_name) = '' THEN
        RAISE EXCEPTION 'clinic name is required';
    END IF;

    v_slug := NULLIF(btrim(COALESCE(p_slug, '')), '');
    IF v_slug IS NULL THEN
        v_slug := lower(regexp_replace(btrim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
        v_slug := trim(BOTH '-' FROM v_slug);
        IF v_slug = '' THEN
            v_slug := 'clinica';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM kinesys.tenants t WHERE t.slug = v_slug) THEN
        v_slug := v_slug || '-' || substr(replace(uuid_generate_v4()::text, '-', ''), 1, 6);
    END IF;

    INSERT INTO kinesys.tenants (
        name,
        slug,
        timezone,
        email,
        phone,
        address,
        subscription_plan,
        subscription_status,
        max_users,
        trial_ends_at,
        is_wompi_sandbox
    ) VALUES (
        btrim(p_name),
        v_slug,
        'America/Bogota',
        NULLIF(btrim(COALESCE(p_email, '')), ''),
        NULLIF(btrim(COALESCE(p_phone, '')), ''),
        NULLIF(btrim(COALESCE(p_address, '')), ''),
        COALESCE(NULLIF(btrim(COALESCE(p_subscription_plan, '')), ''), 'starter'),
        'trialing',
        COALESCE(p_max_users, 5),
        COALESCE(p_trial_ends_at, NOW() + INTERVAL '7 days'),
        TRUE
    )
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_orphan_tenant_onboarding(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kinesys, public
AS $$
BEGIN
    IF p_tenant_id IS NULL THEN
        RETURN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM kinesys.users u WHERE u.tenant_id = p_tenant_id) THEN
        DELETE FROM kinesys.tenants WHERE id = p_tenant_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_tenant_onboarding(
    TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.delete_orphan_tenant_onboarding(UUID) TO anon, authenticated;

-- ==========================================
-- Trigger: sync auth.users → kinesys.users / profiles
-- ==========================================

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

    -- Sin tenant_id: OAuth / pending_onboarding — no abortar el INSERT de auth.users
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

CREATE OR REPLACE FUNCTION kinesys.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kinesys, public
AS $$
BEGIN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
