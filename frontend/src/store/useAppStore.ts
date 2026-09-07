import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppModule } from '../types';

export interface ActivePatient {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  rut_or_dni?: string;
  avatar_url?: string;
  birth_date?: string;
  gender?: string;
  medical_conditions?: string[];
  allergies?: string[];
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  role?: string;
  tenant_id?: string;
  [key: string]: any;
}

/** Borrador de sesión nutricional (ISAK / BIA / metas) ligado al paciente activo. */
export interface NutritionSessionDraft {
  patientId: string;
  weightKg?: number;
  heightCm?: number;
  isakMeasures?: Record<string, number>;
  equation?: string;
  biaSource?: 'WITHINGS' | 'INBODY';
  biaSnapshot?: Record<string, unknown> | null;
  dietCaloricTarget?: number;
  updatedAt?: string;
}

interface AppStoreState {
  // Estado Global del Paciente en Consulta Activa
  activePatient: ActivePatient | null;
  setActivePatient: (patient: ActivePatient | null) => void;
  clearActivePatient: () => void;

  // Historial de Pacientes Recientemente Consultados (para acceso ultra rápido)
  recentPatients: ActivePatient[];
  addRecentPatient: (patient: ActivePatient) => void;
  clearRecentPatients: () => void;

  // Borrador clínico Nutrición & Antropometría (sincroniza módulos)
  nutritionDraft: NutritionSessionDraft | null;
  patchNutritionDraft: (patch: Partial<NutritionSessionDraft> & { patientId: string }) => void;
  clearNutritionDraft: () => void;

  // RBAC: Módulos y Rutas Permitidas para el usuario/rol activo
  allowedModules: AppModule[];
  allowedRoutes: string[];
  setAllowedModules: (modules: AppModule[]) => void;
  isRouteAllowed: (path: string) => boolean;
}

export const useAppStore = create<AppStoreState>()(
  persist(
    (set, get) => ({
      activePatient: null,

      setActivePatient: (patient: ActivePatient | null) => {
        const prevId = get().activePatient?.id;
        const resetDraft = !patient || (prevId != null && prevId !== patient.id);
        set({
          activePatient: patient,
          ...(resetDraft ? { nutritionDraft: null } : {}),
        });
        if (patient) {
          get().addRecentPatient(patient);
          window.dispatchEvent(
            new CustomEvent('kinesys_active_patient_changed', { detail: { patient } })
          );
        } else {
          window.dispatchEvent(
            new CustomEvent('kinesys_active_patient_changed', { detail: { patient: null } })
          );
        }
      },

      clearActivePatient: () => {
        set({ activePatient: null, nutritionDraft: null });
        window.dispatchEvent(
          new CustomEvent('kinesys_active_patient_changed', { detail: { patient: null } })
        );
      },

      recentPatients: [],

      addRecentPatient: (patient: ActivePatient) => {
        if (!patient || !patient.id) return;
        set((state) => {
          const filtered = state.recentPatients.filter((p) => p.id !== patient.id);
          // Mantener los últimos 6 pacientes consultados
          return {
            recentPatients: [patient, ...filtered].slice(0, 6),
          };
        });
      },

      clearRecentPatients: () => set({ recentPatients: [] }),

      nutritionDraft: null,

      patchNutritionDraft: (patch) => {
        set((state) => {
          const prev =
            state.nutritionDraft?.patientId === patch.patientId ? state.nutritionDraft : null;
          return {
            nutritionDraft: {
              ...(prev || { patientId: patch.patientId }),
              ...patch,
              patientId: patch.patientId,
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },

      clearNutritionDraft: () => set({ nutritionDraft: null }),

      // RBAC State & Methods
      allowedModules: [],
      allowedRoutes: [],

      setAllowedModules: (modules: AppModule[]) => {
        const routes = modules.map((m) => m.path_route);
        set({
          allowedModules: modules,
          allowedRoutes: routes,
        });
      },

      isRouteAllowed: (path: string) => {
        const { allowedRoutes } = get();
        // Rutas públicas universales
        const publicRoutes = ['/', '/landing', '/login', '/onboarding', '/portal-paciente'];
        if (publicRoutes.includes(path)) return true;
        
        // Comprobar coincidencia exacta o prefijos para subrutas
        return allowedRoutes.some(
          (route) => path === route || path.startsWith(`${route}/`) || (route === '/medicina-general' && path === '/doctor-dashboard')
        );
      },
    }),
    {
      name: 'kinesys_app_active_patient_store',
      storage: createJSONStorage(() => sessionStorage), // Persiste durante la sesión activa en el navegador
    }
  )
);
