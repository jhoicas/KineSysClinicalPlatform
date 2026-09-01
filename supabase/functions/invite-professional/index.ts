import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      return new Response(JSON.stringify({ error: 'Campos requeridos: email, full_name, role, tenant_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: { full_name, role, tenant_id },
    });

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = inviteData.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'No se obtuvo ID del usuario invitado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    return new Response(JSON.stringify({ user: userRow }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
