import React, { useState, useEffect } from 'react';
import { AuthProvider } from './app/providers/AuthProvider';
import { I18nProvider } from './app/providers/I18nProvider';
import { ThemeProvider } from './app/providers/ThemeProvider';
import { CalendarPage } from './pages/CalendarPage';
import { PatientsPage } from './pages/PatientsPage';
import { DemoPainMapPage } from './pages/DemoPainMapPage';
import { SettingsPage } from './pages/SettingsPage';
import { LandingPage } from './pages/LandingPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { PatientPortalPage } from './pages/PatientPortalPage';
import { NutricionistaPage } from './pages/NutricionistaPage';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { LoginPage } from './pages/LoginPage';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const hash = window.location.hash.replace(/^#/, '');
    return hash || '/calendario';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash) {
        setCurrentPath(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (path: string) => {
    window.location.hash = path;
    setCurrentPath(path);
  };

  const renderCurrentView = () => {
    switch (currentPath) {
      case '/login':
        return <LoginPage onNavigate={handleNavigate} />;
      case '/landing':
        return <LandingPage onNavigate={handleNavigate} />;
      case '/onboarding':
        return <OnboardingPage onNavigate={handleNavigate} />;
      case '/super-admin':
        return <SuperAdminPage onNavigate={handleNavigate} />;
      case '/portal-paciente':
        return <PatientPortalPage onNavigate={handleNavigate} />;
      case '/nutricion':
        return <NutricionistaPage onNavigate={handleNavigate} />;
      case '/medicina-general':
      case '/doctor-dashboard':
        return <DoctorDashboard onNavigate={handleNavigate} />;
      case '/calendario':
        return <CalendarPage onNavigate={handleNavigate} />;
      case '/pacientes':
        return <PatientsPage onNavigate={handleNavigate} />;
      case '/mapa-dolor':
        return <DemoPainMapPage onNavigate={handleNavigate} />;
      case '/configuracion':
        return <SettingsPage onNavigate={handleNavigate} />;
      default:
        return <CalendarPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <I18nProvider>
      <AuthProvider>
        <ThemeProvider>
          <div className="min-h-screen bg-background text-on-background font-sans antialiased selection:bg-primary selection:text-white">
            {renderCurrentView()}
          </div>
        </ThemeProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
