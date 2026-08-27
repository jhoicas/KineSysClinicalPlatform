import React, { useState, useEffect } from 'react';
import { useAuth } from '../app/providers/AuthProvider';
import { useI18n } from '../app/providers/I18nProvider';
import { supabase, INITIAL_TENANT } from '../services/supabaseClient';
import { SideNavBar } from '../components/layout/SideNavBar';
import { TopNavBar } from '../components/layout/TopNavBar';
import { PhoneInputWithCountry } from '../components/common/PhoneInputWithCountry';
import { ToastContainer, ToastMessage } from '../components/common/Toast';
import { BrandingCustomizer } from '../components/settings/BrandingCustomizer';
import { Tenant } from '../types';

interface SettingsPageProps {
  onNavigate?: (path: string) => void;
}

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  const { tenantId, updateTenant } = useAuth();
  const { t, locale, setLocale, selectedCountry, setSelectedCountry, countries, availableLocales } = useI18n();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'branding' | 'general' | 'database'>('branding');

  // Form Fields State
  const [clinicName, setClinicName] = useState('');
  const [timezone, setTimezone] = useState('America/Bogota (UTC-5)');
  const [cancellationWindowHours, setCancellationWindowHours] = useState<number>(24);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [appointmentDuration, setAppointmentDuration] = useState<number>(45);
  const [currency, setCurrency] = useState('COP');

  // Supabase Custom Credentials State
  const [customSupabaseUrl, setCustomSupabaseUrl] = useState(
    localStorage.getItem('kinesys_supabase_url') || ''
  );
  const [customSupabaseKey, setCustomSupabaseKey] = useState(
    localStorage.getItem('kinesys_supabase_key') || ''
  );

  // Alerts / Toasts State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  useEffect(() => {
    fetchTenantSettings();
  }, [tenantId]);

  const fetchTenantSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error && !data) {
        throw error;
      }

      const tenantData: Tenant = data || INITIAL_TENANT;
      setTenant(tenantData);
      setClinicName(tenantData.name || '');
      setTimezone(tenantData.timezone || 'America/Bogota (UTC-5)');
      setCancellationWindowHours(tenantData.cancellation_window_hours ?? 24);
      setEmail(tenantData.email || '');
      setPhone(tenantData.phone || '');
      setAddress(tenantData.address || '');
      setAppointmentDuration(tenantData.appointment_duration_minutes ?? 45);
      setCurrency(tenantData.currency || 'COP');
    } catch (err) {
      console.error('Error fetching tenant settings:', err);
      addToast('error', t('common.error', 'Error al cargar ajustes'), 'Se usarán los valores predeterminados.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessBanner(null);

    try {
      const updates = {
        name: clinicName,
        timezone,
        cancellation_window_hours: Number(cancellationWindowHours),
        email,
        phone,
        address,
        appointment_duration_minutes: Number(appointmentDuration),
        currency,
      };

      const { data, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', tenantId);

      if (error) throw error;

      await updateTenant(updates);

      setSuccessBanner(t('common.save_success', 'Ajustes guardados con éxito en la base de datos.'));
      addToast('success', t('settings.save_success', 'Configuración Actualizada'), 'Los ajustes se aplicaron inmediatamente.');
    } catch (err: any) {
      console.error('Error updating tenant:', err);
      addToast('error', t('common.error', 'Error al guardar'), err?.message || 'Ocurrió un problema al guardar los ajustes.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSupabaseUrl && customSupabaseKey) {
      localStorage.setItem('kinesys_supabase_url', customSupabaseUrl.trim());
      localStorage.setItem('kinesys_supabase_key', customSupabaseKey.trim());
      addToast('success', t('common.success', 'Credenciales Guardadas'), 'Recarga para conectar.');
    } else {
      localStorage.removeItem('kinesys_supabase_url');
      localStorage.removeItem('kinesys_supabase_key');
      addToast('info', 'Supabase Local', 'Usando almacenamiento local.');
    }
  };

  const handleResetDemoData = () => {
    supabase.resetLocalDatabase();
    fetchTenantSettings();
    addToast('info', t('common.reset', 'Datos Reiniciados'), 'La base de datos se restauró con el conjunto de pruebas inicial.');
  };

  const timezones = [
    'America/Bogota (UTC-5)',
    'America/Santiago (UTC-3)',
    'America/Buenos_Aires (UTC-3)',
    'America/Lima (UTC-5)',
    'America/Mexico_City (UTC-6)',
    'America/Madrid (UTC+1)',
    'America/New_York (UTC-5)',
    'America/Sao_Paulo (UTC-3)',
  ];

  return (
    <div className="min-h-screen flex bg-background font-sans text-on-background overflow-hidden">
      <SideNavBar currentPath="/configuracion" onNavigate={onNavigate} />

      <main className="flex-1 ml-0 md:ml-72 flex flex-col h-screen overflow-hidden">
        <TopNavBar currentPath="/configuracion" onNavigate={onNavigate} />

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto pt-[80px] pb-12 px-6 md:px-10">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary/10 text-primary material-symbols-outlined text-2xl">
                  settings
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight">
                  {t('settings.title', 'Configuración de la Clínica')}
                </h2>
              </div>
              <p className="text-sm text-on-surface-variant mt-1">
                {t('settings.subtitle', 'Administra los parámetros de la clínica, zona horaria y políticas.')}
              </p>
            </div>

            <button
              onClick={handleResetDemoData}
              className="bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/30 text-xs font-bold text-on-surface-variant hover:text-primary px-3.5 py-2 rounded-2xl flex items-center gap-2 clinical-shadow cursor-pointer transition-all"
              title="Restaurar datos iniciales de prueba"
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              {t('common.reset', 'Restaurar Datos')}
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b border-outline-variant/20 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('branding')}
              className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'branding'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-base">palette</span>
              <span>Marca y Personalización (Branding)</span>
            </button>

            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'general'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-base">tune</span>
              <span>{t('settings.general_settings', 'Parámetros Generales')}</span>
            </button>
          </div>

          {/* Success Banner Alert */}
          {successBanner && (
            <div
              id="settings-success-alert"
              className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between animate-fadeIn shadow-xs"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl text-emerald-600">check_circle</span>
                <div>
                  <h4 className="font-extrabold text-sm text-emerald-950">{t('common.success', '¡Actualización Exitosa!')}</h4>
                  <p className="text-xs text-emerald-800">{successBanner}</p>
                </div>
              </div>
              <button
                onClick={() => setSuccessBanner(null)}
                className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center py-24 opacity-70">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
              <p className="text-xs font-bold mt-2 text-on-surface-variant">{t('common.loading', 'Cargando configuración...')}</p>
            </div>
          ) : activeTab === 'branding' ? (
            <BrandingCustomizer
              onSuccessToast={(title, msg) => addToast('success', title, msg)}
              onErrorToast={(title, msg) => addToast('error', title, msg)}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Form: Main Tenant Settings (8 cols) */}
              <div className="lg:col-span-8 bg-surface-container-lowest rounded-3xl border border-outline-variant/30 clinical-shadow p-6 md:p-8">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-outline-variant/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">tune</span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-on-surface">
                        {t('settings.general_settings', 'Parámetros de Operación')}
                      </h3>
                      <p className="text-xs text-on-surface-variant">
                        Tenant ID: <strong className="font-mono text-primary">{tenantId}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-6">
                  {/* Clinic Name */}
                  <div>
                    <label className="block text-xs font-black uppercase text-on-surface-variant mb-2">
                      {t('settings.clinic_name', 'Nombre de la Clínica / Centro')}
                    </label>
                    <input
                      id="input-clinic-name"
                      type="text"
                      required
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-2xl p-3.5 text-sm font-bold text-on-surface outline-none focus:border-primary transition-all"
                    />
                  </div>

                  {/* Timezone & Cancellation Window */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-on-surface-variant mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-primary">schedule</span>
                        {t('settings.timezone', 'Zona Horaria')}
                      </label>
                      <select
                        id="input-timezone"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/40 rounded-2xl p-3.5 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer transition-all"
                      >
                        {timezones.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-on-surface-variant mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-primary">history_toggle_off</span>
                        {t('settings.cancellation_window', 'Ventana de Cancelación (Horas)')}
                      </label>
                      <div className="relative">
                        <input
                          id="input-cancellation-window"
                          type="number"
                          min="0"
                          max="168"
                          required
                          value={cancellationWindowHours}
                          onChange={(e) => setCancellationWindowHours(Number(e.target.value))}
                          className="w-full bg-surface-container-low border border-outline-variant/40 rounded-2xl p-3.5 text-sm font-bold text-on-surface outline-none focus:border-primary pr-16 transition-all"
                        />
                        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-xs font-bold text-outline">
                          {t('settings.hours', 'horas')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Duration & Currency */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-on-surface-variant mb-2">
                        {t('settings.session_duration', 'Duración Estándar de Sesión')}
                      </label>
                      <select
                        value={appointmentDuration}
                        onChange={(e) => setAppointmentDuration(Number(e.target.value))}
                        className="w-full bg-surface-container-low border border-outline-variant/40 rounded-2xl p-3.5 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
                      >
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>60 min</option>
                        <option value={90}>90 min</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-on-surface-variant mb-2">
                        {t('settings.currency', 'Moneda')}
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/40 rounded-2xl p-3.5 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
                      >
                        <option value="COP">COP ($ - Colombia)</option>
                        <option value="USD">USD ($ - EE. UU.)</option>
                        <option value="CLP">CLP ($ - Chile)</option>
                        <option value="EUR">EUR (€ - Europa)</option>
                        <option value="MXN">MXN ($ - México)</option>
                        <option value="BRL">BRL (R$ - Brasil)</option>
                      </select>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-on-surface-variant mb-2">
                        {t('settings.contact_email', 'Email Institucional')}
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/40 rounded-2xl p-3.5 text-xs font-semibold text-on-surface outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <PhoneInputWithCountry
                        label={t('phone.reception_label', 'Teléfono de Recepción')}
                        value={phone}
                        onChange={(fullNumber) => setPhone(fullNumber)}
                        placeholder="300 123 4567"
                        defaultCountryCode="CO"
                      />
                    </div>
                  </div>

                  {/* Multi-Language & Multi-Country System Defaults */}
                  <div className="p-4 bg-surface-container-low/70 border border-outline-variant/30 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-on-surface">
                      <span className="material-symbols-outlined text-base text-primary">public</span>
                      <span>{t('settings.regional_settings', 'Configuración Regional & Multi-Lenguaje')}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
                          {t('settings.interface_language', 'Idioma de la Interfaz')}
                        </label>
                        <select
                          value={locale}
                          onChange={(e) => setLocale(e.target.value as any)}
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-3 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
                        >
                          {availableLocales.map((loc) => (
                            <option key={loc.code} value={loc.code}>
                              {loc.flag} {loc.nativeLabel} ({loc.code.toUpperCase()})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
                          {t('settings.primary_country', 'País Principal de Operación')}
                        </label>
                        <select
                          value={selectedCountry.code}
                          onChange={(e) => {
                            const found = countries.find((c) => c.code === e.target.value);
                            if (found) setSelectedCountry(found);
                          }}
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-3 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
                        >
                          {countries.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.name} ({c.dial_code})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-black uppercase text-on-surface-variant mb-2">
                      {t('settings.address', 'Dirección de la Sede')}
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-2xl p-3.5 text-xs font-semibold text-on-surface outline-none focus:border-primary"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-outline-variant/20 flex justify-end">
                    <button
                      id="btn-save-settings"
                      type="submit"
                      disabled={saving}
                      className="bg-primary hover:bg-primary-container text-white font-extrabold text-xs px-6 py-3.5 rounded-2xl shadow-md shadow-primary/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-base">sync</span>
                          {t('common.saving', 'Guardando...')}
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base">save</span>
                          {t('settings.save_button', 'Guardar Configuración')}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Supabase & DB Info Card (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Database State Card */}
                <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 clinical-shadow p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">database</span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-on-surface">Supabase Engine</h4>
                      <p className="text-[11px] text-on-surface-variant">PostgreSQL Multi-Tenant</p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/20 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Tablas:</span>
                      <strong className="font-mono text-primary">users, appointments, tenants</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Modo:</span>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-extrabold text-[10px]">
                        {t('patients.active_status', 'Activo')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cloud Supabase Connect Card */}
                <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 clinical-shadow p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">cloud_sync</span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-on-surface">Conectar Proyecto Supabase</h4>
                      <p className="text-[11px] text-on-surface-variant">Opcional para nube externa</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveSupabaseConfig} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-on-surface-variant mb-1">
                        SUPABASE_URL
                      </label>
                      <input
                        type="text"
                        placeholder="https://xyzcompany.supabase.co"
                        value={customSupabaseUrl}
                        onChange={(e) => setCustomSupabaseUrl(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-on-surface-variant mb-1">
                        SUPABASE_ANON_KEY
                      </label>
                      <input
                        type="password"
                        placeholder="eyJhbGciOi..."
                        value={customSupabaseKey}
                        onChange={(e) => setCustomSupabaseKey(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      {t('common.save', 'Guardar')}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
