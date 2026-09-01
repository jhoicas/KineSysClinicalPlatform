/**
 * KineSys — Supabase Auth Module
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as { env?: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  (import.meta as { env?: { VITE_SUPABASE_ANON_KEY?: string } }).env?.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http')) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('[KineSys Auth] Failed to initialize Supabase client:', e);
  }
}

export const supabaseAuthClient = supabaseClient;

export async function getAccessToken(): Promise<string | null> {
  if (!supabaseClient) return null;
  try {
    const { data } = await supabaseClient.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

export async function getUser() {
  if (!supabaseClient) {
    return { data: { user: null }, error: { message: 'Supabase Auth no está configurado.' } };
  }
  return await supabaseClient.auth.getUser();
}

export async function getSession() {
  if (!supabaseClient) {
    return { data: { session: null }, error: { message: 'Supabase Auth no está configurado.' } };
  }
  return await supabaseClient.auth.getSession();
}

export async function signInWithOAuth({
  provider,
  options,
}: {
  provider: string;
  options?: Record<string, unknown>;
}) {
  if (!supabaseClient) {
    return {
      data: { provider, url: null },
      error: {
        message:
          'Supabase Auth no está configurado. Configure VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
      },
    };
  }
  return await supabaseClient.auth.signInWithOAuth({ provider: provider as 'google', options });
}

export async function signInWithOtp({
  email,
  options,
}: {
  email: string;
  options?: Record<string, unknown>;
}) {
  if (!supabaseClient) {
    return {
      data: { user: null, session: null },
      error: { message: 'Supabase Auth no está configurado.' },
    };
  }
  return await supabaseClient.auth.signInWithOtp({ email, options });
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
  if (!supabaseClient) {
    return {
      data: { user: null, session: null },
      error: { message: 'Supabase Auth no está configurado.' },
    };
  }
  return await supabaseClient.auth.verifyOtp({ email, token, type: type as 'email' });
}

export async function signOut() {
  if (!supabaseClient) {
    return { error: { message: 'Supabase Auth no está configurado.' } };
  }
  return await supabaseClient.auth.signOut();
}

export function onAuthStateChange(callback?: Parameters<SupabaseClient['auth']['onAuthStateChange']>[0]) {
  if (!supabaseClient) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return supabaseClient.auth.onAuthStateChange(callback!);
}

export function isAuthConfigured(): boolean {
  return supabaseClient !== null;
}
