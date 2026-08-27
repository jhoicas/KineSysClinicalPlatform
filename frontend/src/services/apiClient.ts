/**
 * KineSys — API Client for Go Backend (Clean Architecture)
 *
 * This module is the canonical data layer for communicating with the
 * Go backend REST API (Chi + pgx/v5 over PostgreSQL/Supabase).
 *
 * Usage:
 *   import { api } from '@/src/services/apiClient';
 *   const appointments = await api.appointments.list({ professionalId: '...' });
 *
 * Authentication:
 *   The client automatically attaches the Supabase JWT as a Bearer token.
 *   The Go backend verifies it via SUPABASE_JWT_SECRET middleware.
 */

import { getAccessToken } from './supabaseAuth';
import type {
  User,
  Tenant,
  Appointment,
  PainObservation,
  PacienteClinico,
  ConsultaSOP,
  PrescripcionMedica,
  EvaluacionAntropometrica,
  PlanNutricional,
  OrdenNutricionFHIR,
  GeneralMedicalRecord,
  ProfessionalProfile,
  Review,
  ProfessionalWithDetails,
  TeamInvitation,
} from '../types';

// ─── Configuration ────────────────────────────────────────────────────────────

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080';

// ─── Generic Response Types ───────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

// ─── Core HTTP Client ─────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  queryParams?: Record<string, string | number | boolean | undefined>
): Promise<ApiResponse<T>> {
  try {
    // Build URL with query params
    const url = new URL(`${API_BASE_URL}${path}`);
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      });
    }

    // Auth header from Supabase JWT
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle no-content responses
    if (response.status === 204) {
      return { data: null, error: null, status: 204 };
    }

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        (responseData as any)?.message ||
        (responseData as any)?.error ||
        `Error HTTP ${response.status}`;
      return { data: null, error: errorMessage, status: response.status };
    }

    return { data: responseData as T, error: null, status: response.status };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || 'Error de red — No se pudo conectar con el servidor.',
      status: 0,
    };
  }
}

// ─── Resource Clients ─────────────────────────────────────────────────────────

