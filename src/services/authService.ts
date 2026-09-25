import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AuthUser } from '../types';

const STORAGE_KEY_FALLBACK_AUTH = 'ordo_servis_auth_user_v4';
const STORAGE_KEY_FALLBACK_USERS = 'ordo_servis_registered_users_v1';

/**
 * Generate slug toko otomatis dari nama konter: huruf kecil, spasi diganti strip (-), dan 5 karakter acak unik
 * Contoh: "Jaya Phone" -> "jaya-phone-a1b2c"
 */
export function generateStoreSlug(storeName: string): string {
  const cleanBase =
    storeName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'konter';
  const randomCode = Math.random().toString(36).substring(2, 7);
  return `${cleanBase}-${randomCode}`;
}

// Type helper lokal agar tidak perlu import Database penuh di setiap service
type ProfileRow = {
  id: string;
  full_name: string;
  phone: string;
  role: 'OWNER';
  avatar_url: string | null;
  created_at: string;
};

type StoreRow = {
  id: string;
  name: string;
  username: string;
  phone: string;
  logo_url: string | null;
  has_completed_onboarding: boolean;
  has_completed_store_setup: boolean;
} | null;

/**
 * Mengambil data profil dan toko dari database Supabase untuk user terautentikasi
 */
export async function fetchUserProfileAndStore(userId: string): Promise<AuthUser | null> {
  if (!isSupabaseConfigured()) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FALLBACK_AUTH);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  }

  try {
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr || !profileData) {
      return null;
    }

    // Cast eksplisit: supabase-js membutuhkan ini agar TypeScript kenali shape Row
    const profile = profileData as unknown as ProfileRow;

    const { data: storeData } = await supabase
      .from('stores')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle();

    // store bisa null jika trigger DB belum selesai saat dipanggil
    const store = (storeData ?? null) as unknown as StoreRow;

    const { data: authData } = await supabase.auth.getUser();

    return {
      id: profile.id,
      storeId: store?.id,
      name: profile.full_name,
      email: authData?.user?.email || '',
      phone: profile.phone || store?.phone || '',
      role: 'OWNER',
      storeName: store?.name || 'Ordo Servis HP',
      storeUsername: store?.username || 'ordo',
      avatarUrl: profile.avatar_url || store?.logo_url || undefined,
      hasCompletedOnboarding: store?.has_completed_onboarding ?? false,
      hasCompletedStoreSetup: store?.has_completed_store_setup ?? false,
      createdAt: profile.created_at,
    };
  } catch (err) {
    console.error('[authService] Gagal mengambil profil dan toko:', err);
    return null;
  }
}

/**
 * Registrasi akun pemilik baru
 * - Kolom Username Toko otomatis di-generate di balik layar
 */
