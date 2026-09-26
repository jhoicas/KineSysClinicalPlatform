import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient';
import { useAuth } from '../../app/providers/AuthProvider';

interface WithingsAdminConfigProps {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

interface ProfessionalUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

const DEFAULT_REDIRECT_URI = 'https://clinicalplatform.ludoia.com/api/v1/hardware/withings/callback';

export function WithingsAdminConfig({ onSuccess, onError }: WithingsAdminConfigProps) {
  const { tenantId, user, role } = useAuth();

  const [nutritionists, setNutritionists] = useState<ProfessionalUser[]>([]);
  const [selectedNutritionistId, setSelectedNutritionistId] = useState<string>('');
  const [customNutritionistId, setCustomNutritionistId] = useState<string>('');
  const [isManualInput, setIsManualInput] = useState<boolean>(false);

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState(DEFAULT_REDIRECT_URI);
  const [showSecret, setShowSecret] = useState(false);

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusInfo, setStatusInfo] = useState<{
    configured: boolean;
    isConnected?: boolean;
    withingsUserId?: string;
  } | null>(null);

  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Cargar lista de profesionales/nutricionistas de la clínica
  useEffect(() => {
    async function fetchUsers() {
      setLoadingUsers(true);
      try {
        const users = await api.users.list({ tenant_id: tenantId || undefined });
        const eligible = users.filter((u: any) =>
          ['nutricionista', 'nutritionist', 'clinic_admin', 'professional', 'doctor'].includes(
            (u.role || '').toLowerCase()
          )
        );
        setNutritionists(eligible.length > 0 ? eligible : users);
        if (eligible.length > 0) {
          // Preseleccionar al usuario actual si es elegible, o el primero
          const currentInList = eligible.find((u) => u.id === user?.id);
          setSelectedNutritionistId(currentInList ? currentInList.id : eligible[0].id);
        } else if (user?.id) {
          setSelectedNutritionistId(user.id);
        }
      } catch (err: any) {
        console.warn('No se pudo cargar la lista de usuarios mediante api.users.list:', err);
        if (user?.id) {
          setSelectedNutritionistId(user.id);
        }
      } finally {
        setLoadingUsers(false);
      }
    }

    fetchUsers();
  }, [tenantId, user?.id]);

  // Cargar credenciales existentes para el usuario seleccionado
  const activeNutriId = isManualInput ? customNutritionistId.trim() : selectedNutritionistId;

