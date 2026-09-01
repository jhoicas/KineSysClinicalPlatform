/**
 * KineSys — Supabase Client (Real Postgres + Auth)
 */

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

export { supabaseDataClient, isSupabaseConfigured } from './supabaseDataClient';

export {
  supabase,
  PRICING_PLANS,
  DEFAULT_APP_MODULES,
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
  fetchClinicProfessionals,
  createProfessional,
  updateProfessionalRole,
  deactivateProfessional,
  reactivateProfessional,
  getProfessionalRoleLabel,
  CLINIC_STAFF_ROLES,
  getPatients,
  createPatient,
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  saveSoapEncounter,
  saveAnthropometry,
  saveNutritionalPlan,
  completeOnboarding,
  loadUserByAuthId,
  loadUserByEmail,
  loadProfileByAuthId,
  loadTenantById,
} from './dataService';

export { api } from './apiClient';
