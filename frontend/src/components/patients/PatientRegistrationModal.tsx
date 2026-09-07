import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  emptyPatientFormValues,
  patientRegistrationSchema,
  PatientRegistrationFormData,
} from '../../schemas/patientSchema';
import { PhoneInputWithCountry } from '../common/PhoneInputWithCountry';
import { useI18n } from '../../app/providers/I18nProvider';
import type { PacienteClinico, User } from '../../types';

export type PatientFormSource = User | PacienteClinico | null;

interface PatientRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPatient: (data: PatientRegistrationFormData) => Promise<void>;
  tenantId: string;
  /** create = alta; edit = actualización con campos precargados */
  mode?: 'create' | 'edit';
  /** Paciente a editar (User de listado o PacienteClinico) */
  initialPatient?: PatientFormSource;
}

function toFormValues(patient?: PatientFormSource): PatientRegistrationFormData {
  if (!patient) return { ...emptyPatientFormValues };

  if ('first_name' in patient) {
    const p = patient as PacienteClinico;
    const gender =
      p.gender === 'female' || p.gender === 'male' || p.gender === 'other' ? p.gender : 'other';
    return {
      full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      email: p.telecom_email || '',
      phone: p.telecom_phone || '',
      rut_or_dni: p.identifier_number || '',
      gender,
      birth_date: p.birth_date ? String(p.birth_date).slice(0, 10) : '',
      address_line: p.address_line || '',
      medical_conditions: p.chronic_conditions?.[0] || '',
      allergies: p.known_allergies?.[0] || '',
      emergency_contact_name: p.emergency_contact?.name || '',
      emergency_contact_phone: p.emergency_contact?.phone || '',
    };
  }

  const u = patient as User;
  const gender =
    u.gender === 'female' || u.gender === 'male' || u.gender === 'other' ? u.gender : 'male';
  return {
    full_name: u.full_name || '',
    email: u.email || '',
    phone: u.phone || '',
    rut_or_dni: u.rut_or_dni || '',
    gender,
    birth_date: u.birth_date ? String(u.birth_date).slice(0, 10) : '',
    address_line: (u as User & { address_line?: string }).address_line || '',
    medical_conditions: u.medical_conditions?.[0] || '',
    allergies: u.allergies?.[0] || '',
    emergency_contact_name: u.emergency_contact?.name || '',
    emergency_contact_phone: u.emergency_contact?.phone || '',
  };
}

