/**
 * KineSys — Cliente Supabase real (datos clínicos + auth compartido)
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseAuthClient, getNativeAuth } from './supabaseAuth';

const SUPABASE_URL = (import.meta as { env?: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  (import.meta as { env?: { VITE_SUPABASE_ANON_KEY?: string } }).env?.VITE_SUPABASE_ANON_KEY || '';

const baseClient: SupabaseClient =
  supabaseAuthClient ??
  (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http')
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : createClient('http://localhost:54321', 'missing-key'));

/** Tablas del esquema clínico `kinesys` */
export const KINESYS_TABLES = new Set([
  'tenants',
  'users',
  'profiles',
  'pacientes_clinicos',
  'appointments',
  'consultas_soap',
  'prescripciones',
  'evaluaciones_antropometricas',
  'planes_nutricionales',
  'ordenes_nutricion_fhir',
  'professional_profiles',
  'team_invitations',
  'pain_observations',
  'reviews',
  'general_medical_records',
  'app_roles',
  'app_modules',
  'role_permissions',
]);

export const CLINICAL_SCHEMA = 'kinesys';

export function clinicalFrom(table: string) {
  if (KINESYS_TABLES.has(table)) {
    return baseClient.schema(CLINICAL_SCHEMA).from(table);
  }
  return baseClient.from(table);
}

/** Cliente con `.from()` enrutado al schema kinesys cuando corresponde */
export const supabaseDataClient = new Proxy(baseClient, {
  get(target, prop, receiver) {
    if (prop === 'from') {
      return (table: string) => clinicalFrom(table);
    }
    if (prop === 'auth') {
      return getNativeAuth() ?? Reflect.get(target, prop, receiver);
    }
    return Reflect.get(target, prop, receiver);
  },
}) as SupabaseClient & { from: typeof clinicalFrom };

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseAuthClient);
}
