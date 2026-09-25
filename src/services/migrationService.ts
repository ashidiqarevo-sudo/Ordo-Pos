import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ServiceItem, CashEntry } from '../types';
import { upsertCustomer } from './customerService';

const STORAGE_KEY_SERVICES = 'ordo_servis_services_v6';
const STORAGE_KEY_CASH_ENTRIES = 'ordo_servis_cash_entries_v2';

export interface SyncResult {
  success: boolean;
  message: string;
  syncedTickets: number;
  syncedCustomers: number;
  syncedCashEntries: number;
  skippedTickets: number;
  error?: string;
}

/**
 * Konversi string tanggal lokal (misal "2026-09-14 14:30") ke ISO timestamptz string yang valid.
 */
function toIsoTimestamp(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString();
  try {
    if (dateStr.includes('T')) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    const d = new Date(dateStr.replace(' ', 'T'));
    if (!isNaN(d.getTime())) return d.toISOString();
    const d2 = new Date(dateStr);
    if (!isNaN(d2.getTime())) return d2.toISOString();
  } catch {
    // fallback
  }
  return new Date().toISOString();
}

/**
 * Konversi string tanggal ke format 'YYYY-MM-DD' untuk kolom bertipe DATE di PostgreSQL.
 */
function toDateOnly(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(dateStr.replace(' ', 'T'));
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    const d2 = new Date(dateStr);
    if (!isNaN(d2.getTime())) return d2.toISOString().split('T')[0];
  } catch {
    // fallback
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Menghitung tanggal kadaluarsa garansi (start_date + durationDays).
 */
function calculateExpiryDate(startDateStr: string, durationDays: number): string {
  try {
    const d = new Date(startDateStr);
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + durationDays);
      return d.toISOString().split('T')[0];
    }
  } catch {
    // fallback
  }
  const fallbackDate = new Date();
  fallbackDate.setDate(fallbackDate.getDate() + durationDays);
  return fallbackDate.toISOString().split('T')[0];
}

/**
 * Mengambil data mentah offline dari localStorage untuk services dan cash_entries.
 */
export function getLocalOfflineData(): {
  services: ServiceItem[];
  cashEntries: CashEntry[];
} {
  let services: ServiceItem[] = [];
  let cashEntries: CashEntry[] = [];

  try {
    const sStr = localStorage.getItem(STORAGE_KEY_SERVICES);
    if (sStr) {
      const parsed = JSON.parse(sStr);
      if (Array.isArray(parsed)) services = parsed;
    }
  } catch (e) {
    console.warn('[migrationService] Gagal membaca offline services:', e);
  }

  try {
    const cStr = localStorage.getItem(STORAGE_KEY_CASH_ENTRIES);
    if (cStr) {
      const parsed = JSON.parse(cStr);
      if (Array.isArray(parsed)) cashEntries = parsed;
    }
  } catch (e) {
    console.warn('[migrationService] Gagal membaca offline cash entries:', e);
  }

  return { services, cashEntries };
}

/**
 * FASE 8: SINKRONISASI DATA OFFLINE KE CLOUD (SUPABASE)
 *
 * Membaca data offline dari localStorage (atau fallback memory), lalu melakukan:
 * 1. Upsert data pelanggan (customers) ke database.
 * 2. Cek tiket servis yang belum ada di database (berdasarkan store_id & ticket_no).
 * 3. Unggah tiket baru ke tabel `services`, serta membuat entri `payments` dan `warranties` yang relevan.
 * 4. Unggah catatan kas yang belum tercatat ke tabel `cash_entries`.
 *
 * Menghasilkan statistik hasil migrasi secara aman tanpa merusak atau menduplikasi data yang sudah ada.
 */
