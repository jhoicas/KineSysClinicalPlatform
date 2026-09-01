import React, { useEffect, useState } from 'react';
import { User, UserRole } from '../../types';
import { CLINIC_STAFF_ROLES, getProfessionalRoleLabel } from '../../services/dataService';
import { X } from 'lucide-react';

export interface ProfessionalFormValues {
  full_name: string;
  email: string;
  role: UserRole;
  phone?: string;
  license_number?: string;
}

interface ProfessionalFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: User | null;
  onClose: () => void;
  onSubmit: (values: ProfessionalFormValues) => Promise<void>;
  saving?: boolean;
}

const DEFAULT_VALUES: ProfessionalFormValues = {
  full_name: '',
  email: '',
  role: 'fisioterapeuta',
  phone: '',
  license_number: '',
};

export function ProfessionalFormModal({
  isOpen,
  mode,
  initialData,
  onClose,
  onSubmit,
  saving = false,
}: ProfessionalFormModalProps) {
  const [values, setValues] = useState<ProfessionalFormValues>(DEFAULT_VALUES);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && initialData) {
      setValues({
        full_name: initialData.full_name,
        email: initialData.email,
        role: initialData.role,
        phone: initialData.phone || '',
        license_number: initialData.license_number || '',
      });
    } else {
      setValues(DEFAULT_VALUES);
    }
  }, [isOpen, mode, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(values);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl w-full max-w-lg clinical-shadow-lg overflow-hidden">
        <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-on-surface">
              {mode === 'create' ? 'Añadir Profesional' : 'Editar Profesional'}
            </h3>
            <p className="text-xs text-on-surface-variant">
              {mode === 'create'
                ? 'El profesional recibirá invitación para acceder con su correo.'
                : 'Actualiza el rol o datos del miembro del equipo.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-container-high cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={values.full_name}
              onChange={(e) => setValues((v) => ({ ...v, full_name: e.target.value }))}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs font-bold"
              placeholder="Ej: Dra. Ana Pérez"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              disabled={mode === 'edit'}
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs font-bold disabled:opacity-60"
              placeholder="profesional@clinica.com"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
              Rol / Especialidad <span className="text-red-500">*</span>
            </label>
            <select
              value={values.role}
              onChange={(e) => setValues((v) => ({ ...v, role: e.target.value as UserRole }))}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs font-bold cursor-pointer"
            >
              {CLINIC_STAFF_ROLES.map((role) => (
                <option key={role} value={role}>
                  {getProfessionalRoleLabel(role)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                Teléfono
              </label>
              <input
                type="tel"
                value={values.phone}
                onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                Licencia / Registro
              </label>
              <input
                type="text"
                value={values.license_number}
                onChange={(e) => setValues((v) => ({ ...v, license_number: e.target.value }))}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary hover:bg-primary-container text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Guardando...' : mode === 'create' ? 'Crear Profesional' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
