import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface CustomerRecord {
  id: string;
  store_id: string;
  name: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

/**
 * Mengambil daftar data pelanggan milik toko dari Supabase.
 */
export async function fetchCustomers(storeId: string): Promise<CustomerRecord[]> {
  if (!isSupabaseConfigured() || !storeId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) {
      console.error('[customerService] Gagal mengambil data pelanggan:', error);
      return [];
    }

    return (data || []) as CustomerRecord[];
  } catch (err) {
    console.error('[customerService] Error fetchCustomers:', err);
    return [];
  }
}

/**
 * Mencari atau mendaftarkan pelanggan baru saat Intake Servis (Upsert).
 * - Jika nomor WA cocok, gunakan pelanggan tersebut dan perbarui nama jika ada perubahan.
 * - Jika nomor WA tidak ada atau 'Tanpa WA', cari berdasarkan kecocokan nama.
 * - Jika belum ada, buat record baru di tabel `customers`.
 */
export async function upsertCustomer(params: {
  storeId: string;
  name: string;
  phone?: string;
}): Promise<CustomerRecord | null> {
  const { storeId, name, phone } = params;
  const cleanName = name.trim();
  const cleanPhone = (phone && phone.trim()) || 'Tanpa WA';

  if (!isSupabaseConfigured() || !storeId) {
    // Fallback object jika Supabase belum aktif
    return {
      id: `cust_${Date.now()}`,
      store_id: storeId || 'demo_store',
      name: cleanName,
      phone: cleanPhone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  try {
    // 1. Cek berdasarkan nomor WhatsApp jika bukan 'Tanpa WA'
    if (cleanPhone !== 'Tanpa WA') {
      const { data: existingByPhone, error: phoneErr } = await supabase
        .from('customers')
        .select('*')
        .eq('store_id', storeId)
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (!phoneErr && existingByPhone) {
        // Jika nama berbeda, perbarui nama terbaru pelanggan
        if (existingByPhone.name !== cleanName) {
          const { data: updated } = await supabase
            .from('customers')
            .update({
              name: cleanName,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingByPhone.id)
            .select()
            .single();

          return (updated || existingByPhone) as CustomerRecord;
        }
        return existingByPhone as CustomerRecord;
      }
    }

    // 2. Cek berdasarkan nama (case-insensitive) jika nomor telepon sama atau belum terdaftar
    const { data: existingByName, error: nameErr } = await supabase
      .from('customers')
      .select('*')
      .eq('store_id', storeId)
      .ilike('name', cleanName)
      .maybeSingle();

    if (!nameErr && existingByName) {
      // Jika pelanggan sebelumnya 'Tanpa WA' dan sekarang ada nomor WA baru, update
      if (cleanPhone !== 'Tanpa WA' && (!existingByName.phone || existingByName.phone === 'Tanpa WA')) {
        const { data: updated } = await supabase
          .from('customers')
          .update({
            phone: cleanPhone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingByName.id)
          .select()
          .single();

        return (updated || existingByName) as CustomerRecord;
      }
      return existingByName as CustomerRecord;
    }

    // 3. Jika belum ditemukan, buat pelanggan baru di tabel `customers`
    const { data: newCustomer, error: insertErr } = await supabase
      .from('customers')
      .insert({
        store_id: storeId,
        name: cleanName,
        phone: cleanPhone,
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[customerService] Gagal menambahkan pelanggan baru:', insertErr);
      return null;
    }

    return newCustomer as CustomerRecord;
  } catch (err) {
    console.error('[customerService] Error upsertCustomer:', err);
    return null;
  }
}

/**
 * Memperbarui data kontak pelanggan di tabel `customers`
 * dan menyinkronkan snapshot kontak di tabel `services` milik toko.
 */
export async function updateCustomer(params: {
  storeId: string;
  originalKey: string;
  newName: string;
  newPhone: string;
}): Promise<{ success: boolean; error?: string | null }> {
  const { storeId, originalKey, newName, newPhone } = params;
  const cleanName = newName.trim();
  const cleanPhone = newPhone.trim() || 'Tanpa WA';

  if (!isSupabaseConfigured() || !storeId) {
    return { success: true };
  }

  try {
    const nowIso = new Date().toISOString();

    // 1. Update tabel customers
    // originalKey bisa berupa nomor telepon atau nama pelanggan (case-insensitive)
    let updatedCust = false;

    // Coba update dengan kecocokan phone
    const { data: byPhone, error: phoneErr } = await supabase
      .from('customers')
      .update({
        name: cleanName,
        phone: cleanPhone,
        updated_at: nowIso,
      })
      .eq('store_id', storeId)
      .eq('phone', originalKey)
      .select();

    if (!phoneErr && byPhone && byPhone.length > 0) {
      updatedCust = true;
    }

    // Jika belum terupdate (misal pelanggan Tanpa WA yang primaryKey-nya nama), update by name
    if (!updatedCust) {
      await supabase
        .from('customers')
        .update({
          name: cleanName,
          phone: cleanPhone,
          updated_at: nowIso,
        })
        .eq('store_id', storeId)
        .ilike('name', originalKey);
    }

    // 2. Sinkronkan snapshot pelanggan di seluruh tiket servis milik toko
    // Update tiket yang customer_phone_snapshot = originalKey
    await supabase
      .from('services')
      .update({
        customer_name_snapshot: cleanName,
        customer_phone_snapshot: cleanPhone,
        updated_at: nowIso,
      })
      .eq('store_id', storeId)
      .eq('customer_phone_snapshot', originalKey);

    // Update tiket yang customer_name_snapshot = originalKey (untuk unit Tanpa WA)
    await supabase
      .from('services')
      .update({
        customer_name_snapshot: cleanName,
        customer_phone_snapshot: cleanPhone,
        updated_at: nowIso,
      })
      .eq('store_id', storeId)
      .ilike('customer_name_snapshot', originalKey);

    return { success: true };
  } catch (err: any) {
    console.error('[customerService] Error updateCustomer:', err);
    return { success: false, error: err?.message || 'Gagal memperbarui data pelanggan' };
  }
}