export async function syncLocalDataToSupabase(params: {
  storeId: string;
  fallbackServices?: ServiceItem[];
  fallbackCashEntries?: CashEntry[];
  onProgress?: (step: string) => void;
}): Promise<SyncResult> {
  const { storeId, fallbackServices, fallbackCashEntries, onProgress } = params;

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Koneksi Supabase belum dikonfigurasi di file .env aplikasi.',
      syncedTickets: 0,
      syncedCustomers: 0,
      syncedCashEntries: 0,
      skippedTickets: 0,
      error: 'Supabase not configured',
    };
  }

  if (!storeId) {
    return {
      success: false,
      message: 'Store ID tidak ditemukan. Pastikan Anda telah login dengan akun toko.',
      syncedTickets: 0,
      syncedCustomers: 0,
      syncedCashEntries: 0,
      skippedTickets: 0,
      error: 'Store ID missing',
    };
  }

  // Ambil data offline dari localStorage, atau gunakan fallback state yang sedang aktif di App
  const localData = getLocalOfflineData();
  const rawServices = localData.services.length > 0 ? localData.services : (fallbackServices || []);
  const rawCash = localData.cashEntries.length > 0 ? localData.cashEntries : (fallbackCashEntries || []);

  if (rawServices.length === 0 && rawCash.length === 0) {
    return {
      success: true,
      message: 'Tidak ada data offline di browser yang perlu disinkronkan.',
      syncedTickets: 0,
      syncedCustomers: 0,
      syncedCashEntries: 0,
      skippedTickets: 0,
    };
  }

  let syncedCustomers = 0;
  let syncedTickets = 0;
  let skippedTickets = 0;
  let syncedCashEntries = 0;

  try {
    // =========================================================================
    // 1. SINKRONISASI PELANGGAN (CUSTOMERS)
    // =========================================================================
    onProgress?.('Menyinkronkan data pelanggan...');
    const customerMap = new Map<string, string>(); // identifier -> customerId

    // Kumpulkan pelanggan unik dari riwayat servis offline
    const uniqueCustomerKeys = new Map<string, { name: string; phone: string }>();
    rawServices.forEach((s) => {
      const name = s.customerName.trim();
      const phone = (s.customerPhone && s.customerPhone.trim()) || 'Tanpa WA';
      const key = phone !== 'Tanpa WA' ? phone : name.toLowerCase();
      if (!uniqueCustomerKeys.has(key)) {
        uniqueCustomerKeys.set(key, { name, phone });
      }
    });

    for (const [key, custInfo] of uniqueCustomerKeys.entries()) {
      try {
        const custRecord = await upsertCustomer({
          storeId,
          name: custInfo.name,
          phone: custInfo.phone,
        });
        if (custRecord?.id) {
          customerMap.set(key, custRecord.id);
          syncedCustomers++;
        }
      } catch (custErr) {
        console.warn('[migrationService] Warning saat sync customer:', custInfo.name, custErr);
      }
    }

    // =========================================================================
    // 2. SINKRONISASI TIKET SERVIS (SERVICES)
    // =========================================================================
    onProgress?.('Memeriksa riwayat tiket di database cloud...');

    // Ambil nomor tiket yang sudah tersimpan di database untuk toko ini
    const { data: existingRows, error: fetchErr } = await supabase
      .from('services')
      .select('ticket_no')
      .eq('store_id', storeId);

    if (fetchErr) {
      console.error('[migrationService] Gagal fetch existing services:', fetchErr);
    }

    const existingTicketNos = new Set((existingRows || []).map((r) => r.ticket_no.trim().toUpperCase()));

    onProgress?.(`Mengunggah tiket servis (${rawServices.length} data)...`);

    for (const item of rawServices) {
      const ticketNoUpper = item.ticketNo ? item.ticketNo.trim().toUpperCase() : '';

      // Cegah duplikasi: jika tiket sudah ada di Supabase, lewati
      if (ticketNoUpper && existingTicketNos.has(ticketNoUpper)) {
        skippedTickets++;
        continue;
      }

      // Cari customerId terkait
      const custKey =
        item.customerPhone && item.customerPhone !== 'Tanpa WA'
          ? item.customerPhone.trim()
          : item.customerName.trim().toLowerCase();
      const customerId = customerMap.get(custKey) || null;

      const parsedEstimated = Number(item.estimatedCost) || 0;
      const parsedInitial = item.initialEstimatedCost != null ? Number(item.initialEstimatedCost) : parsedEstimated;
      const parsedFinal = Number(item.finalCost) || 0;
      const parsedDp = Number(item.dp) || 0;
      const parsedSparepart = Number(item.sparepartCost) || 0;
      const warrantyDaysNum = Number(item.warrantyDays) || 7;

      const createdIso = toIsoTimestamp(item.createdAt);
      const pickedUpIso = item.pickedUpAt ? toIsoTimestamp(item.pickedUpAt) : null;
      const readyIso =
        item.status === 'SIAP' || item.status === 'DIAMBIL' || item.status === 'BATAL'
          ? toIsoTimestamp(item.pickedUpAt || item.createdAt)
          : null;

      // Insert tiket ke tabel `services`
      const { data: insertedService, error: insertServiceErr } = await supabase
        .from('services')
        .insert({
          store_id: storeId,
          ticket_no: item.ticketNo,
          customer_id: customerId,
          customer_name_snapshot: item.customerName.trim(),
          customer_phone_snapshot: item.customerPhone?.trim() || 'Tanpa WA',
          device_model: item.deviceModel.trim(),
          screen_lock: item.screenLock?.trim() || '-',
          complaints: Array.isArray(item.complaints) && item.complaints.length > 0
            ? item.complaints
            : ['Pemeriksaan Umum'],
          notes: item.notes?.trim() || '-',
          status: item.status || 'BARU',
          estimated_cost: parsedEstimated,
          initial_estimated_cost: parsedInitial,
          diagnosis: item.diagnosis?.trim() || null,
          confirmation_status: item.confirmationStatus || 'TIDAK_PERLU',
          confirmed_at: item.confirmedAt ? toIsoTimestamp(item.confirmedAt) : null,
          final_cost: parsedFinal,
          dp_amount: parsedDp,
          sparepart_cost: parsedSparepart,
          warranty_days: warrantyDaysNum,
          payment_method: item.paymentMethod || '-',
          ready_at: readyIso,
          picked_up_at: pickedUpIso,
          cancel_reason: item.cancelReason?.trim() || null,
          created_at: createdIso,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertServiceErr || !insertedService) {
        console.error('[migrationService] Gagal insert tiket:', item.ticketNo, insertServiceErr);
        continue;
      }

      syncedTickets++;
      existingTicketNos.add(ticketNoUpper);

      // Catat DP di tabel `payments` jika ada DP > 0
      if (parsedDp > 0) {
        try {
          await supabase.from('payments').insert({
            store_id: storeId,
            service_id: insertedService.id,
            payment_type: 'DP',
            amount: parsedDp,
            payment_method: item.paymentMethod || 'Tunai (DP)',
            payment_date: createdIso,
            notes: `DP Penerimaan Servis Nota ${item.ticketNo}`,
            created_at: createdIso,
          });
        } catch (payErr) {
          console.warn('[migrationService] Warning saat insert payment DP:', payErr);
        }
      }

      // Catat Pelunasan di tabel `payments` jika unit sudah DIAMBIL dan ada sisa bayar
      if (item.status === 'DIAMBIL') {
        const remaining = Math.max(0, parsedFinal - parsedDp);
        if (remaining > 0) {
          try {
            await supabase.from('payments').insert({
              store_id: storeId,
              service_id: insertedService.id,
              payment_type: 'PELUNASAN',
              amount: remaining,
              payment_method: item.paymentMethod || 'Tunai (Pelunasan)',
              payment_date: pickedUpIso || new Date().toISOString(),
              notes: `Pelunasan Servis Nota ${item.ticketNo}`,
              created_at: pickedUpIso || new Date().toISOString(),
            });
          } catch (payErr) {
            console.warn('[migrationService] Warning saat insert payment pelunasan:', payErr);
          }
        }

        // Catat Garansi di tabel `warranties` jika durasi garansi > 0
        if (warrantyDaysNum > 0) {
          try {
            const startDate = toDateOnly(item.pickedUpAt || item.createdAt);
            const expiryDate = calculateExpiryDate(startDate, warrantyDaysNum);
            await supabase.from('warranties').insert({
              store_id: storeId,
              service_id: insertedService.id,
              duration_days: warrantyDaysNum,
              start_date: startDate,
              expiry_date: expiryDate,
              terms: 'Garansi resmi toko Ordo POS',
              created_at: pickedUpIso || new Date().toISOString(),
            });
          } catch (warErr) {
            console.warn('[migrationService] Warning saat insert warranty:', warErr);
          }
        }
      }
    }

    // =========================================================================
    // 3. SINKRONISASI BUKU KAS (CASH_ENTRIES)
    // =========================================================================
    if (rawCash.length > 0) {
      onProgress?.(`Mengunggah catatan kas (${rawCash.length} data)...`);

      // Ambil entri kas yang sudah ada di Supabase
      const { data: existingCashRows } = await supabase
        .from('cash_entries')
        .select('entry_date, entry_type, category, amount')
        .eq('store_id', storeId);

      // Hash key untuk cek duplikasi entri kas
      const cashHash = (date: string, type: string, cat: string, amt: number) =>
        `${date}|${type}|${cat}|${amt}`;

      const existingCashSet = new Set(
        (existingCashRows || []).map((r) =>
          cashHash(r.entry_date, r.entry_type, r.category, Number(r.amount))
        )
      );

      for (const entry of rawCash) {
        const dateStr = entry.date ? toDateOnly(entry.date) : toDateOnly();
        const hash = cashHash(dateStr, entry.type, entry.category, Number(entry.amount));

        if (existingCashSet.has(hash)) {
          // Entri kas sudah ada di DB, lewati
          continue;
        }

        const { error: insertCashErr } = await supabase.from('cash_entries').insert({
          store_id: storeId,
          entry_type: entry.type,
          category: entry.category,
          amount: Number(entry.amount) || 0,
          notes: entry.notes || '-',
          payment_method: entry.paymentMethod || null,
          transfer_from: entry.transferFrom || null,
          transfer_to: entry.transferTo || null,
          entry_date: dateStr,
          created_at: entry.createdAt ? toIsoTimestamp(entry.createdAt) : new Date().toISOString(),
        });

        if (!insertCashErr) {
          syncedCashEntries++;
          existingCashSet.add(hash);
        } else {
          console.warn('[migrationService] Gagal insert cash entry:', entry.id, insertCashErr);
        }
      }
    }

    onProgress?.('Sinkronisasi selesai!');

    const message = `Sinkronisasi berhasil! ${syncedTickets} tiket servis, ${syncedCustomers} data pelanggan, dan ${syncedCashEntries} buku kas berhasil dipindahkan ke cloud.${
      skippedTickets > 0 ? ` (${skippedTickets} tiket sudah ada sebelumnya)` : ''
    }`;

    return {
      success: true,
      message,
      syncedTickets,
      syncedCustomers,
      syncedCashEntries,
      skippedTickets,
    };
  } catch (err: any) {
    console.error('[migrationService] Fatal error syncLocalDataToSupabase:', err);
    return {
      success: false,
      message: err?.message || 'Terjadi kesalahan saat menyinkronkan data ke cloud.',
      syncedTickets,
      syncedCustomers,
      syncedCashEntries,
      skippedTickets,
      error: err?.message,
    };
  }
}
