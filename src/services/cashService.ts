import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CashEntry } from '../types';

/**
 * Mapping dari baris tabel `cash_entries` Supabase ke objek `CashEntry` frontend.
 */
function mapDbRowToCashEntry(row: any): CashEntry {
  return {
    id: row.id,
    date: row.entry_date,          // DATE kolom di DB: 'YYYY-MM-DD'
    type: row.entry_type as 'IN' | 'OUT' | 'TRANSFER',
    category: row.category,
    amount: Number(row.amount) || 0,
    notes: row.notes || '',
    paymentMethod: row.payment_method ?? undefined,
    transferFrom: row.transfer_from ?? undefined,
    transferTo: row.transfer_to ?? undefined,
    createdAt: row.created_at,
  };
}

// ==============================================================================
// FETCH: Ambil seluruh entri kas milik toko dari Supabase
// ==============================================================================

/**
 * Mengambil semua catatan kas (IN, OUT, TRANSFER) milik toko dari tabel `cash_entries`.
 * Data diurutkan dari yang terbaru ke yang lama berdasarkan `entry_date`.
 *
 * Mengembalikan array kosong jika Supabase belum dikonfigurasi atau storeId tidak tersedia.
 */
export async function fetchCashEntries(storeId: string): Promise<CashEntry[]> {
  if (!isSupabaseConfigured() || !storeId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('cash_entries')
      .select('*')
      .eq('store_id', storeId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[cashService] Gagal mengambil entri kas:', error);
      return [];
    }

    return (data || []).map(mapDbRowToCashEntry);
  } catch (err) {
    console.error('[cashService] Error fetchCashEntries:', err);
    return [];
  }
}

// ==============================================================================
// ADD: Catat entri kas baru (IN / OUT / TRANSFER)
// ==============================================================================

/**
 * Menyimpan catatan kas baru ke tabel `cash_entries` Supabase.
 *
 * PERHATIAN KHUSUS LOGIKA KEUANGAN:
 * - Entri IN  -> income, dicatat sebagai pemasukan kas.
 * - Entri OUT -> expense, dicatat sebagai pengeluaran kas.
 * - Entri TRANSFER -> TIDAK mempengaruhi total profit/laba toko.
 *   Transaksi TRANSFER hanya memindahkan saldo antar kantong kas (income=0, expense=0
 *   di getLedgerTransactions) sehingga tidak mengubah kalkulasi profit bersih.
 *
 * Fungsi ini mengembalikan objek CashEntry yang dapat langsung dipakai untuk
 * update state lokal tanpa perlu re-fetch dari database.
 *
 * @returns { entry, error } - `entry` null jika ada kegagalan fatal saat insert.
 */
export async function addCashEntry(params: {
  storeId?: string;
  payload: Omit<CashEntry, 'id' | 'createdAt'>;
}): Promise<{ entry: CashEntry | null; error: string | null }> {
  const { storeId, payload } = params;

  // Buat objek entry lokal (digunakan baik dalam mode fallback maupun setelah insert DB)
  const localEntry: CashEntry = {
    ...payload,
    id: `CASH-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
  };

  // Fallback jika Supabase belum dikonfigurasi
  if (!isSupabaseConfigured() || !storeId) {
    return { entry: localEntry, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('cash_entries')
      .insert({
        store_id: storeId,
        entry_type: payload.type,
        category: payload.category,
        amount: payload.amount,           // Sudah berupa angka murni dari CashEntryModal
        notes: payload.notes || '',
        payment_method: payload.paymentMethod ?? null,
        transfer_from: payload.transferFrom ?? null,
        transfer_to: payload.transferTo ?? null,
        entry_date: payload.date,         // Format 'YYYY-MM-DD' dari date input
      })
      .select()
      .single();

    if (error || !data) {
      console.error('[cashService] Gagal menyimpan entri kas:', error);
      // Kembalikan entry lokal sebagai fallback darurat agar data tidak hilang
      return { entry: localEntry, error: error?.message || 'Gagal menyimpan ke database' };
    }

    return { entry: mapDbRowToCashEntry(data), error: null };
  } catch (err: any) {
    console.error('[cashService] Error addCashEntry:', err);
    // Fallback darurat: kembalikan entry lokal
    return { entry: localEntry, error: err?.message || 'Tersimpan secara offline' };
  }
}

// ==============================================================================
// DELETE: Hapus entri kas berdasarkan ID
// ==============================================================================

/**
 * Menghapus catatan kas dari tabel `cash_entries` berdasarkan `id` dan `store_id`.
 * Filter `store_id` memastikan hanya owner toko tersebut yang dapat menghapus datanya
 * (sesuai kebijakan RLS yang sudah aktif).
 */
export async function deleteCashEntry(params: {
  id: string;
  storeId?: string;
}): Promise<{ success: boolean; error: string | null }> {
  const { id, storeId } = params;

  if (!isSupabaseConfigured() || !storeId) {
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase
      .from('cash_entries')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId);

    if (error) {
      console.error('[cashService] Gagal menghapus entri kas:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[cashService] Error deleteCashEntry:', err);
    return { success: false, error: err?.message || 'Gagal menghapus catatan kas' };
  }
}
