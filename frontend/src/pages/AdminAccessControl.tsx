import React, { useState, useEffect } from 'react';
import { User } from '../types';
import {
  fetchClinicProfessionals,
  createProfessional,
  updateProfessionalRole,
  deactivateProfessional,
  reactivateProfessional,
  getProfessionalRoleLabel,
} from '../services/dataService';
import { useAuth } from '../app/providers/AuthProvider';
import { SideNavBar } from '../components/layout/SideNavBar';
import { TopNavBar } from '../components/layout/TopNavBar';
import { ToastContainer, ToastMessage } from '../components/common/Toast';
import {
  ProfessionalFormModal,
  ProfessionalFormValues,
} from '../components/admin/ProfessionalFormModal';
import { UserPlus, Shield, UserX, UserCheck, Pencil, RefreshCw } from 'lucide-react';

interface AdminAccessControlProps {
  onNavigate: (path: string) => void;
}

export const AdminAccessControl: React.FC<AdminAccessControlProps> = ({ onNavigate }) => {
  const { user: currentUser, tenantId } = useAuth();

  const [professionals, setProfessionals] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  };

  const loadProfessionals = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const data = await fetchClinicProfessionals(tenantId);
      setProfessionals(data);
    } catch {
      addToast('error', 'Error', 'No se pudo cargar el equipo profesional.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfessionals();

    const handleDataUpdate = (e: CustomEvent) => {
      if (e.detail?.table === 'users' || e.detail?.table === 'all') {
        loadProfessionals();
      }
    };
    window.addEventListener('kinesys_data_updated', handleDataUpdate as EventListener);
    return () =>
      window.removeEventListener('kinesys_data_updated', handleDataUpdate as EventListener);
  }, [tenantId]);

  const filteredProfessionals = professionals.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.full_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.specialty || '').toLowerCase().includes(q);
    const isActive = p.is_active !== false;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'inactive' && !isActive);
    return matchesSearch && matchesStatus;
  });

  const activeCount = professionals.filter((p) => p.is_active !== false).length;
  const inactiveCount = professionals.length - activeCount;

  const handleOpenCreate = () => {
    setFormMode('create');
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (prof: User) => {
    setFormMode('edit');
    setEditingUser(prof);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: ProfessionalFormValues) => {
    if (!tenantId) return;
    setIsSaving(true);

    if (formMode === 'create') {
      const result = await createProfessional(tenantId, values, currentUser?.id);
      if (result.success) {
        addToast('success', 'Profesional creado', `${values.full_name} fue registrado correctamente.`);
        setIsFormOpen(false);
        loadProfessionals();
      } else {
        addToast('error', 'Error al crear', result.error || 'No se pudo crear el profesional.');
      }
    } else if (editingUser) {
      const roleResult = await updateProfessionalRole(editingUser.id, values.role);
      if (!roleResult.success) {
        addToast('error', 'Error', roleResult.error || 'No se pudo actualizar el rol.');
        setIsSaving(false);
        return;
      }
      addToast('success', 'Rol actualizado', `El rol de ${editingUser.full_name} fue actualizado.`);
      setIsFormOpen(false);
      loadProfessionals();
    }

    setIsSaving(false);
  };

  const handleRevokeAccess = async (prof: User) => {
    if (prof.id === currentUser?.id) {
      addToast('error', 'Acción no permitida', 'No puedes revocar tu propio acceso.');
      return;
    }
    if (!window.confirm(`¿Revocar el acceso de ${prof.full_name}? El usuario no podrá iniciar sesión.`)) {
      return;
    }

    setIsSaving(true);
    const result = await deactivateProfessional(prof.id);
    if (result.success) {
      addToast('success', 'Acceso revocado', `${prof.full_name} fue inhabilitado.`);
      loadProfessionals();
    } else {
      addToast('error', 'Error', result.error || 'No se pudo revocar el acceso.');
    }
    setIsSaving(false);
  };

  const handleReactivate = async (prof: User) => {
    setIsSaving(true);
    const result = await reactivateProfessional(prof.id);
    if (result.success) {
      addToast('success', 'Acceso restaurado', `${prof.full_name} puede volver a iniciar sesión.`);
      loadProfessionals();
    } else {
      addToast('error', 'Error', result.error || 'No se pudo reactivar el acceso.');
    }
    setIsSaving(false);
  };

  return (
    <div className="flex min-h-screen bg-background text-on-background font-sans">
      <SideNavBar currentPath="/admin-access" onNavigate={onNavigate} />

      <main className="flex-1 md:ml-72 min-h-screen flex flex-col">
        <TopNavBar currentPath="/admin-access" onNavigate={onNavigate} />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto mt-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-xs font-black uppercase text-primary tracking-wider">
                  Administración de Clínica
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
                Gestión de Profesionales
              </h1>
              <p className="text-xs text-on-surface-variant max-w-2xl mt-1">
                Invita, crea, edita o revoca el acceso de médicos, nutricionistas y fisioterapeutas de tu clínica.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadProfessionals}
                disabled={isLoading}
                className="px-3 py-2 rounded-xl border border-outline-variant/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-surface-container-high"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="bg-primary hover:bg-primary-container text-white text-xs font-black px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Añadir Profesional
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30">
              <p className="text-[11px] font-bold text-on-surface-variant uppercase">Total equipo</p>
              <p className="text-3xl font-black text-primary mt-1">{professionals.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30">
              <p className="text-[11px] font-bold text-on-surface-variant uppercase">Activos</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{activeCount}</p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30">
              <p className="text-[11px] font-bold text-on-surface-variant uppercase">Inactivos</p>
              <p className="text-3xl font-black text-red-500 mt-1">{inactiveCount}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar por nombre o correo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-surface-container-lowest border border-outline-variant/40 rounded-xl"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-2 text-xs font-bold bg-surface-container-lowest border border-outline-variant/40 rounded-xl cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </select>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-sm text-on-surface-variant">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              Cargando equipo profesional...
            </div>
          ) : filteredProfessionals.length === 0 ? (
            <div className="py-16 text-center rounded-3xl border border-dashed border-outline-variant/40 bg-surface-container-low/40">
              <UserPlus className="w-10 h-10 mx-auto text-primary/40 mb-3" />
              <p className="font-bold text-on-surface">No hay profesionales registrados</p>
              <p className="text-xs text-on-surface-variant mt-1 mb-4">
                Comienza invitando al primer miembro de tu equipo clínico.
              </p>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
              >
                Añadir Profesional
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredProfessionals.map((prof) => {
                const isActive = prof.is_active !== false;
                const isSelf = prof.id === currentUser?.id;

                return (
                  <div
                    key={prof.id}
                    className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 clinical-shadow flex flex-col gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={
                          prof.avatar_url ||
                          'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150'
                        }
                        alt={prof.full_name}
                        className="w-12 h-12 rounded-2xl object-cover border border-outline-variant/30"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-on-surface truncate">{prof.full_name}</h3>
                          {isSelf && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              TÚ
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant font-mono truncate">{prof.email}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                            {getProfessionalRoleLabel(prof.role)}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-outline-variant/20">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(prof)}
                        disabled={isSaving}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar Rol
                      </button>

                      {isActive ? (
                        <button
                          type="button"
                          onClick={() => handleRevokeAccess(prof)}
                          disabled={isSaving || isSelf}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center gap-1 cursor-pointer disabled:opacity-40"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Revocar Acceso
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReactivate(prof)}
                          disabled={isSaving}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Reactivar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <ProfessionalFormModal
        isOpen={isFormOpen}
        mode={formMode}
        initialData={editingUser}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        saving={isSaving}
      />

      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
