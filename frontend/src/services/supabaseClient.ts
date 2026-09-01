/**
 * KineSys — Supabase Client (Backward-Compatible Re-export Layer)
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  ARCHITECTURE NOTE (Monorepo Migration)                        │
 * │                                                                │
 * │  Auth    → supabaseAuth.ts  (Supabase Auth only)               │
 * │  Data    → dataService.ts   (localStorage mock, legacy)        │
 * │  Target  → apiClient.ts     (Go backend REST API)              │
 * │                                                                │
 * │  This file re-exports everything so existing page imports      │
 * │  (`import { supabase } from '../services/supabaseClient'`)     │
 * │  continue working without modification.                        │
 * └─────────────────────────────────────────────────────────────────┘
 */

// ─── Auth (Canonical Source) ──────────────────────────────────────────────────

export {
  supabaseAuthClient,
  getAccessToken,
  getUser,
  getSession,
  signInWithOAuth,
  signInWithOtp,
  verifyOtp,
  signOut,
  onAuthStateChange,
  isAuthConfigured,
} from './supabaseAuth';

// ─── Data Service (Backward Compat — migrate to apiClient.ts) ─────────────────

export {
  // The proxy object used by all existing pages
  supabase,

  // Demo data constants (will be replaced by DB seed)
  INITIAL_TENANT,
  PRICING_PLANS,
  INITIAL_USERS,
  INITIAL_PROFESSIONAL,
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_PAIN_OBSERVATIONS,
  INITIAL_BODY_COMPOSITIONS,
  INITIAL_MEDICAL_RECORDS,
  INITIAL_INVITATIONS,
  INITIAL_PACIENTES_CLINICOS,
  INITIAL_CONSULTAS_SOAP,
  INITIAL_PRESCRIPCIONES,
  INITIAL_EVALUACIONES_ANTROPOMETRICAS,
  INITIAL_PROFESSIONAL_PROFILES,
  INITIAL_REVIEWS,
  INITIAL_APP_ROLES,
  INITIAL_APP_MODULES,
  INITIAL_ROLE_PERMISSIONS,
  ALL_DEMO_TENANTS,

  // Helper functions
  formatPatientNameForPrivacy,
  fetchProfessionalsWithFullDetails,
  fetchProfessionalDetails,
  submitProfessionalReview,
  fetchProfessionalAvailability,
  saveProfessionalWeeklyAvailability,
  fetchProfessionalAvailabilityExceptions,
  saveProfessionalAvailabilityExceptions,
  fetchAvailableTimeSlots,
  validateAppointmentSlot,
  INITIAL_PROFESSIONAL_AVAILABILITY,
  fetchClinicProfessionals,
  createProfessional,
  updateProfessionalRole,
  deactivateProfessional,
  reactivateProfessional,
  getProfessionalRoleLabel,
  CLINIC_STAFF_ROLES,
} from './dataService';

// ─── API Client (Target Architecture — Go Backend) ────────────────────────────

export { api } from './apiClient';
