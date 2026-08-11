import { supabase } from '../lib/supabase';
import type { UserRole } from '../types';

export interface SupabaseUserProfile {
  id: string;
  fullName: string;
  username?: string;
  role: UserRole;
}

export const userService = {
  async getAll(): Promise<SupabaseUserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, role, username');
    if (error) throw error;
    return (data ?? []).map((p) => ({
      id: p.id,
      fullName: p.full_name,
      username: p.username ?? undefined,
      role: p.role as UserRole,
    }));
  },

  async updateProfile(id: string, update: { fullName?: string; role?: UserRole }): Promise<void> {
    const patch: Record<string, string> = {};
    if (update.fullName !== undefined) patch.full_name = update.fullName;
    if (update.role !== undefined) patch.role = update.role;
    const { error } = await supabase.from('user_profiles').update(patch).eq('id', id);
    if (error) throw error;
  },

  // Renames the linked auth account's email when the username changes, so login
  // keeps working under the new username — requires the service-role key, hence
  // routed through the 'update-user' edge function rather than a direct table update.
  async updateUser(id: string, update: { username: string; fullName: string; role: UserRole }): Promise<void> {
    const { data, error } = await supabase.functions.invoke('update-user', {
      body: { id, username: update.username, fullName: update.fullName, role: update.role },
    });
    if (error) {
      let message = error.message;
      try {
        const body = await (error as { context: Response }).context.json();
        if (body?.error) message = body.error;
      } catch { /* ignore — fall back to error.message */ }
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
  },

  async deleteProfile(id: string): Promise<void> {
    const { error } = await supabase.from('user_profiles').delete().eq('id', id);
    if (error) throw error;
  },

  async upsertProfile(id: string, fullName: string, role: UserRole): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ id, full_name: fullName, role });
    if (error) throw error;
  },
};
