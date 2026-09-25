import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ServiceItem, ServiceStatus } from '../types';
import { parseNumberFromDots, formatDateTime, generateNextTicketNo } from '../data/initialData';
import { upsertCustomer } from './customerService';

// ─── Tipe Parameter Tambahan ─────────────────────────────────────────────────

export interface UpdateDiagnosisParams {
  ticketId: string;
  storeId?: string;
  diagnosis: string;
  /** Bisa berupa string format titik ribuan ("150.000") atau number */
  newEstimatedCost: number | string;
  confirmationStatus: 'MENUNGGU' | 'DISETUJUI' | 'TIDAK_PERLU';
  currentStatus: ServiceStatus;
  initialEstimatedCost?: number;
}

export interface MarkServiceReadyParams {
  ticketId: string;
  storeId?: string;
  /** Bisa berupa string format titik ribuan ("150.000") atau number */
  finalCost: number | string;
  /** Bisa berupa string format titik ribuan ("50.000") atau number */
  sparepartCost: number | string;
}

export interface CheckoutServiceParams {
  ticketId: string;
  storeId?: string;
  actionType: 'DIAMBIL' | 'BATAL';
  paymentMethod: string;
  warrantyDays: number;
  cancelReason?: string;
  /** Nilai dp saat ini, dipakai untuk menghitung sisa pelunasan */
  currentDp: number;
  /** Nilai final cost, dipakai untuk menghitung sisa pelunasan */
  finalCost: number;
  /** Nama toko, dipakai untuk notes payment */
  ticketNo: string;
}

export interface CreateServiceTicketParams {
  storeId?: string;
  formData: {
    customerName: string;
    customerPhone: string;
    deviceModel: string;
    screenLock: string;
    complaints: string[];
    notes: string;
    estimatedCost: number | string;
    dp: number | string;
  };
  defaultWarrantyDays?: number | string;
  existingTickets?: ServiceItem[];
}

/**
 * Konversi baris data tabel `services` Supabase ke bentuk objek `ServiceItem` frontend.
 */
export function mapDatabaseServiceToItem(row: any): ServiceItem {
  return {
    id: row.id,
    ticketNo: row.ticket_no,
    customerName: row.customer_name_snapshot,
    customerPhone: row.customer_phone_snapshot || 'Tanpa WA',
    deviceModel: row.device_model,
    screenLock: row.screen_lock || '-',
    complaints: Array.isArray(row.complaints) ? row.complaints : [],
    notes: row.notes || '-',
    status: (row.status as ServiceStatus) || 'BARU',
    estimatedCost: Number(row.estimated_cost) || 0,
    initialEstimatedCost:
      row.initial_estimated_cost != null ? Number(row.initial_estimated_cost) : undefined,
    diagnosis: row.diagnosis || undefined,
    confirmationStatus: row.confirmation_status || 'TIDAK_PERLU',
    confirmedAt: row.confirmed_at || undefined,
    finalCost: Number(row.final_cost) || 0,
    dp: Number(row.dp_amount) || 0,
    sparepartCost: Number(row.sparepart_cost) || 0,
    warrantyDays: Number(row.warranty_days) || 7,
    paymentMethod: row.payment_method || '-',
    pickedUpAt: row.picked_up_at
      ? formatDateTime(new Date(row.picked_up_at))
      : null,
    cancelReason: row.cancel_reason || undefined,
    createdAt: row.created_at
      ? formatDateTime(new Date(row.created_at))
      : formatDateTime(),
  };
}

/**
 * Mengambil seluruh riwayat dan tiket servis aktif milik toko dari Supabase.
 */
export async function fetchServiceTickets(storeId: string): Promise<ServiceItem[]> {
  if (!isSupabaseConfigured() || !storeId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[serviceTicketService] Gagal mengambil data tiket:', error);
      return [];
    }

    return (data || []).map(mapDatabaseServiceToItem);
  } catch (err) {
    console.error('[serviceTicketService] Error fetchServiceTickets:', err);
    return [];
  }
}

