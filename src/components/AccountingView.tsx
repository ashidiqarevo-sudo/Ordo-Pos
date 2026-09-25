import React, { useRef, useState, useMemo } from 'react';
import {
  ServiceItem,
  LedgerTransaction,
  CashEntry,
  AccountingPeriodType,
} from '../types';
import { formatRupiah, getMonthNameIndo } from '../data/initialData';
import { exportFinanceToExcel } from '../utils/excelExport';
import {
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Smartphone,
  Calendar,
  Layers,
  CalendarRange,
  Printer,
  ChevronLeft,
  ChevronRight,
  Calculator,
  FileSpreadsheet,
  PlusCircle,
  MinusCircle,
  Receipt,
  Trash2,
  Landmark,
  QrCode,
  Banknote,
  ArrowLeftRight,
} from 'lucide-react';

interface AccountingViewProps {
  services: ServiceItem[];
  cashEntries?: CashEntry[];
  onOpenDayDetail: (dateStr: string) => void;
  onOpenAddCash: (type: 'IN' | 'OUT' | 'TRANSFER') => void;
  onDeleteCashEntry?: (id: string) => void;
  storeName?: string;
  onToast?: (msg: string, type?: 'info' | 'success' | 'warning') => void;
}

export function getLedgerTransactions(
  services: ServiceItem[],
  cashEntries: CashEntry[] = []
): LedgerTransaction[] {
  const transactions: LedgerTransaction[] = [];

  // 1. Service tickets: HANYA dihitung ketika HP sudah masuk Riwayat Servis (status DIAMBIL atau BATAL yang sudah diambil).
  // HP yang masih di Servis Berjalan (status BARU, PROSES) dan Siap Diambil (status SIAP, atau BATAL belum diambil) TIDAK MASUK HITUNGAN!
  services.forEach((s) => {
    // Abaikan servis berjalan dan siap diambil
    if (s.status === 'BARU' || s.status === 'PROSES' || s.status === 'SIAP') {
      return;
    }
    if (s.status === 'BATAL' && !s.pickedUpAt) {
      return;
    }

    if (s.status === 'DIAMBIL') {
      const pickupDate = (s.pickedUpAt || s.createdAt || '').split(' ')[0];
      if (!pickupDate) return;
      const totalIncome = Number(s.finalCost) || Number(s.estimatedCost) || 0;
      const partCost = Number(s.sparepartCost) || 0;

      transactions.push({
        date: pickupDate,
        ticketId: s.id,
        ticketNo: s.ticketNo,
        customerName: s.customerName,
        deviceModel: s.deviceModel,
        type: 'PELUNASAN_SELESAI',
        desc: `Servis Selesai (${s.deviceModel})`,
        notes: `Pelunasan servis ${s.deviceModel} dari ${s.customerName} (${s.paymentMethod || 'Lunas'})`,
        income: totalIncome,
        expense: partCost,
        unitEvent: 'SELESAI',
      });
    } else if (s.status === 'BATAL' && s.pickedUpAt) {
      const pickupDate = s.pickedUpAt.split(' ')[0];
      if (!pickupDate) return;
      transactions.push({
        date: pickupDate,
        ticketId: s.id,
        ticketNo: s.ticketNo,
        customerName: s.customerName,
        deviceModel: s.deviceModel,
        type: 'PELUNASAN_SELESAI',
        desc: `Servis Batal Diserahkan (${s.deviceModel})`,
        notes: `Unit dibatalkan dan diserahkan kembali ke ${s.customerName} (${s.cancelReason || 'Batal'})`,
        income: 0,
        expense: 0,
        unitEvent: 'SELESAI',
      });
    }
  });

  // 2. Manual cash entries (Masukan, Keluarkan, & Pemindahan Uang)
  cashEntries.forEach((c) => {
    if (c.type === 'IN') {
      transactions.push({
        id: c.id,
        date: c.date,
        type: 'KAS_MASUK_MANUAL',
        category: c.category,
        notes: c.notes,
        desc: `${c.category}: ${c.notes}`,
        income: Number(c.amount) || 0,
        expense: 0,
      });
    } else if (c.type === 'OUT') {
      transactions.push({
        id: c.id,
        date: c.date,
        type: 'KAS_KELUAR_MANUAL',
        category: c.category,
        notes: c.notes,
        desc: `${c.category}: ${c.notes}`,
        income: 0,
        expense: Number(c.amount) || 0,
      });
    } else if (c.type === 'TRANSFER') {
      transactions.push({
        id: c.id,
        date: c.date,
        type: 'KAS_TRANSFER_MANUAL',
        category: c.category,
        notes: c.notes,
        desc: `${c.category}: ${c.notes}`,
        income: 0,
        expense: 0,
        transferFrom: c.transferFrom,
        transferTo: c.transferTo,
      });
    }
  });

  return transactions;
}

