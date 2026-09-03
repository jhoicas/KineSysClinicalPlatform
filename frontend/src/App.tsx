import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './app/providers/AuthProvider';
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
import { HistoriaClinicaPage } from './pages/HistoriaClinicaPage';
import { EvaluacionKinesicaPage } from './pages/EvaluacionKinesicaPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function isOAuthFragment(path: string): boolean {
  return (
    path.includes('access_token=') ||
    path.includes('refresh_token=') ||
    path.startsWith('error=') ||
    path.includes('error_description')
  );
}

function AppRouter() {
  const { user, needsOnboarding, allowedModules, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(
    () => window.location.hash.replace(/^#/, '') || '/landing'
  );

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash.replace(/^#/, '') || '/landing');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (path: string) => {
    window.location.hash = path;
    setCurrentPath(path);
  };

  useEffect(() => {
    if (loading || !user || isOAuthFragment(currentPath)) return;

    const publicPaths = ['/login', '/landing', '/', ''];
    if (!publicPaths.includes(currentPath)) return;

    if (needsOnboarding) {
      handleNavigate('/onboarding');
      return;
    }
    if (allowedModules && allowedModules.length > 0) {
      handleNavigate(allowedModules[0].path_route);
    }
  }, [user, loading, currentPath, needsOnboarding, allowedModules]);

  if (isOAuthFragment(currentPath)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-on-surface-variant font-bold text-xs">Validando credenciales seguras...</p>
        </div>
      </div>
    );
  }

  const defaultFallback = allowedModules[0]?.path_route || '/calendario';

  const renderCurrentView = () => {
    switch (currentPath) {
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
      case '/super-admin':
        return (
          <ProtectedRoute path="/super-admin" onNavigate={handleNavigate} fallbackPath={defaultFallback}>
            <SuperAdminPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/nutricion':
        return (
          <ProtectedRoute path="/nutricion" onNavigate={handleNavigate} fallbackPath={defaultFallback}>
            <NutricionistaPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/medicina-general':
      case '/doctor-dashboard':
        return (
          <ProtectedRoute path="/medicina-general" onNavigate={handleNavigate} fallbackPath={defaultFallback}>
            <DoctorDashboard onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/calendario':
        return (
          <ProtectedRoute path="/calendario" onNavigate={handleNavigate} fallbackPath={defaultFallback}>
            <CalendarPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/pacientes':
        return (
          <ProtectedRoute path="/pacientes" onNavigate={handleNavigate} fallbackPath={defaultFallback}>
            <PatientsPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/mapa-dolor':
        return (
          <ProtectedRoute path="/mapa-dolor" onNavigate={handleNavigate} fallbackPath={defaultFallback}>
            <DemoPainMapPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/historia-clinica':
        return (
          <ProtectedRoute path="/historia-clinica" onNavigate={handleNavigate} fallbackPath={defaultFallback}>
            <HistoriaClinicaPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/evaluacion-kinesica':
        return (
          <ProtectedRoute path="/evaluacion-kinesica" onNavigate={handleNavigate} fallbackPath={defaultFallback}>
            <EvaluacionKinesicaPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/admin-access':
        return (
          <ProtectedRoute path="/admin-access" onNavigate={handleNavigate} fallbackPath={defaultFallback}>
            <AdminAccessControl onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/configuracion':
        return (
          <ProtectedRoute path="/configuracion" onNavigate={handleNavigate} fallbackPath={defaultFallback}>
            <SettingsPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      default:
        return (
          <ProtectedRoute path={currentPath} onNavigate={handleNavigate} fallbackPath={defaultFallback}>
            <CalendarPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
    }
  };

  return <>{renderCurrentView()}</>;
}

export function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <ThemeProvider>
          <div className="min-h-screen bg-background text-on-background font-sans antialiased selection:bg-primary selection:text-white">
            <AppRouter />
          </div>
        </ThemeProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
