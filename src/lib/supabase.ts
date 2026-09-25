import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Cek apakah kredensial Supabase sudah terisi dengan valid
 */
export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('your-project-ref') &&
    !supabaseAnonKey.includes('your-anon-key')
  );
};

if (!isSupabaseConfigured()) {
  console.warn(
    '[Ordo POS] Kredensial Supabase belum dikonfigurasi di file .env. ' +
      'Aplikasi berjalan dalam mode fallback lokal.'
  );
}

// Inisialisasi Supabase client dengan graceful fallback URL & Anon Key dummy jika belum dikonfigurasi
const effectiveUrl = isSupabaseConfigured()
  ? supabaseUrl
  : 'https://placeholder.supabase.co';
const effectiveKey = isSupabaseConfigured()
  ? supabaseAnonKey
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase = createClient<Database>(effectiveUrl, effectiveKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
