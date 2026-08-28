import React from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useAppStore } from '../../store/useAppStore';

interface ProtectedRouteProps {
  path: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
  fallbackPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  path,
  onNavigate,
  children,
  fallbackPath = '/calendario',
}) => {
  const { user, loading, role, allowedModules } = useAuth();
  const isRouteAllowed = useAppStore((state) => state.isRouteAllowed);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-on-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-semibold text-on-surface-variant">Validando credenciales y permisos...</p>
        </div>
      </div>
    );
  }

  // 1. Verificación de Autenticación
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-on-background">
        <div className="max-w-md w-full p-8 rounded-3xl bg-surface-container-low border border-outline-variant/30 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black tracking-tight text-on-surface">Sesión Requerida</h2>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Debes iniciar sesión con tu cuenta profesional o de paciente para acceder a esta sección de la plataforma clínica.
            </p>
          </div>
          <button
            onClick={() => onNavigate('/login')}
            className="w-full py-3 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-md hover:bg-primary/90 transition-all cursor-pointer"
          >
            Iniciar Sesión →
          </button>
        </div>
      </div>
    );
  }

  // 2. Verificación de Permisos Dinámicos RBAC
  const hasAccess = isRouteAllowed(path);

  if (!hasAccess) {
    const defaultRoute = allowedModules[0]?.path_route || fallbackPath;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-on-background">
        <div className="max-w-lg w-full p-8 rounded-3xl bg-surface-container-low border border-rose-500/20 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">gpp_bad</span>
          </div>
          
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-700 text-[11px] font-black uppercase tracking-wider border border-rose-500/20">
              <span className="material-symbols-outlined text-xs">shield_lock</span>
              Acceso Restringido (RBAC)
            </div>
            <h2 className="text-2xl font-black tracking-tight text-on-surface">
              Módulo No Autorizado
            </h2>
            <p className="text-xs text-on-surface-variant leading-relaxed max-w-sm mx-auto">
              Tu rol actual (<strong className="text-primary uppercase">{role}</strong>) no cuenta con permisos asignados para visualizar la ruta <code className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[11px] text-on-surface">{path}</code>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-left space-y-2">
            <p className="text-[11px] font-bold text-on-surface uppercase tracking-wider">Módulos Habilitados para tu Perfil:</p>
            <div className="flex flex-wrap gap-1.5">
              {allowedModules.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onNavigate(m.path_route)}
                  className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-[11px] font-semibold text-on-surface transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[13px]">{m.icon}</span>
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onNavigate(defaultRoute)}
              className="flex-1 py-3 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-md hover:bg-primary/90 transition-all cursor-pointer"
            >
              Ir a mi Dashboard ({allowedModules[0]?.name || 'Inicio'}) →
            </button>
            <button
              onClick={() => onNavigate('/landing')}
              className="px-4 py-3 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Landing
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
