/**
 * KineSys — Supabase Auth Module (Single Responsibility)
 *
 * This module handles ONLY authentication with Supabase Auth:
 * - OAuth (Google, GitHub, etc.)
 * - Magic Link (OTP)
 * - Session / JWT management
 *
 * All CRUD data operations have been decoupled to:
 * - dataService.ts  (local mock, backward-compat)
 * - apiClient.ts    (Go backend REST API — target architecture)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Supabase Client Initialization (Auth Only) ───────────────────────────────

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http')) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('[KineSys Auth] Failed to initialize Supabase client:', e);
  }
}

/** The real Supabase client (null if not configured) */
export const supabaseAuthClient = supabaseClient;

// ─── Access Token Helper ──────────────────────────────────────────────────────

/**
 * Returns the current JWT access token from Supabase Auth session.
 * Used by apiClient.ts to authenticate requests to the Go backend.
 */
export async function getAccessToken(): Promise<string | null> {
  if (!supabaseClient) return null;
  try {
    const { data } = await supabaseClient.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

// ─── Auth Operations ──────────────────────────────────────────────────────────

export async function getUser() {
  if (supabaseClient?.auth) {
    return await supabaseClient.auth.getUser();
  }
  // Mock fallback: return demo user from localStorage
  const activeId = localStorage.getItem('kinesys_active_user_id') || 'prof_mateo_01';
  return {
    data: { user: { id: activeId } },
    error: null,
  };
}

export async function getSession() {
  if (supabaseClient?.auth) {
    return await supabaseClient.auth.getSession();
  }
  const activeId = localStorage.getItem('kinesys_active_user_id') || 'prof_mateo_01';
  return {
    data: {
      session: {
        user: { id: activeId },
        access_token: 'mock_jwt_token_kinesys',
      },
    },
    error: null,
  };
}

export async function signInWithOAuth({
  provider,
  options,
}: {
  provider: string;
  options?: any;
}) {
  if (supabaseClient?.auth) {
    return await supabaseClient.auth.signInWithOAuth({
      provider: provider as any,
      options,
    });
  }
  // Mock OAuth flow
  await new Promise((resolve) => setTimeout(resolve, 900));
  localStorage.setItem('kinesys_active_user_id', 'prof_mateo_01');
  window.dispatchEvent(
    new CustomEvent('kinesys_data_updated', { detail: { table: 'users' } })
  );
  return {
    data: {
      provider,
      url:
        window.location.origin +
        window.location.pathname +
        '#/calendario',
    },
    error: null,
  };
}

export async function signInWithOtp({
  email,
  options,
}: {
  email: string;
  options?: any;
}) {
  if (supabaseClient?.auth) {
    return await supabaseClient.auth.signInWithOtp({ email, options });
  }
  await new Promise((resolve) => setTimeout(resolve, 800));
  return {
    data: {
      user: null,
      session: null,
      message: `Magic link enviado satisfactoriamente a ${email}`,
    },
    error: null,
  };
}

export async function verifyOtp({
  email,
  token,
  type,
}: {
  email: string;
  token: string;
  type: string;
}) {
  if (supabaseClient?.auth) {
    return await supabaseClient.auth.verifyOtp({
      email,
      token,
      type: type as any,
    });
  }
  await new Promise((resolve) => setTimeout(resolve, 600));
  const mockUser = { id: 'prof_mateo_01', email };
  localStorage.setItem('kinesys_active_user_id', mockUser.id);
  window.dispatchEvent(
    new CustomEvent('kinesys_data_updated', { detail: { table: 'users' } })
  );
  return { data: { user: mockUser, session: { user: mockUser } }, error: null };
}

export async function signOut() {
  if (supabaseClient?.auth) {
    return await supabaseClient.auth.signOut();
  }
  return { error: null };
}

export function onAuthStateChange(callback?: any) {
  if (supabaseClient?.auth) {
    return supabaseClient.auth.onAuthStateChange(callback);
  }
  return { data: { subscription: { unsubscribe: () => {} } } };
}

/** Whether a real Supabase Auth client is configured */
export function isAuthConfigured(): boolean {
  return supabaseClient !== null;
}
