import React, { useState, useEffect } from 'react';
import { useAuth } from '../app/providers/AuthProvider';
import { supabase, ALL_DEMO_TENANTS, PRICING_PLANS } from '../services/supabaseClient';
import { Tenant, PricingPlanConfig } from '../types';
import { SideNavBar } from '../components/layout/SideNavBar';
import { TopNavBar } from '../components/layout/TopNavBar';
import { RoleSwitcherBanner } from '../components/layout/RoleSwitcherBanner';

interface SuperAdminPageProps {
  onNavigate: (path: string) => void;
}

export const SuperAdminPage: React.FC<SuperAdminPageProps> = ({ onNavigate }) => {
  const { tenant, updateTenant } = useAuth();
  const [tenantsList, setTenantsList] = useState<Tenant[]>(ALL_DEMO_TENANTS);
  const [plans, setPlans] = useState<PricingPlanConfig[]>(PRICING_PLANS);
  const [globalWompiPublicKey, setGlobalWompiPublicKey] = useState('pub_prod_wompi_superadmin_master99');
  const [globalWompiPrivateKey, setGlobalWompiPrivateKey] = useState('prv_prod_wompi_secret_master00');
  const [isSandbox, setIsSandbox] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadAllTenants();
  }, []);

  const loadAllTenants = async () => {
    const { data } = await supabase.from('tenants').select('*');
    if (data && data.length > 0) {
      setTenantsList(data);
    }
  };

  const handleUpdatePrice = async (planId: string, newPriceCop: number) => {
    const updated = plans.map((p) => (p.id === planId ? { ...p, price_cop: newPriceCop } : p));
    setPlans(updated);
    await supabase.from('pricing_plans').update({ price_cop: newPriceCop }).eq('id', planId);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Metrics calculation
  const totalClinics = tenantsList.length;
  const trialingClinics = tenantsList.filter((t) => t.subscription_status === 'trialing').length;
  const activePaidClinics = tenantsList.filter((t) => t.subscription_status === 'active').length;
  const estimatedMRR = tenantsList.reduce((acc, t) => {
    const plan = plans.find((p) => p.id === t.subscription_plan);
    return acc + (plan ? (plan.price_cop || 119000) : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <SideNavBar currentPath="/super-admin" onNavigate={onNavigate} />

      <main className="flex-1 md:ml-72 pt-16 pb-20 px-4 sm:px-8 max-w-7xl mx-auto w-full space-y-8">
        <TopNavBar currentPath="/super-admin" onNavigate={onNavigate} />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-b border-outline-variant/30 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 text-xs font-black uppercase border border-rose-500/20">
                SaaS Super Admin
              </span>
              <span className="text-xs text-on-surface-variant font-mono">system.kinesys.cloud</span>
            </div>
            <h1 className="text-2xl font-black text-on-surface tracking-tight mt-1">
              Panel Global de Control SaaS & Clínicas
            </h1>
            <p className="text-xs text-on-surface-variant">
              Supervisa todas las clínicas registradas, ingresos mensuales por suscripción y configuración de la pasarela Wompi.
            </p>
          </div>

          <button
            onClick={() => onNavigate('/landing')}
            className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold rounded-xl transition-colors self-start sm:self-auto cursor-pointer"
          >
            Ver Landing Pública →
          </button>
        </div>

        {/* Global KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/30 space-y-1">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="text-xs font-bold uppercase tracking-wider">Total Clínicas</span>
              <span className="material-symbols-outlined text-primary">domain</span>
            </div>
            <p className="text-3xl font-black text-on-surface">{totalClinics}</p>
            <p className="text-[11px] text-emerald-600 font-bold">+2 este mes</p>
          </div>

          <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/30 space-y-1">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="text-xs font-bold uppercase tracking-wider">En Trial (7 Días)</span>
              <span className="material-symbols-outlined text-amber-600">hourglass_top</span>
            </div>
            <p className="text-3xl font-black text-amber-700">{trialingClinics}</p>
            <p className="text-[11px] text-on-surface-variant">Clínicas evaluando la plataforma</p>
          </div>

          <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/30 space-y-1">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="text-xs font-bold uppercase tracking-wider">Suscripciones Activas</span>
              <span className="material-symbols-outlined text-emerald-600">verified</span>
            </div>
            <p className="text-3xl font-black text-emerald-700">{activePaidClinics}</p>
            <p className="text-[11px] text-emerald-600 font-bold">Cobros automáticos vía Wompi</p>
          </div>

          <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/30 space-y-1">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="text-xs font-bold uppercase tracking-wider">MRR Proyectado</span>
              <span className="material-symbols-outlined text-primary">payments</span>
            </div>
            <p className="text-2xl font-black text-primary">${estimatedMRR.toLocaleString('es-CO')} COP</p>
            <p className="text-[11px] text-on-surface-variant">Ingreso mensual recurrente</p>
          </div>
        </div>

        {/* Section 1: All Registered Clinics Table */}
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-on-surface">Clínicas Registradas (Tenants)</h2>
              <p className="text-xs text-on-surface-variant">Base de datos de clínicas, estados de trial y usuarios asignados</p>
            </div>
            <button
              onClick={loadAllTenants}
              className="p-2 text-on-surface-variant hover:text-primary rounded-xl hover:bg-surface-container-high transition-colors"
              title="Refrescar lista"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 text-on-surface-variant font-bold uppercase text-[10px]">
                  <th className="py-3 px-3">Clínica / Subdominio</th>
                  <th className="py-3 px-3">Plan</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3">Límite Usuarios</th>
                  <th className="py-3 px-3">Trial Expira</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {tenantsList.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-bold text-on-surface">{t.name}</p>
                      <p className="text-[11px] text-on-surface-variant font-mono">{t.slug || t.id}.kinesys.cloud</p>
                    </td>
                    <td className="py-3 px-3 capitalize font-bold text-primary">
                      {t.subscription_plan}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          t.subscription_status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.subscription_status === 'trialing'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {t.subscription_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-on-surface font-semibold">
                      {t.max_users} usuarios
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant font-mono text-[11px]">
                      {t.trial_ends_at ? new Date(t.trial_ends_at).toLocaleDateString('es-CL') : 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onNavigate('/configuracion')}
                        className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Pricing Configuration & Global Wompi Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pricing Plans Editor */}
          <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 space-y-4">
            <h2 className="text-base font-extrabold text-on-surface">Configurar Precios de Paquetes SaaS</h2>
            <p className="text-xs text-on-surface-variant">Ajusta los precios mensuales en COP cobrados a través de Wompi</p>

            <div className="space-y-3">
              {plans.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-extrabold text-xs text-on-surface">{p.name}</p>
                    <p className="text-[11px] text-on-surface-variant">Máx {p.max_users} usuarios • 7 días trial</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-on-surface-variant">$</span>
                    <input
                      type="number"
                      defaultValue={p.price_cop || 119000}
                      onBlur={(e) => handleUpdatePrice(p.id, Number(e.target.value))}
                      className="w-32 bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-2.5 py-1.5 text-xs font-bold text-on-surface text-right"
                    />
                    <span className="text-[10px] text-on-surface-variant font-bold">COP</span>
                  </div>
                </div>
              ))}
            </div>
            {saveSuccess && (
              <p className="text-xs font-bold text-emerald-600">✓ Precios actualizados en Supabase</p>
            )}
          </div>

          {/* Global Wompi Credentials */}
          <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-on-surface">Credenciales Globales de Wompi</h2>
              <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                Pasarela Activa
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Llaves del Merchant Master para procesar suscripciones automáticas.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Llave Pública (Public Key)</label>
                <input
                  type="text"
                  value={globalWompiPublicKey}
                  onChange={(e) => setGlobalWompiPublicKey(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Llave Privada (Private Key)</label>
                <input
                  type="password"
                  value={globalWompiPrivateKey}
                  onChange={(e) => setGlobalWompiPrivateKey(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                <div>
                  <p className="font-bold text-on-surface">Modo Sandbox (Pruebas)</p>
                  <p className="text-[11px] text-on-surface-variant">Simula transacciones sin cobro real</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSandbox(!isSandbox)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    isSandbox ? 'bg-teal-600' : 'bg-outline-variant'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      isSandbox ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={() => {
                  setSaveSuccess(true);
                  setTimeout(() => setSaveSuccess(false), 2000);
                }}
                className="w-full py-2.5 bg-primary hover:bg-teal-800 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Guardar Configuración Wompi
              </button>
            </div>
          </div>
        </div>
      </main>

      <RoleSwitcherBanner onNavigate={onNavigate} currentPath="/super-admin" />
    </div>
  );
};