export const AccountingView: React.FC<AccountingViewProps> = ({
  services,
  cashEntries = [],
  onOpenDayDetail,
  onOpenAddCash,
  onDeleteCashEntry,
  storeName = 'ORDO SERVIS HP',
  onToast,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthStr = useMemo(() => todayStr.substring(0, 7), [todayStr]);
  const currentYearStr = useMemo(() => todayStr.substring(0, 4), [todayStr]);

  const [periodType, setPeriodType] = useState<AccountingPeriodType>('DAILY');
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'CASH_BOOK'>('SUMMARY');
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);

  const [paymentScope, setPaymentScope] = useState<
    'AUTO' | 'TODAY' | 'MONTH' | 'YEAR' | 'ALL'
  >('AUTO');

  const scroll = (offset: number) => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const transactions = useMemo(
    () => getLedgerTransactions(services, cashEntries),
    [services, cashEntries]
  );

  // Label & Badge Periode untuk Posisi Uang Pembayaran
  const { paymentPeriodBadge, paymentPeriodDesc } = useMemo(() => {
    if (paymentScope === 'TODAY') {
      return {
        paymentPeriodBadge: 'Hari Ini',
        paymentPeriodDesc: `Dihitung untuk hari ini (${todayStr})`,
      };
    }
    if (paymentScope === 'MONTH') {
      const [y, mStr] = currentMonthStr.split('-');
      const mName = getMonthNameIndo(parseInt(mStr) - 1);
      return {
        paymentPeriodBadge: `Bulan Ini (${mName})`,
        paymentPeriodDesc: `Dihitung untuk bulan ${mName} ${y}`,
      };
    }
    if (paymentScope === 'YEAR') {
      return {
        paymentPeriodBadge: `Tahun ${currentYearStr}`,
        paymentPeriodDesc: `Dihitung untuk tahun ${currentYearStr}`,
      };
    }
    if (paymentScope === 'ALL') {
      return {
        paymentPeriodBadge: 'Semua Waktu',
        paymentPeriodDesc: 'Dihitung untuk seluruh riwayat transaksi',
      };
    }

    // paymentScope === 'AUTO' (mengikuti filter toolbar aktif: Tanggal, Bulan, atau Tahun)
    if (periodType === 'DAILY') {
      if (selectedDailyDate !== 'ALL') {
        return {
          paymentPeriodBadge:
            selectedDailyDate === todayStr ? 'Hari Ini' : selectedDailyDate,
          paymentPeriodDesc: `Dihitung untuk tanggal ${selectedDailyDate}`,
        };
      }
      if (selectedMonth !== 'ALL') {
        const [y, mStr] = selectedMonth.split('-');
        const mName = getMonthNameIndo(parseInt(mStr) - 1);
        return {
          paymentPeriodBadge: `${mName} ${y}`,
          paymentPeriodDesc: `Dihitung untuk bulan ${mName} ${y}`,
        };
      }
      return {
        paymentPeriodBadge: 'Semua Hari',
        paymentPeriodDesc: 'Dihitung untuk seluruh transaksi harian',
      };
    } else if (periodType === 'MONTHLY') {
      if (selectedMonth !== 'ALL') {
        const [y, mStr] = selectedMonth.split('-');
        const mName = getMonthNameIndo(parseInt(mStr) - 1);
        return {
          paymentPeriodBadge: `${mName} ${y}`,
          paymentPeriodDesc: `Dihitung untuk bulan ${mName} ${y}`,
        };
      }
      if (selectedYear !== 'ALL') {
        return {
          paymentPeriodBadge: `Tahun ${selectedYear}`,
          paymentPeriodDesc: `Dihitung untuk tahun ${selectedYear}`,
        };
      }
      return {
        paymentPeriodBadge: 'Semua Bulan',
        paymentPeriodDesc: 'Dihitung untuk seluruh transaksi bulanan',
      };
    } else {
      if (selectedYear !== 'ALL') {
        return {
          paymentPeriodBadge: `Tahun ${selectedYear}`,
          paymentPeriodDesc: `Dihitung untuk tahun ${selectedYear}`,
        };
      }
      return {
        paymentPeriodBadge: 'Semua Tahun',
        paymentPeriodDesc: 'Dihitung untuk seluruh transaksi tahunan',
      };
    }
  }, [
    paymentScope,
    periodType,
    selectedDailyDate,
    selectedMonth,
    selectedYear,
    todayStr,
    currentMonthStr,
    currentYearStr,
  ]);

  // Posisi Uang Pembayaran & Proporsi Pemasukan:
  // Dihitung dinamis sesuai filter Tanggal, Bulan, Tahun (atau preset Hari Ini / Bulan Ini / Tahun Ini)
  // Termasuk efek pemindahan uang antar kas (Tunai, BCA, QRIS)
  const paymentBreakdown = useMemo(() => {
    let tunai = 0;
    let bca = 0;
    let qris = 0;

    const matchesScope = (dateStr: string) => {
      if (!dateStr) return false;
      const d = dateStr.split(' ')[0];
      if (paymentScope === 'TODAY') return d === todayStr;
      if (paymentScope === 'MONTH') return d.startsWith(currentMonthStr);
      if (paymentScope === 'YEAR') return d.startsWith(currentYearStr);
      if (paymentScope === 'ALL') return true;

      // AUTO: ikuti filter toolbar aktif (Tanggal / Bulan / Tahun)
      if (periodType === 'DAILY') {
        if (selectedDailyDate !== 'ALL') return d === selectedDailyDate;
        if (selectedMonth !== 'ALL') return d.startsWith(selectedMonth);
        return true;
      } else if (periodType === 'MONTHLY') {
        if (selectedMonth !== 'ALL') return d.startsWith(selectedMonth);
        if (selectedYear !== 'ALL') return d.startsWith(selectedYear);
        return true;
      } else {
        if (selectedYear !== 'ALL') return d.startsWith(selectedYear);
        return true;
      }
    };

    // 1. Dari servis yang sudah selesai & diambil (sesuai filter tanggal/bulan/tahun)
    services.forEach((s) => {
      if (
        s.status === 'DIAMBIL' &&
        s.pickedUpAt &&
        matchesScope(s.pickedUpAt)
      ) {
        const amt = Number(s.finalCost) || Number(s.estimatedCost) || 0;
        const method = (s.paymentMethod || '').toLowerCase();
        if (
          method.includes('bca') ||
          method.includes('transfer') ||
          method.includes('bank')
        ) {
          bca += amt;
        } else if (method.includes('qris')) {
          qris += amt;
        } else {
          tunai += amt;
        }
      }
    });

    // 2. Dari catatan kas manual (Masukan, Keluarkan, & Pemindahan Uang)
    (cashEntries || []).forEach((c) => {
      if (matchesScope(c.date)) {
        const amt = Number(c.amount) || 0;
        const cat = (c.category || '').toLowerCase();
        const note = (c.notes || '').toLowerCase();
        const pm = (c.paymentMethod || '').toUpperCase();
        const from = (c.transferFrom || '').toUpperCase();
        const to = (c.transferTo || '').toUpperCase();

        if (c.type === 'IN') {
          if (
            pm === 'BCA' ||
            cat.includes('bca') ||
            cat.includes('transfer') ||
            note.includes('bca') ||
            note.includes('transfer')
          ) {
            bca += amt;
          } else if (pm === 'QRIS' || cat.includes('qris') || note.includes('qris')) {
            qris += amt;
          } else {
            tunai += amt;
          }
        } else if (c.type === 'OUT') {
          if (
            pm === 'BCA' ||
            cat.includes('bca') ||
            cat.includes('transfer') ||
            note.includes('bca') ||
            note.includes('transfer')
          ) {
            bca -= amt;
          } else if (pm === 'QRIS' || cat.includes('qris') || note.includes('qris')) {
            qris -= amt;
          } else {
            tunai -= amt;
          }
        } else if (c.type === 'TRANSFER') {
          // Kurangi dari sumber
          if (
            from === 'TUNAI' ||
            (!from && (cat.includes('tunai') || note.includes('tunai')))
          ) {
            tunai -= amt;
          } else if (
            from === 'BCA' ||
            (!from && (cat.includes('bca') || note.includes('bca')))
          ) {
            bca -= amt;
          } else if (
            from === 'QRIS' ||
            (!from && (cat.includes('qris') || note.includes('qris')))
          ) {
            qris -= amt;
          }

          // Tambahkan ke tujuan
          if (
            to === 'TUNAI' ||
            (!to && (cat.includes('ke tunai') || cat.includes('➔ tunai') || note.includes('ke tunai')))
          ) {
            tunai += amt;
          } else if (
            to === 'BCA' ||
            (!to && (cat.includes('ke bca') || cat.includes('➔ bca') || note.includes('ke bca')))
          ) {
            bca += amt;
          } else if (
            to === 'QRIS' ||
            (!to && (cat.includes('ke qris') || cat.includes('➔ qris') || note.includes('ke qris')))
          ) {
            qris += amt;
          }
        }
      }
    });

    const total = tunai + bca + qris;
    const posTotal = Math.max(0, tunai) + Math.max(0, bca) + Math.max(0, qris);
    let tunaiPct = 0;
    let bcaPct = 0;
    let qrisPct = 0;

    if (posTotal > 0) {
      tunaiPct = Math.round((Math.max(0, tunai) / posTotal) * 100);
      bcaPct = Math.round((Math.max(0, bca) / posTotal) * 100);
      qrisPct = Math.max(0, 100 - tunaiPct - bcaPct);
    }

    return {
      tunai,
      bca,
      qris,
      total,
      tunaiPct,
      bcaPct,
      qrisPct,
    };
  }, [
    services,
    cashEntries,
    paymentScope,
    periodType,
    selectedDailyDate,
    selectedMonth,
    selectedYear,
    todayStr,
    currentMonthStr,
    currentYearStr,
  ]);

  // Collect available dates, months, and years from all transactions
  const { availableDates, availableMonths, availableYears } = useMemo(() => {
    const dateSet = new Set<string>();
    const monthSet = new Set<string>();
    const yearSet = new Set<string>();

    transactions.forEach((t) => {
      if (t.date) {
        dateSet.add(t.date);
        monthSet.add(t.date.substring(0, 7));
        yearSet.add(t.date.substring(0, 4));
      }
    });

    // Pastikan hari ini, bulan ini, dan tahun ini selalu ada di opsi filter
    dateSet.add(todayStr);
    monthSet.add(currentMonthStr);
    yearSet.add(currentYearStr);

    return {
      availableDates: Array.from(dateSet).sort().reverse(),
      availableMonths: Array.from(monthSet).sort().reverse(),
      availableYears: Array.from(yearSet).sort().reverse(),
    };
  }, [transactions, todayStr, currentMonthStr, currentYearStr]);

  // Aggregate by Day
  const dailyData = useMemo(() => {
    const dayMap = new Map<
      string,
      {
        date: string;
        income: number;
        expense: number;
        unitMasuk: number;
        unitSelesai: number;
        cashInCount: number;
        cashOutCount: number;
        txCount: number;
      }
    >();

    transactions.forEach((t) => {
      if (selectedMonth !== 'ALL' && !t.date.startsWith(selectedMonth)) {
        return;
      }
      if (!dayMap.has(t.date)) {
        dayMap.set(t.date, {
          date: t.date,
          income: 0,
          expense: 0,
          unitMasuk: 0,
          unitSelesai: 0,
          cashInCount: 0,
          cashOutCount: 0,
          txCount: 0,
        });
      }
      const day = dayMap.get(t.date)!;
      day.income += t.income;
      day.expense += t.expense;
      if (t.unitEvent === 'MASUK') day.unitMasuk++;
      if (t.unitEvent === 'SELESAI') day.unitSelesai++;
      if (t.type === 'KAS_MASUK_MANUAL') day.cashInCount++;
      if (t.type === 'KAS_KELUAR_MANUAL') day.cashOutCount++;
      day.txCount++;
    });

    return Array.from(dayMap.values()).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }, [transactions, selectedMonth]);

  // Data harian yang ditampilkan di tabel (filter berdasarkan tanggal yang dipilih)
  const displayedDailyData = useMemo(() => {
    if (selectedDailyDate === 'ALL') {
      return dailyData;
    }
    const filtered = dailyData.filter((d) => d.date === selectedDailyDate);
    if (filtered.length > 0) {
      return filtered;
    }
    return [
      {
        date: selectedDailyDate,
        income: 0,
        expense: 0,
        unitMasuk: 0,
        unitSelesai: 0,
        cashInCount: 0,
        cashOutCount: 0,
        txCount: 0,
      },
    ];
  }, [dailyData, selectedDailyDate]);

  // Aggregate by Month
  const monthlyData = useMemo(() => {
    const monthMap = new Map<
      string,
      {
        ym: string;
        income: number;
        expense: number;
        unitMasuk: number;
        unitSelesai: number;
        cashInCount: number;
        cashOutCount: number;
        activeDays: Set<string>;
      }
    >();

    transactions.forEach((t) => {
      const ym = t.date.substring(0, 7);
      const y = t.date.substring(0, 4);
      if (selectedYear !== 'ALL' && y !== selectedYear) {
        return;
      }

      if (!monthMap.has(ym)) {
        monthMap.set(ym, {
          ym,
          income: 0,
          expense: 0,
          unitMasuk: 0,
          unitSelesai: 0,
          cashInCount: 0,
          cashOutCount: 0,
          activeDays: new Set(),
        });
      }
      const m = monthMap.get(ym)!;
      m.income += t.income;
      m.expense += t.expense;
      if (t.unitEvent === 'MASUK') m.unitMasuk++;
      if (t.unitEvent === 'SELESAI') m.unitSelesai++;
      if (t.type === 'KAS_MASUK_MANUAL') m.cashInCount++;
      if (t.type === 'KAS_KELUAR_MANUAL') m.cashOutCount++;
      m.activeDays.add(t.date);
    });

    return Array.from(monthMap.values()).sort((a, b) =>
      b.ym.localeCompare(a.ym)
    );
  }, [transactions, selectedYear]);

  // Aggregate by Year (Tahunan)
  const yearlyData = useMemo(() => {
    const yearMap = new Map<
      string,
      {
        y: string;
        income: number;
        expense: number;
        unitMasuk: number;
        unitSelesai: number;
        cashInCount: number;
        cashOutCount: number;
        activeMonths: Set<string>;
        txCount: number;
      }
    >();

    transactions.forEach((t) => {
      const y = t.date.substring(0, 4);
      const ym = t.date.substring(0, 7);

      if (!yearMap.has(y)) {
        yearMap.set(y, {
          y,
          income: 0,
          expense: 0,
          unitMasuk: 0,
          unitSelesai: 0,
          cashInCount: 0,
          cashOutCount: 0,
          activeMonths: new Set(),
          txCount: 0,
        });
      }
      const yr = yearMap.get(y)!;
      yr.income += t.income;
      yr.expense += t.expense;
      if (t.unitEvent === 'MASUK') yr.unitMasuk++;
      if (t.unitEvent === 'SELESAI') yr.unitSelesai++;
      if (t.type === 'KAS_MASUK_MANUAL') yr.cashInCount++;
      if (t.type === 'KAS_KELUAR_MANUAL') yr.cashOutCount++;
      yr.activeMonths.add(ym);
      yr.txCount++;
    });

    return Array.from(yearMap.values()).sort((a, b) => b.y.localeCompare(a.y));
  }, [transactions]);

  // Totals for the 4 Stat Cards: otomatis terhitung sesuai periode yang dipilih
  const { totalIncome, totalExpense, totalUnits, activePeriodLabel } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    let units = 0;
    let label = '';

    if (periodType === 'DAILY') {
      const targetDate = selectedDailyDate;
      if (targetDate === 'ALL') {
        label = selectedMonth === 'ALL' ? 'Semua Hari' : `Harian (${selectedMonth})`;
        dailyData.forEach((d) => {
          inc += d.income;
          exp += d.expense;
          units += d.unitSelesai;
        });
      } else {
        const isToday = targetDate === todayStr;
        label = isToday ? `Hari Ini (${targetDate})` : targetDate;
        const match = dailyData.find((d) => d.date === targetDate);
        if (match) {
          inc = match.income;
          exp = match.expense;
          units = match.unitSelesai;
        }
      }
    } else if (periodType === 'MONTHLY') {
      if (selectedMonth === 'ALL') {
        label = selectedYear === 'ALL' ? 'Semua Bulan' : `Tahun ${selectedYear}`;
        monthlyData.forEach((m) => {
          inc += m.income;
          exp += m.expense;
          units += m.unitSelesai;
        });
      } else {
        const [y, mStr] = selectedMonth.split('-');
        const mName = getMonthNameIndo(parseInt(mStr) - 1);
        const isThisMonth = selectedMonth === currentMonthStr;
        label = isThisMonth ? `Bulan Ini (${mName} ${y})` : `${mName} ${y}`;
        const match = monthlyData.find((m) => m.ym === selectedMonth);
        if (match) {
          inc = match.income;
          exp = match.expense;
          units = match.unitSelesai;
        }
      }
    } else {
      if (selectedYear === 'ALL') {
        label = 'Semua Tahun';
        yearlyData.forEach((y) => {
          inc += y.income;
          exp += y.expense;
          units += y.unitSelesai;
        });
      } else {
        const isThisYear = selectedYear === currentYearStr;
        label = isThisYear ? `Tahun Ini (${selectedYear})` : `Tahun ${selectedYear}`;
        const match = yearlyData.find((y) => y.y === selectedYear);
        if (match) {
          inc = match.income;
          exp = match.expense;
          units = match.unitSelesai;
        }
      }
    }

    return {
      totalIncome: inc,
      totalExpense: exp,
      totalUnits: units,
      activePeriodLabel: label,
    };
  }, [
    periodType,
    selectedDailyDate,
    selectedMonth,
    selectedYear,
    dailyData,
    monthlyData,
    yearlyData,
    todayStr,
    currentMonthStr,
    currentYearStr,
  ]);

  const netProfit = totalIncome - totalExpense;

  // Filter Buku Kas Masuk & Keluar berdasarkan tanggal/bulan/tahun yang dipilih
  const filteredCashEntries = useMemo(() => {
    return cashEntries.filter((c) => {
      if (periodType === 'DAILY') {
        if (selectedDailyDate !== 'ALL') {
          return c.date === selectedDailyDate;
        }
        if (selectedMonth !== 'ALL') {
          return c.date.startsWith(selectedMonth);
        }
        return true;
      }
      if (periodType === 'MONTHLY') {
        if (selectedMonth !== 'ALL') {
          return c.date.startsWith(selectedMonth);
        }
        if (selectedYear !== 'ALL') {
          return c.date.startsWith(selectedYear);
        }
        return true;
      }
      if (periodType === 'YEARLY') {
        if (selectedYear !== 'ALL') {
          return c.date.startsWith(selectedYear);
        }
        return true;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [cashEntries, periodType, selectedDailyDate, selectedMonth, selectedYear]);

  // Perhitungan total Kas Masuk, Kas Keluar, Saldo Kas, dan Total Transaksi Kas untuk Buku Kas
  const { cashInTotal, cashOutTotal, cashBalance, cashTxCount } = useMemo(() => {
    let inTotal = 0;
    let outTotal = 0;
    filteredCashEntries.forEach((c) => {
      if (c.type === 'IN') inTotal += c.amount;
      if (c.type === 'OUT') outTotal += c.amount;
    });
    return {
      cashInTotal: inTotal,
      cashOutTotal: outTotal,
      cashBalance: inTotal - outTotal,
      cashTxCount: filteredCashEntries.length,
    };
  }, [filteredCashEntries]);

  const handleExportExcel = () => {
    try {
      const selectedFilter =
        periodType === 'DAILY'
          ? selectedMonth
          : periodType === 'MONTHLY'
          ? selectedYear
          : 'ALL';

      exportFinanceToExcel({
        periodType,
        selectedFilter,
        transactions,
        cashEntries,
        services,
        storeName,
      });

      if (onToast) {
        onToast('Laporan Keuangan berhasil diekspor ke Excel (.xlsx)!', 'success');
      }
    } catch (err) {
      console.error(err);
      if (onToast) {
        onToast('Gagal mengekspor laporan ke Excel.', 'warning');
      }
    }
  };

  return (
    <section className="space-y-6 animate-in fade-in duration-200">
      {/* 4 Financial Stat Cards (Detail Rupiah Format) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Uang Masuk / Kas Masuk */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="uppercase tracking-wider">
                {activeTab === 'CASH_BOOK' ? 'Kas Masuk' : 'Uang Masuk'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {activePeriodLabel}
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-lg sm:text-2xl font-black text-white font-mono tracking-tight break-all">
              {formatRupiah(activeTab === 'CASH_BOOK' ? cashInTotal : totalIncome)}
            </h3>
            <p className="text-[11px] text-zinc-400 mt-1">
              {activeTab === 'CASH_BOOK'
                ? 'Total uang kas masuk ke toko'
                : 'Pelunasan HP riwayat servis & kas masuk'}
            </p>
          </div>
        </div>

        {/* Card 2: Biaya Sparepart & Pengeluaran / Kas Keluar */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="uppercase tracking-wider">
                {activeTab === 'CASH_BOOK' ? 'Kas Keluar' : 'Biaya & Pengeluaran'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                {activePeriodLabel}
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-lg sm:text-2xl font-black text-zinc-200 font-mono tracking-tight break-all">
              {formatRupiah(activeTab === 'CASH_BOOK' ? cashOutTotal : totalExpense)}
            </h3>
            <p className="text-[11px] text-zinc-400 mt-1">
              {activeTab === 'CASH_BOOK'
                ? 'Total uang kas keluar dari toko'
                : 'Modal sparepart HP riwayat servis & kas keluar'}
            </p>
          </div>
        </div>

        {/* Card 3: Keuntungan Bersih / Saldo Kas */}
        <div
          className={`bg-zinc-900 border-2 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg ${
            activeTab === 'CASH_BOOK'
              ? cashBalance >= 0
                ? 'border-emerald-500/80 shadow-emerald-500/5'
                : 'border-rose-500/80 shadow-rose-500/5'
              : 'border-emerald-500/80 shadow-emerald-500/5'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="uppercase tracking-wider">
                {activeTab === 'CASH_BOOK' ? 'Saldo Kas' : 'Keuntungan Bersih'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {activePeriodLabel}
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3
              className={`text-lg sm:text-2xl font-black font-mono tracking-tight break-all ${
                activeTab === 'CASH_BOOK'
                  ? cashBalance >= 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                  : netProfit >= 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {formatRupiah(activeTab === 'CASH_BOOK' ? cashBalance : netProfit)}
            </h3>
            <p className="text-[11px] text-zinc-400 mt-1">
              {activeTab === 'CASH_BOOK'
                ? 'Kas masuk dikurangi kas keluar'
                : 'Uang masuk dikurangi modal part riwayat & kas'}
            </p>
          </div>
        </div>

        {/* Card 4: HP Riwayat Selesai / Total Transaksi Kas */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="uppercase tracking-wider">
                {activeTab === 'CASH_BOOK' ? 'Total Kas' : 'HP Riwayat Selesai'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                {activePeriodLabel}
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-zinc-800 text-emerald-400 shrink-0">
              {activeTab === 'CASH_BOOK' ? (
                <Receipt className="w-4 h-4" />
              ) : (
                <Smartphone className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-lg sm:text-2xl font-black text-white">
              {activeTab === 'CASH_BOOK' ? `${cashTxCount} Transaksi` : `${totalUnits} Unit`}
            </h3>
            <p className="text-[11px] text-zinc-400 mt-1">
              {activeTab === 'CASH_BOOK'
                ? 'Jumlah transaksi kas masuk & keluar'
                : 'Khusus HP yang sudah masuk Riwayat Servis'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Quick Bar: Dipindah ke bawah kolom uang masuk, biaya, keuntungan, dan hp riwayat */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900 border border-zinc-800/80 p-3 sm:p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenAddCash('IN')}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200/90 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/90 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
            <span>+ Masukan Uang</span>
          </button>
          <button
            onClick={() => onOpenAddCash('OUT')}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <MinusCircle className="w-4 h-4 text-rose-400" />
            <span>- Keluarkan Uang</span>
          </button>
          <button
            onClick={() => onOpenAddCash('TRANSFER')}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4 text-blue-400" />
            <span>⇄ Pemindahan Uang</span>
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleExportExcel}
            title="Ekspor Seluruh Data ke Excel (.xlsx)"
            className="px-3.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200/90 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/90 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 font-bold text-xs flex items-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
            <span>Ekspor ke Excel</span>
          </button>
          <button
            onClick={() => window.print()}
            title="Cetak Laporan"
            className="p-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold border border-zinc-700 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-300" />
            <span className="hidden md:inline">Cetak</span>
          </button>
        </div>
      </div>

      {/* Main Container: Table + Posisi Uang Pembayaran Side Widgets */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Main Table Card (Left Side) */}
        <div className="flex-1 min-w-0 w-full bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-lg">
        {/* Header Toolbar */}
        <div className="p-4 border-b border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-950/60">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Harian / Bulanan / Tahunan toggle */}
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => {
                  setPeriodType('DAILY');
                  setActiveTab('SUMMARY');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  periodType === 'DAILY' && activeTab === 'SUMMARY'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Harian</span>
              </button>
              <button
                onClick={() => {
                  setPeriodType('MONTHLY');
                  setActiveTab('SUMMARY');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  periodType === 'MONTHLY' && activeTab === 'SUMMARY'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Bulanan</span>
              </button>
              <button
                onClick={() => {
                  setPeriodType('YEARLY');
                  setActiveTab('SUMMARY');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  periodType === 'YEARLY' && activeTab === 'SUMMARY'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Tahunan</span>
              </button>
            </div>

            {/* Sub Tab: Buku Kas Masuk/Keluar */}
            <button
              onClick={() => setActiveTab('CASH_BOOK')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'CASH_BOOK'
                  ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white border-zinc-800'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>Buku Kas Masuk & Keluar ({filteredCashEntries.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-between lg:justify-end">
            {/* Filter Tanggal/Bulan/Tahun aktif untuk ringkasan dan buku kas */}
            {periodType === 'DAILY' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] text-zinc-400 font-bold hidden md:inline">
                    Tanggal:
                  </label>
                  <select
                    value={selectedDailyDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedDailyDate(val);
                      if (val !== 'ALL' && selectedMonth !== 'ALL' && !val.startsWith(selectedMonth)) {
                        setSelectedMonth(val.substring(0, 7));
                      }
                    }}
                    className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Semua Hari</option>
                    <option value={todayStr}>Hari Ini ({todayStr})</option>
                    {availableDates
                      .filter((d) => d !== todayStr)
                      .map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                  </select>

                  {selectedDailyDate !== 'ALL' && (
                    <button
                      onClick={() => setSelectedDailyDate('ALL')}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-bold border border-zinc-700 transition-colors cursor-pointer"
                      title="Tampilkan Semua Hari"
                    >
                      Semua Hari
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] text-zinc-400 font-bold hidden md:inline">
                    Filter Bulan:
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedMonth(val);
                      if (selectedDailyDate !== 'ALL' && val !== 'ALL' && !selectedDailyDate.startsWith(val)) {
                        setSelectedDailyDate('ALL');
                      }
                    }}
                    className="bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Semua Bulan</option>
                    {availableMonths.map((ym) => {
                      const [y, m] = ym.split('-');
                      const mName = getMonthNameIndo(parseInt(m) - 1);
                      return (
                        <option key={ym} value={ym}>
                          {mName} {y}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}

            {periodType === 'MONTHLY' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] text-zinc-400 font-bold hidden md:inline">
                    Bulan:
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Semua Bulan</option>
                    {availableMonths.map((ym) => {
                      const [y, m] = ym.split('-');
                      const mName = getMonthNameIndo(parseInt(m) - 1);
                      return (
                        <option key={ym} value={ym}>
                          {mName} {y} {ym === currentMonthStr ? '(Bulan Ini)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] text-zinc-400 font-bold hidden md:inline">
                    Tahun:
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Semua Tahun</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        Tahun {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {periodType === 'YEARLY' && (
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-zinc-400 font-bold hidden md:inline">
                  Tahun:
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Tahun</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      Tahun {y} {y === currentYearStr ? '(Tahun Ini)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => scroll(-200)}
                title="Geser Kiri"
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll(200)}
                title="Geser Kanan"
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Views */}
        <div ref={containerRef} className="overflow-x-auto scroll-smooth">
          {activeTab === 'CASH_BOOK' ? (
            /* TAB: BUKU KAS MASUK & KELUAR */
            <table className="w-full text-left border-collapse text-xs min-w-[750px]">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Tipe Kas</th>
                  <th className="py-3.5 px-4">Catatan / Keperluan</th>
                  <th className="py-3.5 px-4 text-right">Nominal</th>
                  {onDeleteCashEntry && <th className="py-3.5 px-4 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredCashEntries.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                      {c.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                          c.type === 'IN'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : c.type === 'OUT'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {c.type === 'IN' ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : c.type === 'OUT' ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {c.type === 'IN'
                            ? 'Uang Masuk'
                            : c.type === 'OUT'
                            ? 'Uang Keluar'
                            : 'Pemindahan Uang'}
                        </span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-200 max-w-md break-words font-medium">
                      {c.type === 'TRANSFER' && (
                        <span className="inline-block mr-2 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-bold text-[10px] border border-blue-500/30">
                          {c.transferFrom || 'Kas'} ➔ {c.transferTo || 'Kas'}
                        </span>
                      )}
                      <span>{c.notes}</span>
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono font-black text-xs whitespace-nowrap ${
                        c.type === 'IN'
                          ? 'text-emerald-400'
                          : c.type === 'OUT'
                          ? 'text-rose-400'
                          : 'text-blue-400'
                      }`}
                    >
                      {c.type === 'IN' ? '+' : c.type === 'OUT' ? '-' : '⇄'}{' '}
                      {formatRupiah(c.amount)}
                    </td>
                    {onDeleteCashEntry && (
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => onDeleteCashEntry(c.id)}
                          title="Hapus Catatan Kas"
                          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : periodType === 'DAILY' ? (
            /* TAB: HARIAN */
            <table className="w-full text-left border-collapse text-xs min-w-[750px]">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4 text-center">Unit Riwayat & Kas</th>
                  <th className="py-3.5 px-4">Uang Masuk</th>
                  <th className="py-3.5 px-4">Biaya & Pengeluaran</th>
                  <th className="py-3.5 px-4 font-bold text-white">
                    Keuntungan
                  </th>
                  <th className="py-3.5 px-4 text-right">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {displayedDailyData.map((d) => {
                  const profit = d.income - d.expense;
                  const dayNum = d.date.split('-')[2];
                  const mIndex = parseInt(d.date.split('-')[1]) - 1;
                  const mShort = getMonthNameIndo(mIndex).substring(0, 3);

                  return (
                    <tr
                      key={d.date}
                      className="hover:bg-zinc-800/40 transition-colors group"
                    >
                      <td
                        onClick={() => setSelectedDailyDate(d.date)}
                        className="py-3.5 px-4 font-bold text-white text-xs cursor-pointer"
                        title="Klik untuk filter hari ini"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex flex-col items-center justify-center font-mono group-hover:border-emerald-500/50 transition-colors">
                            <span className="text-xs text-emerald-400 font-black leading-none">
                              {dayNum}
                            </span>
                            <span className="text-[9px] font-bold text-zinc-400 uppercase leading-none mt-0.5">
                              {mShort}
                            </span>
                          </div>
                          <div>
                            <span className="font-black text-white block font-mono group-hover:text-emerald-400 transition-colors">
                              {d.date}
                            </span>
                            <span className="text-[11px] text-zinc-400">
                              {d.txCount} Transaksi
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                          {d.unitSelesai > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-emerald-400 border border-zinc-700 font-bold text-[11px]">
                              ✓{d.unitSelesai} Riwayat
                            </span>
                          )}
                          {d.cashInCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[11px]">
                              +{d.cashInCount} Kas Masuk
                            </span>
                          )}
                          {d.cashOutCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold text-[11px]">
                              -{d.cashOutCount} Kas Keluar
                            </span>
                          )}
                          {d.unitSelesai === 0 &&
                            d.cashInCount === 0 &&
                            d.cashOutCount === 0 && (
                              <span className="text-zinc-500 text-[11px]">
                                0 Unit
                              </span>
                            )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-bold text-emerald-400 font-mono">
                        {formatRupiah(d.income)}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-bold text-zinc-300 font-mono">
                        {formatRupiah(d.expense)}
                      </td>

                      <td
                        className={`py-3.5 px-4 text-xs font-black font-mono ${
                          profit >= 0 ? 'text-white' : 'text-rose-400'
                        }`}
                      >
                        {formatRupiah(profit)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onOpenDayDetail(d.date)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors border border-zinc-700 cursor-pointer"
                        >
                          Rincian
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : periodType === 'MONTHLY' ? (
            /* TAB: BULANAN */
            <table className="w-full text-left border-collapse text-xs min-w-[750px]">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Bulan</th>
                  <th className="py-3.5 px-4 text-center">HP Riwayat Servis</th>
                  <th className="py-3.5 px-4">Uang Masuk</th>
                  <th className="py-3.5 px-4">Biaya & Pengeluaran</th>
                  <th className="py-3.5 px-4 font-bold text-white">
                    Keuntungan
                  </th>
                  <th className="py-3.5 px-4 text-right">Rata-rata / Hari</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {monthlyData.map((m) => {
                  const profit = m.income - m.expense;
                  const [y, mStr] = m.ym.split('-');
                  const mName = getMonthNameIndo(parseInt(mStr) - 1);
                  const daysCount = m.activeDays.size || 1;
                  const avgPerDay = Math.round(m.income / daysCount);

                  return (
                    <tr
                      key={m.ym}
                      className="hover:bg-zinc-800/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-bold text-white text-xs">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-zinc-800 text-emerald-400 border border-zinc-700">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-black text-white text-sm">
                              {mName} {y}
                            </span>
                            <span className="text-[11px] text-zinc-400 block">
                              {daysCount} Hari Aktif
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-3 py-1 rounded-full bg-zinc-800 text-emerald-400 font-bold text-xs border border-zinc-700">
                          {m.unitSelesai} Unit Riwayat
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-bold text-emerald-400 font-mono">
                        {formatRupiah(m.income)}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-bold text-zinc-300 font-mono">
                        {formatRupiah(m.expense)}
                      </td>

                      <td
                        className={`py-3.5 px-4 text-xs font-black font-mono ${
                          profit >= 0 ? 'text-white' : 'text-rose-400'
                        }`}
                      >
                        {formatRupiah(profit)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-zinc-300">
                        {formatRupiah(avgPerDay)} / hr
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* TAB: TAHUNAN (YEARLY) */
            <table className="w-full text-left border-collapse text-xs min-w-[750px]">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Tahun</th>
                  <th className="py-3.5 px-4 text-center">Bulan Aktif & Unit Riwayat</th>
                  <th className="py-3.5 px-4">Total Uang Masuk</th>
                  <th className="py-3.5 px-4">Total Biaya & Pengeluaran</th>
                  <th className="py-3.5 px-4 font-bold text-white">
                    Keuntungan Bersih
                  </th>
                  <th className="py-3.5 px-4 text-right">Rata-rata / Bulan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {yearlyData.map((yr) => {
                  const profit = yr.income - yr.expense;
                  const monthCount = yr.activeMonths.size || 1;
                  const avgPerMonth = Math.round(yr.income / monthCount);

                  return (
                    <tr
                      key={yr.y}
                      className="hover:bg-zinc-800/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-bold text-white text-xs">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-zinc-800 text-emerald-400 border border-zinc-700">
                            <CalendarRange className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-black text-white text-sm">
                              Tahun {yr.y}
                            </span>
                            <span className="text-[11px] text-zinc-400 block font-mono">
                              {yr.txCount} Total Transaksi
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 font-bold text-xs border border-zinc-700">
                            {monthCount} Bulan Aktif
                          </span>
                          <span className="px-3 py-1 rounded-full bg-zinc-800 text-emerald-400 font-bold text-xs border border-zinc-700">
                            {yr.unitSelesai} Unit Riwayat
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-bold text-emerald-400 font-mono">
                        {formatRupiah(yr.income)}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-bold text-zinc-300 font-mono">
                        {formatRupiah(yr.expense)}
                      </td>

                      <td
                        className={`py-3.5 px-4 text-xs font-black font-mono ${
                          profit >= 0 ? 'text-white' : 'text-rose-400'
                        }`}
                      >
                        {formatRupiah(profit)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-zinc-300">
                        {formatRupiah(avgPerMonth)} / bln
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Empty States */}
        {activeTab === 'CASH_BOOK' && filteredCashEntries.length === 0 && (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
              <Receipt className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-zinc-300">
              Belum Ada Catatan Kas Masuk / Keluar {activePeriodLabel ? `(${activePeriodLabel})` : ''}
            </h4>
            <p className="text-xs text-zinc-500 mt-1 mb-4">
              Gunakan tombol &quot;+ Masukan Uang&quot; atau &quot;- Keluarkan Uang&quot; untuk mencatat kas toko.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => onOpenAddCash('IN')}
                className="px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200/90 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/90 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 font-bold text-xs cursor-pointer shadow-xs"
              >
                + Masukan Uang
              </button>
              <button
                onClick={() => onOpenAddCash('OUT')}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-rose-400 border border-zinc-700 font-bold text-xs hover:bg-zinc-700 cursor-pointer"
              >
                - Keluarkan Uang
              </button>
            </div>
          </div>
        )}

        {activeTab === 'SUMMARY' &&
          ((periodType === 'DAILY' && dailyData.length === 0) ||
            (periodType === 'MONTHLY' && monthlyData.length === 0) ||
            (periodType === 'YEARLY' && yearlyData.length === 0)) && (
            <div className="py-16 px-4 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                <Calculator className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-zinc-300">
                Belum Ada Catatan Uang
              </h4>
              <p className="text-xs text-zinc-500 mt-1">
                Setiap ada bayaran DP, pelunasan, atau kas masuk/keluar, otomatis muncul di sini.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Posisi Uang Pembayaran & Proporsi Pemasukan */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0 space-y-4 lg:sticky lg:top-4">
          {/* Card 1: Posisi Uang Pembayaran */}
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 shadow-lg space-y-4">
            {/* Header with cash register icon and dynamic period badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <span className="text-xl leading-none mt-0.5">📟</span>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">
                    Posisi Uang Pembayaran
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {paymentPeriodDesc}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                {paymentPeriodBadge}
              </span>
            </div>

            {/* Quick Scope Selector: Filter Aktif, Hari Ini, Bulan Ini, Tahun Ini, Semua */}
            <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800/90 rounded-xl overflow-x-auto text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setPaymentScope('AUTO')}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  paymentScope === 'AUTO'
                    ? 'bg-emerald-500 text-zinc-950 font-black shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Ikuti filter Tanggal / Bulan / Tahun dari tabel di atas"
              >
                Ikuti Filter
              </button>
              <button
                type="button"
                onClick={() => setPaymentScope('TODAY')}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  paymentScope === 'TODAY'
                    ? 'bg-emerald-500 text-zinc-950 font-black shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setPaymentScope('MONTH')}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  paymentScope === 'MONTH'
                    ? 'bg-emerald-500 text-zinc-950 font-black shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setPaymentScope('YEAR')}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  paymentScope === 'YEAR'
                    ? 'bg-emerald-500 text-zinc-950 font-black shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                Tahun Ini
              </button>
              <button
                type="button"
                onClick={() => setPaymentScope('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  paymentScope === 'ALL'
                    ? 'bg-emerald-500 text-zinc-950 font-black shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                Semua
              </button>
            </div>

            {/* List of Payment Channels */}
            <div className="space-y-3">
              {/* Item 1: Uang Tunai (Laci Kasir) */}
              <div className="bg-zinc-950/80 border border-zinc-800/80 hover:border-emerald-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      Uang Tunai (Laci Kasir)
                    </h4>
                    <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                      Penerimaan tunai &amp; mutasi
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-zinc-400 block font-semibold leading-none">
                    Rp
                  </span>
                  <span className="text-sm font-mono font-black text-white leading-tight">
                    {paymentBreakdown.tunai.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Item 2: Transfer BCA Rekening */}
              <div className="bg-zinc-950/80 border border-zinc-800/80 hover:border-blue-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      Transfer BCA Rekening
                    </h4>
                    <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                      Rekening bank &amp; mutasi
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-zinc-400 block font-semibold leading-none">
                    Rp
                  </span>
                  <span className="text-sm font-mono font-black text-white leading-tight">
                    {paymentBreakdown.bca.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Item 3: QRIS Konter (Statis) */}
              <div className="bg-zinc-950/80 border border-zinc-800/80 hover:border-amber-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      QRIS Konter (Statis)
                    </h4>
                    <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                      Penerimaan QRIS &amp; mutasi
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-zinc-400 block font-semibold leading-none">
                    Rp
                  </span>
                  <span className="text-sm font-mono font-black text-white leading-tight">
                    {paymentBreakdown.qris.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Keseluruhan Bar */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">
                Total Posisi Uang
              </span>
              <span className="text-sm sm:text-base font-mono font-black text-emerald-400">
                {formatRupiah(paymentBreakdown.total)}
              </span>
            </div>

            {/* Quick Action: Pemindahan Uang */}
            <button
              type="button"
              onClick={() => onOpenAddCash('TRANSFER')}
              className="w-full py-2.5 px-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4 text-blue-400" />
              <span>⇄ Pemindahan Uang (Pindah Kas)</span>
            </button>
          </div>

          {/* Card 2: Proporsi Pemasukan */}
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white">
                Proporsi Pemasukan
              </h4>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                {paymentPeriodBadge}
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden flex border border-zinc-800">
              <div
                style={{ width: `${paymentBreakdown.tunaiPct}%` }}
                className="bg-emerald-600 transition-all duration-300"
                title={`Tunai: ${paymentBreakdown.tunaiPct}%`}
              />
              <div
                style={{ width: `${paymentBreakdown.bcaPct}%` }}
                className="bg-blue-600 transition-all duration-300"
                title={`BCA: ${paymentBreakdown.bcaPct}%`}
              />
              <div
                style={{ width: `${paymentBreakdown.qrisPct}%` }}
                className="bg-amber-600 transition-all duration-300"
                title={`QRIS: ${paymentBreakdown.qrisPct}%`}
              />
            </div>

            {/* Legend with colored dots */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>{paymentBreakdown.tunaiPct}%</span>
                </div>
                <span className="text-[11px] font-semibold text-zinc-400 mt-0.5">
                  Tunai
                </span>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-xs font-black text-blue-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                  <span>{paymentBreakdown.bcaPct}%</span>
                </div>
                <span className="text-[11px] font-semibold text-zinc-400 mt-0.5">
                  BCA
                </span>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span>{paymentBreakdown.qrisPct}%</span>
                </div>
                <span className="text-[11px] font-semibold text-zinc-400 mt-0.5">
                  QRIS
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
