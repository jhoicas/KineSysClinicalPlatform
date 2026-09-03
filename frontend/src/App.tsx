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
import { AdminAccessControl } from './pages/AdminAccessControl';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

export function App() {
  const getCleanPath = () => {
    const hash = window.location.hash.replace(/^#/, '');
    if (
      hash.startsWith('access_token=') ||
      hash.startsWith('access_token') ||
      hash.includes('access_token=') ||
      hash.startsWith('error=') ||
      hash.startsWith('error_description')
    ) {
      return 'oauth-callback';
    }
    return hash || '/landing';
  };

  const [currentPath, setCurrentPath] = useState<string>(getCleanPath);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(getCleanPath());
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
      case 'oauth-callback':
        return (
          <div className="flex h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-on-surface-variant font-bold text-xs">Validando autenticación segura...</p>
            </div>
          </div>
        );
      // ─── RUTAS PÚBLICAS (Sin autenticación requerida) ───
      case '/login':
        return <LoginPage onNavigate={handleNavigate} />;
      case '/':
      case '/landing':
        return <LandingPage onNavigate={handleNavigate} />;
      case '/onboarding':
      case '/registro':
        return <OnboardingPage onNavigate={handleNavigate} />;
      case '/portal-paciente':
        return <PatientPortalPage onNavigate={handleNavigate} />;

      // ─── RUTAS PRIVADAS (Protegidas por Sesión y RBAC Dinámico) ───
      case '/super-admin':
        return (
          <ProtectedRoute path="/super-admin" onNavigate={handleNavigate}>
            <SuperAdminPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/nutricion':
        return (
          <ProtectedRoute path="/nutricion" onNavigate={handleNavigate}>
            <NutricionistaPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/medicina-general':
      case '/doctor-dashboard':
        return (
          <ProtectedRoute path="/medicina-general" onNavigate={handleNavigate}>
            <DoctorDashboard onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/calendario':
        return (
          <ProtectedRoute path="/calendario" onNavigate={handleNavigate}>
            <CalendarPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/pacientes':
        return (
          <ProtectedRoute path="/pacientes" onNavigate={handleNavigate}>
            <PatientsPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/mapa-dolor':
        return (
          <ProtectedRoute path="/mapa-dolor" onNavigate={handleNavigate}>
            <DemoPainMapPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/admin-access':
        return (
          <ProtectedRoute path="/admin-access" onNavigate={handleNavigate}>
            <AdminAccessControl onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/configuracion':
        return (
          <ProtectedRoute path="/configuracion" onNavigate={handleNavigate}>
            <SettingsPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      default:
        return (
          <ProtectedRoute path={currentPath} onNavigate={handleNavigate}>
            <CalendarPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
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
