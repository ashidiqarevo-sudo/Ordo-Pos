import React, { useMemo } from 'react';
import { ServiceItem, CashEntry } from '../types';
import { formatRupiah, formatRupiahCompact } from '../data/initialData';
import { WhatsAppSolidIcon } from './icons/WhatsAppIcon';
import {
  Wallet,
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronRight,
  Plus,
  AlertTriangle,
  Bell,
  CheckCircle,
  Wrench,
  CheckSquare,
  History,
  Users,
  ArrowUpRight,
  MessageCircle,
  FileText,
  DollarSign,
  Activity,
  ArrowDownRight,
  Smartphone,
  Minus,
} from 'lucide-react';

interface DashboardViewProps {
  services: ServiceItem[];
  cashEntries?: CashEntry[];
  onNavigateBoard: () => void;
  onNavigateReady: () => void;
  onNavigateHistory: () => void;
  onNavigateAccounting: () => void;
  onNavigateCustomers: () => void;
  onOpenServiceModal: () => void;
  onViewDetail: (serviceId: string) => void;
  onNavigateToService?: (serviceId: string) => void;
  onDirectWhatsApp?: (serviceId: string) => void;
}

interface ActivityLogItem {
  id: string;
  title: string;
  timestamp: string;
  customerName: string;
  ticketNo: string;
  ticketId: string;
  type: 'PAYMENT' | 'READY' | 'PROCESS' | 'CREATED';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  services,
  cashEntries = [],
  onNavigateBoard,
  onNavigateReady,
  onNavigateHistory,
  onNavigateAccounting,
  onNavigateCustomers,
  onOpenServiceModal,
  onViewDetail,
  onNavigateToService,
  onDirectWhatsApp,
}) => {
  const handleNavigateTicket = (ticketId: string, statusHint?: string) => {
    if (onNavigateToService) {
      onNavigateToService(ticketId);
      return;
    }
    const item = services.find((s) => s.id === ticketId);
    const targetStatus = statusHint || item?.status;

    if (targetStatus === 'BARU' || targetStatus === 'PROSES') {
      onNavigateBoard();
    } else if (targetStatus === 'SIAP' || (targetStatus === 'BATAL' && !item?.pickedUpAt)) {
      onNavigateReady();
    } else {
      onNavigateHistory();
    }
  };
  // Global cash totals (Dihitung hanya ketika HP sudah masuk Riwayat Servis / DIAMBIL)
  let totalKasMasuk = 0;
  let totalModalSparepart = 0;

  services.forEach((s) => {
    if (s.status === 'DIAMBIL') {
      totalKasMasuk += Number(s.finalCost) || Number(s.estimatedCost) || 0;
      totalModalSparepart += Number(s.sparepartCost) || 0;
    }
  });

  (cashEntries || []).forEach((c) => {
    if (c.type === 'IN') {
      totalKasMasuk += Number(c.amount) || 0;
    } else {
      totalModalSparepart += Number(c.amount) || 0;
    }
  });

  const profitBersih = totalKasMasuk - totalModalSparepart;

  // Calculate today's cash (Kas Hari Ini)
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Current month string (YYYY-MM) for monthly reset stats
  const thisMonthStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const { todayIncome, todayExpense, todayNet } = useMemo(() => {
    let income = 0;
    let expense = 0;

    services.forEach((s) => {
      // Hanya dihitung ketika HP sudah masuk riwayat servis (DIAMBIL) pada tanggal hari ini
      if (s.pickedUpAt && s.pickedUpAt.startsWith(todayStr) && s.status === 'DIAMBIL') {
        income += Number(s.finalCost) || Number(s.estimatedCost) || 0;
        expense += Number(s.sparepartCost) || 0;
      }
    });

    // Sertakan catatan kas manual hari ini
    (cashEntries || []).forEach((c) => {
      if (c.date === todayStr) {
        if (c.type === 'IN') {
          income += Number(c.amount) || 0;
        } else {
          expense += Number(c.amount) || 0;
        }
      }
    });

    return {
      todayIncome: income,
      todayExpense: expense,
      todayNet: income - expense,
    };
  }, [services, cashEntries, todayStr]);

  // Daily Units Intake Statistics & Comparison with Yesterday
  const dailyUnitStats = useMemo(() => {
    // 1. Identify today and yesterday date strings
    const today = new Date();
    const formatDateKey = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const actualTodayKey = formatDateKey(today);
    
    // Check services created on actual today
    const countOnDate = (dateKey: string) => {
      return services.filter((s) => s.createdAt && s.createdAt.startsWith(dateKey)).length;
    };

    const yesterdayDate = new Date(today);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const actualYesterdayKey = formatDateKey(yesterdayDate);

    const todayUnitsCount = countOnDate(actualTodayKey);
    const yesterdayUnitsCount = countOnDate(actualYesterdayKey);
    const diffUnits = todayUnitsCount - yesterdayUnitsCount;

    // Build last 7 days series for sparkline chart ending on actual today
    const last7Days: { dateKey: string; label: string; count: number; isToday: boolean }[] = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = formatDateKey(d);
      const count = countOnDate(key);
      const dayLabel = dayNames[d.getDay()];
      last7Days.push({
        dateKey: key,
        label: `${dayLabel} ${d.getDate()}`,
        count,
        isToday: i === 0,
      });
    }

    const maxCount = Math.max(...last7Days.map((d) => d.count), 1);

    return {
      todayUnitsCount,
      yesterdayUnitsCount,
      diffUnits,
      refTodayKey: actualTodayKey,
      refYesterdayKey: actualYesterdayKey,
      last7Days,
      maxCount,
    };
  }, [services]);

  // Daily Financial Statistics (Kas Masuk & Keuntungan Bersih per Hari vs Kemarin)
  const dailyFinanceStats = useMemo(() => {
    const todayKey = dailyUnitStats.refTodayKey;
    const yesterdayKey = dailyUnitStats.refYesterdayKey;

    const getDayFinance = (dateKey: string) => {
      let income = 0;
      let expense = 0;

      services.forEach((s) => {
        // Dihitung hanya ketika HP sudah masuk riwayat servis (DIAMBIL) pada tanggal tersebut
        if (s.status === 'DIAMBIL' && s.pickedUpAt && s.pickedUpAt.startsWith(dateKey)) {
          income += Number(s.finalCost) || Number(s.estimatedCost) || 0;
          expense += Number(s.sparepartCost) || 0;
        }
      });

      // Include manual cash entries
      (cashEntries || []).forEach((c) => {
        if (c.date === dateKey) {
          if (c.type === 'IN') {
            income += Number(c.amount) || 0;
          } else {
            expense += Number(c.amount) || 0;
          }
        }
      });

      return {
        income,
        expense,
        profit: income - expense,
      };
    };

    const todayFinance = getDayFinance(todayKey);
    const yesterdayFinance = getDayFinance(yesterdayKey);

    const diffIncome = todayFinance.income - yesterdayFinance.income;
    const diffProfit = todayFinance.profit - yesterdayFinance.profit;

    return {
      refTodayKey: todayKey,
      refYesterdayKey: yesterdayKey,
      todayIncome: todayFinance.income,
      todayExpense: todayFinance.expense,
      todayProfit: todayFinance.profit,
      yesterdayIncome: yesterdayFinance.income,
      yesterdayProfit: yesterdayFinance.profit,
      diffIncome,
      diffProfit,
    };
  }, [services, cashEntries, dailyUnitStats.refTodayKey, dailyUnitStats.refYesterdayKey]);

  // Generate real-time activity log from services
  const activityLogs: ActivityLogItem[] = useMemo(() => {
    const logs: ActivityLogItem[] = [];

    services.forEach((s) => {
      // 1. Payment completed (DIAMBIL)
      if (s.status === 'DIAMBIL' && s.pickedUpAt) {
        const timePart = s.pickedUpAt.split(' ')[1] || '14:32';
        logs.push({
          id: `pay-${s.id}`,
          title: 'Pembayaran diterima',
          timestamp: timePart,
          customerName: s.customerName.split(' ')[0],
          ticketNo: s.ticketNo,
          ticketId: s.id,
          type: 'PAYMENT',
        });
      }

      // 2. Ready for pickup
      if (s.status === 'SIAP') {
        const timePart = s.confirmedAt?.split(' ')[1] || s.createdAt?.split(' ')[1] || '14:05';
        logs.push({
          id: `ready-${s.id}`,
          title: 'Pengecekan akhir (Siap Diambil)',
          timestamp: timePart,
          customerName: s.customerName.split(' ')[0],
          ticketNo: s.ticketNo,
          ticketId: s.id,
          type: 'READY',
        });
      }

      // 3. Process / In progress
      if (s.status === 'PROSES') {
        const timePart = s.createdAt?.split(' ')[1] || '12:15';
        logs.push({
          id: `proc-${s.id}`,
          title: s.diagnosis ? 'Diagnosis & Dikerjakan' : 'Servis sedang diproses',
          timestamp: timePart,
          customerName: s.customerName.split(' ')[0],
          ticketNo: s.ticketNo,
          ticketId: s.id,
          type: 'PROCESS',
        });
      }

      // 4. Servis terdaftar
      if (s.createdAt) {
        const timePart = s.createdAt.split(' ')[1] || '10:00';
        logs.push({
          id: `create-${s.id}`,
          title: Number(s.dp) > 0 ? `Servis terdaftar (DP ${formatRupiah(s.dp)})` : 'Servis terdaftar',
          timestamp: timePart,
          customerName: s.customerName.split(' ')[0],
          ticketNo: s.ticketNo,
          ticketId: s.id,
          type: 'CREATED',
        });
      }
    });

    return logs.slice(0, 6);
  }, [services]);

  // Items needing attention:
  const pendingConfirmations = services.filter(
    (s) =>
      s.confirmationStatus === 'MENUNGGU' &&
      s.status !== 'BATAL' &&
      s.status !== 'DIAMBIL'
  );

  const readyForPickup = services.filter((s) => s.status === 'SIAP');

  const activeServices = services.filter(
    (s) => s.status === 'BARU' || s.status === 'PROSES'
  );

  const monthlyHistoryServices = useMemo(() => {
    return services.filter((s) => {
      const isHist = s.status === 'DIAMBIL' || (s.status === 'BATAL' && !!s.pickedUpAt);
      if (!isHist) return false;
      return !!(s.pickedUpAt && s.pickedUpAt.startsWith(thisMonthStr));
    });
  }, [services, thisMonthStr]);

  const activeWarrantiesEndingSoon = services.filter((s) => {
    if (s.status !== 'DIAMBIL' || !s.pickedUpAt || !s.warrantyDays) return false;
    try {
      const parts = s.pickedUpAt.split(' ')[0].split('-');
      const pickupDate = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2])
      );
      const expiry = new Date(pickupDate);
      expiry.setDate(expiry.getDate() + Number(s.warrantyDays));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 3;
    } catch {
      return false;
    }
  });

  const totalAttentionItems =
    pendingConfirmations.length +
    readyForPickup.length +
    activeWarrantiesEndingSoon.length;

  const recentActive = services
    .filter((s) => s.status !== 'DIAMBIL' && s.status !== 'BATAL')
    .slice(0, 6);

  return (
    <section className="space-y-6 animate-in fade-in duration-200">
      {/* Quick Navigation Quick-Status Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={onNavigateBoard}
          className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/60 hover:bg-zinc-800/60 transition-all text-left group cursor-pointer shadow-sm active:scale-[0.98]"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-zinc-400 font-medium group-hover:text-zinc-300">
                Servis Berjalan
              </div>
              <div className="text-base font-bold text-white">
                {activeServices.length}{' '}
                <span className="text-xs font-normal text-zinc-500">Unit</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
        </button>

        <button
          onClick={onNavigateReady}
          className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/60 hover:bg-zinc-800/60 transition-all text-left group cursor-pointer shadow-sm active:scale-[0.98]"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-colors">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-zinc-400 font-medium group-hover:text-zinc-300">
                Siap Diambil
              </div>
              <div className="text-base font-bold text-white">
                {readyForPickup.length}{' '}
                <span className="text-xs font-normal text-zinc-500">Unit</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
        </button>

        <button
          onClick={onNavigateHistory}
          className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/60 hover:bg-zinc-800/60 transition-all text-left group cursor-pointer shadow-sm active:scale-[0.98]"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-zinc-400 font-medium group-hover:text-zinc-300 flex items-center gap-1.5">
                <span>Riwayat Selesai</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-emerald-400 border border-zinc-700 font-semibold">
                  Bulan Ini
                </span>
              </div>
              <div className="text-base font-bold text-white">
                {monthlyHistoryServices.length}{' '}
                <span className="text-xs font-normal text-zinc-500">Unit</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>

      {/* 3 Main Overall Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Metric 1: HP Masuk Hari Ini */}
        <button
          onClick={onNavigateBoard}
          className="bg-zinc-900 border border-zinc-800/80 hover:border-emerald-500/60 hover:bg-zinc-800/40 rounded-2xl p-4 sm:p-5 shadow-lg transition-all text-left group cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider group-hover:text-emerald-400 transition-colors truncate">
                  HP Masuk Hari Ini
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-emerald-400 transition-colors shrink-0" />
              </div>
              <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
                  {dailyUnitStats.todayUnitsCount} Unit
                </h3>
                {dailyUnitStats.diffUnits > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <TrendingUp className="w-3 h-3" />
                    +{dailyUnitStats.diffUnits} dari kemarin
                  </span>
                )}
                {dailyUnitStats.diffUnits < 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    <TrendingDown className="w-3 h-3" />
                    {dailyUnitStats.diffUnits} dari kemarin
                  </span>
                )}
                {dailyUnitStats.diffUnits === 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                    <Minus className="w-3 h-3" />
                    Sama spt kemarin
                  </span>
                )}
              </div>
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-zinc-950 text-emerald-400 flex items-center justify-center border border-zinc-800 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10 transition-colors shrink-0">
              <Smartphone className="w-5 h-5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/80 pt-2.5 group-hover:text-emerald-400 font-medium">
            <span className="group-hover:text-zinc-300">Antrean Servis Berjalan</span>
            <span className="font-bold flex items-center gap-0.5">
              Buka <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </button>

        {/* Metric 2: Total Kas Masuk (Hari Ini) */}
        <button
          onClick={onNavigateAccounting}
          className="bg-zinc-900 border border-zinc-800/80 hover:border-emerald-500/60 hover:bg-zinc-800/40 rounded-2xl p-4 sm:p-5 shadow-lg transition-all text-left group cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider group-hover:text-emerald-400 transition-colors truncate">
                  Total Kas Masuk (Hari Ini)
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-emerald-400 transition-colors shrink-0" />
              </div>
              <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
                  {formatRupiah(dailyFinanceStats.todayIncome)}
                </h3>
                {dailyFinanceStats.diffIncome > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <TrendingUp className="w-3 h-3" />
                    +{formatRupiah(dailyFinanceStats.diffIncome)} dari kemarin
                  </span>
                )}
                {dailyFinanceStats.diffIncome < 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    <TrendingDown className="w-3 h-3" />
                    -{formatRupiah(Math.abs(dailyFinanceStats.diffIncome))} dari kemarin
                  </span>
                )}
                {dailyFinanceStats.diffIncome === 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                    <Minus className="w-3 h-3" />
                    Sama spt kemarin
                  </span>
                )}
              </div>
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-zinc-950 text-emerald-400 flex items-center justify-center border border-zinc-800 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10 transition-colors shrink-0">
              <Wallet className="w-5 h-5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/80 pt-2.5 group-hover:text-emerald-400 font-medium">
            <span className="group-hover:text-zinc-300">Buku Kas & Uang Masuk</span>
            <span className="font-bold flex items-center gap-0.5">
              Buka <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </button>

        {/* Metric 3: Keuntungan Bersih (Hari Ini) */}
        <button
          onClick={onNavigateAccounting}
          className="bg-zinc-900 border-2 border-emerald-500/80 hover:border-emerald-400 hover:bg-emerald-950/20 rounded-2xl p-4 sm:p-5 shadow-xl shadow-emerald-500/5 transition-all text-left group cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1 truncate">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" /> Keuntungan Bersih (Hari Ini)
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </div>
              <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                  {formatRupiah(dailyFinanceStats.todayProfit)}
                </h3>
                {dailyFinanceStats.diffProfit > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <TrendingUp className="w-3 h-3" />
                    +{formatRupiah(dailyFinanceStats.diffProfit)} dari kemarin
                  </span>
                )}
                {dailyFinanceStats.diffProfit < 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    <TrendingDown className="w-3 h-3" />
                    -{formatRupiah(Math.abs(dailyFinanceStats.diffProfit))} dari kemarin
                  </span>
                )}
                {dailyFinanceStats.diffProfit === 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                    <Minus className="w-3 h-3" />
                    Sama spt kemarin
                  </span>
                )}
              </div>
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-5 sm:h-5 text-emerald-800 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/80 pt-2.5 group-hover:text-emerald-400 font-medium">
            <span className="group-hover:text-zinc-300">Laporan Laba & Margin</span>
            <span className="font-bold text-emerald-400 flex items-center gap-0.5">
              Buka <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </button>
      </div>

      {/* Main Grid: Left side (Antrean Aktif) + Right side (Kas Hari Ini & Log Aktivitas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Antrean Aktif / HP yang sedang diservis (Span 7 or 8) */}
        <div className="lg:col-span-7 xl:col-span-8 bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-base font-bold text-white">Antrean Aktif</h3>
            </div>
            <button
              onClick={onNavigateBoard}
              className="text-xs font-medium text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto -mx-1 sm:mx-0">
            <table className="w-full text-left border-collapse text-xs min-w-[480px]">
              <thead>
                <tr className="border-b border-zinc-800/80 text-zinc-400 text-[11px] font-bold tracking-wider uppercase">
                  <th className="pb-3 px-3 whitespace-nowrap">NOMOR</th>
                  <th className="pb-3 px-3 whitespace-nowrap">PELANGGAN</th>
                  <th className="pb-3 px-3 whitespace-nowrap">PERANGKAT</th>
                  <th className="pb-3 px-3 text-right whitespace-nowrap w-32">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {recentActive.map((s) => {
                  let statusBadge = (
                    <span className="text-[10px] px-2.5 py-1 rounded-lg font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 whitespace-nowrap inline-flex items-center justify-center">
                      Antre
                    </span>
                  );

                  if (s.confirmationStatus === 'MENUNGGU') {
                    statusBadge = (
                      <span className="text-[10px] px-2.5 py-1 rounded-lg font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60 whitespace-nowrap inline-flex items-center justify-center">
                        Menunggu Part
                      </span>
                    );
                  } else if (s.status === 'PROSES') {
                    statusBadge = (
                      <span className="text-[10px] px-2.5 py-1 rounded-lg font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-400 border border-blue-300 dark:border-blue-800/60 whitespace-nowrap inline-flex items-center justify-center">
                        Diuji / Proses
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={s.id}
                      onClick={() => handleNavigateTicket(s.id, s.status)}
                      title={
                        s.status === 'SIAP' || (s.status === 'BATAL' && !s.pickedUpAt)
                          ? 'Klik untuk langsung menuju ke tab Siap Diambil'
                          : 'Klik untuk langsung menuju ke tab Servis Berjalan'
                      }
                      className="hover:bg-zinc-800/60 transition-colors cursor-pointer group"
                    >
                      {/* NOMOR */}
                      <td className="py-4 px-3 align-middle whitespace-nowrap">
                        <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm group-hover:underline">
                          {s.ticketNo}
                        </span>
                      </td>

                      {/* PELANGGAN */}
                      <td className="py-4 px-3 align-middle">
                        <div className="font-bold text-white text-xs sm:text-sm whitespace-nowrap">
                          {s.customerName}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1.5 whitespace-nowrap">
                          <span>{s.customerPhone}</span>
                          {s.customerPhone && s.customerPhone !== 'Tanpa WA' && onDirectWhatsApp && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDirectWhatsApp(s.id);
                              }}
                              title="Chat WA Pelanggan"
                              className="p-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400 transition-colors cursor-pointer"
                            >
                              <WhatsAppSolidIcon className="w-3 h-3 text-emerald-400" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* PERANGKAT */}
                      <td className="py-4 px-3 align-middle">
                        <div className="text-zinc-100 font-medium text-xs sm:text-sm">
                          {s.deviceModel}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1 font-normal">
                          {s.complaints.join(', ') || 'Pengecekan'}
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="py-4 px-3 align-middle text-right whitespace-nowrap">
                        {statusBadge}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {recentActive.length === 0 && (
            <div className="py-12 text-center border-t border-zinc-800/50">
              <p className="text-zinc-500 text-xs mb-3">
                Belum ada antrean servis berjalan saat ini.
              </p>
              <button
                onClick={onOpenServiceModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" /> + Terima Servis Baru
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Kas Hari Ini & Log Aktivitas (Span 5 or 4) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5">
          {/* Card 1: Kas Hari Ini */}
          <div
            onClick={onNavigateAccounting}
            title="Klik untuk membuka Buku Kas Lengkap"
            className="bg-zinc-900 border border-zinc-800/80 hover:border-emerald-500/50 rounded-2xl p-5 shadow-lg transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                Kas Hari Ini
              </h4>
              <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
                Arus Kas
              </span>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-medium">Pemasukan</span>
                <span className="font-mono font-bold text-emerald-400">
                  +{formatRupiahCompact(todayIncome)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-medium">Pengeluaran</span>
                <span className="font-mono font-bold text-zinc-200">
                  -{formatRupiahCompact(todayExpense)}
                </span>
              </div>
            </div>

            <div className="border-t border-zinc-800/80 my-3.5" />

            <div className="flex items-baseline justify-between">
              <span className="text-xs sm:text-sm text-zinc-300 font-medium">
                Saldo Bersih
              </span>
              <span className="text-xl sm:text-2xl font-bold text-white font-mono">
                {formatRupiahCompact(todayNet)}
              </span>
            </div>
          </div>

          {/* Card 2: Log Aktivitas */}
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white">Log Aktivitas</h4>
              <span className="text-[10px] text-zinc-500 font-mono">Real-time</span>
            </div>

            <div className="space-y-3.5">
              {activityLogs.map((log, idx) => {
                const isFirst = idx === 0;

                return (
                  <div
                    key={log.id}
                    onClick={() => handleNavigateTicket(log.ticketId)}
                    title="Klik untuk langsung menuju ke lokasi tiket servis"
                    className="flex items-start gap-3 text-xs group cursor-pointer hover:bg-zinc-800/40 p-1.5 -mx-1.5 rounded-lg transition-colors"
                  >
                    {/* Dot / Indicator */}
                    <div className="pt-1 shrink-0">
                      {isFirst ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-400 flex items-center justify-center bg-emerald-500/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-zinc-600 flex items-center justify-center bg-zinc-950 group-hover:border-zinc-400 transition-colors">
                          <div className="w-1 h-1 rounded-full bg-zinc-600 group-hover:bg-zinc-300" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div
                        className={`font-medium leading-tight ${
                          isFirst ? 'text-white font-bold' : 'text-zinc-200'
                        } group-hover:text-emerald-400 transition-colors`}
                      >
                        {log.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5 font-normal">
                        {log.timestamp} • {log.customerName} • {log.ticketNo}
                      </div>
                    </div>
                  </div>
                );
              })}

              {activityLogs.length === 0 && (
                <p className="text-xs text-zinc-500 py-2 text-center">
                  Belum ada log aktivitas servis tercatat.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
