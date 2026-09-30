import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { StoreSettings } from '../types';
import { DEFAULT_STORE_SETTINGS } from '../data/initialData';

// ==============================================================================
// UPLOAD LOGO: Base64 cropped → Supabase Storage → Public URL
// ==============================================================================

/**
 * Mengunggah gambar logo (berformat Base64 dari LogoCropperModal) ke Supabase Storage
 * di bucket `store-logos`. Mengembalikan public URL permanen yang dapat disimpan di DB.
 *
 * PENTING: Fungsi ini TIDAK menyimpan Base64 ke database. Hanya public URL yang disimpan
 * ke kolom `logo_url` di tabel `stores`.
 *
 * @param storeId  - ID toko, digunakan sebagai nama folder di dalam bucket.
 * @param base64   - String data URL Base64 (format: "data:image/png;base64,...").
 * @returns { publicUrl, error } — publicUrl berisi URL permanen jika sukses.
 */
export async function uploadStoreLogo(
  storeId: string,
  base64: string
): Promise<{ publicUrl: string | null; error: string | null }> {
  if (!isSupabaseConfigured() || !storeId || !base64) {
    // Fallback: kembalikan Base64 apa adanya jika Storage belum bisa diakses
    return { publicUrl: base64, error: null };
  }

  try {
    // 1. Decode Base64 → Blob
    const [header, data] = base64.split(',');
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mime = mimeMatch?.[1] || 'image/jpeg';
    const ext = mime.split('/')[1] || 'jpg';
    const byteCharacters = atob(data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mime });

    // 2. Path unik: store-id/logo-timestamp.ext (upsert agar tidak duplikat)
    const fileName = `logo-${Date.now()}.${ext}`;
    const filePath = `${storeId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('store-logos')
      .upload(filePath, blob, {
        contentType: mime,
        upsert: true,
      });

    if (uploadError) {
      console.error('[storeService] Gagal upload logo:', uploadError);
      return { publicUrl: base64, error: uploadError.message };
    }

    // 3. Ambil public URL
    const { data: urlData } = supabase.storage
      .from('store-logos')
      .getPublicUrl(filePath);

    const publicUrl = urlData?.publicUrl || base64;
    return { publicUrl, error: null };
  } catch (err: any) {
    console.error('[storeService] Error uploadStoreLogo:', err);
    return { publicUrl: base64, error: err?.message || 'Upload gagal' };
  }
}

// ==============================================================================
// FETCH FULL STORE SETTINGS: Ambil seluruh pengaturan toko langsung dari Supabase
// ==============================================================================

export interface FullStoreSettingsResult {
  settings: StoreSettings;
  theme: 'dark' | 'light';
  hasCompletedOnboarding: boolean;
  hasCompletedStoreSetup: boolean;
}

/**
 * Mengambil seluruh data pengaturan toko dari Supabase:
 * 1. Tabel `stores` (nama, slug, slogan, alamat, nomor telp, logo, garansi, tema, status setup)
 * 2. Tabel `profiles` (nama pemilik konter dari owner_id)
 * 3. Tabel `store_whatsapp_templates` (ke-6 template pesan WA dinamis)
 */
export async function fetchFullStoreSettings(
  storeId: string
): Promise<FullStoreSettingsResult | null> {
  if (!isSupabaseConfigured() || !storeId) {
    return null;
  }

  try {
    // 1. Fetch data toko
    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .maybeSingle();

    if (storeErr || !store) {
      console.error('[storeService] Gagal memuat data toko dari Supabase:', storeErr);
      return null;
    }

    // 2. Fetch nama pemilik dari tabel profiles jika ada owner_id
    let ownerName = DEFAULT_STORE_SETTINGS.ownerName;
    if (store.owner_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', store.owner_id)
        .maybeSingle();
      if (profile?.full_name?.trim()) {
        ownerName = profile.full_name.trim();
      }
    }

    // 3. Fetch template WhatsApp dari tabel store_whatsapp_templates
    const { data: waTemplate } = await supabase
      .from('store_whatsapp_templates')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle();

    // Helper sanitasi emoji jika data lama masih mengandung emoji
    const cleanEmoji = (str?: string | null) => {
      if (!str) return undefined;
      const hasEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(str);
      return hasEmoji ? undefined : str;
    };

    const settings: StoreSettings = {
      storeName: store.name || DEFAULT_STORE_SETTINGS.storeName,
      storeUsername: store.username || DEFAULT_STORE_SETTINGS.storeUsername,
      ownerName: ownerName,
      storeTagline: store.tagline || DEFAULT_STORE_SETTINGS.storeTagline,
      storeAddress: store.address || DEFAULT_STORE_SETTINGS.storeAddress,
      storePhone: store.phone || DEFAULT_STORE_SETTINGS.storePhone,
      defaultWarrantyDays: store.default_warranty_days || DEFAULT_STORE_SETTINGS.defaultWarrantyDays,
      warrantyTerms: store.warranty_terms || DEFAULT_STORE_SETTINGS.warrantyTerms,
      logoUrl: store.logo_url || undefined,
      waIntakeMsg: cleanEmoji(waTemplate?.wa_intake_msg) || DEFAULT_STORE_SETTINGS.waIntakeMsg,
      waDiagnosisMsg: cleanEmoji(waTemplate?.wa_diagnosis_msg) || DEFAULT_STORE_SETTINGS.waDiagnosisMsg,
      waReadyMsg: cleanEmoji(waTemplate?.wa_ready_msg) || DEFAULT_STORE_SETTINGS.waReadyMsg,
      waDoneMsg: cleanEmoji(waTemplate?.wa_done_msg) || DEFAULT_STORE_SETTINGS.waDoneMsg,
      waCancelMsg: cleanEmoji(waTemplate?.wa_cancel_msg) || DEFAULT_STORE_SETTINGS.waCancelMsg,
      waCancelPickupMsg: cleanEmoji(waTemplate?.wa_cancel_pickup_msg) || DEFAULT_STORE_SETTINGS.waCancelPickupMsg,
    };

    const theme: 'dark' | 'light' = store.theme_preference === 'light' ? 'light' : 'dark';
    const hasCompletedOnboarding = Boolean(store.has_completed_onboarding);
    const hasCompletedStoreSetup = Boolean(store.has_completed_store_setup);

    return {
      settings,
      theme,
      hasCompletedOnboarding,
      hasCompletedStoreSetup,
    };
  } catch (err) {
    console.error('[storeService] Error fetchFullStoreSettings:', err);
    return null;
  }
}

// ==============================================================================
// UPDATE STORE PROFILE: Simpan data profil toko ke tabel `stores`
// ==============================================================================

/**
 * Memperbarui kolom-kolom profil di tabel `stores`.
 * Kolom yang diupdate: store_name, owner_name, tagline, address, phone,
 * default_warranty_days, warranty_terms, logo_url.
 */
export async function updateStoreProfile(params: {
  storeId: string;
  settings: StoreSettings;
}): Promise<{ success: boolean; data?: Partial<StoreSettings>; error: string | null }> {
  const { storeId, settings } = params;

  if (!isSupabaseConfigured() || !storeId) {
    return { success: true, error: null };
  }

  try {
    const { data: updatedStore, error } = await supabase
      .from('stores')
      .update({
        name: settings.storeName?.trim() || 'ORDO SERVIS HP',
        tagline: settings.storeTagline?.trim() || '',
        address: settings.storeAddress?.trim() || '',
        phone: settings.storePhone?.trim() || '',
        default_warranty_days: String(settings.defaultWarrantyDays || '14'),
        warranty_terms: settings.warrantyTerms?.trim() || '',
        logo_url: settings.logoUrl ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storeId)
      .select('*')
      .single();

    if (error) {
      console.error('[storeService] Gagal update profil toko di Supabase:', error);
      return { success: false, error: error.message };
    }

    const ownerName = settings.ownerName?.trim();
    if (ownerName) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          await supabase
            .from('profiles')
            .update({
              full_name: ownerName,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userData.user.id);
        }
      } catch (profErr) {
        console.warn('[storeService] Non-fatal profile name update warning:', profErr);
      }
    }

    return {
      success: true,
      data: {
        storeName: updatedStore.name,
        storeTagline: updatedStore.tagline,
        storeAddress: updatedStore.address,
        storePhone: updatedStore.phone,
        defaultWarrantyDays: updatedStore.default_warranty_days,
        warrantyTerms: updatedStore.warranty_terms,
        logoUrl: updatedStore.logo_url || undefined,
        ownerName: ownerName || undefined,
      },
      error: null,
    };
  } catch (err: any) {
    console.error('[storeService] Error updateStoreProfile:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan profil toko' };
  }
}

// ==============================================================================
// UPDATE WA TEMPLATES: Simpan template pesan WA ke tabel `store_whatsapp_templates`
// ==============================================================================

/**
 * Memperbarui (UPSERT) semua template pesan WhatsApp milik toko di tabel
 * `store_whatsapp_templates`. Menggunakan ON CONFLICT (store_id) DO UPDATE.
 */
export async function updateWhatsAppTemplates(params: {
  storeId: string;
  settings: StoreSettings;
}): Promise<{ success: boolean; data?: Partial<StoreSettings>; error: string | null }> {
  const { storeId, settings } = params;

  if (!isSupabaseConfigured() || !storeId) {
    return { success: true, error: null };
  }

  try {
    const { data: updatedTemplate, error } = await supabase
      .from('store_whatsapp_templates')
      .upsert(
        {
          store_id: storeId,
          wa_intake_msg: settings.waIntakeMsg ?? null,
          wa_diagnosis_msg: settings.waDiagnosisMsg ?? null,
          wa_ready_msg: settings.waReadyMsg ?? null,
          wa_done_msg: settings.waDoneMsg ?? null,
          wa_cancel_msg: settings.waCancelMsg ?? null,
          wa_cancel_pickup_msg: settings.waCancelPickupMsg ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'store_id' }
      )
      .select('*')
      .single();

    if (error) {
      console.error('[storeService] Gagal update template WA di Supabase:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        waIntakeMsg: updatedTemplate.wa_intake_msg || undefined,
        waDiagnosisMsg: updatedTemplate.wa_diagnosis_msg || undefined,
        waReadyMsg: updatedTemplate.wa_ready_msg || undefined,
        waDoneMsg: updatedTemplate.wa_done_msg || undefined,
        waCancelMsg: updatedTemplate.wa_cancel_msg || undefined,
        waCancelPickupMsg: updatedTemplate.wa_cancel_pickup_msg || undefined,
      },
      error: null,
    };
  } catch (err: any) {
    console.error('[storeService] Error updateWhatsAppTemplates:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan template WA' };
  }
}

// ==============================================================================
// UPDATE THEME PREFERENCE: Simpan mode tema (dark/light) ke kolom `stores.theme_preference`
// ==============================================================================

/**
 * Memperbarui preferensi mode tema toko (dark / light) langsung di database Supabase.
 */
export async function updateStoreTheme(
  storeId: string,
  theme: 'dark' | 'light'
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured() || !storeId) {
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase
      .from('stores')
      .update({
        theme_preference: theme,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storeId);

    if (error) {
      console.error('[storeService] Gagal update preferensi tema di Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[storeService] Error updateStoreTheme:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan tema' };
  }
}

// ==============================================================================
// UPDATE ONBOARDING / SETUP STATUS: Simpan status wizard ke kolom `stores`
// ==============================================================================

/**
 * Memperbarui status selesai onboarding atau store setup di database Supabase.
 */
export async function updateStoreOnboardingStatus(
  storeId: string,
  status: {
    hasCompletedOnboarding?: boolean;
    hasCompletedStoreSetup?: boolean;
  }
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured() || !storeId) {
    return { success: true, error: null };
  }

  try {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof status.hasCompletedOnboarding === 'boolean') {
      updatePayload.has_completed_onboarding = status.hasCompletedOnboarding;
    }
    if (typeof status.hasCompletedStoreSetup === 'boolean') {
      updatePayload.has_completed_store_setup = status.hasCompletedStoreSetup;
    }

    const { error } = await supabase
      .from('stores')
      .update(updatePayload)
      .eq('id', storeId);

    if (error) {
      console.error('[storeService] Gagal update status setup/onboarding di Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[storeService] Error updateStoreOnboardingStatus:', err);
    return { success: false, error: err?.message || 'Gagal update status setup' };
  }
}

// ==============================================================================
// SAVE ALL SETTINGS: Gabungan — update profil + template WA sekaligus
// ==============================================================================

/**
 * Helper yang memanggil updateStoreProfile + updateWhatsAppTemplates secara paralel.
 * Mengembalikan objek StoreSettings yang telah tersinkronisasi dari respons database Supabase.
 */
export async function saveAllStoreSettings(params: {
  storeId: string;
  settings: StoreSettings;
}): Promise<{ success: boolean; updatedSettings?: StoreSettings; errors: string[] }> {
  const [profileResult, templateResult] = await Promise.allSettled([
    updateStoreProfile(params),
    updateWhatsAppTemplates(params),
  ]);

  const errors: string[] = [];
  let mergedSettings: StoreSettings = { ...params.settings };

  if (profileResult.status === 'fulfilled') {
    if (profileResult.value.success && profileResult.value.data) {
      mergedSettings = { ...mergedSettings, ...profileResult.value.data };
    } else if (!profileResult.value.success && profileResult.value.error) {
      errors.push(profileResult.value.error);
    }
  } else {
    errors.push('Gagal menyimpan profil toko ke Cloud');
  }

  if (templateResult.status === 'fulfilled') {
    if (templateResult.value.success && templateResult.value.data) {
      mergedSettings = { ...mergedSettings, ...templateResult.value.data };
    } else if (!templateResult.value.success && templateResult.value.error) {
      errors.push(templateResult.value.error);
    }
  } else {
    errors.push('Gagal menyimpan template WhatsApp ke Cloud');
  }

  return {
    success: errors.length === 0,
    updatedSettings: mergedSettings,
    errors,
  };
}
