import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Verify caller is admin via their JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Create a client scoped to the caller to verify their identity
  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user: callerUser }, error: userError } = await callerClient.auth.getUser();
  if (userError || !callerUser) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const callerId = callerUser.id;

  // Use service role client for admin operations
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  // Check caller is admin
  const { data: callerRole } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', callerId)
    .eq('role', 'admin')
    .maybeSingle();

  if (!callerRole) {
    return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const {
      username,
      passcode,
      role = 'user',
      can_edit_columns = false,
      can_view_reports = false,
      can_manage_users = false,
      avatar_color = '#8B4513',
      employeeId,
    } = body;

    // Validate inputs
    if (!username || !passcode) {
      return new Response(JSON.stringify({ error: 'username and passcode are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (passcode.length < 6) {
      return new Response(JSON.stringify({ error: 'Passcode must be at least 6 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validRoles = ['admin', 'user', 'viewer'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const passcodeUpper = passcode.toUpperCase();
    const baseSlug = username.toLowerCase().replace(/\s+/g, '_');

    // Check if passcode already exists
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('passcode', passcodeUpper)
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({ error: 'This passcode is already in use' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try creating auth user, appending a suffix if email already exists
    let authData: any = null;
    let fakeEmail = `${baseSlug}@roastery.local`;
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidateEmail = attempt === 0 ? fakeEmail : `${baseSlug}_${attempt}@roastery.local`;
      const { data, error: authError } = await adminClient.auth.admin.createUser({
        email: candidateEmail,
        password: passcodeUpper,
        email_confirm: true,
      });
      if (!authError && data?.user) {
        authData = data;
        fakeEmail = candidateEmail;
        break;
      }
      if (authError && authError.message?.includes('already been registered')) {
        continue;
      }
      if (authError) throw authError;
    }
    if (!authData?.user) throw new Error('Failed to create user after multiple attempts');

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // Create profile
    const isAdmin = role === 'admin';
    const { data: profileData, error: profileError } = await adminClient
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        username,
        passcode: passcodeUpper,
        avatar_color,
        can_edit_columns: isAdmin || can_edit_columns,
        can_view_reports: isAdmin || can_view_reports,
        can_manage_users: isAdmin || can_manage_users,
      })
      .select('id')
      .single();

    if (profileError) throw profileError;

    // Create role
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role,
      });

    if (roleError) throw roleError;

    // Link profile to employee if employeeId provided
    if (employeeId) {
      const { error: linkError } = await adminClient
        .from('employees')
        .update({ profile_id: profileData.id })
        .eq('id', employeeId);

      if (linkError) throw linkError;
    }

    return new Response(JSON.stringify({
      success: true,
      profileId: profileData.id,
      passcode: passcodeUpper,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error creating user account:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
