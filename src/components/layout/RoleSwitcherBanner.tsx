import React, { useState } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useI18n } from '../../app/providers/I18nProvider';
import { UserRole } from '../../types';

interface RoleSwitcherBannerProps {
  onNavigate: (path: string) => void;
  currentPath: string;
}

export const RoleSwitcherBanner: React.FC<RoleSwitcherBannerProps> = ({ onNavigate, currentPath }) => {
  const { user, role, availableUsers, setUserAndRole, tenant, trialDaysLeft, isTrialExpired } = useAuth();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const rolesCatalog: Array<{
    role: UserRole;
    userId: string;
    label: string;
    description: string;
    targetRoute: string;
    badgeColor: string;
    icon: string;
  }> = [
    {
      role: 'clinic_admin',
      userId: 'user_admin_01',
      label: t('role.clinic_admin', 'Clinic Admin'),
      description: t('role.clinic_admin_desc', 'Gestión de clínica, equipo, trial 7 días & pagos Wompi'),
      targetRoute: '/configuracion',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: 'admin_panel_settings',
    },
    {
      role: 'fisioterapeuta',
      userId: 'prof_mateo_01',
      label: t('role.fisioterapeuta', 'Fisioterapeuta / Kinesiólogo'),
      description: t('role.fisioterapeuta_desc', 'Mapa de Dolor 2D interactivo, agenda y evolución'),
      targetRoute: '/mapa-dolor',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
      icon: 'accessibility_new',
    },
    {
      role: 'nutricionista',
      userId: 'prof_nutri_01',
      label: t('role.nutricionista', 'Nutricionista'),
      description: t('role.nutricionista_desc', 'Composición corporal InBody, macros y plan alimenticio'),
      targetRoute: '/nutricion',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: 'nutrition',
    },
    {
      role: 'medico_general',
      userId: 'prof_doctor_01',
      label: t('role.medico_general', 'Médico General'),
      description: t('role.medico_general_desc', 'Signos vitales, recetas médicas y órdenes de exámenes'),
      targetRoute: '/medicina-general',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
      icon: 'stethoscope',
    },
    {
      role: 'patient',
      userId: 'pat_camila_01',
      label: t('role.patient', 'Paciente (Portal B2C)'),
      description: t('role.patient_desc', 'Auto-agendamiento con filtro de profesionales y citas'),
      targetRoute: '/portal-paciente',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      icon: 'person',
    },
    {
      role: 'super_admin',
      userId: 'user_superadmin_01',
      label: t('role.super_admin', 'Super Admin SaaS'),
      description: t('role.super_admin_desc', 'Métricas de todas las clínicas, planes & Wompi global'),
      targetRoute: '/super-admin',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: 'shield_person',
    },
  ];

  const handleSelectRole = (userId: string, targetRoute: string) => {
    setUserAndRole(userId);
    setIsOpen(false);
    onNavigate(targetRoute);
  };

  const currentRoleInfo = rolesCatalog.find((r) => r.role === role) || rolesCatalog[1];

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Floating Trigger Pill */}
      <div className="relative">
        <button
          id="btn-open-role-switcher"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 bg-slate-900/95 hover:bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700/60 backdrop-blur-md transition-all hover:scale-105 cursor-pointer text-xs font-bold"
        >
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
          </span>
          <span className="text-slate-300">{t('role.current_role', 'Rol Activo')}:</span>
          <span className="text-teal-300 font-extrabold">{currentRoleInfo.label}</span>
          <span className="material-symbols-outlined text-sm text-slate-400">
            {isOpen ? 'expand_more' : 'unfold_more'}
          </span>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute bottom-12 right-0 w-80 sm:w-96 bg-surface-container-lowest border border-outline-variant/40 rounded-3xl shadow-2xl p-4 space-y-2 mb-2 animate-scaleUp z-50">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30 px-1">
              <div>
                <p className="text-xs font-black text-on-surface uppercase tracking-wider">
                  {t('role.switcher_title', 'Simulador de Roles (RBAC)')}
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  {t('role.switcher_desc', 'Prueba la experiencia de cada usuario en el SaaS')}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                B2B2C
              </span>
            </div>

            {/* Trial status indicator inside widget */}
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-base">hourglass_top</span>
                <div>
                  <p className="font-bold text-amber-900">{t('nav.trial_badge', 'Período de Prueba Activo')}</p>
                  <p className="text-amber-800 text-[10px]">
                    {trialDaysLeft > 0 ? `${trialDaysLeft} ${t('nav.trial_remaining', 'días restantes')}` : t('nav.trial_expired', 'Trial finalizado - Exige Wompi')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigate('/landing');
                }}
                className="text-[10px] font-bold text-primary hover:underline"
              >
                {t('common.view', 'Ver')}
              </button>
            </div>

            {/* List of Roles */}
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {rolesCatalog.map((r) => {
                const isSelected = role === r.role;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => handleSelectRole(r.userId, r.targetRoute)}
                    className={`w-full text-left p-2.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-xs'
                        : 'bg-surface-container-low/60 border-outline-variant/20 hover:border-primary/50 hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-surface-container-highest flex items-center justify-center text-on-surface shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-base">{r.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-on-surface truncate">{r.label}</span>
                        {isSelected && (
                          <span className="text-[10px] font-black text-primary uppercase">{t('role.current_role', 'Activo')}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-tight line-clamp-2 mt-0.5">
                        {r.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Landing / Onboarding links */}
            <div className="pt-2 border-t border-outline-variant/20 flex gap-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigate('/landing');
                }}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-[11px] font-bold text-on-surface text-center transition-colors"
              >
                {t('nav.landing', 'Landing Page')}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigate('/onboarding');
                }}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-primary hover:bg-teal-800 text-[11px] font-bold text-white text-center transition-colors"
              >
                {t('onboarding.title', 'Onboarding Clínica')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
