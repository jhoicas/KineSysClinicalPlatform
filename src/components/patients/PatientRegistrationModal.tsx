import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  patientRegistrationSchema,
  PatientRegistrationFormData,
} from '../../schemas/patientSchema';
import { PhoneInputWithCountry } from '../common/PhoneInputWithCountry';
import { useI18n } from '../../app/providers/I18nProvider';

interface PatientRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPatient: (data: PatientRegistrationFormData) => Promise<void>;
  tenantId: string;
}

export const PatientRegistrationModal: React.FC<PatientRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSubmitPatient,
}) => {
  const { t } = useI18n();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PatientRegistrationFormData>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '+57 300 123 4567',
      rut_or_dni: '',
      gender: 'male',
      birth_date: '',
      medical_conditions: 'Evaluación Kinésica Inicial',
      allergies: 'Sin alergias conocidas',
      emergency_contact_name: '',
      emergency_contact_phone: '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        full_name: '',
        email: '',
        phone: '+57 300 123 4567',
        rut_or_dni: '',
        gender: 'male',
        birth_date: '',
        medical_conditions: 'Evaluación Kinésica Inicial',
        allergies: 'Sin alergias conocidas',
        emergency_contact_name: '',
        emergency_contact_phone: '',
      });
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const onFormSubmit = async (data: PatientRegistrationFormData) => {
    try {
      await onSubmitPatient(data);
      reset();
      onClose();
    } catch (err) {
      console.error('Error submitting patient registration form:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest w-full max-w-xl rounded-3xl border border-outline-variant/40 shadow-2xl p-6 space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-2xl">person_add</span>
            </div>
            <div>
              <h3 className="text-base font-black text-on-surface">
                {t('patients.add_patient', 'Registrar Nuevo Paciente')}
              </h3>
              <p className="text-xs text-on-surface-variant">
                Validación estricta de expediente clínico con React Hook Form & Zod
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

        {/* Validation Form */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 text-xs" noValidate>
          {/* Nombre Completo */}
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

          {/* Email & Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Email */}
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

            {/* Teléfono */}
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

          {/* RUT / DNI & Género */}
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

          {/* Fecha de Nacimiento & Diagnóstico Inicial */}
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

          {/* Alergias / Observaciones Clínicas */}
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

          {/* Footer Actions with clear Loading State */}
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
                  <span>{t('patients.saving', 'Registrando Paciente...')}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">person_add</span>
                  <span>{t('patients.add_patient', 'Registrar Paciente')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
