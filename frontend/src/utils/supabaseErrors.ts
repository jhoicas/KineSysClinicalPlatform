import type { PostgrestError } from '@supabase/supabase-js';

export function assertSupabaseOk<T>(result: {
  data: T;
  error: PostgrestError | null;
}): T {
  if (result.error) throw result.error;
  return result.data;
}

export function getSupabaseErrorMessage(error: unknown, fallback = 'Error inesperado'): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return fallback;
}

/** Log detallado de errores PostgREST/Supabase para diagnóstico en producción. */
export function logSupabaseError(context: string, error: unknown): void {
  console.error(`Supabase Error [${context}]:`, error);
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    console.error('Supabase Error details:', {
      message: e.message,
      code: e.code,
      details: e.details,
      hint: e.hint,
      status: e.status,
      statusCode: e.statusCode,
    });
  }
}
