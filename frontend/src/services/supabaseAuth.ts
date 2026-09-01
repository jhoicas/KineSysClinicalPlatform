/**
 * KineSys — Supabase Auth Module
 *
 * Los wrappers delegan a funciones enlazadas (.bind) capturadas al crear el cliente.
 * Nunca usar `supabaseClient.auth.*` en wrappers: si otro módulo reemplaza `.auth`
 * en el cliente compartido, las referencias enlazadas siguen apuntando al SDK real.
 */
import { createClient, SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as { env?: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  (import.meta as { env?: { VITE_SUPABASE_ANON_KEY?: string } }).env?.VITE_SUPABASE_ANON_KEY || '';

let rawSupabaseClient: SupabaseClient | null = null;
let nativeAuth: SupabaseClient['auth'] | null = null;

type AuthStateCallback = (event: AuthChangeEvent, session: Session | null) => void;
type AuthStateSubscription = ReturnType<SupabaseClient['auth']['onAuthStateChange']>;

/** Suscriptor enlazado al GoTrueClient real — inmune a shadowing en `.auth` */
let subscribeAuthStateChange: ((callback: AuthStateCallback) => AuthStateSubscription) | null = null;

const noopSubscription = { data: { subscription: { unsubscribe: () => {} } } };

if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http')) {
  try {
    rawSupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    nativeAuth = rawSupabaseClient.auth;
    subscribeAuthStateChange = nativeAuth.onAuthStateChange.bind(nativeAuth);
  } catch (e) {
    console.warn('[KineSys Auth] Failed to initialize Supabase client:', e);
  }
}

/**
 * Cliente Supabase con `.auth` siempre resuelto al SDK nativo (no al facade de dataService).
 */
export const supabaseAuthClient: SupabaseClient | null = rawSupabaseClient
  ? new Proxy(rawSupabaseClient, {
      get(target, prop, receiver) {
        if (prop === 'auth') {
          return nativeAuth;
        }
        return Reflect.get(target, prop, receiver);
      },
    })
  : null;

/** Acceso directo al GoTrueClient nativo */
export function getNativeAuth(): SupabaseClient['auth'] | null {
  return nativeAuth;
}

export async function getAccessToken(): Promise<string | null> {
  if (!nativeAuth) return null;
  try {
    const { data } = await nativeAuth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

export async function getUser() {
  if (!nativeAuth) {
    return { data: { user: null }, error: { message: 'Supabase Auth no está configurado.' } };
  }
  return nativeAuth.getUser();
}

export async function getSession() {
  if (!nativeAuth) {
    return { data: { session: null }, error: { message: 'Supabase Auth no está configurado.' } };
  }
  return nativeAuth.getSession();
}

export async function signInWithOAuth({
  provider,
  options,
}: {
  provider: string;
  options?: Record<string, unknown>;
}) {
  if (!nativeAuth) {
    return {
      data: { provider, url: null },
      error: {
        message:
          'Supabase Auth no está configurado. Configure VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
      },
    };
  }
  return nativeAuth.signInWithOAuth({ provider: provider as 'google', options });
}

export async function signInWithOtp({
  email,
  options,
}: {
  email: string;
  options?: Record<string, unknown>;
}) {
  if (!nativeAuth) {
    return {
      data: { user: null, session: null },
      error: { message: 'Supabase Auth no está configurado.' },
    };
  }
  return nativeAuth.signInWithOtp({ email, options });
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
  if (!nativeAuth) {
    return {
      data: { user: null, session: null },
      error: { message: 'Supabase Auth no está configurado.' },
    };
  }
  return nativeAuth.verifyOtp({ email, token, type: type as 'email' });
}

export async function signOut() {
  if (!nativeAuth) {
    return { error: { message: 'Supabase Auth no está configurado.' } };
  }
  return nativeAuth.signOut();
}

/** Wrapper seguro: delega al método .bind() capturado al inicio, nunca se llama a sí mismo */
export function onAuthStateChange(callback: AuthStateCallback): AuthStateSubscription {
  if (!subscribeAuthStateChange) {
    return noopSubscription as AuthStateSubscription;
  }
  return subscribeAuthStateChange(callback);
}

export function isAuthConfigured(): boolean {
  return subscribeAuthStateChange !== null;
}

/** URL de retorno post-OAuth (hash router) */
export function getOAuthRedirectUrl(path = '/calendario'): string {
  return `${window.location.origin}/#${path}`;
}

export async function signInWithGoogle() {
  if (!nativeAuth) {
    return {
      data: { provider: 'google', url: null },
      error: { message: 'Supabase Auth no está configurado.' },
    };
  }
  return nativeAuth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getOAuthRedirectUrl('/calendario'),
    },
  });
}

export async function signInWithMicrosoft() {
  if (!nativeAuth) {
    return {
      data: { provider: 'azure', url: null },
      error: { message: 'Supabase Auth no está configurado.' },
    };
  }
  return nativeAuth.signInWithOAuth({
    provider: 'azure',
    options: {
      redirectTo: getOAuthRedirectUrl('/calendario'),
      scopes: 'email profile',
    },
  });
}
