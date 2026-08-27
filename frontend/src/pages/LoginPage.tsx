import React, { useState } from 'react';
import { supabase, INITIAL_USERS } from '../services/supabaseClient';
import { useAuth } from '../app/providers/AuthProvider';
import { LanguageSelector } from '../components/common/LanguageSelector';
import { 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles, 
  KeyRound, 
  ArrowLeft,
  Loader2
} from 'lucide-react';

interface LoginPageProps {
  onNavigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { setUserAndRole } = useAuth();

  // Form states
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'azure' | 'email' | 'otp' | 'demo' | null>(null);
  
  // Feedback alerts
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Google OAuth Authentication
  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoadingProvider('google');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname + '#/calendario',
        },
      });

      if (error) {
        throw error;
      }

      setSuccessMessage('¡Autenticación con Google completada! Redirigiendo al espacio clínico...');
      setTimeout(() => {
        onNavigate('/calendario');
      }, 1000);
    } catch (err: any) {
      console.error('Error in Google OAuth:', err);
      setErrorMessage(err?.message || 'No fue posible conectar con el servicio de Google OAuth. Intente nuevamente.');
    } finally {
      setLoadingProvider(null);
    }
  };

  // 2. Microsoft (Azure AD / Office 365) OAuth Authentication
  const handleMicrosoftLogin = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoadingProvider('azure');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email profile openid',
          redirectTo: window.location.origin + window.location.pathname + '#/calendario',
        },
      });

      if (error) {
        throw error;
      }

      setSuccessMessage('¡Autenticación con Microsoft exitosa! Redirigiendo al espacio clínico...');
      setTimeout(() => {
        onNavigate('/calendario');
      }, 1000);
    } catch (err: any) {
      console.error('Error in Microsoft OAuth:', err);
      setErrorMessage(err?.message || 'No fue posible conectar con Microsoft Azure AD. Verifique sus credenciales corporativas.');
    } finally {
      setLoadingProvider(null);
    }
  };

  // 3. Magic Link / OTP Email Authentication
  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Por favor ingrese una dirección de correo electrónico válida.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setLoadingProvider('email');

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname + '#/calendario',
        },
      });

      if (error) {
        throw error;
      }

      setIsOtpSent(true);
      setSuccessMessage(`Hemos enviado un enlace de acceso y código seguro a ${email.trim()}`);
    } catch (err: any) {
      console.error('Error in Magic Link request:', err);
      setErrorMessage(err?.message || 'Error al enviar el enlace mágico. Verifique su correo o intente con otro método.');
    } finally {
      setLoadingProvider(null);
    }
  };

  // 4. Verify OTP Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) {
      setErrorMessage('Ingrese el código de verificación recibido (mínimo 6 dígitos).');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setLoadingProvider('otp');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otpCode.trim(),
        type: 'magiclink',
      });

      if (error) {
        throw error;
      }

      setSuccessMessage('¡Código verificado con éxito! Accediendo a la clínica...');
      setTimeout(() => {
        onNavigate('/calendario');
      }, 1000);
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      setErrorMessage(err?.message || 'Código inválido o expirado. Por favor solicite uno nuevo.');
    } finally {
      setLoadingProvider(null);
    }
  };

  // 5. Quick Demo Profile Quick Switcher (For Evaluation & QA)
  const handleFastDemoLogin = (userId: string, targetRoute: string) => {
    setLoadingProvider('demo');
    setUserAndRole(userId);
    setSuccessMessage('Iniciando sesión con perfil demo autorizado...');
    setTimeout(() => {
      onNavigate(targetRoute);
    }, 600);
  };

  const isLoading = loadingProvider !== null;

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col justify-between selection:bg-primary selection:text-white relative overflow-hidden">
      {/* Background Subtle Clinical Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar / Navigation */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between z-10">
        <button
          onClick={() => onNavigate('/landing')}
          className="inline-flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Volver al Inicio</span>
        </button>

        <div className="flex items-center gap-3">
          <LanguageSelector variant="compact" />
          <button
            onClick={() => onNavigate('/onboarding')}
            className="hidden sm:inline-flex text-xs font-bold text-primary hover:text-primary-container bg-primary-fixed/60 hover:bg-primary-fixed border border-primary-fixed-dim px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            Registrar Clínica (Trial 7 Días)
          </button>
        </div>
      </div>

      {/* Main Content: Centered Auth Card */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 z-10">
        <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl border border-outline-variant/40 clinical-shadow-lg p-6 sm:p-8 space-y-6 relative">
          
          {/* Header & Clinic Brand */}
          <div className="text-center space-y-2">
            <div 
              onClick={() => onNavigate('/landing')}
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-white shadow-md shadow-primary/20 cursor-pointer mx-auto"
            >
              <span className="material-symbols-outlined text-2xl font-bold">vital_signs</span>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
                Iniciar Sesión en KineSys
              </h1>
              <p className="text-xs text-on-surface-variant mt-1">
                Acceso unificado para profesionales de salud, administradores y pacientes
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low border border-outline-variant/40 text-[11px] font-bold text-on-surface-variant">
              <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
              <span>Autenticación Cifrada • Supabase Auth</span>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-error-container/40 border border-error/30 text-on-error-container text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px] leading-relaxed">{errorMessage}</div>
              <button 
                onClick={() => setErrorMessage(null)} 
                className="text-on-error-container/70 hover:text-on-error-container font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-secondary-container/40 border border-secondary/30 text-on-secondary-container text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px] leading-relaxed font-medium">{successMessage}</div>
            </div>
          )}

          {/* Social OAuth Buttons */}
          <div className="space-y-3">
            {/* Google OAuth Button */}
            <button
              id="btn-login-google"
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/50 text-on-surface font-bold text-xs flex items-center justify-center gap-3 transition-all hover:shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingProvider === 'google' ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{loadingProvider === 'google' ? 'Conectando con Google...' : 'Continuar con Google'}</span>
            </button>

            {/* Microsoft Azure OAuth Button */}
            <button
              id="btn-login-microsoft"
              type="button"
              onClick={handleMicrosoftLogin}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/50 text-on-surface font-bold text-xs flex items-center justify-center gap-3 transition-all hover:shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingProvider === 'azure' ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
              )}
              <span>{loadingProvider === 'azure' ? 'Conectando con Microsoft...' : 'Continuar con Microsoft (Azure AD)'}</span>
            </button>
          </div>

          {/* Stylized Visual Separator */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-outline-variant/40 w-full" />
            <span className="bg-surface-container-lowest px-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
              O continuar con correo
            </span>
            <div className="border-t border-outline-variant/40 w-full" />
          </div>

          {/* Magic Link / Email Form */}
          {!isOtpSent ? (
            <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="input-login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@clinica.com o paciente@email.com"
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/50 rounded-2xl text-xs font-medium text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              <button
                id="btn-login-magiclink"
                type="submit"
                disabled={isLoading || !email}
                className="w-full py-3 px-4 rounded-2xl bg-primary hover:bg-primary-container text-white font-extrabold text-xs shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingProvider === 'email' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando Enlace Mágico...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Enviar Enlace Mágico sin Contraseña</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* OTP Confirmation Step */
            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-primary-fixed/30 border border-primary-fixed-dim rounded-2xl text-xs space-y-1">
                <p className="font-bold text-on-primary-fixed">
                  Código de un solo uso (OTP) enviado
                </p>
                <p className="text-on-primary-fixed-variant text-[11px]">
                  Revisa tu bandeja de entrada en <strong>{email}</strong> e introduce el código numérico para acceder.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface">
                  Código de Verificación (OTP)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/50 rounded-2xl text-xs font-mono font-bold tracking-widest text-on-surface placeholder:tracking-normal placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-center disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOtpSent(false)}
                  className="w-1/3 py-2.5 px-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/40 text-on-surface-variant font-bold text-xs transition-all cursor-pointer"
                >
                  Cambiar Correo
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !otpCode}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-primary hover:bg-primary-container text-white font-extrabold text-xs shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loadingProvider === 'otp' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Verificar & Entrar</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Access Bar (Instant QA & Demo Testing) */}
          <div className="pt-3 border-t border-outline-variant/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">
                Acceso Rápido Demo (QA)
              </span>
              <span className="text-[10px] font-mono text-primary font-bold">
                5 Roles Disponibles
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleFastDemoLogin('prof_mateo_01', '/calendario')}
                className="p-2 rounded-xl bg-surface-container-low hover:bg-primary-fixed/40 border border-outline-variant/30 text-left transition-all cursor-pointer"
              >
                <div className="font-bold text-on-surface truncate">Klgo. Mateo</div>
                <div className="text-[9px] text-on-surface-variant truncate">Fisioterapia</div>
              </button>

              <button
                type="button"
                onClick={() => handleFastDemoLogin('prof_nutri_01', '/nutricion')}
                className="p-2 rounded-xl bg-surface-container-low hover:bg-emerald-50 border border-outline-variant/30 text-left transition-all cursor-pointer"
              >
                <div className="font-bold text-on-surface truncate">Nut. Andrea</div>
                <div className="text-[9px] text-emerald-700 truncate">Nutricionista</div>
              </button>

              <button
                type="button"
                onClick={() => handleFastDemoLogin('prof_doctor_01', '/doctor-dashboard')}
                className="p-2 rounded-xl bg-surface-container-low hover:bg-teal-50 border border-outline-variant/30 text-left transition-all cursor-pointer"
              >
                <div className="font-bold text-on-surface truncate">Dr. Castillo</div>
                <div className="text-[9px] text-teal-700 truncate">Médico General</div>
              </button>

              <button
                type="button"
                onClick={() => handleFastDemoLogin('pat_camila_01', '/portal-paciente')}
                className="p-2 rounded-xl bg-surface-container-low hover:bg-sky-50 border border-outline-variant/30 text-left transition-all cursor-pointer"
              >
                <div className="font-bold text-on-surface truncate">Camila Soto</div>
                <div className="text-[9px] text-sky-700 truncate">Portal Paciente</div>
              </button>
            </div>
          </div>

          {/* Footer Call to Onboarding */}
          <div className="pt-2 text-center text-xs text-on-surface-variant">
            <span>¿Tu clínica aún no tiene cuenta? </span>
            <button
              onClick={() => onNavigate('/onboarding')}
              className="text-primary font-bold hover:underline cursor-pointer ml-1"
            >
              Regístrate aquí (7 Días Gratis)
            </button>
          </div>
        </div>
      </div>

      {/* Security & Regulatory Footer */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-4 text-center text-[11px] text-on-surface-variant/70 border-t border-outline-variant/20 z-10">
        <p>
          KineSys protege tus registros médicos bajo cifrado AES-256 en reposo y tránsito con Row Level Security (RLS).
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