/**
 * Membuat tiket servis baru (Intake Servis):
 * 1. Parse variabel biaya (estimatedCost & dp) menjadi angka murni (integer) menggunakan parseNumberFromDots.
 * 2. Simpan / perbarui profil pelanggan di tabel `customers` (upsert).
 * 3. Generate nomor nota atomik (RPC `generate_next_ticket_no` atau fallback).
 * 4. Simpan ke tabel `services`.
 * 5. Jika ada DP > 0, otomatis catat transaksi di tabel `payments`.
 * 6. Kembalikan objek `ServiceItem` untuk state lokal & pencetakan nota.
 */
export async function createServiceTicket(
  params: CreateServiceTicketParams
): Promise<{ ticket: ServiceItem; error?: string | null }> {
  const { storeId, formData, defaultWarrantyDays = 7, existingTickets = [] } = params;

  // PERHATIAN KHUSUS (FORMAT ANGKA):
  // Pastikan estimasi biaya dan DP di-parse menjadi angka murni (numeric/integer)
  const parsedEstimatedCost = parseNumberFromDots(formData.estimatedCost);
  const parsedDp = parseNumberFromDots(formData.dp);
  const warrantyDaysNum = parseInt(String(defaultWarrantyDays), 10) || 7;

  const nowFormatted = formatDateTime();

  // Mode Fallback: Jika Supabase belum dikonfigurasi atau tidak ada storeId
  if (!isSupabaseConfigured() || !storeId) {
    const fallbackTicketNo = generateNextTicketNo(existingTickets);
    const fallbackItem: ServiceItem = {
      id: `SRV-${Date.now()}`,
      ticketNo: fallbackTicketNo,
      customerName: formData.customerName.trim(),
      customerPhone: formData.customerPhone.trim() || 'Tanpa WA',
      deviceModel: formData.deviceModel.trim(),
      screenLock: formData.screenLock.trim() || '-',
      complaints:
        formData.complaints.length > 0 ? formData.complaints : ['Pemeriksaan Umum'],
      notes: formData.notes.trim() || '-',
      status: 'BARU',
      estimatedCost: parsedEstimatedCost,
      finalCost: parsedEstimatedCost,
      dp: parsedDp,
      sparepartCost: 0,
      warrantyDays: warrantyDaysNum,
      paymentMethod: parsedDp > 0 ? 'Tunai (DP)' : '-',
      pickedUpAt: null,
      createdAt: nowFormatted,
    };

    return { ticket: fallbackItem, error: null };
  }

  try {
    // 1. Upsert data pelanggan ke tabel `customers`
    let customerId: string | null = null;
    try {
      const cust = await upsertCustomer({
        storeId,
        name: formData.customerName,
        phone: formData.customerPhone,
      });
      if (cust?.id) {
        customerId = cust.id;
      }
    } catch (custErr) {
      console.warn('[serviceTicketService] Upsert customer non-fatal warning:', custErr);
    }

    // 2. Generate nomor tiket secara atomik melalui fungsi Supabase RPC
    let ticketNo = '';
    try {
      const yearShort = new Date().getFullYear().toString().slice(-2);
      const { data: rpcTicketNo, error: rpcErr } = await supabase.rpc(
        'generate_next_ticket_no',
        {
          p_store_id: storeId,
          p_year_short: yearShort,
        }
      );

      if (!rpcErr && rpcTicketNo) {
        ticketNo = rpcTicketNo;
      } else if (rpcErr) {
        console.warn('[serviceTicketService] RPC generate_next_ticket_no error, fallback lokal:', rpcErr);
      }
    } catch (rpcCatch) {
      console.warn('[serviceTicketService] RPC call failed, fallback lokal:', rpcCatch);
    }

    // Jika RPC tidak berhasil, gunakan sequence counter lokal
    if (!ticketNo) {
      ticketNo = generateNextTicketNo(existingTickets);
    }

    // 3. Insert record baru ke tabel `services`
    const { data: insertedService, error: insertErr } = await supabase
      .from('services')
      .insert({
        store_id: storeId,
        ticket_no: ticketNo,
        customer_id: customerId,
        customer_name_snapshot: formData.customerName.trim(),
        customer_phone_snapshot: formData.customerPhone.trim() || 'Tanpa WA',
        device_model: formData.deviceModel.trim(),
        screen_lock: formData.screenLock.trim() || '-',
        complaints:
          formData.complaints.length > 0
            ? formData.complaints
            : ['Pemeriksaan Umum'],
        notes: formData.notes.trim() || '-',
        status: 'BARU',
        estimated_cost: parsedEstimatedCost,
        initial_estimated_cost: parsedEstimatedCost,
        final_cost: parsedEstimatedCost,
        dp_amount: parsedDp,
        sparepart_cost: 0,
        warranty_days: warrantyDaysNum,
        payment_method: parsedDp > 0 ? 'Tunai (DP)' : '-',
      })
      .select()
      .single();

    if (insertErr || !insertedService) {
      console.error('[serviceTicketService] Gagal insert service ke Supabase:', insertErr);
      throw new Error(insertErr?.message || 'Gagal menyimpan tiket servis');
    }

    // 4. Jika ada DP > 0, otomatis catat transaksi di tabel `payments`
    if (parsedDp > 0) {
      const { error: paymentErr } = await supabase.from('payments').insert({
        store_id: storeId,
        service_id: insertedService.id,
        payment_type: 'DP',
        amount: parsedDp,
        payment_method: 'Tunai (DP)',
        notes: `DP Penerimaan Servis Nota ${ticketNo}`,
      });

      if (paymentErr) {
        console.error('[serviceTicketService] Gagal mencatat payment DP:', paymentErr);
      }
    }

    // 5. Kembalikan data tiket dalam bentuk ServiceItem
    const createdTicket = mapDatabaseServiceToItem(insertedService);
    return { ticket: createdTicket, error: null };
  } catch (err: any) {
    console.error('[serviceTicketService] Error createServiceTicket:', err);

    // Fallback darurat jika ada kendala jaringan saat insert Supabase
    // agar data input teknisi tidak hilang dan nota tetap bisa dicetak
    const emergencyTicketNo = generateNextTicketNo(existingTickets);
    const emergencyItem: ServiceItem = {
      id: `SRV-${Date.now()}`,
      ticketNo: emergencyTicketNo,
      customerName: formData.customerName.trim(),
      customerPhone: formData.customerPhone.trim() || 'Tanpa WA',
      deviceModel: formData.deviceModel.trim(),
      screenLock: formData.screenLock.trim() || '-',
      complaints:
        formData.complaints.length > 0 ? formData.complaints : ['Pemeriksaan Umum'],
      notes: formData.notes.trim() || '-',
      status: 'BARU',
      estimatedCost: parsedEstimatedCost,
      finalCost: parsedEstimatedCost,
      dp: parsedDp,
      sparepartCost: 0,
      warrantyDays: warrantyDaysNum,
      paymentMethod: parsedDp > 0 ? 'Tunai (DP)' : '-',
      pickedUpAt: null,
      createdAt: nowFormatted,
    };

    return { ticket: emergencyItem, error: err?.message || 'Tersimpan secara offline' };
  }
}

