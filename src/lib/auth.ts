import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  email: string | null;
  passcode: string;
  avatar_color: string;
  can_edit_columns: boolean;
  can_view_reports: boolean;
  can_manage_users: boolean;
  api_key: string | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user' | 'viewer';
}

export async function checkSystemInitialized(): Promise<boolean> {
  // Use the secure RPC function instead of querying profiles directly
  const { data, error } = await supabase.rpc('is_system_initialized');
  
  if (error) {
    console.error('Error checking system initialization:', error);
    return false;
  }
  
  return data === true;
}

export async function signUp(username: string, email: string | null, passcode: string, isAdmin: boolean = false) {
  // Create auth user with passcode as password
  const fakeEmail = `${username.toLowerCase().replace(/\s+/g, '_')}@roastery.local`;
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: fakeEmail,
    password: passcode.toUpperCase(),
  });

  if (authError) {
    throw authError;
  }

  if (!authData.user) {
    throw new Error('Failed to create user');
  }

  // Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: authData.user.id,
      username,
      email,
      passcode: passcode.toUpperCase(),
      avatar_color: generateRandomColor(),
      can_edit_columns: isAdmin,
      can_view_reports: isAdmin,
      can_manage_users: isAdmin,
    });

  if (profileError) {
    throw profileError;
  }

  // Create role
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({
      user_id: authData.user.id,
      role: isAdmin ? 'admin' : 'user',
    });

  if (roleError) {
    throw roleError;
  }

  return { user: authData.user, passcode: passcode.toUpperCase() };
}

export async function signIn(passcode: string) {
  // Find user by passcode
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('passcode', passcode.toUpperCase())
    .limit(1);

  if (profileError) {
    throw profileError;
  }

  if (!profiles || profiles.length === 0) {
    throw new Error('Invalid passcode');
  }

  const profile = profiles[0];
  const fakeEmail = `${profile.username.toLowerCase().replace(/\s+/g, '_')}@roastery.local`;

  // Sign in with Supabase auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email: fakeEmail,
    password: passcode.toUpperCase(),
  });

  if (error) {
    throw error;
  }

  return { user: data.user, profile };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .limit(1);

  if (error || !profiles || profiles.length === 0) {
    return null;
  }

  return profiles[0] as UserProfile;
}

export async function getCurrentRole(): Promise<UserRole | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id)
    .limit(1);

  if (error || !roles || roles.length === 0) {
    return null;
  }

  return roles[0] as UserRole;
}

function generateRandomColor(): string {
  const colors = [
    '#8B4513', '#A0522D', '#CD853F', '#DEB887', '#D2691E',
    '#B8860B', '#DAA520', '#F4A460', '#E9967A', '#FA8072',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
