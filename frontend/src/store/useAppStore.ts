import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

interface AppStoreState {
  // Estado Global del Paciente en Consulta Activa
  activePatient: ActivePatient | null;
  setActivePatient: (patient: ActivePatient | null) => void;
  clearActivePatient: () => void;

  // Historial de Pacientes Recientemente Consultados (para acceso ultra rápido)
  recentPatients: ActivePatient[];
  addRecentPatient: (patient: ActivePatient) => void;
  clearRecentPatients: () => void;
}

export const useAppStore = create<AppStoreState>()(
  persist(
    (set, get) => ({
      activePatient: null,

      setActivePatient: (patient: ActivePatient | null) => {
        set({ activePatient: patient });
        if (patient) {
          get().addRecentPatient(patient);
          // Emitir evento para componentes desacoplados si es necesario
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
        set({ activePatient: null });
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
    }),
    {
      name: 'kinesys_app_active_patient_store',
      storage: createJSONStorage(() => sessionStorage), // Persiste durante la sesión activa en el navegador
    }
  )
);
