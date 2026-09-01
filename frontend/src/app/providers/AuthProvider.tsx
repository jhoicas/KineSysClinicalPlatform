import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Tenant, UserRole, AppModule, RolePermission } from '../../types';
import {
  supabase,
  DEFAULT_APP_MODULES,
  loadUserByAuthId,
  loadUserByEmail,
  loadTenantById,
  completeOnboarding,
} from '../../services/supabaseClient';
import { useAppStore } from '../../store/useAppStore';
import { isAuthConfigured } from '../../services/supabaseAuth';

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
  createTenantAndAdmin: (
    tenantData: Partial<Tenant>,
    adminData: Partial<User>,
    password?: string
  ) => Promise<{ tenant: Tenant; user: User }>;
  refreshAuth: () => void;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [allowedModules, setAllowedModulesState] = useState<AppModule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const setStoreAllowedModules = useAppStore((state) => state.setAllowedModules);

  const loadPermissionsForRole = useCallback(
    async (activeRole: UserRole) => {
      try {
        const { data: allModules, error: modErr } = await supabase
          .from('app_modules')
          .select('*')
          .order('display_order', { ascending: true });

        const modulesCatalog: AppModule[] =
          !modErr && allModules && allModules.length > 0 ? (allModules as AppModule[]) : DEFAULT_APP_MODULES;

        const { data: rolePerms, error: permErr } = await supabase
          .from('role_permissions')
          .select('*')
          .eq('role_id', activeRole);

        let grantedModuleIds: string[] = [];
        if (!permErr && rolePerms && rolePerms.length > 0) {
          grantedModuleIds = (rolePerms as RolePermission[]).map((rp) => rp.module_id);
        }

        const filtered = modulesCatalog
          .filter((mod) => grantedModuleIds.includes(mod.id))
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

        setAllowedModulesState(filtered);
        setStoreAllowedModules(filtered);
      } catch (err) {
        console.warn('Could not load permissions from DB:', err);
        setAllowedModulesState(DEFAULT_APP_MODULES);
        setStoreAllowedModules(DEFAULT_APP_MODULES);
      }
    },
    [setStoreAllowedModules]
  );

  const loadTenantAndUsers = useCallback(async (currentUser?: User | null) => {
    const activeUser = currentUser ?? user;
    if (!activeUser?.tenant_id) return;

    try {
      const tenantData = await loadTenantById(activeUser.tenant_id);
      if (tenantData) setTenant(tenantData);

      const { data: fetchedUsers, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', activeUser.tenant_id);
      if (!error && fetchedUsers) {
        setUsersList(fetchedUsers as User[]);
      }
    } catch (err) {
      console.warn('Could not load tenant/users from db:', err);
    }
  }, [user]);

  const verifyAndSyncAuthSession = useCallback(
    async (sessionUserId?: string | null, sessionUserEmail?: string | null) => {
      if (!isAuthConfigured()) {
        setLoading(false);
        return false;
      }

      try {
        let registeredUser: User | null = null;

        if (sessionUserId) {
          registeredUser = await loadUserByAuthId(sessionUserId);
        }
        if (!registeredUser && sessionUserEmail) {
          registeredUser = await loadUserByEmail(sessionUserEmail);
        }

        if (!registeredUser) {
          const denialMessage =
            'El correo no está registrado en la plataforma. Contacta al administrador para habilitar tu cuenta.';
          try {
            await supabase.auth.signOut();
          } catch {
            /* ignore */
          }
          sessionStorage.setItem('kinesys_auth_error', denialMessage);
          setUser(null);
          setTenant(null);
          setAllowedModulesState([]);
          setStoreAllowedModules([]);
          if (window.location.hash !== '#/login') window.location.hash = '#/login';
          return false;
        }

        if (registeredUser.is_active === false) {
          const denialMessage =
            'Tu acceso ha sido revocado por el administrador de la clínica. Contacta a soporte si crees que es un error.';
          try {
            await supabase.auth.signOut();
          } catch {
            /* ignore */
          }
          sessionStorage.setItem('kinesys_auth_error', denialMessage);
          setUser(null);
          setTenant(null);
          setAllowedModulesState([]);
          setStoreAllowedModules([]);
          if (window.location.hash !== '#/login') window.location.hash = '#/login';
          return false;
        }

        setUser(registeredUser);
        const tenantData = await loadTenantById(registeredUser.tenant_id);
        if (tenantData) setTenant(tenantData);
        await loadPermissionsForRole(registeredUser.role);
        await loadTenantAndUsers(registeredUser);
        return true;
      } catch (err) {
        console.error('[KineSys Security] Error verifying auth session:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadPermissionsForRole, loadTenantAndUsers, setStoreAllowedModules]
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (session?.user) {
        await verifyAndSyncAuthSession(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    };
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: string, session: { user?: { id?: string; email?: string } } | null) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          await verifyAndSyncAuthSession(session.user.id, session.user.email);
        }
      }
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setTenant(null);
        setAllowedModulesState([]);
        setStoreAllowedModules([]);
      }
    });

    const handleDataUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.table === 'tenants' || detail?.table === 'users' || detail?.table === 'all') {
        loadTenantAndUsers();
      }
      if (
        detail?.table === 'role_permissions' ||
        detail?.table === 'app_modules' ||
        detail?.table === 'all'
      ) {
        if (user?.role) loadPermissionsForRole(user.role);
      }
    };
    window.addEventListener('kinesys_data_updated', handleDataUpdate);

    return () => {
      window.removeEventListener('kinesys_data_updated', handleDataUpdate);
      authListener?.subscription?.unsubscribe();
    };
  }, [verifyAndSyncAuthSession, loadTenantAndUsers, loadPermissionsForRole, user?.role, setStoreAllowedModules]);

  const setUserAndRole = (selectedUserId: string) => {
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV && user?.role === 'super_admin') {
      const found = usersList.find((u) => u.id === selectedUserId);
      if (found) {
        setUser(found);
        loadPermissionsForRole(found.role);
      }
    }
  };

  const setRole = (newRole: UserRole) => {
    if (user) {
      setUser({ ...user, role: newRole });
      loadPermissionsForRole(newRole);
    }
  };

  const refreshPermissions = async () => {
    if (user?.role) await loadPermissionsForRole(user.role);
  };

  const updateTenant = async (tenantUpdates: Partial<Tenant>) => {
    if (!tenant) return;
    const { data, error } = await supabase
      .from('tenants')
      .update(tenantUpdates)
      .eq('id', tenant.id)
      .select()
      .single();
    if (!error && data) setTenant(data as Tenant);
  };

  const createTenantAndAdmin = async (
    tenantData: Partial<Tenant>,
    adminData: Partial<User>,
    password?: string
  ): Promise<{ tenant: Tenant; user: User }> => {
    if (password && adminData.email && adminData.full_name && tenantData.name) {
      const result = await completeOnboarding({
        clinicName: tenantData.name,
        slug: tenantData.slug || tenantData.name.toLowerCase().replace(/\s+/g, '-'),
        adminEmail: adminData.email,
        adminName: adminData.full_name,
        adminPhone: adminData.phone,
        adminLicense: adminData.license_number,
        adminRut: adminData.rut_or_dni,
        clinicPhone: tenantData.phone,
        clinicAddress: tenantData.address,
        subscriptionPlan: tenantData.subscription_plan || 'growth',
        maxUsers: tenantData.max_users || 5,
        password,
      });
      setTenant(result.tenant);
      setUser(result.user);
      await loadPermissionsForRole(result.user.role);
      return result;
    }
    throw new Error('Datos incompletos para crear tenant y administrador.');
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Error during Supabase signOut:', err);
    }
    setUser(null);
    setTenant(null);
    setAllowedModulesState([]);
    setStoreAllowedModules([]);
    useAppStore.getState().clearActivePatient();
  };

  const refreshAuth = () => {
    loadTenantAndUsers();
    if (user?.role) loadPermissionsForRole(user.role);
  };

  const trialEndMs = tenant?.trial_ends_at ? new Date(tenant.trial_ends_at).getTime() : Date.now() + 7 * 86400000;
  const trialDaysLeft = Math.max(0, Math.ceil((trialEndMs - Date.now()) / (1000 * 60 * 60 * 24)));
  const isTrialExpired = tenant?.subscription_status === 'trialing' && trialDaysLeft <= 0;

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'fisioterapeuta',
        tenantId: user?.tenant_id || tenant?.id || '',
        tenant,
        loading,
        isTrialExpired,
        trialDaysLeft,
        availableUsers: usersList,
        allowedModules,
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
