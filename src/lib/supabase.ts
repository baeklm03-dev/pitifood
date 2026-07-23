import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('xxxxxxxxxxxx')) {
  console.error(
    '[PITI] Missing Supabase credentials.\n' +
    'Open .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n' +
    'Get these from: Supabase Dashboard → Project Settings → API'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
