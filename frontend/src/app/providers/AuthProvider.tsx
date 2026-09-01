import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import type { Session } from '@supabase/supabase-js';
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
import { isAuthConfigured, supabaseAuthClient } from '../../services/supabaseAuth';

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

function usersEqual(a: User | null, b: User | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id && a.role === b.role && a.tenant_id === b.tenant_id && a.is_active === b.is_active;
}

function tenantsEqual(a: Tenant | null, b: Tenant | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [allowedModules, setAllowedModulesState] = useState<AppModule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const setStoreAllowedModules = useAppStore((state) => state.setAllowedModules);

  const userRef = useRef<User | null>(null);
  const syncingRef = useRef(false);
  const lastSyncedAuthIdRef = useRef<string | null>(null);
  const isSigningOutRef = useRef(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

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

        setAllowedModulesState((prev) => {
          const prevIds = prev.map((m) => m.id).join(',');
          const nextIds = filtered.map((m) => m.id).join(',');
          if (prevIds === nextIds) return prev;
          return filtered;
        });
        setStoreAllowedModules(filtered);
      } catch (err) {
        console.warn('Could not load permissions from DB:', err);
        setAllowedModulesState(DEFAULT_APP_MODULES);
        setStoreAllowedModules(DEFAULT_APP_MODULES);
      }
    },
    [setStoreAllowedModules]
  );

  const loadTenantAndUsers = useCallback(async (activeUser: User) => {
    if (!activeUser.tenant_id) return;

    try {
      const tenantData = await loadTenantById(activeUser.tenant_id);
      if (tenantData) {
        setTenant((prev) => (tenantsEqual(prev, tenantData) ? prev : tenantData));
      }

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
  }, []);

  const clearAuthState = useCallback(() => {
    setUser((prev) => (prev === null ? prev : null));
    setTenant((prev) => (prev === null ? prev : null));
    setAllowedModulesState((prev) => (prev.length === 0 ? prev : []));
    setStoreAllowedModules([]);
    lastSyncedAuthIdRef.current = null;
  }, [setStoreAllowedModules]);

  const denyAccess = useCallback(
    async (denialMessage: string) => {
      sessionStorage.setItem('kinesys_auth_error', denialMessage);
      clearAuthState();
      if (!isSigningOutRef.current) {
        isSigningOutRef.current = true;
        try {
          await supabaseAuthClient?.auth.signOut();
        } catch {
          /* ignore */
        } finally {
          isSigningOutRef.current = false;
        }
      }
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login';
      }
    },
    [clearAuthState]
  );

  const applyRegisteredUser = useCallback(
    async (registeredUser: User) => {
      setUser((prev) => (usersEqual(prev, registeredUser) ? prev : registeredUser));

      const tenantData = await loadTenantById(registeredUser.tenant_id);
      if (tenantData) {
        setTenant((prev) => (tenantsEqual(prev, tenantData) ? prev : tenantData));
      }

      await loadPermissionsForRole(registeredUser.role);
      await loadTenantAndUsers(registeredUser);
      lastSyncedAuthIdRef.current = registeredUser.id;
    },
    [loadPermissionsForRole, loadTenantAndUsers]
  );

  const syncFromSession = useCallback(
    async (session: Session | null) => {
      if (!isAuthConfigured()) {
        setLoading(false);
        return;
      }

      if (!session?.user) {
        clearAuthState();
        setLoading(false);
        return;
      }

      const sessionUserId = session.user.id;
      const sessionUserEmail = session.user.email ?? null;

      if (syncingRef.current) return;
      if (lastSyncedAuthIdRef.current === sessionUserId && userRef.current?.id === sessionUserId) {
        setLoading(false);
        return;
      }

      syncingRef.current = true;
      try {
        let registeredUser: User | null = null;

        if (sessionUserId) {
          registeredUser = await loadUserByAuthId(sessionUserId);
        }
        if (!registeredUser && sessionUserEmail) {
          registeredUser = await loadUserByEmail(sessionUserEmail);
        }

        if (!registeredUser) {
          await denyAccess(
            'El correo no está registrado en la plataforma. Contacta al administrador para habilitar tu cuenta.'
          );
          return;
        }

        if (registeredUser.is_active === false) {
          await denyAccess(
            'Tu acceso ha sido revocado por el administrador de la clínica. Contacta a soporte si crees que es un error.'
          );
          return;
        }

        await applyRegisteredUser(registeredUser);
      } catch (err) {
        console.error('[KineSys Security] Error verifying auth session:', err);
        clearAuthState();
      } finally {
        syncingRef.current = false;
        setLoading(false);
      }
    },
    [applyRegisteredUser, clearAuthState, denyAccess]
  );

  // Suscripción auth: una sola vez. Usar `session` del callback, nunca getSession() aquí.
  useEffect(() => {
    if (!isAuthConfigured() || !supabaseAuthClient) {
      setLoading(false);
      return;
    }

    const {
      data: { subscription },
    } = supabaseAuthClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearAuthState();
        setLoading(false);
        return;
      }

      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        void syncFromSession(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- suscripción única al montar
  }, []);

  // Eventos de datos de la app (independiente de auth)
  useEffect(() => {
    const handleDataUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const currentUser = userRef.current;

      if (detail?.table === 'tenants' || detail?.table === 'users' || detail?.table === 'all') {
        if (currentUser) void loadTenantAndUsers(currentUser);
      }
      if (
        detail?.table === 'role_permissions' ||
        detail?.table === 'app_modules' ||
        detail?.table === 'all'
      ) {
        if (currentUser?.role) void loadPermissionsForRole(currentUser.role);
      }
    };

    window.addEventListener('kinesys_data_updated', handleDataUpdate);
    return () => window.removeEventListener('kinesys_data_updated', handleDataUpdate);
  }, [loadTenantAndUsers, loadPermissionsForRole]);

  const setUserAndRole = (selectedUserId: string) => {
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV && user?.role === 'super_admin') {
      const found = usersList.find((u) => u.id === selectedUserId);
      if (found && !usersEqual(user, found)) {
        setUser(found);
        void loadPermissionsForRole(found.role);
      }
    }
  };

  const setRole = (newRole: UserRole) => {
    if (user && user.role !== newRole) {
      setUser({ ...user, role: newRole });
      void loadPermissionsForRole(newRole);
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
    if (!error && data) {
      setTenant((prev) => {
        const next = data as Tenant;
        return tenantsEqual(prev, next) ? prev : next;
      });
    }
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
      lastSyncedAuthIdRef.current = result.user.id;
      await loadPermissionsForRole(result.user.role);
      setLoading(false);
      return result;
    }
    throw new Error('Datos incompletos para crear tenant y administrador.');
  };

  const signOut = async () => {
    isSigningOutRef.current = true;
    try {
      await supabaseAuthClient?.auth.signOut();
    } catch (err) {
      console.warn('Error during Supabase signOut:', err);
    } finally {
      isSigningOutRef.current = false;
    }
    clearAuthState();
    useAppStore.getState().clearActivePatient();
  };

  const refreshAuth = () => {
    const currentUser = userRef.current;
    if (currentUser) void loadTenantAndUsers(currentUser);
    if (currentUser?.role) void loadPermissionsForRole(currentUser.role);
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
