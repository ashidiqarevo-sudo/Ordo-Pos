import * as XLSX from 'xlsx';
import { LedgerTransaction, CashEntry, ServiceItem } from '../types';
import { getMonthNameIndo } from '../data/initialData';

interface ExportFinanceOptions {
  periodType: 'DAILY' | 'MONTHLY' | 'YEARLY';
  selectedFilter: string;
  transactions: LedgerTransaction[];
  cashEntries: CashEntry[];
  services: ServiceItem[];
  storeName?: string;
}

export function exportFinanceToExcel({
  periodType,
  selectedFilter,
  transactions,
  cashEntries,
  services,
  storeName = 'ORDO SERVIS HP',
}: ExportFinanceOptions) {
  const wb = XLSX.utils.book_new();

  // 1. DATA SHEET: Rincian Transaksi
  const txRows = transactions.map((t, idx) => {
    let typeName = 'Servis HP';
    if (t.type === 'DP_MASUK') typeName = 'DP Masuk';
    else if (t.type === 'PELUNASAN_SELESAI') typeName = 'Pelunasan Servis';
    else if (t.type === 'UNIT_MASUK_NON_DP') typeName = 'Unit Masuk (Non-DP)';
    else if (t.type === 'KAS_MASUK_MANUAL') typeName = 'Masukan Uang (Kas)';
    else if (t.type === 'KAS_KELUAR_MANUAL') typeName = 'Keluarkan Uang (Kas)';
    else if (t.type === 'KAS_TRANSFER_MANUAL') typeName = 'Pemindahan Uang (Transfer)';

    const profit = t.income - t.expense;

    return {
      No: idx + 1,
      Tanggal: t.date,
      'Jenis Transaksi': typeName,
      'No. Nota / ID': t.ticketNo || '-',
      'Nama Pelanggan / Kategori': t.customerName || t.category || '-',
      'Model HP / Deskripsi': t.deviceModel || t.desc,
      'Catatan / Keperluan': t.notes || t.desc,
      'Uang Masuk (Rp)': t.income,
      'Pengeluaran / Sparepart (Rp)': t.expense,
      'Keuntungan Bersih (Rp)': profit,
    };
  });

  const wsTx = XLSX.utils.json_to_sheet(txRows);
  // Auto-width columns
  wsTx['!cols'] = [
    { wch: 5 }, // No
    { wch: 13 }, // Tanggal
    { wch: 22 }, // Jenis Transaksi
    { wch: 15 }, // No Nota
    { wch: 25 }, // Nama Pelanggan / Kategori
    { wch: 25 }, // Model HP
    { wch: 35 }, // Catatan
    { wch: 18 }, // Uang Masuk
    { wch: 22 }, // Pengeluaran
    { wch: 20 }, // Keuntungan
  ];
  XLSX.utils.book_append_sheet(wb, wsTx, 'Rincian Transaksi');

  // 2. DATA SHEET: Kas Masuk & Keluar (Manual Entries)
  if (cashEntries.length > 0) {
    const cashRows = cashEntries.map((c, idx) => ({
      No: idx + 1,
      Tanggal: c.date,
      Tipe:
        c.type === 'IN'
          ? 'Uang Masuk (Kas In)'
          : c.type === 'OUT'
          ? 'Uang Keluar (Kas Out)'
          : 'Pemindahan Uang (Transfer)',
      Kategori: c.category,
      'Catatan Keperluan': c.notes,
      'Nominal (Rp)': c.amount,
      'Waktu Dibuat': c.createdAt,
    }));
    const wsCash = XLSX.utils.json_to_sheet(cashRows);
    wsCash['!cols'] = [
      { wch: 5 },
      { wch: 13 },
      { wch: 22 },
      { wch: 25 },
      { wch: 40 },
      { wch: 18 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, wsCash, 'Kas Masuk Keluar');
  }

  // 3. DATA SHEET: Ringkasan Sesuai Periode
  if (periodType === 'DAILY') {
    const dayMap = new Map<
      string,
      { income: number; expense: number; txCount: number; units: number }
    >();
    transactions.forEach((t) => {
      if (!dayMap.has(t.date)) {
        dayMap.set(t.date, { income: 0, expense: 0, txCount: 0, units: 0 });
      }
      const d = dayMap.get(t.date)!;
      d.income += t.income;
      d.expense += t.expense;
      d.txCount++;
      if (t.unitEvent) d.units++;
    });

    const summaryRows = Array.from(dayMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, d], idx) => ({
        No: idx + 1,
        Tanggal: date,
        'Total Transaksi': d.txCount,
        'Unit HP': d.units,
        'Total Uang Masuk (Rp)': d.income,
        'Total Pengeluaran / Part (Rp)': d.expense,
        'Keuntungan Bersih (Rp)': d.income - d.expense,
      }));

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 16 },
      { wch: 12 },
      { wch: 22 },
      { wch: 24 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Harian');
  } else if (periodType === 'MONTHLY') {
    const monthMap = new Map<
      string,
      { income: number; expense: number; activeDays: Set<string>; units: number }
    >();
    transactions.forEach((t) => {
      const ym = t.date.substring(0, 7);
      if (!monthMap.has(ym)) {
        monthMap.set(ym, { income: 0, expense: 0, activeDays: new Set(), units: 0 });
      }
      const m = monthMap.get(ym)!;
      m.income += t.income;
      m.expense += t.expense;
      m.activeDays.add(t.date);
      if (t.unitEvent) m.units++;
    });

    const summaryRows = Array.from(monthMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([ym, m], idx) => {
        const [y, mStr] = ym.split('-');
        const mName = getMonthNameIndo(parseInt(mStr) - 1);
        return {
          No: idx + 1,
          Periode: `${mName} ${y}`,
          'Hari Aktif': m.activeDays.size,
          'Unit HP': m.units,
          'Total Uang Masuk (Rp)': m.income,
          'Total Pengeluaran (Rp)': m.expense,
          'Keuntungan Bersih (Rp)': m.income - m.expense,
          'Rata-rata / Hari (Rp)': Math.round(m.income / (m.activeDays.size || 1)),
        };
      });

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [
      { wch: 5 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Bulanan');
  } else {
    // YEARLY
    const yearMap = new Map<
      string,
      { income: number; expense: number; activeMonths: Set<string>; units: number }
    >();
    transactions.forEach((t) => {
      const y = t.date.substring(0, 4);
      const ym = t.date.substring(0, 7);
      if (!yearMap.has(y)) {
        yearMap.set(y, { income: 0, expense: 0, activeMonths: new Set(), units: 0 });
      }
      const yr = yearMap.get(y)!;
      yr.income += t.income;
      yr.expense += t.expense;
      yr.activeMonths.add(ym);
      if (t.unitEvent) yr.units++;
    });

    const summaryRows = Array.from(yearMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([y, yr], idx) => ({
        No: idx + 1,
        Tahun: `Tahun ${y}`,
        'Bulan Aktif': yr.activeMonths.size,
        'Unit HP': yr.units,
        'Total Uang Masuk (Rp)': yr.income,
        'Total Pengeluaran (Rp)': yr.expense,
        'Keuntungan Bersih (Rp)': yr.income - yr.expense,
        'Rata-rata / Bulan (Rp)': Math.round(yr.income / (yr.activeMonths.size || 1)),
      }));

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 14 },
      { wch: 12 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Tahunan');
  }

  // Generate date stamp for file name
  const today = new Date().toISOString().split('T')[0];
  const cleanStore = storeName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Laporan_Keuangan_${cleanStore}_${periodType}_${today}.xlsx`;

  // Write and trigger download
  XLSX.writeFile(wb, filename);
}
