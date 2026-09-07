import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, optionsResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Preflight CORS — debe responder 200 ANTES de cualquier auth/JWT
  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonResponse({ error: 'Configuración de Supabase incompleta' }, 500);
    }

    // Validar JWT del invocador (verify_jwt=false en config para no romper OPTIONS)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: callerError,
    } = await caller.auth.getUser();

    if (callerError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerRecord, error: callerRecordError } = await supabaseAdmin
      .schema('kinesys').from('users').select('role, tenant_id').eq('id', user.id).single();

    if (
      callerRecordError ||
      !callerRecord ||
      !['clinic_admin', 'super_admin', 'superadmin'].includes(String(callerRecord.role).toLowerCase())
    ) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const body = await req.json();
    const {
      email,
      full_name,
      role,
      tenant_id,
      phone,
      license_number,
      specialty,
      invited_by,
    } = body;

    if (!email || !full_name || !role || !tenant_id) {
      return jsonResponse(
        { error: 'Campos requeridos: email, full_name, role, tenant_id' },
        400,
      );
    }

    const callerRole = String(callerRecord.role).toLowerCase();
    if (callerRole === 'clinic_admin' && callerRecord.tenant_id !== tenant_id) {
      return jsonResponse({ error: 'No autorizado para este tenant' }, 403);
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: { full_name, role, tenant_id },
      },
    );

    if (inviteError) {
      return jsonResponse({ error: inviteError.message }, 400);
    }

    const userId = inviteData.user?.id;
    if (!userId) {
      return jsonResponse({ error: 'No se obtuvo ID del usuario invitado' }, 500);
    }

    const db = supabaseAdmin.schema('kinesys');

    const { data: userRow, error: userError } = await db
      .from('users')
      .upsert([
        {
          id: userId,
          tenant_id,
          email: normalizedEmail,
          full_name,
          role,
          phone,
          license_number,
          specialty,
          is_active: true,
        },
      ], { onConflict: 'id' })
      .select()
      .single();

    if (userError) {
      return jsonResponse({ error: userError.message }, 400);
    }

    const { error: profileError } = await db.from('profiles').upsert(
      [{ id: userId, tenant_id, email: normalizedEmail, full_name, role, is_active: true }],
      { onConflict: 'id' },
    );
    if (profileError) {
      return jsonResponse({ error: profileError.message }, 400);
    }

    const { error: professionalProfileError } = await db.from('professional_profiles').upsert(
      [{ user_id: userId, tenant_id, bio: '' }],
      { onConflict: 'user_id' },
    );
    if (professionalProfileError) {
      return jsonResponse({ error: professionalProfileError.message }, 400);
    }

    if (invited_by) {
      const { error: invitationError } = await db.from('team_invitations').insert([
        { tenant_id, email: normalizedEmail, role, status: 'pending', invited_by },
      ]);
      if (invitationError) {
        return jsonResponse({ error: invitationError.message }, 400);
      }
    }

    return jsonResponse(
      { success: true, user: userRow, message: 'Invitación enviada' },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return jsonResponse({ error: message }, 400);
  }
});

// Re-export for clarity / tests
export { corsHeaders };
