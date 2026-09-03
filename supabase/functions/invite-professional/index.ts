import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

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
      return jsonResponse({ error: 'Campos requeridos: email, full_name, role, tenant_id' }, 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: { full_name, role, tenant_id },
    });

    if (inviteError) {
      return jsonResponse({ error: inviteError.message }, 400);
    }

    const userId = inviteData.user?.id;
    if (!userId) {
      return jsonResponse({ error: 'No se obtuvo ID del usuario invitado' }, 500);
    }

    const db = admin.schema('kinesys');

    const { data: userRow, error: userError } = await db.from('users').insert([
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
    ]).select().single();

    if (userError) {
      return jsonResponse({ error: userError.message }, 400);
    }

    await db.from('profiles').insert([
      { id: userId, tenant_id, email: normalizedEmail, full_name, role, is_active: true },
    ]);

    await db.from('professional_profiles').insert([
      { user_id: userId, tenant_id, bio: '' },
    ]);

    if (invited_by) {
      await db.from('team_invitations').insert([
        { tenant_id, email: normalizedEmail, role, status: 'pending', invited_by },
      ]);
    }

    return jsonResponse({ success: true, user: userRow }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return jsonResponse({ error: message }, 400);
  }
});
