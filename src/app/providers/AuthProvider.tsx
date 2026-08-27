import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Tenant, UserRole } from '../../types';
import { INITIAL_USERS, INITIAL_TENANT, supabase } from '../../services/supabaseClient';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  tenantId: string;
  tenant: Tenant | null;
  loading: boolean;
  isTrialExpired: boolean;
  trialDaysLeft: number;
  availableUsers: User[];
  setUserAndRole: (selectedUserId: string) => void;
  setRole: (role: UserRole) => void;
  updateTenant: (tenant: Partial<Tenant>) => Promise<void>;
  createTenantAndAdmin: (tenantData: Partial<Tenant>, adminData: Partial<User>) => Promise<{ tenant: Tenant; user: User }>;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usersList, setUsersList] = useState<User[]>(INITIAL_USERS);
  const [user, setUser] = useState<User | null>(() => {
    const savedUserId = localStorage.getItem('kinesys_active_user_id');
    return INITIAL_USERS.find((u) => u.id === savedUserId) || INITIAL_USERS[2]; // Default to Klgo Mateo
  });
  const [tenant, setTenant] = useState<Tenant | null>(INITIAL_TENANT);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadTenantAndUsers();

    const handleDataUpdate = (e: any) => {
      if (
        e.detail?.table === 'tenants' || 
        e.detail?.table === 'users' || 
        e.detail?.table === 'all'
      ) {
        loadTenantAndUsers();
      }
    };
    window.addEventListener('kinesys_data_updated', handleDataUpdate);
    return () => window.removeEventListener('kinesys_data_updated', handleDataUpdate);
  }, []);

  const loadTenantAndUsers = async () => {
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
  };

  const setUserAndRole = (selectedUserId: string) => {
    const found = usersList.find((u) => u.id === selectedUserId);
    if (found) {
      setUser(found);
      localStorage.setItem('kinesys_active_user_id', found.id);
    }
  };

  const setRole = (newRole: UserRole) => {
    if (user) {
      const updated = { ...user, role: newRole };
      setUser(updated);
    }
  };

  const updateTenant = async (tenantUpdates: Partial<Tenant>) => {
    if (!tenant) return;
    const { data, error } = await supabase
      .from('tenants')
      .update(tenantUpdates)
      .eq('id', tenant.id);
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

    return { tenant: newTenantObj, user: newAdminObj };
  };

  const refreshAuth = () => {
    loadTenantAndUsers();
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
        setUserAndRole,
        setRole,
        updateTenant,
        createTenantAndAdmin,
        refreshAuth,
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

