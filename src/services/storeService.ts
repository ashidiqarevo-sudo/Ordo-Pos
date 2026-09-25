import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { StoreSettings } from '../types';

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
      // Fallback darurat: simpan Base64 jika storage gagal
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
    // Fallback darurat: kembalikan Base64
    return { publicUrl: base64, error: err?.message || 'Upload gagal' };
  }
}

// ==============================================================================
// UPDATE STORE PROFILE: Simpan data profil toko ke tabel `stores`
// ==============================================================================

/**
 * Memperbarui kolom-kolom profil di tabel `stores`.
 * Kolom yang diupdate: store_name, owner_name, tagline, address, phone,
 * default_warranty_days, warranty_terms, logo_url.
 *
 * Tidak menyentuh kolom username/storeId.
 */
export async function updateStoreProfile(params: {
  storeId: string;
  settings: StoreSettings;
}): Promise<{ success: boolean; error: string | null }> {
  const { storeId, settings } = params;

  if (!isSupabaseConfigured() || !storeId) {
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase
      .from('stores')
      .update({
        name: settings.storeName?.trim() || 'ORDO SERVIS HP',
        tagline: settings.storeTagline?.trim() || '',
        address: settings.storeAddress?.trim() || '',
        phone: settings.storePhone?.trim() || '',
        default_warranty_days: String(settings.defaultWarrantyDays || '14'),
        warranty_terms: settings.warrantyTerms?.trim() || '',
        // Simpan logo_url hanya jika bukan Base64 (URL permanen dari storage)
        // Jika masih Base64 (fallback offline), tetap simpan apa adanya
        logo_url: settings.logoUrl ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storeId);

    if (error) {
      console.error('[storeService] Gagal update profil toko:', error);
      return { success: false, error: error.message };
    }

    if (settings.ownerName?.trim()) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          await supabase
            .from('profiles')
            .update({
              full_name: settings.ownerName.trim(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', userData.user.id);
        }
      } catch (profErr) {
        console.warn('[storeService] Non-fatal profile name update warning:', profErr);
      }
    }

    return { success: true, error: null };
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
 * `store_whatsapp_templates`. Menggunakan ON CONFLICT (store_id) DO UPDATE
 * via metode upsert Supabase.
 *
 * Template yang disinkronkan:
 * - wa_intake_msg    → template notifikasi masuk HP
 * - wa_diagnosis_msg → template konfirmasi estimasi biaya
 * - wa_ready_msg     → template pemberitahuan HP siap diambil
 * - wa_done_msg      → template bukti serah terima selesai
 * - wa_cancel_msg    → template servis dibatalkan (belum diambil)
 * - wa_cancel_pickup_msg → template HP batal sudah diserahkan
 */
export async function updateWhatsAppTemplates(params: {
  storeId: string;
  settings: StoreSettings;
}): Promise<{ success: boolean; error: string | null }> {
  const { storeId, settings } = params;

  if (!isSupabaseConfigured() || !storeId) {
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase
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
      );

    if (error) {
      console.error('[storeService] Gagal update template WA:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[storeService] Error updateWhatsAppTemplates:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan template WA' };
  }
}

// ==============================================================================
// SAVE ALL SETTINGS: Gabungan — update profil + template WA sekaligus
// ==============================================================================

/**
 * Helper yang memanggil updateStoreProfile + updateWhatsAppTemplates secara paralel.
 * Digunakan oleh App.tsx agar satu panggilan saja yang diperlukan dari handler.
 */
export async function saveAllStoreSettings(params: {
  storeId: string;
  settings: StoreSettings;
}): Promise<{ success: boolean; errors: string[] }> {
  const [profileResult, templateResult] = await Promise.allSettled([
    updateStoreProfile(params),
    updateWhatsAppTemplates(params),
  ]);

  const errors: string[] = [];

  if (profileResult.status === 'fulfilled' && !profileResult.value.success) {
    if (profileResult.value.error) errors.push(profileResult.value.error);
  } else if (profileResult.status === 'rejected') {
    errors.push('Gagal simpan profil toko');
  }

  if (templateResult.status === 'fulfilled' && !templateResult.value.success) {
    if (templateResult.value.error) errors.push(templateResult.value.error);
  } else if (templateResult.status === 'rejected') {
    errors.push('Gagal simpan template WA');
  }

  return { success: errors.length === 0, errors };
}