export const api = {
  // ──── Health ────
  health: {
    check: () => request<{ status: string; timestamp: string }>('GET', '/api/v1/health'),
  },

  // ──── Users ────
  users: {
    list: (params?: { tenant_id?: string; role?: string }) =>
      request<User[]>('GET', '/api/v1/users', undefined, params),
    getById: (id: string) => request<User>('GET', `/api/v1/users/${id}`),
    create: (data: Partial<User>) => request<User>('POST', '/api/v1/users', data),
    update: (id: string, data: Partial<User>) =>
      request<User>('PUT', `/api/v1/users/${id}`, data),
  },

  // ──── Tenants ────
  tenants: {
    getById: (id: string) => request<Tenant>('GET', `/api/v1/tenants/${id}`),
    update: (id: string, data: Partial<Tenant>) =>
      request<Tenant>('PUT', `/api/v1/tenants/${id}`, data),
    list: () => request<Tenant[]>('GET', '/api/v1/tenants'),
  },

  // ──── Appointments ────
  appointments: {
    list: (params?: {
      tenant_id?: string;
      professional_id?: string;
      patient_id?: string;
      start_date?: string;
      end_date?: string;
    }) => request<Appointment[]>('GET', '/api/v1/appointments', undefined, params),
    getById: (id: string) => request<Appointment>('GET', `/api/v1/appointments/${id}`),
    create: (data: Partial<Appointment>) =>
      request<Appointment>('POST', '/api/v1/appointments', data),
    update: (id: string, data: Partial<Appointment>) =>
      request<Appointment>('PUT', `/api/v1/appointments/${id}`, data),
    delete: (id: string) => request<void>('DELETE', `/api/v1/appointments/${id}`),
  },

  // ──── Pain Observations ────
  painObservations: {
    list: (params?: { tenant_id?: string; patient_id?: string }) =>
      request<PainObservation[]>('GET', '/api/v1/pain-observations', undefined, params),
    create: (data: Partial<PainObservation>) =>
      request<PainObservation>('POST', '/api/v1/pain-observations', data),
  },

  // ──── Clinical Patients (FHIR-aligned) ────
  clinicalPatients: {
    list: (params?: { tenant_id?: string; search?: string }) =>
      request<PacienteClinico[]>('GET', '/api/v1/clinical-patients', undefined, params),
    getById: (id: string) =>
      request<PacienteClinico>('GET', `/api/v1/clinical-patients/${id}`),
    create: (data: Partial<PacienteClinico>) =>
      request<PacienteClinico>('POST', '/api/v1/clinical-patients', data),
    update: (id: string, data: Partial<PacienteClinico>) =>
      request<PacienteClinico>('PUT', `/api/v1/clinical-patients/${id}`, data),
  },

  // ──── SOAP Consultations ────
  consultasSoap: {
    list: (params?: { tenant_id?: string; patient_id?: string }) =>
      request<ConsultaSOP[]>('GET', '/api/v1/consultas-soap', undefined, params),
    create: (data: Partial<ConsultaSOP>) =>
      request<ConsultaSOP>('POST', '/api/v1/consultas-soap', data),
  },

  // ──── Medical Prescriptions ────
  prescriptions: {
    list: (params?: { tenant_id?: string; patient_id?: string }) =>
      request<PrescripcionMedica[]>('GET', '/api/v1/prescriptions', undefined, params),
    create: (data: Partial<PrescripcionMedica>) =>
      request<PrescripcionMedica>('POST', '/api/v1/prescriptions', data),
  },

  // ──── General Medical Records ────
  medicalRecords: {
    list: (params?: { tenant_id?: string; patient_id?: string }) =>
      request<GeneralMedicalRecord[]>(
        'GET',
        '/api/v1/medical-records',
        undefined,
        params
      ),
    create: (data: Partial<GeneralMedicalRecord>) =>
      request<GeneralMedicalRecord>('POST', '/api/v1/medical-records', data),
  },

  // ──── Anthropometric Evaluations (ISAK / Mifflin-St Jeor) ────
  anthropometry: {
    list: (params?: { tenant_id?: string; patient_id?: string }) =>
      request<EvaluacionAntropometrica[]>(
        'GET',
        '/api/v1/anthropometry',
        undefined,
        params
      ),
    create: (data: Partial<EvaluacionAntropometrica>) =>
      request<EvaluacionAntropometrica>('POST', '/api/v1/anthropometry', data),
  },

  // ──── Nutrition Plans ────
  nutritionPlans: {
    list: (params?: { tenant_id?: string; patient_id?: string; status?: string }) =>
      request<PlanNutricional[]>('GET', '/api/v1/nutrition-plans', undefined, params),
    create: (data: Partial<PlanNutricional>) =>
      request<PlanNutricional>('POST', '/api/v1/nutrition-plans', data),
    update: (id: string, data: Partial<PlanNutricional>) =>
      request<PlanNutricional>('PUT', `/api/v1/nutrition-plans/${id}`, data),
  },

  // ──── FHIR Nutrition Orders ────
  nutritionOrders: {
    list: (params?: { tenant_id?: string; patient_id?: string }) =>
      request<OrdenNutricionFHIR[]>(
        'GET',
        '/api/v1/nutrition-orders',
        undefined,
        params
      ),
    create: (data: Partial<OrdenNutricionFHIR>) =>
      request<OrdenNutricionFHIR>('POST', '/api/v1/nutrition-orders', data),
  },

  // ──── Professional Profiles & Portal ────
  professionals: {
    list: (params?: { tenant_id?: string; role?: string; specialty?: string }) =>
      request<ProfessionalWithDetails[]>(
        'GET',
        '/api/v1/professionals',
        undefined,
        params
      ),
    getById: (id: string) =>
      request<ProfessionalWithDetails>('GET', `/api/v1/professionals/${id}`),
    updateProfile: (userId: string, data: Partial<ProfessionalProfile>) =>
      request<ProfessionalProfile>(
        'PUT',
        `/api/v1/professionals/${userId}/profile`,
        data
      ),
  },

  // ──── Reviews ────
  reviews: {
    list: (params?: { professional_id?: string; status?: string }) =>
      request<Review[]>('GET', '/api/v1/reviews', undefined, params),
    create: (data: Partial<Review>) => request<Review>('POST', '/api/v1/reviews', data),
    voteHelpful: (id: string) =>
      request<Review>('POST', `/api/v1/reviews/${id}/vote-helpful`),
  },

  // ──── Team Invitations ────
  invitations: {
    list: (params?: { tenant_id?: string }) =>
      request<TeamInvitation[]>('GET', '/api/v1/invitations', undefined, params),
    create: (data: Partial<TeamInvitation>) =>
      request<TeamInvitation>('POST', '/api/v1/invitations', data),
  },

  // ──── Document Sending (replaces Supabase Edge Function) ────
  documents: {
    sendToPatient: (data: {
      to_email: string;
      patient_name: string;
      document_type: string;
      pdf_base64: string;
      filename?: string;
      clinic_name?: string;
      custom_message?: string;
    }) =>
      request<{ success: boolean; messageId: string; recipient: string }>(
        'POST',
        '/api/v1/documents/send',
        data
      ),
  },
};

export default api;
