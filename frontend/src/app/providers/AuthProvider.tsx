import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Tenant, UserRole, AppModule, RolePermission } from '../../types';
import { 
  INITIAL_USERS, 
  INITIAL_TENANT, 
  INITIAL_APP_MODULES, 
  INITIAL_ROLE_PERMISSIONS, 
  supabase 
} from '../../services/supabaseClient';
import { useAppStore } from '../../store/useAppStore';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  tenantId: string;
  tenant: Tenant | null;
  loading: boolean;
  isTrialExpired: boolean;
  trialDaysLeft: number;
  availableUsers: User[];
  allowedModules: AppModule[];
  setUserAndRole: (selectedUserId: string) => void;
  setRole: (role: UserRole) => void;
  signOut: () => Promise<void>;
  updateTenant: (tenant: Partial<Tenant>) => Promise<void>;
  createTenantAndAdmin: (tenantData: Partial<Tenant>, adminData: Partial<User>) => Promise<{ tenant: Tenant; user: User }>;
  refreshAuth: () => void;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usersList, setUsersList] = useState<User[]>(INITIAL_USERS);
  const [user, setUser] = useState<User | null>(() => {
    const savedUserId = localStorage.getItem('kinesys_active_user_id');
    if (!savedUserId) return INITIAL_USERS[2]; // Default to Klgo Mateo if initial demo, but if user logs out it will be null
    return INITIAL_USERS.find((u) => u.id === savedUserId) || null;
  });
  const [tenant, setTenant] = useState<Tenant | null>(INITIAL_TENANT);
  const [allowedModules, setAllowedModulesState] = useState<AppModule[]>([]);
  const [allowedRoutes, setAllowedRoutesState] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const setStoreAllowedModules = useAppStore((state) => state.setAllowedModules);

  const loadPermissionsForRole = useCallback(async (activeRole: UserRole) => {
    try {
      // 1. Fetch all modules
      const { data: allModules } = await supabase
        .from('app_modules')
        .select('*')
        .order('display_order', { ascending: true });

      const modulesCatalog: AppModule[] = allModules && allModules.length > 0 ? allModules : INITIAL_APP_MODULES;

      // 2. Fetch permissions for current role
      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_id', activeRole);

      let grantedModuleIds: string[] = [];
      if (rolePerms && rolePerms.length > 0) {
        grantedModuleIds = rolePerms.map((rp: RolePermission) => rp.module_id);
      } else {
        // Fallback to initial permissions
        grantedModuleIds = INITIAL_ROLE_PERMISSIONS
          .filter((rp) => rp.role_id === activeRole)
          .map((rp) => rp.module_id);
      }

      // Filter and sort allowed modules
      const filtered = modulesCatalog
        .filter((mod) => grantedModuleIds.includes(mod.id))
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

      setAllowedModulesState(filtered);
      const routes = filtered.map((m) => m.path_route);
      setAllowedRoutesState(routes);

      // Sync with global Zustand store
      setStoreAllowedModules(filtered);
    } catch (err) {
      console.warn('Could not load permissions from DB, using defaults:', err);
      const defaultPerms = INITIAL_ROLE_PERMISSIONS
        .filter((rp) => rp.role_id === activeRole)
        .map((rp) => rp.module_id);
      const filtered = INITIAL_APP_MODULES.filter((mod) => defaultPerms.includes(mod.id));
      setAllowedModulesState(filtered);
      setAllowedRoutesState(filtered.map((m) => m.path_route));
      setStoreAllowedModules(filtered);
    }
  }, [setStoreAllowedModules]);

  const loadTenantAndUsers = useCallback(async () => {
    try {
      const { data: tenantData } = await supabase.from('tenants').select('*').single();
      if (tenantData) {
        setTenant(tenantData);
      }
      const { data: fetchedUsers } = await supabase.from('users').select('*');
      if (fetchedUsers && fetchedUsers.length > 0) {
        setUsersList(fetchedUsers);
      }
    } catch (err) {
      console.warn('Could not load tenant/users from db:', err);
    }
  }, []);

  // Strict verification: Ensure OAuth/Session user is already registered in users DB
  const verifyAndSyncAuthSession = useCallback(async (sessionUserEmail?: string | null) => {
    if (!sessionUserEmail) return false;
    const normalizedEmail = sessionUserEmail.trim().toLowerCase();
    
    try {
      const { data: dbUsers } = await supabase.from('users').select('*');
      const allUsers = dbUsers && dbUsers.length > 0 ? dbUsers : INITIAL_USERS;
      const registeredUser = allUsers.find(
        (u: User) => u.email?.trim().toLowerCase() === normalizedEmail
      );

      if (!registeredUser) {
        console.warn(`[KineSys Security] Bloqueo OAuth: El correo ${normalizedEmail} no está registrado en la base de datos.`);
        
        // Terminate session immediately
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.warn('Error during signOut on security denial:', err);
        }

        const denialMessage = `El correo ${normalizedEmail} no está registrado en la plataforma. Contacta al administrador para habilitar tu cuenta.`;

        localStorage.removeItem('kinesys_active_user_id');
        sessionStorage.removeItem('kinesys_selected_plan');
        sessionStorage.setItem('kinesys_auth_error', denialMessage);
        
        setUser(null);
        setAllowedModulesState([]);
        setAllowedRoutesState([]);
        setStoreAllowedModules([]);
        useAppStore.getState().clearActivePatient();

        window.dispatchEvent(
          new CustomEvent('kinesys_oauth_denied', {
            detail: { email: normalizedEmail, message: denialMessage },
          })
        );

        if (window.location.hash !== '#/login' && window.location.pathname !== '/login') {
          window.location.hash = '#/login';
        }
        return false;
      } else {
        // Authorized registered user
        setUser(registeredUser);
        localStorage.setItem('kinesys_active_user_id', registeredUser.id);
        loadPermissionsForRole(registeredUser.role);
        return true;
      }
    } catch (err) {
      console.error('[KineSys Security] Error verifying auth session:', err);
      return false;
    }
  }, [loadPermissionsForRole, setStoreAllowedModules]);

  // Load tenant, users and permissions on initial mount + listen to Supabase Auth state changes
  useEffect(() => {
    loadTenantAndUsers();
    const activeRole = user?.role || 'fisioterapeuta';
    loadPermissionsForRole(activeRole);

    // 1. Verify active Supabase session on startup
    supabase.auth.getSession().then(({ data }: any) => {
      const email = data?.session?.user?.email;
      if (email) {
        verifyAndSyncAuthSession(email);
      }
    });

    // 2. Listen to Supabase Auth State Changes (OAuth post-redirect or login)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const email = session?.user?.email;
        if (email) {
          await verifyAndSyncAuthSession(email);
        }
      }
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAllowedModulesState([]);
        setAllowedRoutesState([]);
        setStoreAllowedModules([]);
      }
    });

    const handleDataUpdate = (e: any) => {
      if (
        e.detail?.table === 'tenants' || 
        e.detail?.table === 'users' || 
        e.detail?.table === 'all'
      ) {
        loadTenantAndUsers();
      }
      if (
        e.detail?.table === 'role_permissions' || 
        e.detail?.table === 'app_modules' || 
        e.detail?.table === 'app_roles' ||
        e.detail?.table === 'all'
      ) {
        const currentRole = user?.role || 'fisioterapeuta';
        loadPermissionsForRole(currentRole);
      }
    };
    window.addEventListener('kinesys_data_updated', handleDataUpdate);
    return () => {
      window.removeEventListener('kinesys_data_updated', handleDataUpdate);
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [loadTenantAndUsers, loadPermissionsForRole, verifyAndSyncAuthSession, user?.role]);

  const setUserAndRole = (selectedUserId: string) => {
    const found = usersList.find((u) => u.id === selectedUserId);
    if (found) {
      setUser(found);
      localStorage.setItem('kinesys_active_user_id', found.id);
      loadPermissionsForRole(found.role);
    }
  };

  const setRole = (newRole: UserRole) => {
    if (user) {
      const updated = { ...user, role: newRole };
      setUser(updated);
      loadPermissionsForRole(newRole);
    }
  };

  const refreshPermissions = async () => {
    const currentRole = user?.role || 'fisioterapeuta';
    await loadPermissionsForRole(currentRole);
  };

  const updateTenant = async (tenantUpdates: Partial<Tenant>) => {
    if (!tenant) return;
    const { data, error } = await supabase
      .from('tenants')
      .eq('id', tenant.id)
      .update(tenantUpdates);
    if (!error && data) {
      setTenant(data);
    }
  };

  const createTenantAndAdmin = async (
    tenantData: Partial<Tenant>, 
    adminData: Partial<User>
  ): Promise<{ tenant: Tenant; user: User }> => {
    const newTenantId = `tenant_${Date.now()}`;
    const trialEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const newTenantObj: Tenant = {
      id: newTenantId,
      name: tenantData.name || 'Nueva Clínica Kinésica',
      slug: tenantData.slug || tenantData.name?.toLowerCase().replace(/\s+/g, '-') || 'mi-clinica',
      timezone: tenantData.timezone || 'America/Bogota (UTC-5)',
      cancellation_window_hours: tenantData.cancellation_window_hours ?? 24,
      email: tenantData.email || adminData.email,
      phone: tenantData.phone || adminData.phone,
      address: tenantData.address || '',
      currency: tenantData.currency || 'COP',
      appointment_duration_minutes: tenantData.appointment_duration_minutes ?? 45,
      subscription_plan: tenantData.subscription_plan || 'starter',
      subscription_status: 'trialing',
      max_users: tenantData.subscription_plan === 'enterprise' ? 25 : (tenantData.subscription_plan === 'growth' ? 5 : 1),
      trial_ends_at: trialEnds,
      is_wompi_sandbox: true,
      created_at: new Date().toISOString(),
      ...tenantData,
    };

    const newAdminObj: User = {
      id: `user_admin_${Date.now()}`,
      email: adminData.email || 'admin@clinica.com',
      full_name: adminData.full_name || 'Administrador de Clínica',
      role: 'clinic_admin',
      phone: adminData.phone || '',
      tenant_id: newTenantId,
      license_number: adminData.license_number || '',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
      ...adminData,
    };

    // Insert into Supabase tables
    await supabase.from('tenants').insert(newTenantObj);
    await supabase.from('users').insert(newAdminObj);

    setTenant(newTenantObj);
    setUser(newAdminObj);
    localStorage.setItem('kinesys_active_user_id', newAdminObj.id);
    loadPermissionsForRole(newAdminObj.role);

    return { tenant: newTenantObj, user: newAdminObj };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Error during Supabase signOut:', err);
    }
    localStorage.removeItem('kinesys_active_user_id');
    sessionStorage.removeItem('kinesys_selected_plan');
    setUser(null);
    setAllowedModulesState([]);
    setAllowedRoutesState([]);
    setStoreAllowedModules([]);
    useAppStore.getState().clearActivePatient();
  };

  const refreshAuth = () => {
    loadTenantAndUsers();
    if (user?.role) {
      loadPermissionsForRole(user.role);
    }
  };

  // Trial Calculations
  const trialEndMs = tenant?.trial_ends_at ? new Date(tenant.trial_ends_at).getTime() : Date.now() + 7 * 86400000;
  const nowMs = Date.now();
  const trialDaysLeft = Math.max(0, Math.ceil((trialEndMs - nowMs) / (1000 * 60 * 60 * 24)));
  const isTrialExpired = tenant?.subscription_status === 'trialing' && trialDaysLeft <= 0;

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'fisioterapeuta',
        tenantId: user?.tenant_id || tenant?.id || 'tenant_kine_001',
        tenant,
        loading,
        isTrialExpired,
        trialDaysLeft,
        availableUsers: usersList,
        allowedModules,
        allowedRoutes,
        setUserAndRole,
        setRole,
        signOut,
        updateTenant,
        createTenantAndAdmin,
        refreshAuth,
        refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

