import React from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useI18n } from '../../app/providers/I18nProvider';
import { useTheme } from '../../app/providers/ThemeProvider';
import { supabase } from '../../services/supabaseClient';

interface SideNavBarProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({ currentPath = '/calendario', onNavigate }) => {
  const { user, tenant, role, trialDaysLeft } = useAuth();
  const { activeLogoUrl } = useTheme();
  const { t } = useI18n();
  const isLocal = supabase.isUsingLocalEngine();

  // Dynamic navigation items based on the active RBAC role
  const getNavItemsForRole = () => {
    const commonAgenda = {
      id: 'nav-calendario',
      path: '/calendario',
      label: t('nav.calendar', 'Agenda & Citas'),
      icon: 'calendar_month',
      badge: 'Hoy',
    };
    const commonPacientes = {
      id: 'nav-pacientes',
      path: '/pacientes',
      label: t('nav.patients', 'Pacientes'),
      icon: 'group',
      badge: '5 Activos',
    };
    const painMap = {
      id: 'nav-mapa-dolor',
      path: '/mapa-dolor',
      label: t('nav.pain_map', 'Mapa de Dolor'),
      icon: 'accessibility_new',
      badge: 'Fisio',
    };
    const nutrition = {
      id: 'nav-nutricion',
      path: '/nutricion',
      label: t('nav.nutrition', 'Nutrición & InBody'),
      icon: 'nutrition',
      badge: 'Nutri',
    };
    const medicine = {
      id: 'nav-medicina-general',
      path: '/medicina-general',
      label: t('nav.general_medicine', 'Medicina General'),
      icon: 'stethoscope',
      badge: 'Médico',
    };
    const patientPortal = {
      id: 'nav-portal-paciente',
      path: '/portal-paciente',
      label: t('nav.patient_portal', 'Portal del Paciente'),
      icon: 'person',
      badge: 'B2C',
    };
    const settings = {
      id: 'nav-configuracion',
      path: '/configuracion',
      label: t('nav.settings', 'Gestión de Clínica'),
      icon: 'settings',
      badge: 'Admin',
    };
    const superAdmin = {
      id: 'nav-super-admin',
      path: '/super-admin',
      label: t('nav.super_admin', 'Super Admin SaaS'),
      icon: 'shield_person',
      badge: 'SaaS',
    };

    if (role === 'super_admin') {
      return [superAdmin, settings, commonAgenda, commonPacientes];
    }
    if (role === 'clinic_admin') {
      return [settings, commonAgenda, commonPacientes, painMap, nutrition, medicine];
    }
    if (role === 'nutricionista') {
      return [nutrition, commonAgenda, commonPacientes, patientPortal];
    }
    if (role === 'medico_general') {
      return [medicine, commonAgenda, commonPacientes, patientPortal];
    }
    if (role === 'patient') {
      return [patientPortal, commonAgenda];
    }
    // Default / Fisioterapeuta
    return [commonAgenda, commonPacientes, painMap, nutrition, medicine, settings];
  };

  const navItems = getNavItemsForRole();

  const handleNavClick = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.hash = path;
    }
  };

  return (
    <aside
      id="side-nav-bar"
      className="hidden md:flex flex-col w-72 h-screen fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant/30 z-30 clinical-shadow transition-all"
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between">
        <button
          onClick={() => handleNavClick('/landing')}
          className="flex items-center gap-3 text-left group cursor-pointer"
        >
          {activeLogoUrl ? (
            <div className="w-10 h-10 rounded-2xl overflow-hidden border border-outline-variant/40 bg-surface-container shadow-md shadow-primary/20 group-hover:scale-105 transition-transform flex items-center justify-center p-0.5">
              <img 
                src={activeLogoUrl} 
                alt={tenant?.name || 'Logo Clínica'} 
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-2xl font-bold">vital_signs</span>
            </div>
          )}
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-base text-on-surface tracking-tight leading-tight truncate">
                {tenant?.name?.split(' ')[0] || 'KineSys'}
              </h1>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                B2B2C
              </span>
            </div>
            <p className="text-[10px] text-on-surface-variant font-medium truncate">
              {tenant?.name || 'SaaS Clínico'}
            </p>
          </div>
        </button>
      </div>

      {/* Trial 7 Days Banner */}
      <div className="px-4 pt-3 pb-1">
        <div className="p-2.5 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-teal-700">timer</span>
            <div className="text-[11px] leading-tight">
              <p className="font-extrabold text-teal-950">Trial 7 Días</p>
              <p className="text-[10px] text-teal-800 font-medium">
                {trialDaysLeft} días restantes
              </p>
            </div>
          </div>
          <button
            onClick={() => handleNavClick('/configuracion')}
            className="text-[10px] font-extrabold text-white bg-primary hover:bg-teal-800 px-2 py-1 rounded-lg transition-colors cursor-pointer"
          >
            Wompi
          </button>
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 px-4 py-4 overflow-y-auto space-y-1.5">
        <div className="px-3 pb-1 flex items-center justify-between">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-outline">
            Módulos Clínicos
          </p>
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded">
            {role.replace('_', ' ')}
          </span>
        </div>

        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <button
              key={item.path}
              id={item.id}
              onClick={() => handleNavClick(item.path)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                isActive
                  ? 'bg-primary text-white shadow-sm shadow-primary/30'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`material-symbols-outlined text-lg ${
                    isActive ? 'text-white' : 'text-on-surface-variant'
                  }`}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Public Landing Shortcut */}
        <div className="pt-4 px-1">
          <button
            onClick={() => handleNavClick('/landing')}
            className="w-full flex items-center gap-2.5 p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 text-xs font-bold text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-primary text-base">storefront</span>
            <span className="flex-1 text-left">Landing & Precios</span>
            <span className="material-symbols-outlined text-sm text-on-surface-variant">arrow_outward</span>
          </button>
        </div>
      </div>

      {/* Database Sync Status in Sidebar */}
      <div className="px-4 py-2 border-t border-outline-variant/20 bg-surface-container-low/40">
        <div className="flex items-center justify-between text-[11px] font-bold text-on-surface-variant px-1 py-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isLocal ? 'bg-teal-500 animate-pulse' : 'bg-emerald-500'}`}></span>
            <span>{isLocal ? 'Supabase Local Sync' : 'Supabase Conectado'}</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-outline">DB Sync</span>
        </div>
      </div>

      {/* Authenticated User Footer */}
      <div className="p-3.5 border-t border-outline-variant/20 bg-surface-container-lowest">
        <div className="flex items-center gap-3 p-2 rounded-2xl bg-surface-container-low/50">
          <img
            src={user?.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150'}
            alt={user?.full_name || 'Profesional'}
            className="w-9 h-9 rounded-full object-cover border-2 border-primary/20 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-on-surface truncate">
              {user?.full_name?.split('(')[0] || 'Dr. Usuario'}
            </p>
            <p className="text-[10px] text-on-surface-variant capitalize truncate flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {role === 'fisioterapeuta' ? 'Fisioterapeuta' : (role === 'clinic_admin' ? 'Clinic Admin' : (role === 'super_admin' ? 'Super Admin' : role))}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

