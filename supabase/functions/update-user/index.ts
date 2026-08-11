// Updates an internal user's username/full name/role. When the username
// changes, the linked auth account's email is renamed to match
// (username@pitifoods.com) so login keeps working under the new username.
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

    // Only super admins may edit other users' accounts.
    const { data: callerProfile } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('id', caller.id)
      .single();
    if (callerProfile?.role !== 'super_admin') {
      throw new Error('Only super admins can edit users');
    }

    const { id, username, fullName, role } = await req.json();
    if (!id || !username || !fullName || !role) {
      throw new Error('Missing required fields');
    }
    if (role !== 'admin' && role !== 'super_admin') {
      throw new Error('Invalid role');
    }

    const { data: existingProfile, error: fetchError } = await adminClient
      .from('user_profiles')
      .select('username')
      .eq('id', id)
      .single();
    if (fetchError || !existingProfile) throw new Error('User not found');

    const cleanUsername = String(username).trim().toLowerCase();

    if (cleanUsername !== existingProfile.username) {
      const newEmail = `${cleanUsername}@pitifoods.com`;
      const { error: emailError } = await adminClient.auth.admin.updateUserById(id, { email: newEmail });
      if (emailError) {
        throw new Error(
          emailError.message.toLowerCase().includes('already been registered') || emailError.message.toLowerCase().includes('duplicate')
            ? 'That username is already taken'
            : emailError.message
        );
      }
    }

    const { error: profileError } = await adminClient
      .from('user_profiles')
      .update({ username: cleanUsername, full_name: String(fullName).trim(), role })
      .eq('id', id);
    if (profileError) throw profileError;

    return new Response(JSON.stringify({ ok: true }), {
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