export const PatientRegistrationModal: React.FC<PatientRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSubmitPatient,
  mode = 'create',
  initialPatient = null,
}) => {
  const { t } = useI18n();
  const isEdit = mode === 'edit';

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PatientRegistrationFormData>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: emptyPatientFormValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(isEdit ? toFormValues(initialPatient) : { ...emptyPatientFormValues });
  }, [isOpen, isEdit, initialPatient, reset]);

  if (!isOpen) return null;

  const onFormSubmit = async (data: PatientRegistrationFormData) => {
    try {
      await onSubmitPatient(data);
      reset({ ...emptyPatientFormValues });
      onClose();
    } catch (err) {
      console.error('Error submitting patient form:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest w-full max-w-xl rounded-3xl border border-outline-variant/40 shadow-2xl p-6 space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-2xl">
                {isEdit ? 'edit' : 'person_add'}
              </span>
            </div>
            <div>
              <h3 className="text-base font-black text-on-surface">
                {isEdit
                  ? t('patients.edit_patient', 'Editar Paciente')
                  : t('patients.add_patient', 'Registrar Nuevo Paciente')}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {isEdit
                  ? 'Actualiza los datos demográficos y de contacto del expediente'
                  : 'Validación estricta de expediente clínico con React Hook Form & Zod'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 text-xs" noValidate>
          <div>
            <label className="block text-xs font-black uppercase text-on-surface-variant mb-1">
              Nombre Completo *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-on-surface-variant material-symbols-outlined text-base">
                person
              </span>
              <input
                type="text"
                autoComplete="off"
                {...register('full_name')}
                placeholder="Ej: Marcelo Morales Riquelme"
                disabled={isSubmitting}
                className={`w-full bg-surface-container-low border rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-on-surface outline-none transition-all ${
                  errors.full_name
                    ? 'border-error ring-1 ring-error/50 bg-error-container/10'
                    : 'border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary/40'
                }`}
              />
            </div>
            {errors.full_name && (
              <p className="text-[11px] font-bold text-error mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">error</span>
                <span>{errors.full_name.message}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1">
                Correo Electrónico *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-on-surface-variant material-symbols-outlined text-base">
                  mail
                </span>
                <input
                  type="email"
                  autoComplete="off"
                  {...register('email')}
                  placeholder="marcelo@ejemplo.com"
                  disabled={isSubmitting}
                  className={`w-full bg-surface-container-low border rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-on-surface outline-none transition-all ${
                    errors.email
                      ? 'border-error ring-1 ring-error/50 bg-error-container/10'
                      : 'border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary/40'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] font-bold text-error mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">error</span>
                  <span>{errors.email.message}</span>
                </p>
              )}
            </div>

            <div>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <PhoneInputWithCountry
                    label="Teléfono de Contacto *"
                    value={field.value}
                    onChange={(val) => field.onChange(val)}
                    placeholder="300 123 4567"
                    defaultCountryCode="CO"
                  />
                )}
              />
              {errors.phone && (
                <p className="text-[11px] font-bold text-error mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">error</span>
                  <span>{errors.phone.message}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1">
                RUT / Cédula / DNI *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-on-surface-variant material-symbols-outlined text-base">
                  badge
                </span>
                <input
                  type="text"
                  autoComplete="off"
                  {...register('rut_or_dni')}
                  placeholder="Ej: 18.990.231-5"
                  disabled={isSubmitting}
                  className={`w-full bg-surface-container-low border rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-on-surface outline-none transition-all ${
                    errors.rut_or_dni
                      ? 'border-error ring-1 ring-error/50 bg-error-container/10'
                      : 'border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary/40'
                  }`}
                />
              </div>
              {errors.rut_or_dni && (
                <p className="text-[11px] font-bold text-error mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">error</span>
                  <span>{errors.rut_or_dni.message}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1">
                Género Fisiológico *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-on-surface-variant material-symbols-outlined text-base">
                  wc
                </span>
                <select
                  {...register('gender')}
                  disabled={isSubmitting}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                >
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                  <option value="other">Otro / No especificado</option>
                </select>
              </div>
              {errors.gender && (
                <p className="text-[11px] font-bold text-error mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">error</span>
                  <span>{errors.gender.message}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1">
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                {...register('birth_date')}
                disabled={isSubmitting}
                className={`w-full bg-surface-container-low border rounded-xl p-2 text-xs font-semibold text-on-surface outline-none transition-all ${
                  errors.birth_date
                    ? 'border-error ring-1 ring-error/50 bg-error-container/10'
                    : 'border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary/40'
                }`}
              />
              {errors.birth_date && (
                <p className="text-[11px] font-bold text-error mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">error</span>
                  <span>{errors.birth_date.message}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1">
                Diagnóstico o Motivo de Consulta
              </label>
              <input
                type="text"
                {...register('medical_conditions')}
                placeholder="Ej: Fascitis plantar, Control nutricional"
                disabled={isSubmitting}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2 text-xs font-semibold text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-on-surface-variant mb-1">
              Dirección
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-on-surface-variant material-symbols-outlined text-base">
                home
              </span>
              <input
                type="text"
                {...register('address_line')}
                placeholder="Calle, número, comuna / ciudad"
                disabled={isSubmitting}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              />
            </div>
            {errors.address_line && (
              <p className="text-[11px] font-bold text-error mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">error</span>
                <span>{errors.address_line.message}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-on-surface-variant mb-1">
              Alergias o Restricciones Clínicas
            </label>
            <input
              type="text"
              {...register('allergies')}
              placeholder="Ej: Mariscos, Maní, Penicilina (o Sin alergias)"
              disabled={isSubmitting}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2 text-xs font-semibold text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1">
                Contacto de emergencia
              </label>
              <input
                type="text"
                {...register('emergency_contact_name')}
                placeholder="Nombre"
                disabled={isSubmitting}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2 text-xs font-semibold text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-on-surface-variant mb-1">
                Teléfono de emergencia
              </label>
              <input
                type="text"
                {...register('emergency_contact_phone')}
                placeholder="+57 300..."
                disabled={isSubmitting}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2 text-xs font-semibold text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-high cursor-pointer transition-colors disabled:opacity-50"
            >
              {t('common.cancel', 'Cancelar')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary-container text-white font-extrabold text-xs px-6 py-2.5 rounded-2xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 min-w-[170px] justify-center"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-base">sync</span>
                  <span>
                    {isEdit
                      ? t('patients.updating', 'Guardando cambios...')
                      : t('patients.saving', 'Registrando Paciente...')}
                  </span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">
                    {isEdit ? 'save' : 'person_add'}
                  </span>
                  <span>
                    {isEdit
                      ? t('patients.save_changes', 'Guardar cambios')
                      : t('patients.add_patient', 'Registrar Paciente')}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
