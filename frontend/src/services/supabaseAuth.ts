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

function getStoredActiveUserId(): string | null {
  return localStorage.getItem('kinesys_active_user_id');
}

function findLocalUserByEmail(email: string): { id: string; email: string } | null {
  try {
    const raw = localStorage.getItem('kinesys_users_v2');
    if (!raw) return null;
    const users = JSON.parse(raw) as { id: string; email?: string; is_active?: boolean }[];
    const normalized = email.trim().toLowerCase();
    const match = users.find(
      (u) => u.email?.trim().toLowerCase() === normalized && u.is_active !== false
    );
    return match ? { id: match.id, email: match.email || email } : null;
  } catch {
    return null;
  }
}

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
  const activeId = getStoredActiveUserId();
  if (!activeId) {
    return { data: { user: null }, error: null };
  }
  return {
    data: { user: { id: activeId } },
    error: null,
  };
}

export async function getSession() {
  if (supabaseClient?.auth) {
    return await supabaseClient.auth.getSession();
  }
  const activeId = getStoredActiveUserId();
  if (!activeId) {
    return { data: { session: null }, error: null };
  }
  return {
    data: {
      session: {
        user: { id: activeId },
        access_token: 'local_session_token',
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
  return {
    data: { provider, url: null },
    error: {
      message:
        'Supabase Auth no está configurado. Configure VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para habilitar inicio de sesión OAuth.',
    },
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

  const registered = findLocalUserByEmail(email);
  if (!registered) {
    return {
      data: { user: null, session: null },
      error: {
        message:
          'El correo no está registrado en la plataforma. Contacta al administrador de tu clínica.',
      },
    };
  }

  await new Promise((resolve) => setTimeout(resolve, 800));
  return {
    data: {
      user: null,
      session: null,
      message: `Enlace de acceso enviado a ${email}`,
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

  const registered = findLocalUserByEmail(email);
  if (!registered) {
    return {
      data: { user: null, session: null },
      error: { message: 'Usuario no autorizado o acceso revocado.' },
    };
  }

  if (!token || token.length < 4) {
    return {
      data: { user: null, session: null },
      error: { message: 'Código de verificación inválido.' },
    };
  }

  await new Promise((resolve) => setTimeout(resolve, 600));
  localStorage.setItem('kinesys_active_user_id', registered.id);
  window.dispatchEvent(
    new CustomEvent('kinesys_data_updated', { detail: { table: 'users' } })
  );
  return {
    data: { user: registered, session: { user: registered } },
    error: null,
  };
}

export async function signOut() {
  if (supabaseClient?.auth) {
    return await supabaseClient.auth.signOut();
  }
  localStorage.removeItem('kinesys_active_user_id');
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
