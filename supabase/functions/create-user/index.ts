// Creates an internal user account without sending any confirmation email.
// Runs server-side with the service-role key — never expose that key to the browser.
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Identify the caller from their own access token.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) throw new Error('Not authenticated');

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Only super admins may create new users.
    const { data: callerProfile } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('id', caller.id)
      .single();
    if (callerProfile?.role !== 'super_admin') {
      throw new Error('Only super admins can create users');
    }

    const { username, password, fullName, role } = await req.json();
    if (!username || !password || !fullName || !role) {
      throw new Error('Missing required fields');
    }
    if (role !== 'admin' && role !== 'super_admin') {
      throw new Error('Invalid role');
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const email = `${cleanUsername}@pitifoods.com`;

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) throw createError;

    const { error: profileError } = await adminClient.from('user_profiles').insert({
      id: created.user.id,
      full_name: String(fullName).trim(),
      role,
      username: cleanUsername,
    });
    if (profileError) {
      // Roll back the auth user so we don't leave an orphaned account.
      await adminClient.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }

    return new Response(JSON.stringify({ id: created.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
