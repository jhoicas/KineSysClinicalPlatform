import React, { useState } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useI18n } from '../../app/providers/I18nProvider';
import { LanguageSelector } from '../common/LanguageSelector';
import { PatientSearchCombobox } from '../common/PatientSearchCombobox';

interface TopNavBarProps {
  onOpenNewAppointment?: () => void;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({ onOpenNewAppointment, currentPath = '/calendario', onNavigate }) => {
  const { user, tenant, role } = useAuth();
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (path: string) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.hash = path;
    }
  };

  const navItems = [
    { path: '/calendario', label: t('nav.calendar', 'Agenda & Citas'), icon: 'calendar_month' },
    { path: '/pacientes', label: t('nav.patients', 'Pacientes'), icon: 'group' },
    { path: '/mapa-dolor', label: t('nav.pain_map', 'Mapa de Dolor'), icon: 'accessibility_new' },
    { path: '/nutricion', label: t('nav.nutrition', 'Nutrición'), icon: 'nutrition' },
    { path: '/medicina-general', label: t('nav.general_medicine', 'Medicina General'), icon: 'stethoscope' },
    { path: '/portal-paciente', label: t('nav.patient_portal', 'Portal Paciente'), icon: 'person' },
    { path: '/configuracion', label: t('nav.settings', 'Gestión Clínica'), icon: 'settings' },
  ];

  return (
    <header
      id="top-nav-bar"
      className="fixed top-0 right-0 left-0 md:left-72 h-16 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/30 z-20 flex items-center justify-between px-4 sm:px-6 transition-all gap-3"
    >
      {/* Mobile Menu Button & Clinic Title */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          id="btn-toggle-mobile-menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-on-surface-variant hover:text-primary rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer"
          aria-label="Abrir menú lateral"
        >
          <span className="material-symbols-outlined text-2xl">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
          <span className="text-xs font-black text-on-surface tracking-wide uppercase truncate max-w-[140px] sm:max-w-none">
            {tenant?.name || 'Clínica KineSys'}
          </span>
        </div>
      </div>

      {/* Global Active Patient Search / Pill (Desktop & Tablet) */}
      <div className="hidden lg:flex flex-1 max-w-md mx-2">
        <PatientSearchCombobox
          variant="compact"
          placeholder="Buscar o cambiar paciente activo..."
          onSelectPatient={(p) => {
            if (currentPath === '/calendario' && onNavigate) {
              // Optionally navigate or stay
            }
          }}
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Multi-language selector */}
        <LanguageSelector variant="compact" />

        {/* New Appointment Quick CTA */}
        {onOpenNewAppointment && (
          <button
            id="btn-quick-new-appointment"
            onClick={onOpenNewAppointment}
            className="flex items-center gap-1.5 bg-primary text-white hover:bg-primary-container px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shadow-primary/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span className="hidden sm:inline">{t('top.new_appointment', 'Nueva Cita')}</span>
          </button>
        )}

        {/* User Avatar Mini */}
        <div className="flex items-center gap-2 pl-2 border-l border-outline-variant/20">
          <img
            src={user?.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150'}
            alt="Usuario"
            className="w-8 h-8 rounded-full object-cover border border-outline-variant"
          />
          <div className="hidden sm:block text-left leading-none">
            <p className="text-xs font-bold text-on-surface">{user?.full_name?.split(' ')[0] || 'Dr. Usuario'}</p>
            <p className="text-[10px] text-on-surface-variant capitalize">{role.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu (Visible only on mobile when hamburger is clicked) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 bg-surface-container-lowest border-b border-outline-variant/30 shadow-xl p-4 space-y-2 z-50 animate-fadeIn max-h-[80vh] overflow-y-auto">
          <div className="px-2 pb-2 text-[11px] font-extrabold uppercase text-outline">
            Menú de Navegación
          </div>
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                  isActive ? 'bg-primary text-white' : 'text-on-surface hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
