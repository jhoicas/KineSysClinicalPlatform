import React, { useState, useEffect } from 'react';
import { User, UserRole, AppRole, AppModule, RolePermission } from '../types';
import { 
  supabase, 
  INITIAL_APP_ROLES, 
  INITIAL_APP_MODULES, 
  INITIAL_ROLE_PERMISSIONS 
} from '../services/supabaseClient';
import { useAuth } from '../app/providers/AuthProvider';
import { SideNavBar } from '../components/layout/SideNavBar';
import { TopNavBar } from '../components/layout/TopNavBar';

interface AdminAccessControlProps {
  onNavigate: (path: string) => void;
}

export const AdminAccessControl: React.FC<AdminAccessControlProps> = ({ onNavigate }) => {
  const { user: currentUser, role: currentRole, refreshPermissions } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<AppRole[]>(INITIAL_APP_ROLES);
  const [modules, setModules] = useState<AppModule[]>(INITIAL_APP_MODULES);
  const [permissions, setPermissions] = useState<RolePermission[]>(INITIAL_ROLE_PERMISSIONS);
  
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState<UserRole>('fisioterapeuta');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Load all RBAC data from database/dataService
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Users
      const { data: userData } = await supabase.from('users').select('*');
      if (userData) setUsers(userData);

      // 2. Roles
      const { data: roleData } = await supabase.from('app_roles').select('*');
      if (roleData && roleData.length > 0) setRoles(roleData);

      // 3. Modules
      const { data: modData } = await supabase
        .from('app_modules')
        .select('*')
        .order('display_order', { ascending: true });
      if (modData && modData.length > 0) setModules(modData);

      // 4. Role Permissions
      const { data: permData } = await supabase.from('role_permissions').select('*');
      if (permData && permData.length > 0) setPermissions(permData);
    } catch (err) {
      console.error('Error loading RBAC management data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleDataUpdate = (e: any) => {
      if (
        e.detail?.table === 'users' || 
        e.detail?.table === 'role_permissions' || 
        e.detail?.table === 'app_roles' ||
        e.detail?.table === 'all'
      ) {
        loadData();
      }
    };
    window.addEventListener('kinesys_data_updated', handleDataUpdate);
    return () => window.removeEventListener('kinesys_data_updated', handleDataUpdate);
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Change user role
  const handleUserRoleChange = async (userId: string, newRole: UserRole) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('users')
        .eq('id', userId)
        .update({ role: newRole });

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      showFeedback('success', `Rol actualizado a "${newRole}" correctamente.`);
      await refreshPermissions();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Error al actualizar el rol del usuario.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Toggle permission for a role <-> module
  const handleTogglePermission = async (roleId: UserRole | string, moduleId: string) => {
    const isCurrentlyGranted = permissions.some(
      (p) => p.role_id === roleId && p.module_id === moduleId
    );

    setIsUpdating(true);
    try {
      if (isCurrentlyGranted) {
        // Remove permission
        await supabase
          .from('role_permissions')
          .eq('role_id', roleId)
          .eq('module_id', moduleId)
          .delete();

        setPermissions((prev) =>
          prev.filter((p) => !(p.role_id === roleId && p.module_id === moduleId))
        );
        showFeedback('success', 'Permiso revocado.');
      } else {
        // Add permission
        const newPerm: RolePermission = {
          role_id: roleId,
          module_id: moduleId,
          created_at: new Date().toISOString(),
        };
        await supabase.from('role_permissions').insert(newPerm);

        setPermissions((prev) => [...prev, newPerm]);
        showFeedback('success', 'Permiso concedido.');
      }
      await refreshPermissions();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Error al actualizar los permisos del rol.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Enable all modules for selected role
  const handleEnableAllForRole = async (roleId: UserRole | string) => {
    setIsUpdating(true);
    try {
      const permsToAdd: RolePermission[] = modules
        .filter((mod) => !permissions.some((p) => p.role_id === roleId && p.module_id === mod.id))
        .map((mod) => ({
          role_id: roleId,
          module_id: mod.id,
          created_at: new Date().toISOString(),
        }));

      if (permsToAdd.length > 0) {
        await supabase.from('role_permissions').insert(permsToAdd);
        setPermissions((prev) => [...prev, ...permsToAdd]);
      }
      showFeedback('success', 'Todos los módulos han sido habilitados para este rol.');
      await refreshPermissions();
    } catch (err: any) {
      showFeedback('error', 'Error al habilitar todos los módulos.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Reset to default permissions
  const handleResetDefaultsForRole = async (roleId: UserRole | string) => {
    setIsUpdating(true);
    try {
      // Remove all current
      await supabase.from('role_permissions').eq('role_id', roleId).delete();

      // Re-insert initial defaults
      const defaults = INITIAL_ROLE_PERMISSIONS.filter((p) => p.role_id === roleId);
      if (defaults.length > 0) {
        await supabase.from('role_permissions').insert(defaults);
      }

      setPermissions((prev) => [
        ...prev.filter((p) => p.role_id !== roleId),
        ...defaults,
      ]);
      showFeedback('success', 'Permisos restablecidos a los valores por defecto del sistema.');
      await refreshPermissions();
    } catch (err: any) {
      showFeedback('error', 'Error al restablecer permisos.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.rut_or_dni?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex min-h-screen bg-background text-on-background font-sans antialiased selection:bg-primary selection:text-white">
      {/* Side Navigation Bar */}
      <SideNavBar currentPath="/admin-access" onNavigate={onNavigate} />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 min-h-screen flex flex-col transition-all">
        <TopNavBar currentPath="/admin-access" onNavigate={onNavigate} />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto mt-16">
          
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/30">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-black uppercase border border-primary/20 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
                  Seguridad Clínica
                </span>
                <span className="text-xs text-on-surface-variant font-mono">RBAC v2.0 Dynamic Engine</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight mt-1">
                Control de Accesos & Permisos Dinámicos
              </h1>
              <p className="text-xs text-on-surface-variant max-w-2xl">
                Asigna roles al personal de la clínica y define qué pantallas y funciones específicas puede ver y operar cada profesional.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={isLoading || isUpdating}
                className="px-3.5 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl border border-outline-variant/40 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className={`material-symbols-outlined text-base ${isLoading ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                Recargar Datos
              </button>
            </div>
          </div>

          {/* Feedback Alert Banner */}
          {feedbackMessage && (
            <div
              className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-fadeIn transition-all ${
                feedbackMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">
                  {feedbackMessage.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span>{feedbackMessage.text}</span>
              </div>
              <button onClick={() => setFeedbackMessage(null)} className="text-sm font-bold cursor-pointer">
                ×
              </button>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/30 space-y-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-xs font-bold uppercase tracking-wider">Total Usuarios Registrados</span>
                <span className="material-symbols-outlined text-primary">group</span>
              </div>
              <p className="text-3xl font-black text-on-surface">{users.length}</p>
              <p className="text-[11px] text-emerald-600 font-bold">Personal y pacientes en el tenant</p>
            </div>

            <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/30 space-y-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-xs font-bold uppercase tracking-wider">Roles Configurados</span>
                <span className="material-symbols-outlined text-teal-600">badge</span>
              </div>
              <p className="text-3xl font-black text-on-surface">{roles.length}</p>
              <p className="text-[11px] text-on-surface-variant">Perfiles con políticas RBAC</p>
            </div>

            <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/30 space-y-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-xs font-bold uppercase tracking-wider">Módulos Clínicos</span>
                <span className="material-symbols-outlined text-indigo-600">view_module</span>
              </div>
              <p className="text-3xl font-black text-on-surface">{modules.length}</p>
              <p className="text-[11px] text-indigo-600 font-bold">Vistas del sistema mapeadas</p>
            </div>
          </div>

          {/* SECTION 1: Matriz de Permisos por Rol */}
          <div className="rounded-3xl bg-surface-container-low border border-outline-variant/30 overflow-hidden shadow-sm">
            <div className="p-5 sm:p-6 border-b border-outline-variant/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-lowest/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">tune</span>
                  <h2 className="text-lg font-black text-on-surface tracking-tight">
                    Matriz de Permisos por Rol
                  </h2>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Selecciona un rol para ver y activar/desactivar en tiempo real los módulos a los que tiene acceso.
                </p>
              </div>

              {/* Quick Actions for Selected Role */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEnableAllForRole(selectedRoleForMatrix)}
                  disabled={isUpdating}
                  className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl border border-outline-variant/40 transition-colors cursor-pointer"
                >
                  Habilitar Todos
                </button>
                <button
                  onClick={() => handleResetDefaultsForRole(selectedRoleForMatrix)}
                  disabled={isUpdating}
                  className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-bold rounded-xl border border-outline-variant/40 transition-colors cursor-pointer"
                >
                  Restablecer Defaults
                </button>
              </div>
            </div>

            {/* Role Tabs */}
            <div className="px-5 pt-4 pb-2 border-b border-outline-variant/20 flex gap-2 overflow-x-auto bg-surface-container-lowest/30">
              {roles.map((r) => {
                const isSelected = selectedRoleForMatrix === r.id;
                const activePermCount = permissions.filter((p) => p.role_id === r.id).length;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoleForMatrix(r.id as UserRole)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    <span>{r.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant'
                      }`}
                    >
                      {activePermCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Modules Grid for Selected Role */}
            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {modules.map((mod) => {
                const hasPermission = permissions.some(
                  (p) => p.role_id === selectedRoleForMatrix && p.module_id === mod.id
                );

                return (
                  <div
                    key={mod.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      hasPermission
                        ? 'bg-surface-container-lowest border-primary/40 shadow-sm'
                        : 'bg-surface-container/40 border-outline-variant/20 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          hasPermission ? 'bg-primary/10 text-primary' : 'bg-surface-container text-outline'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">{mod.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-on-surface truncate">{mod.name}</p>
                          {mod.badge && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                              {mod.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-on-surface-variant truncate">{mod.path_route}</p>
                      </div>
                    </div>

                    {/* Switch Toggle */}
                    <button
                      type="button"
                      onClick={() => handleTogglePermission(selectedRoleForMatrix, mod.id)}
                      disabled={isUpdating}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                        hasPermission ? 'bg-primary' : 'bg-outline-variant'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          hasPermission ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: Gestión de Usuarios y Asignación de Roles */}
          <div className="rounded-3xl bg-surface-container-low border border-outline-variant/30 overflow-hidden shadow-sm space-y-4">
            <div className="p-5 sm:p-6 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">manage_accounts</span>
                  <h2 className="text-lg font-black text-on-surface tracking-tight">
                    Usuarios de la Clínica & Asignación de Rol
                  </h2>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Cambia el rol de cualquier usuario al instante mediante el selector desplegable.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-base">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o correo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs bg-surface-container rounded-xl border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary w-48 sm:w-64"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-surface-container rounded-xl border border-outline-variant/40 text-on-surface font-semibold focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">Todos los Roles</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="px-5 pb-6 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-on-surface-variant font-bold text-[11px] uppercase tracking-wider">
                    <th className="pb-3 px-3">Usuario</th>
                    <th className="pb-3 px-3">Identificación / RUT</th>
                    <th className="pb-3 px-3">Contacto</th>
                    <th className="pb-3 px-3">Rol Asignado</th>
                    <th className="pb-3 px-3 text-right">Módulos Permitidos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-on-surface">
                  {filteredUsers.map((u) => {
                    const userRolePerms = permissions.filter((p) => p.role_id === u.role);
                    const isSelf = currentUser?.id === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-surface-container-lowest/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={u.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150'}
                              alt={u.full_name}
                              className="w-9 h-9 rounded-full object-cover border border-outline-variant/40"
                            />
                            <div>
                              <p className="font-bold text-on-surface flex items-center gap-1.5">
                                {u.full_name}
                                {isSelf && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-black uppercase">
                                    Tú
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-on-surface-variant font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-on-surface-variant font-mono">
                          {u.rut_or_dni || 'No registrado'}
                        </td>

                        <td className="py-3 px-3 text-on-surface-variant">
                          {u.phone || 'Sin teléfono'}
                        </td>

                        <td className="py-3 px-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleUserRoleChange(u.id, e.target.value as UserRole)}
                            disabled={isUpdating}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-outline-variant/50 bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary shadow-sm cursor-pointer capitalize"
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container font-black text-[11px] text-primary border border-outline-variant/30">
                            <span className="material-symbols-outlined text-xs">shield</span>
                            {userRolePerms.length} pantallas
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                        No se encontraron usuarios con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
