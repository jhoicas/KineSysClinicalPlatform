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