export async function signUpOwner(params: {
  name: string;
  storeName: string;
  phone: string;
  email: string;
  password: string;
}): Promise<{ user: AuthUser | null; error: string | null; isNewRegistration: boolean }> {
  const { name, storeName, phone, email, password } = params;

  // 1. Fallback jika Supabase belum terkonfigurasi di .env
  if (!isSupabaseConfigured()) {
    const autoSlug = generateStoreSlug(storeName);
    const mockUser: AuthUser = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || '0812-3456-7890',
      role: 'OWNER',
      storeName: storeName.trim() || 'Ordo Servis HP',
      storeUsername: autoSlug,
      hasCompletedOnboarding: false,
      hasCompletedStoreSetup: false,
      createdAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_KEY_FALLBACK_AUTH, JSON.stringify(mockUser));
      const registeredStr = localStorage.getItem(STORAGE_KEY_FALLBACK_USERS);
      const registered = registeredStr ? JSON.parse(registeredStr) : [];
      localStorage.setItem(
        STORAGE_KEY_FALLBACK_USERS,
        JSON.stringify([...registered, mockUser])
      );
    } catch {
      // ignore
    }

    return { user: mockUser, error: null, isNewRegistration: true };
  }

  // 2. Registrasi resmi ke Supabase Auth
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
          name: name.trim(),
          store_name: storeName.trim(),
          phone: phone.trim(),
        },
      },
    });

    if (error) {
      return { user: null, error: error.message, isNewRegistration: false };
    }

    if (!data.user) {
      return { user: null, error: 'Pendaftaran gagal dibuat.', isNewRegistration: false };
    }

    // Ambil profil yang dibuat otomatis oleh trigger handle_new_user()
    // Berikan sedikit waktu toleransi trigger PostgreSQL
    let authUser = await fetchUserProfileAndStore(data.user.id);
    if (!authUser) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      authUser = await fetchUserProfileAndStore(data.user.id);
    }

    if (!authUser) {
      // Fallback object dari metadata jika trigger masih bekerja
      const autoSlug = generateStoreSlug(storeName);
      authUser = {
        id: data.user.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: 'OWNER',
        storeName: storeName.trim(),
        storeUsername: autoSlug,
        hasCompletedOnboarding: false,
        hasCompletedStoreSetup: false,
        createdAt: data.user.created_at,
      };
    }

    return { user: authUser, error: null, isNewRegistration: true };
  } catch (err: any) {
    return {
      user: null,
      error: err?.message || 'Terjadi kesalahan saat pendaftaran.',
      isNewRegistration: false,
    };
  }
}

/**
 * Masuk (Login) menggunakan Email dan Kata Sandi
 */
export async function signInOwner(params: {
  email: string;
  password: string;
}): Promise<{ user: AuthUser | null; error: string | null }> {
  const { email, password } = params;

  // 1. Fallback jika Supabase belum terkonfigurasi di .env
  if (!isSupabaseConfigured()) {
    try {
      const savedUsersStr = localStorage.getItem(STORAGE_KEY_FALLBACK_USERS);
      const savedUsers: AuthUser[] = savedUsersStr ? JSON.parse(savedUsersStr) : [];
      const match = savedUsers.find(
        (u) => u.email.toLowerCase().trim() === email.toLowerCase().trim()
      );

      if (match) {
        localStorage.setItem(STORAGE_KEY_FALLBACK_AUTH, JSON.stringify(match));
        return { user: match, error: null };
      }

      // Jika tidak ditemukan di list registrasi, buat fallback akun demo
      const demoUser: AuthUser = {
        id: `usr_${Date.now()}`,
        name: 'Pemilik Toko',
        email: email.trim(),
        phone: '0812-3456-7890',
        role: 'OWNER',
        storeName: 'Ordo Servis HP',
        storeUsername: generateStoreSlug('Ordo Servis HP'),
        hasCompletedOnboarding: true,
        hasCompletedStoreSetup: true,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY_FALLBACK_AUTH, JSON.stringify(demoUser));
      return { user: demoUser, error: null };
    } catch {
      // ignore
    }
  }

  // 2. Login resmi ke Supabase Auth
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: 'Pengguna tidak ditemukan.' };
    }

    const authUser = await fetchUserProfileAndStore(data.user.id);
    if (!authUser) {
      return {
        user: null,
        error: 'Profil toko tidak ditemukan. Silakan hubungi admin sistem.',
      };
    }

    return { user: authUser, error: null };
  } catch (err: any) {
    return {
      user: null,
      error: err?.message || 'Gagal masuk ke aplikasi.',
    };
  }
}

/**
 * Keluar (Logout)
 */
export async function signOutOwner(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[authService] Error saat signOut:', err);
    }
  }
  try {
    localStorage.removeItem(STORAGE_KEY_FALLBACK_AUTH);
  } catch {
    // ignore
  }
}

/**
 * Dapatkan user yang sedang aktif saat inisialisasi aplikasi
 */
export async function getInitialAuthUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured()) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FALLBACK_AUTH);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  }

  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user) {
      return await fetchUserProfileAndStore(data.session.user.id);
    }
  } catch (err) {
    console.error('[authService] Gagal memuat session user aktif:', err);
  }
  return null;
}
