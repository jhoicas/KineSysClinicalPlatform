-- 002_rbac_schema.sql
-- Dynamic RBAC, Modules & Granular Role Permissions

-- ==========================================
-- 1. APP ROLES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS app_roles (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'super_admin', 'clinic_admin', 'fisioterapeuta', 'nutricionista', 'medico_general', 'patient'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. APP MODULES TABLE (Screens & Features)
-- ==========================================

CREATE TABLE IF NOT EXISTS app_modules (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'mod_calendario', 'mod_pacientes'
    name VARCHAR(100) NOT NULL,
    path_route VARCHAR(100) NOT NULL UNIQUE, -- e.g. '/calendario', '/pacientes'
    icon VARCHAR(50) NOT NULL, -- Material Symbols icon name
    badge VARCHAR(50),
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_modules_path_route ON app_modules(path_route);

-- ==========================================
-- 3. ROLE PERMISSIONS TABLE (Many-to-Many)
-- ==========================================

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(50) NOT NULL REFERENCES app_roles(id) ON DELETE CASCADE,
    module_id VARCHAR(50) NOT NULL REFERENCES app_modules(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (role_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_module_id ON role_permissions(module_id);

-- Add role_id foreign key or constraint to profiles if applicable
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role_id VARCHAR(50) REFERENCES app_roles(id) DEFAULT 'fisioterapeuta';
    END IF;
END $$;

-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Reading roles, modules and permissions is open to all authenticated users
CREATE POLICY "Authenticated users can view roles" ON app_roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view modules" ON app_modules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view role permissions" ON role_permissions
    FOR SELECT TO authenticated USING (true);

-- Only clinic_admin and super_admin can modify roles and permissions
CREATE POLICY "Admins can manage role permissions" ON role_permissions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('clinic_admin', 'super_admin', 'tenant_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('clinic_admin', 'super_admin', 'tenant_admin')
        )
    );

CREATE POLICY "Admins can manage modules" ON app_modules
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('clinic_admin', 'super_admin', 'tenant_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('clinic_admin', 'super_admin', 'tenant_admin')
        )
    );

-- ==========================================
-- 5. INITIAL SEED DATA
-- ==========================================

-- Seed Roles
INSERT INTO app_roles (id, name, description) VALUES
    ('super_admin', 'Super Administrador SaaS', 'Control total de la plataforma multi-tenant y configuración global.'),
    ('clinic_admin', 'Administrador de Clínica', 'Gestión integral de profesionales, agenda, finanzas y configuración de clínica.'),
    ('fisioterapeuta', 'Kinesiólogo / Fisioterapeuta', 'Atención clínica, mapa de dolor corporal, prescripción y rehabilitación física.'),
    ('nutricionista', 'Nutricionista', 'Evaluaciones antropométricas ISAK, pautas nutricionales y bioimpedancia.'),
    ('medico_general', 'Médico General', 'Consultas SOAP, emisión de recetas con firma digital y antecedentes.'),
    ('patient', 'Paciente', 'Acceso a portal de paciente, citas, recetas y pautas de tratamiento.'),
    ('receptionist', 'Recepcionista', 'Gestión de agenda, asignación de box y recepción de pacientes.')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Seed Modules
INSERT INTO app_modules (id, name, path_route, icon, badge, display_order) VALUES
    ('mod_calendario', 'Agenda & Citas', '/calendario', 'calendar_month', 'Hoy', 1),
    ('mod_pacientes', 'Pacientes', '/pacientes', 'group', 'Activos', 2),
    ('mod_mapa_dolor', 'Mapa de Dolor', '/mapa-dolor', 'accessibility_new', 'Fisio', 3),
    ('mod_nutricion', 'Nutrición & InBody', '/nutricion', 'nutrition', 'Nutri', 4),
    ('mod_medicina_general', 'Medicina General', '/medicina-general', 'stethoscope', 'Médico', 5),
    ('mod_portal_paciente', 'Portal del Paciente', '/portal-paciente', 'person', 'B2C', 6),
    ('mod_configuracion', 'Gestión de Clínica', '/configuracion', 'settings', 'Admin', 7),
    ('mod_admin_access', 'Control de Accesos RBAC', '/admin-access', 'security', 'Seguridad', 8),
    ('mod_super_admin', 'Super Admin SaaS', '/super-admin', 'shield_person', 'SaaS', 9)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, path_route = EXCLUDED.path_route, icon = EXCLUDED.icon, badge = EXCLUDED.badge, display_order = EXCLUDED.display_order;

-- Seed Permissions for each role
-- 1. super_admin: Access all modules
INSERT INTO role_permissions (role_id, module_id) VALUES
    ('super_admin', 'mod_super_admin'),
    ('super_admin', 'mod_admin_access'),
    ('super_admin', 'mod_configuracion'),
    ('super_admin', 'mod_calendario'),
    ('super_admin', 'mod_pacientes'),
    ('super_admin', 'mod_mapa_dolor'),
    ('super_admin', 'mod_nutricion'),
    ('super_admin', 'mod_medicina_general'),
    ('super_admin', 'mod_portal_paciente')
ON CONFLICT DO NOTHING;

-- 2. clinic_admin: Access clinical management, rbac, and clinical tools
INSERT INTO role_permissions (role_id, module_id) VALUES
    ('clinic_admin', 'mod_configuracion'),
    ('clinic_admin', 'mod_admin_access'),
    ('clinic_admin', 'mod_calendario'),
    ('clinic_admin', 'mod_pacientes'),
    ('clinic_admin', 'mod_mapa_dolor'),
    ('clinic_admin', 'mod_nutricion'),
    ('clinic_admin', 'mod_medicina_general')
ON CONFLICT DO NOTHING;

-- 3. fisioterapeuta: Core clinic, calendar, patients, pain map, nutrition, general medicine
INSERT INTO role_permissions (role_id, module_id) VALUES
    ('fisioterapeuta', 'mod_calendario'),
    ('fisioterapeuta', 'mod_pacientes'),
    ('fisioterapeuta', 'mod_mapa_dolor'),
    ('fisioterapeuta', 'mod_nutricion'),
    ('fisioterapeuta', 'mod_medicina_general'),
    ('fisioterapeuta', 'mod_configuracion')
ON CONFLICT DO NOTHING;

-- 4. nutricionista: Nutrition, calendar, patients, portal
INSERT INTO role_permissions (role_id, module_id) VALUES
    ('nutricionista', 'mod_nutricion'),
    ('nutricionista', 'mod_calendario'),
    ('nutricionista', 'mod_pacientes'),
    ('nutricionista', 'mod_portal_paciente')
ON CONFLICT DO NOTHING;

-- 5. medico_general: Medicine, calendar, patients, portal
INSERT INTO role_permissions (role_id, module_id) VALUES
    ('medico_general', 'mod_medicina_general'),
    ('medico_general', 'mod_calendario'),
    ('medico_general', 'mod_pacientes'),
    ('medico_general', 'mod_portal_paciente')
ON CONFLICT DO NOTHING;

-- 6. patient: Patient portal, calendar
INSERT INTO role_permissions (role_id, module_id) VALUES
    ('patient', 'mod_portal_paciente'),
    ('patient', 'mod_calendario')
ON CONFLICT DO NOTHING;

-- 7. receptionist: Calendar, patients, portal
INSERT INTO role_permissions (role_id, module_id) VALUES
    ('receptionist', 'mod_calendario'),
    ('receptionist', 'mod_pacientes'),
    ('receptionist', 'mod_portal_paciente')
ON CONFLICT DO NOTHING;