// ==============================================================================
// FASE 5: UPDATE DIAGNOSIS (estimasi + diagnosis + status konfirmasi)
// ==============================================================================

/**
 * Memperbarui data diagnosis, estimasi biaya, dan status konfirmasi servis di Supabase.
 * - Parse estimasi ke angka murni menggunakan parseNumberFromDots sebelum disimpan.
 * - Jika confirmationStatus DISETUJUI/TIDAK_PERLU dan status tiket masih BARU, otomatis ubah ke PROSES.
 */
export async function updateDiagnosis(
  params: UpdateDiagnosisParams
): Promise<{ success: boolean; error?: string | null }> {
  const {
    ticketId,
    storeId,
    diagnosis,
    newEstimatedCost,
    confirmationStatus,
    currentStatus,
    initialEstimatedCost,
  } = params;

  // Parse angka murni dari string format titik ribuan
  const parsedEstimatedCost = parseNumberFromDots(newEstimatedCost);
  const nowIso = new Date().toISOString();

  if (!isSupabaseConfigured() || !storeId) {
    // Fallback: operasi lokal saja, tidak ada yang dikirim ke DB
    return { success: true };
  }

  try {
    const willBeProses =
      confirmationStatus === 'DISETUJUI' || confirmationStatus === 'TIDAK_PERLU';
    const newStatus = willBeProses && currentStatus === 'BARU' ? 'PROSES' : currentStatus;

    const { error } = await supabase
      .from('services')
      .update({
        diagnosis,
        estimated_cost: parsedEstimatedCost,
        final_cost: parsedEstimatedCost,
        // Simpan estimasi awal jika belum pernah di-set
        initial_estimated_cost: initialEstimatedCost ?? parsedEstimatedCost,
        confirmation_status: confirmationStatus,
        confirmed_at: nowIso,
        status: newStatus,
        updated_at: nowIso,
      })
      .eq('id', ticketId)
      .eq('store_id', storeId);

    if (error) {
      console.error('[serviceTicketService] Gagal update diagnosis:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[serviceTicketService] Error updateDiagnosis:', err);
    return { success: false, error: err?.message };
  }
}

// ==============================================================================
// FASE 5: MARK SERVICE READY (JADI — status SIAP + final_cost + ready_at)
// ==============================================================================

/**
 * Mengubah status tiket menjadi 'SIAP' saat HP selesai diservis (tombol JADI).
 * - Parse finalCost & sparepartCost ke angka murni.
 * - Catat waktu sekarang ke kolom ready_at.
 */
export async function markServiceReady(
  params: MarkServiceReadyParams
): Promise<{ success: boolean; error?: string | null }> {
  const { ticketId, storeId, finalCost, sparepartCost } = params;

  const parsedFinalCost = parseNumberFromDots(finalCost);
  const parsedSparepartCost = parseNumberFromDots(sparepartCost);
  const nowIso = new Date().toISOString();

  if (!isSupabaseConfigured() || !storeId) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('services')
      .update({
        status: 'SIAP',
        final_cost: parsedFinalCost,
        sparepart_cost: parsedSparepartCost,
        ready_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', ticketId)
      .eq('store_id', storeId);

    if (error) {
      console.error('[serviceTicketService] Gagal set status SIAP:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[serviceTicketService] Error markServiceReady:', err);
    return { success: false, error: err?.message };
  }
}

// ==============================================================================
// FASE 5: CHECKOUT (DIAMBIL / BATAL-pickup) — pelunasan + garansi otomatis
// ==============================================================================

/**
 * Memproses serah terima unit (DIAMBIL) atau penyerahan kembali unit batal (BATAL).
 *
 * Untuk actionType === 'DIAMBIL':
 * 1. Update status services → 'DIAMBIL', catat picked_up_at, paymentMethod, warrantyDays.
 * 2. Hitung sisa pelunasan (finalCost - currentDp). Jika > 0, insert record ke tabel payments (type 'PELUNASAN').
 * 3. Jika warrantyDays > 0, insert record aktif ke tabel warranties.
 *
 * Untuk actionType === 'BATAL' (serah terima unit batal):
 * 1. Update status services → 'BATAL', catat picked_up_at dan cancelReason.
 */
export async function checkoutService(
  params: CheckoutServiceParams
): Promise<{ success: boolean; error?: string | null }> {
  const {
    ticketId,
    storeId,
    actionType,
    paymentMethod,
    warrantyDays,
    cancelReason,
    currentDp,
    finalCost,
    ticketNo,
  } = params;

  const nowIso = new Date().toISOString();

  if (!isSupabaseConfigured() || !storeId) {
    return { success: true };
  }

  try {
    if (actionType === 'BATAL') {
      // Serah terima unit batal — hanya update status dan picked_up_at
      const { error } = await supabase
        .from('services')
        .update({
          status: 'BATAL',
          cancel_reason: cancelReason || 'Dibatalkan oleh pelanggan/teknisi',
          payment_method: 'Batal',
          warranty_days: 0,
          picked_up_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', ticketId)
        .eq('store_id', storeId);

      if (error) {
        console.error('[serviceTicketService] Gagal update BATAL checkout:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    }

    // ─── actionType === 'DIAMBIL' ─────────────────────────────────────────

    // 1. Update tabel services
    const { error: updateErr } = await supabase
      .from('services')
      .update({
        status: 'DIAMBIL',
        payment_method: paymentMethod,
        warranty_days: warrantyDays,
        picked_up_at: nowIso,
        dp_amount: finalCost, // normalkan agar dp = finalCost saat LUNAS (sama dgn logika lokal)
        updated_at: nowIso,
      })
      .eq('id', ticketId)
      .eq('store_id', storeId);

    if (updateErr) {
      console.error('[serviceTicketService] Gagal update status DIAMBIL:', updateErr);
      return { success: false, error: updateErr.message };
    }

    // 2. Hitung sisa pelunasan — insert payment jika ada sisa > 0
    const sisaBayar = Math.max(0, finalCost - currentDp);
    if (sisaBayar > 0) {
      const { error: payErr } = await supabase.from('payments').insert({
        store_id: storeId,
        service_id: ticketId,
        payment_type: 'PELUNASAN',
        amount: sisaBayar,
        payment_method: paymentMethod,
        notes: `Pelunasan Servis Nota ${ticketNo} (Sisa dari DP Rp ${currentDp.toLocaleString('id-ID')})`,
      });

      if (payErr) {
        // Non-fatal — log saja, jangan gagalkan seluruh checkout
        console.error('[serviceTicketService] Gagal mencatat payment PELUNASAN:', payErr);
      }
    }

    // 3. Insert garansi jika warrantyDays > 0
    if (warrantyDays > 0) {
      const today = new Date();
      const startDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const expiryDate = new Date(today);
      expiryDate.setDate(today.getDate() + warrantyDays);
      const expiryDateStr = expiryDate.toISOString().split('T')[0];

      const { error: warErr } = await supabase.from('warranties').insert({
        store_id: storeId,
        service_id: ticketId,
        duration_days: warrantyDays,
        start_date: startDate,
        expiry_date: expiryDateStr,
      });

      if (warErr) {
        // Non-fatal — log saja
        console.error('[serviceTicketService] Gagal mencatat garansi:', warErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[serviceTicketService] Error checkoutService:', err);
    return { success: false, error: err?.message };
  }
}

// ==============================================================================
// FASE 5: UPDATE STATUS SEDERHANA (BARU ↔ PROSES, dll.)
// ==============================================================================

/**
 * Memperbarui kolom `status` tiket servis secara sederhana tanpa logika bisnis tambahan.
 * Digunakan untuk perubahan status manual (mis. BARU → PROSES) dari BoardView.
 */
export async function updateServiceStatus(
  ticketId: string,
  storeId: string | undefined,
  newStatus: 'BARU' | 'PROSES' | 'SIAP'
): Promise<{ success: boolean; error?: string | null }> {
  if (!isSupabaseConfigured() || !storeId) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('services')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .eq('store_id', storeId);

    if (error) {
      console.error('[serviceTicketService] Gagal update status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[serviceTicketService] Error updateServiceStatus:', err);
    return { success: false, error: err?.message };
  }
}