  useEffect(() => {
    if (!activeNutriId) return;

    let mounted = true;
    async function loadCurrentConfig() {
      setLoadingConfig(true);
      try {
        const data = await api.hardware.getWithingsCredentials(activeNutriId, tenantId || undefined);
        if (!mounted) return;
        if (data && data.configured) {
          setClientId(data.client_id || '');
          setClientSecret(data.client_secret || '');
          if (data.redirect_uri) {
            setRedirectUri(data.redirect_uri);
          }
          setStatusInfo({
            configured: true,
            isConnected: !!data.is_connected,
            withingsUserId: data.withings_user_id,
          });
        } else {
          setStatusInfo({
            configured: false,
          });
        }
      } catch (err) {
        if (!mounted) return;
        setStatusInfo(null);
      } finally {
        if (mounted) setLoadingConfig(false);
      }
    }

    loadCurrentConfig();
    return () => {
      mounted = false;
    };
  }, [activeNutriId, tenantId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNutriId) {
      setAlert({ type: 'error', text: 'Selecciona o ingresa un Nutricionista / Profesional.' });
      return;
    }
    if (!clientId.trim()) {
      setAlert({ type: 'error', text: 'El WITHINGS_CLIENT_ID es obligatorio.' });
      return;
    }
    if (!clientSecret.trim()) {
      setAlert({ type: 'error', text: 'El WITHINGS_CLIENT_SECRET es obligatorio.' });
      return;
    }

    setSaving(true);
    setAlert(null);

    try {
      const res = await api.hardware.saveWithingsCredentials({
        tenant_id: tenantId || undefined,
        nutritionist_id: activeNutriId,
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        redirect_uri: redirectUri.trim() || DEFAULT_REDIRECT_URI,
      });

      const successMsg = res.message || 'Credenciales de Withings guardadas exitosamente.';
      setAlert({ type: 'success', text: successMsg });
      setStatusInfo((prev) => ({
        configured: true,
        isConnected: prev?.isConnected ?? false,
        withingsUserId: prev?.withingsUserId,
      }));
      if (onSuccess) onSuccess(successMsg);
    } catch (err: any) {
      const errorMsg = err?.message || 'Error al guardar las credenciales en el servidor.';
      setAlert({ type: 'error', text: errorMsg });
      if (onError) onError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setAlert({ type: 'info', text: 'URL de Callback copiada al portapapeles. Pégala en el portal de Withings Developer.' });
  };

  return (
    <div className="bg-surface-container-low rounded-3xl p-6 lg:p-8 border border-outline-variant/30 shadow-sm max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/20 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl shadow-inner">
            <span className="material-symbols-outlined text-3xl">scale</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-on-surface tracking-tight">
                Configuración Withings API
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Multi-Tenant
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Configura las credenciales de la aplicación Withings Developer para cada clínica y nutricionista.
            </p>
          </div>
        </div>

        {statusInfo?.configured && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>
              {statusInfo.isConnected ? 'Báscula Enlazada' : 'Credenciales Listas'}
            </span>
          </div>
        )}
      </div>

      {/* Alerta / Mensajes */}
      {alert && (
        <div
          className={`mb-6 p-4 rounded-2xl border flex items-center justify-between text-xs font-medium animate-fadeIn ${
            alert.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : alert.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-lg">
              {alert.type === 'success' ? 'check_circle' : alert.type === 'error' ? 'error' : 'info'}
            </span>
            <span>{alert.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlert(null)}
            className="opacity-70 hover:opacity-100 p-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Selección de Nutricionista / Profesional */}
        <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/20">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary">person</span>
              <span>Nutricionista / Profesional Asignado</span>
            </label>
            <button
              type="button"
              onClick={() => setIsManualInput(!isManualInput)}
              className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
            >
              {isManualInput ? 'Seleccionar de lista' : 'Ingresar UUID manual'}
            </button>
          </div>

          {isManualInput ? (
            <div>
              <input
                type="text"
                value={customNutritionistId}
                onChange={(e) => setCustomNutritionistId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-[10px] text-on-surface-variant mt-1 block">
                ID del usuario en kinesys.users para asociar las credenciales.
              </span>
            </div>
          ) : (
            <div className="relative">
              <select
                value={selectedNutritionistId}
                onChange={(e) => setSelectedNutritionistId(e.target.value)}
                disabled={loadingUsers}
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer disabled:opacity-50"
              >
                {nutritionists.map((nutri) => (
                  <option key={nutri.id} value={nutri.id}>
                    {nutri.name || nutri.email || nutri.id} {nutri.role ? `(${nutri.role})` : ''}
                  </option>
                ))}
              </select>
              {loadingUsers && (
                <div className="text-[10px] text-on-surface-variant mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                  Cargando profesionales...
                </div>
              )}
            </div>
          )}

          {tenantId && (
            <div className="mt-2 text-[10px] text-on-surface-variant flex items-center gap-1">
              <span className="font-semibold text-on-surface">Tenant ID:</span>
              <code className="bg-surface px-1.5 py-0.5 rounded border border-outline-variant/30 font-mono">
                {tenantId}
              </code>
            </div>
          )}
        </div>

        {/* Inputs de Credenciales Withings */}
        <div className="space-y-4">
          {/* CLIENT ID */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span>WITHINGS_CLIENT_ID</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-on-surface-variant">Desde Withings Developer Portal</span>
            </div>
            <input
              type="text"
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g. 5e9b3a... (Alphanumeric Client ID)"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            />
          </div>

          {/* CLIENT SECRET */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span>WITHINGS_CLIENT_SECRET</span>
                <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">
                  {showSecret ? 'visibility_off' : 'visibility'}
                </span>
                <span>{showSecret ? 'Ocultar' : 'Mostrar'}</span>
              </button>
            </div>
            <input
              type={showSecret ? 'text' : 'password'}
              required
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="e.g. 8f2c1b... (Client Secret)"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            />
          </div>

          {/* REDIRECT URI */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span>WITHINGS_REDIRECT_URI</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRedirectUri(DEFAULT_REDIRECT_URI)}
                  className="text-[10px] text-primary hover:underline cursor-pointer"
                >
                  Restablecer por defecto
                </button>
                <button
                  type="button"
                  onClick={copyRedirectUri}
                  className="text-[10px] text-on-surface-variant hover:text-on-surface flex items-center gap-0.5 cursor-pointer font-medium"
                >
                  <span className="material-symbols-outlined text-xs">content_copy</span>
                  Copiar
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="url"
                required
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              />
            </div>
            <p className="text-[10px] text-on-surface-variant mt-1.5 leading-relaxed">
              <strong>Importante:</strong> Esta URL exacta debe estar registrada en la sección{' '}
              <em>Callback URL</em> de tu aplicación en el portal de Withings Developers.
            </p>
          </div>
        </div>

        {/* Footer & Actions */}
        <div className="pt-4 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-primary">security</span>
            <span>Las credenciales se almacenan cifradas en la base de datos de la clínica.</span>
          </div>

          <button
            type="submit"
            disabled={saving || loadingConfig}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">save</span>
                <span>Guardar Credenciales</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
