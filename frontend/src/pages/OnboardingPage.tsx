import React, { useState, useEffect } from 'react';
import { PRICING_PLANS, supabase } from '../services/supabaseClient';
import { PricingPlanConfig, SubscriptionPlan, User, Tenant } from '../types';
import { useAuth } from '../app/providers/AuthProvider';
import { useI18n } from '../app/providers/I18nProvider';
import { PhoneInputWithCountry } from '../components/common/PhoneInputWithCountry';
import { LanguageSelector } from '../components/common/LanguageSelector';

interface OnboardingPageProps {
  onNavigate: (path: string) => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onNavigate }) => {
  const { createTenantAndAdmin } = useAuth();
  const { t } = useI18n();

  // Wizard Step: 1: Datos Clínica, 2: Selección de Plan, 3: Registro Admin, 4: Éxito
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Datos de la Clínica
  const [clinicName, setClinicName] = useState('Centro Kinésico Integral');
  const [clinicNit, setClinicNit] = useState('901.458.720-3');
  const [clinicSlug, setClinicSlug] = useState('centro-kinesico');
  const [clinicPhone, setClinicPhone] = useState('+57 300 123 4567');
  const [clinicAddress, setClinicAddress] = useState('Cra. 15 # 93-60, Bogotá');
  const [primarySpecialty, setPrimarySpecialty] = useState('Kinesiología & Rehabilitación');

  // Step 2: Selección de Plan
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlan>('growth');

  // Step 3: Registro del Admin
  const [adminName, setAdminName] = useState('Dra. Marcela Lagos');
  const [adminEmail, setAdminEmail] = useState('directora@centrokinesico.com');
  const [adminPassword, setAdminPassword] = useState('KineSys2026*');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('KineSys2026*');
  const [showPassword, setShowPassword] = useState(false);
  const [adminPhone, setAdminPhone] = useState('+57 312 987 6543');
  const [adminRut, setAdminRut] = useState('15.420.912-3');
  const [adminLicense, setAdminLicense] = useState('MED-REG-84920');

  // Created objects after success
  const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);
  const [createdUser, setCreatedUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user came from Landing with preselected plan
    const preselected = sessionStorage.getItem('kinesys_selected_plan') as SubscriptionPlan;
    if (preselected && ['starter', 'growth', 'enterprise'].includes(preselected)) {
      setSelectedPlanId(preselected);
    }
  }, []);

  const selectedPlan: PricingPlanConfig =
    PRICING_PLANS.find((p) => p.id === selectedPlanId) || PRICING_PLANS[1];

  const handleClinicNameChange = (name: string) => {
    setClinicName(name);
    // Auto-generate clean slug
    const generated = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setClinicSlug(generated || 'clinica');
  };

  // Step 1 Validation
  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!clinicName.trim()) {
      setErrorMessage(t('onboarding.error_clinic_name', 'Por favor ingresa el nombre de la clínica.'));
      return;
    }
    if (!clinicNit.trim()) {
      setErrorMessage(t('onboarding.error_clinic_nit', 'Por favor ingresa el NIT o identificación tributaria.'));
      return;
    }
    setCurrentStep(2);
  };

  // Step 2 Validation & Proceed
  const handleNextStep2 = () => {
    setErrorMessage(null);
    setCurrentStep(3);
  };

  // Step 3 Validation & Final Supabase Tenant + User Creation
  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!adminName.trim()) {
      setErrorMessage(t('onboarding.error_admin_name', 'Por favor ingresa el nombre del administrador.'));
      return;
    }
    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      setErrorMessage(t('onboarding.error_admin_email', 'Por favor ingresa un correo electrónico válido.'));
      return;
    }
    if (adminPassword.length < 6) {
      setErrorMessage(t('onboarding.error_password_length', 'La contraseña debe tener al menos 6 caracteres.'));
      return;
    }
    if (adminPassword !== adminPasswordConfirm) {
      setErrorMessage(t('onboarding.error_password_match', 'Las contraseñas no coinciden.'));
      return;
    }

    setIsSubmitting(true);
    try {
      const newTenantId = `tenant_${Date.now()}`;
      const trialEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const newTenant: Tenant = {
        id: newTenantId,
        name: clinicName.trim(),
        slug: clinicSlug.trim() || 'clinica',
        timezone: 'America/Bogota (UTC-5)',
        cancellation_window_hours: 24,
        email: adminEmail.trim(),
        phone: clinicPhone.trim(),
        address: clinicAddress.trim(),
        currency: 'COP',
        appointment_duration_minutes: 45,
        subscription_plan: selectedPlanId,
        subscription_status: 'trialing',
        max_users: selectedPlan.max_users,
        trial_ends_at: trialEnds,
        is_wompi_sandbox: true,
        created_at: new Date().toISOString(),
      };

      const newAdminUser: User = {
        id: `user_admin_${Date.now()}`,
        email: adminEmail.trim(),
        full_name: adminName.trim(),
        role: 'clinic_admin', // role admin / clinic_admin in Supabase
        phone: adminPhone.trim(),
        tenant_id: newTenantId,
        rut_or_dni: adminRut.trim() || clinicNit.trim(),
        license_number: adminLicense.trim(),
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        created_at: new Date().toISOString(),
      };

      // 1. Insert into Supabase 'tenants' and 'users'
      await supabase.from('tenants').insert(newTenant);
      await supabase.from('users').insert(newAdminUser);

      // 2. Set in Context for immediate active session
      if (createTenantAndAdmin) {
        await createTenantAndAdmin(newTenant, newAdminUser);
      }

      setCreatedTenant(newTenant);
      setCreatedUser(newAdminUser);
      setCurrentStep(4);
    } catch (err: any) {
      console.error('Error creating tenant & admin in Supabase:', err);
      setErrorMessage(err?.message || 'Ocurrió un error al registrar la clínica. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background font-sans selection:bg-primary selection:text-white flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-outline-variant/30">
        <button
          onClick={() => onNavigate('/landing')}
          className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>{t('onboarding.back_to_landing', 'Volver a la Landing')}</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-black text-sm shadow-xs">
            K
          </div>
          <span className="text-sm font-black text-on-surface tracking-tight">KineSys Onboarding</span>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector variant="compact" />
          <span className="hidden sm:inline-flex text-xs text-primary font-bold bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
            {t('common.free_trial', '7 Días de Trial')}
          </span>
        </div>
      </header>

      {/* Main Wizard Container */}
      <main className="max-w-3xl mx-auto w-full my-8 bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 sm:p-10 clinical-shadow">
        {/* Step Progress Tracker */}
        {currentStep <= 3 && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant mb-2">
              <span className={`flex items-center gap-1.5 ${currentStep >= 1 ? 'text-primary font-extrabold' : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep >= 1 ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>
                  1
                </span>
                <span>{t('onboarding.step1_label', '1. Datos Clínica')}</span>
              </span>

              <span className={`flex items-center gap-1.5 ${currentStep >= 2 ? 'text-primary font-extrabold' : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep >= 2 ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>
                  2
                </span>
                <span>{t('onboarding.step2_label', '2. Plan')}</span>
              </span>

              <span className={`flex items-center gap-1.5 ${currentStep >= 3 ? 'text-primary font-extrabold' : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep >= 3 ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>
                  3
                </span>
                <span>{t('onboarding.step3_label', '3. Registro Admin')}</span>
              </span>
            </div>

            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden border border-outline-variant/20">
              <div
                className="bg-primary h-full transition-all duration-300 rounded-full"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
            <span className="material-symbols-outlined text-base text-red-600">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 1: DATOS DE LA CLÍNICA (Nombre, NIT, Teléfono con País, Dirección)   */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <form onSubmit={handleNextStep1} className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-extrabold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                Paso 1 de 3: Identificación del Centro
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-on-surface mt-2 tracking-tight">
                {t('onboarding.step1_title', 'Datos de la Clínica o Consultorio')}
              </h2>
              <p className="text-xs text-on-surface-variant mt-1">
                {t('onboarding.step1_desc', 'Ingresa la información institucional y tributaria para configurar tu tenant en Supabase.')}
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Nombre de la Clínica */}
              <div>
                <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                  {t('onboarding.clinic_name', 'Nombre de la Clínica')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-onboarding-clinic-name"
                  type="text"
                  required
                  value={clinicName}
                  onChange={(e) => handleClinicNameChange(e.target.value)}
                  placeholder="Ej: Centro de Rehabilitación Kinésica San Andrés"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface focus:border-primary outline-none transition-all"
                />
              </div>

              {/* NIT / RUT / Identificación Tributaria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                    {t('onboarding.clinic_nit', 'NIT / RUT / Cédula Jurídica')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-onboarding-clinic-nit"
                    type="text"
                    required
                    value={clinicNit}
                    onChange={(e) => setClinicNit(e.target.value)}
                    placeholder="901.458.720-3"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface focus:border-primary outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                    {t('onboarding.subdomain', 'Subdominio / Slug')}
                  </label>
                  <div className="flex items-center bg-surface-container-low border border-outline-variant/40 rounded-xl px-3 py-2.5 text-on-surface-variant">
                    <span className="font-mono text-primary font-bold text-xs">{clinicSlug}</span>
                    <span className="text-[11px] ml-1 text-on-surface-variant/70">.kinesys.cloud</span>
                  </div>
                </div>
              </div>

              {/* Teléfono con Selector de País con Banderas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <PhoneInputWithCountry
                    id="input-onboarding-clinic-phone"
                    label={t('onboarding.clinic_phone', 'Teléfono de Contacto')}
                    value={clinicPhone}
                    onChange={(fullNumber) => setClinicPhone(fullNumber)}
                    placeholder="300 123 4567"
                    defaultCountryCode="CO"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                    {t('onboarding.specialty', 'Especialidad Principal')}
                  </label>
                  <select
                    value={primarySpecialty}
                    onChange={(e) => setPrimarySpecialty(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-3 text-xs font-bold text-on-surface focus:border-primary outline-none cursor-pointer"
                  >
                    <option value="Kinesiología & Rehabilitación">Kinesiología & Rehabilitación</option>
                    <option value="Clínica Multidisciplinaria">Clínica Multidisciplinaria (Kine + Nutri + Médico)</option>
                    <option value="Nutrición & Medicina Deportiva">Nutrición & Medicina Deportiva</option>
                    <option value="Medicina General y Consulta Externa">Medicina General y Consulta Externa</option>
                  </select>
                </div>
              </div>

              {/* Dirección Física */}
              <div>
                <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                  {t('onboarding.clinic_address', 'Dirección de la Sede')}
                </label>
                <input
                  id="input-onboarding-clinic-address"
                  type="text"
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                  placeholder="Cra. 15 # 93-60, Bogotá"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-3 text-xs font-semibold text-on-surface focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end border-t border-outline-variant/20">
              <button
                id="btn-step1-next"
                type="submit"
                className="px-6 py-3 bg-primary hover:bg-primary-container text-white font-extrabold text-xs rounded-xl transition-all shadow-sm shadow-primary/20 flex items-center gap-2 cursor-pointer"
              >
                <span>{t('onboarding.next_step2', 'Continuar a Selección de Plan')}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* PASO 2: SELECCIÓN DE PLAN (Starter, Growth, Enterprise)                    */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-extrabold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                Paso 2 de 3: Suscripción
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-on-surface mt-2 tracking-tight">
                {t('onboarding.select_plan_title', 'Selecciona el Plan para tu Clínica')}
              </h2>
              <p className="text-xs text-on-surface-variant mt-1">
                {t('onboarding.select_plan_desc', 'Todos los planes incluyen 7 días de prueba completa. Puedes cambiar de plan en cualquier momento.')}
              </p>
            </div>

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PRICING_PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <div
                    key={plan.id}
                    id={`plan-card-${plan.id}`}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-primary/5 border-primary shadow-md shadow-primary/10 scale-[1.02]'
                        : 'bg-surface-container-low border-outline-variant/30 hover:border-outline-variant hover:bg-surface-container'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase text-on-surface">{plan.name}</span>
                        {plan.popular && (
                          <span className="text-[9px] bg-primary text-white font-black px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}
                      </div>

                      <p className="text-xl font-black text-primary">
                        ${(plan.price_cop || 119000).toLocaleString('es-CO')} COP
                      </p>
                      <p className="text-[11px] text-on-surface-variant font-bold mt-1">
                        {plan.max_users === 1 ? '1 Profesional' : `Hasta ${plan.max_users} profesionales`}
                      </p>
                      <p className="text-[11px] text-on-surface-variant/80 mt-1 line-clamp-2">
                        {plan.tagline}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-outline-variant/20 text-[11px] text-on-surface-variant space-y-1.5">
                      <p className="flex items-center gap-1 font-semibold">
                        <span className="material-symbols-outlined text-primary text-xs">check_circle</span>
                        <span>7 Días de Trial ($0 Hoy)</span>
                      </p>
                      <p className="flex items-center gap-1 font-semibold">
                        <span className="material-symbols-outlined text-primary text-xs">check_circle</span>
                        <span>Mapa Anatómico 2D</span>
                      </p>
                      <p className="flex items-center gap-1 font-semibold">
                        <span className="material-symbols-outlined text-primary text-xs">check_circle</span>
                        <span>Multi-Lenguaje (ES/EN/PT)</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trial Banner */}
            <div className="p-4 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary text-2xl">verified</span>
              <div className="text-xs">
                <p className="font-extrabold text-secondary">Período de Prueba Garantizado</p>
                <p className="text-on-surface-variant">
                  Tu clínica iniciará con el plan <strong className="text-on-surface">{selectedPlan.name}</strong> durante 7 días sin costo.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>Volver a Datos Clínica</span>
              </button>
              <button
                id="btn-step2-next"
                type="button"
                onClick={handleNextStep2}
                className="px-6 py-3 bg-primary hover:bg-primary-container text-white font-extrabold text-xs rounded-xl transition-all shadow-sm shadow-primary/20 flex items-center gap-2 cursor-pointer"
              >
                <span>Continuar a Registro Admin</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 3: REGISTRO DEL ADMIN (Email, Password, Teléfono, Rol Admin)          */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <form onSubmit={handleCompleteOnboarding} className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-extrabold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                Paso 3 de 3: Cuenta Administrador
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-on-surface mt-2 tracking-tight">
                {t('onboarding.admin_account_title', 'Registro del Administrador (Admin)')}
              </h2>
              <p className="text-xs text-on-surface-variant mt-1">
                {t('onboarding.admin_account_desc', 'Crea las credenciales de acceso para el usuario con rol de Administrador de la clínica en Supabase.')}
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Nombre Completo del Admin */}
              <div>
                <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                  {t('onboarding.admin_fullname', 'Nombre Completo del Administrador')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-onboarding-admin-name"
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Ej: Dra. Marcela Lagos"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Email (Login) */}
              <div>
                <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                  {t('onboarding.admin_email', 'Correo Electrónico (Email de Acceso)')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-onboarding-admin-email"
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@tuclinica.com"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-black uppercase text-on-surface-variant">
                      {t('onboarding.password', 'Contraseña (Password)')} <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="input-onboarding-admin-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface focus:border-primary outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                    {t('onboarding.confirm_password', 'Confirmar Contraseña')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-onboarding-admin-password-confirm"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={adminPasswordConfirm}
                    onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface focus:border-primary outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* Teléfono Admin con Selector de País con Banderas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <PhoneInputWithCountry
                    id="input-onboarding-admin-phone"
                    label={t('onboarding.admin_phone', 'Teléfono Móvil del Admin')}
                    value={adminPhone}
                    onChange={(fullNumber) => setAdminPhone(fullNumber)}
                    placeholder="300 123 4567"
                    defaultCountryCode="CO"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                    {t('onboarding.admin_rut', 'DNI / Cédula / RUT')}
                  </label>
                  <input
                    id="input-onboarding-admin-rut"
                    type="text"
                    value={adminRut}
                    onChange={(e) => setAdminRut(e.target.value)}
                    placeholder="15.228.910-K"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-3 text-xs font-semibold text-on-surface focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              {/* Registro Profesional / Licencia */}
              <div>
                <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
                  {t('onboarding.license_number', 'Registro de Prestador de Salud / Licencia')} (Opcional)
                </label>
                <input
                  id="input-onboarding-admin-license"
                  type="text"
                  value={adminLicense}
                  onChange={(e) => setAdminLicense(e.target.value)}
                  placeholder="Ej: REG-SALUD-89201"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-3 text-xs font-semibold text-on-surface focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Resumen de Creación Supabase */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2 text-[11px]">
                <div className="flex items-center justify-between font-bold text-on-surface">
                  <span>Rol asignado:</span>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md font-mono uppercase">
                    admin / clinic_admin
                  </span>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span>Clínica (Tenant):</span>
                  <strong className="text-on-surface">{clinicName}</strong>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span>NIT / ID Fiscal:</span>
                  <strong className="font-mono text-on-surface">{clinicNit}</strong>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span>Plan Seleccionado:</span>
                  <strong className="text-primary uppercase">{selectedPlan.name} (7 Días Trial)</strong>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>Volver a Planes</span>
              </button>

              <button
                id="btn-finish-onboarding"
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 bg-primary hover:bg-primary-container text-white font-black text-xs rounded-xl transition-all shadow-md shadow-primary/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    <span>Creando Registro en Supabase...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">how_to_reg</span>
                    <span>Crear Clínica y Usuario Admin</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* PASO 4: CONFIRMACIÓN DE ÉXITO EN SUPABASE                                 */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="text-center py-8 space-y-5 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl text-emerald-600">verified</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
              ¡Clínica y Admin Registrados Exitosamente!
            </h2>

            <p className="text-xs sm:text-sm text-on-surface-variant max-w-lg mx-auto">
              Se ha creado el registro en <strong className="text-on-surface font-mono">tenants</strong> y{' '}
              <strong className="text-on-surface font-mono">users</strong> (rol <span className="text-primary font-bold">admin</span>) en Supabase para{' '}
              <strong className="text-on-surface">{clinicName}</strong> con NIT{' '}
              <strong className="font-mono text-on-surface">{clinicNit}</strong>.
            </p>

            {/* Verification Credentials Card */}
            <div className="max-w-md mx-auto p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-left text-xs space-y-2">
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Tenant ID:</span>
                <span className="font-mono font-bold text-primary">{createdTenant?.id || 'tenant_creado'}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Admin Login:</span>
                <span className="font-bold text-on-surface">{adminEmail}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Teléfono:</span>
                <span className="font-semibold text-on-surface">{adminPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Suscripción:</span>
                <span className="text-emerald-700 font-black uppercase">
                  {selectedPlan.name} • 7 Días de Trial Activo
                </span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="btn-go-to-dashboard"
                onClick={() => onNavigate('/pacientes')}
                className="w-full sm:w-auto px-6 py-3.5 bg-primary hover:bg-primary-container text-white font-black text-xs rounded-2xl transition-all shadow-md shadow-primary/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">dashboard</span>
                <span>Entrar al Panel de Pacientes</span>
              </button>

              <button
                id="btn-go-to-settings"
                onClick={() => onNavigate('/configuracion')}
                className="w-full sm:w-auto px-6 py-3.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-black text-xs rounded-2xl transition-all border border-outline-variant/30 cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">settings</span>
                <span>Configurar Clínica</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer info */}
      <footer className="max-w-4xl mx-auto w-full text-center text-[11px] text-on-surface-variant/70 pt-4">
        <p>KineSys SaaS • Plataforma Médica Multi-Tenant y Multi-País</p>
      </footer>
    </div>
  );
};
