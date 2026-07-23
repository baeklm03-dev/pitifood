import { useState, useEffect } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types';

export interface AuthUser {
  id: string;
  userId: string;    // alias for backward compatibility
  email: string;
  username: string;  // alias for email (backward compatibility)
  fullName: string;
  role: UserRole;
}

async function buildAuthUser(sbUser: SupabaseUser): Promise<AuthUser> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, role')
    .eq('id', sbUser.id)
    .single();

  const email = sbUser.email ?? '';
  const fullName = profile?.full_name ?? email;
  const role = (profile?.role as UserRole) ?? 'admin';

  return { id: sbUser.id, userId: sbUser.id, email, username: email, fullName, role };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(await buildAuthUser(session.user));
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) {
          setUser(await buildAuthUser(session.user));
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const { data: email, error: rpcError } = await supabase.rpc('get_email_by_username', { p_username: username.toLowerCase() });
    if (rpcError || !email) return false;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return { user, loading, login, logout, isAuthenticated: !!user };
}
