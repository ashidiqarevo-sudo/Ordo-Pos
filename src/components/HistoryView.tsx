import React, { useRef, useState } from 'react';
import { ServiceItem, HistoryFilterType } from '../types';
import { formatRupiah } from '../data/initialData';
import { Archive, ChevronLeft, ChevronRight, Inbox, Eye, Search, X } from 'lucide-react';

interface HistoryViewProps {
  services: ServiceItem[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  historyFilter: HistoryFilterType;
  onSetHistoryFilter: (filter: HistoryFilterType) => void;
  onViewDetail: (ticketId: string) => void;
  onReopenTicket?: (ticketId: string) => void;
}

export function getWarrantyInfo(ticket: ServiceItem) {
  if (ticket.status !== 'DIAMBIL' || !ticket.pickedUpAt) {
    return {
      status: 'BELUM_DIAMBIL',
      label: 'Belum Diambil',
      color: 'bg-zinc-800 text-zinc-400',
      remainingDays: 0,
    };
  }

  const pickupDate = new Date(ticket.pickedUpAt.replace(' ', 'T'));
  const today = new Date();
  const elapsedDays = Math.floor(
    (today.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const totalWarranty = Number(ticket.warrantyDays) || 0;
  const remainingDays = totalWarranty - elapsedDays;

  if (totalWarranty === 0) {
    return {
      status: 'NON_GARANSI',
      label: 'Non-Garansi',
      color: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
      remainingDays: 0,
    };
  }

  if (remainingDays >= 0) {
    return {
      status: 'AKTIF',
      label: `Garansi (${remainingDays} Hari)`,
      color: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60 font-bold',
      remainingDays,
    };
  } else {
    return {
      status: 'EXPIRED',
      label: `Garansi Habis`,
      color: 'bg-zinc-800 text-zinc-500 border border-zinc-700',
      remainingDays,
    };
  }
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  services,
  searchQuery = '',
  onSearchChange,
  historyFilter,
  onSetHistoryFilter,
  onViewDetail,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const effectiveQuery = onSearchChange ? searchQuery : localQuery;

  const handleQueryChange = (val: string) => {
    setLocalQuery(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  const scroll = (offset: number) => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const filtered = services.filter((s) => {
    // Riwayat Servis hanya mencakup yang sudah diambil oleh pelanggan (DIAMBIL atau BATAL dengan pickedUpAt)
    const isHist = s.status === 'DIAMBIL' || (s.status === 'BATAL' && !!s.pickedUpAt);
    if (!isHist) return false;

    const w = getWarrantyInfo(s);

    if (historyFilter === 'DIAMBIL') {
      if (s.status !== 'DIAMBIL') return false;
    } else if (historyFilter === 'GARANSI_AKTIF') {
      if (s.status !== 'DIAMBIL' || w.status !== 'AKTIF') return false;
    } else if (historyFilter === 'BATAL') {
      if (s.status !== 'BATAL') return false;
    }

    if (!effectiveQuery.trim()) return true;
    const q = effectiveQuery.toLowerCase();
    return (
      s.ticketNo.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      s.deviceModel.toLowerCase().includes(q) ||
      s.customerPhone.includes(q) ||
      s.complaints.some((c) => c.toLowerCase().includes(q)) ||
      (s.diagnosis && s.diagnosis.toLowerCase().includes(q)) ||
      (s.notes && s.notes.toLowerCase().includes(q))
    );
  });

  return (
    <section className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-lg">
        {/* Header & Search Bar Toolbar */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex flex-col gap-3.5 bg-zinc-950/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-black text-white">
                Riwayat Servis Selesai
              </span>
              <span className="ml-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                {filtered.length} Data
              </span>
            </div>

            {/* Filter Tabs & Scroll buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 overflow-x-auto">
                {(
                  [
                    { id: 'SEMUA', label: 'Semua' },
                    { id: 'DIAMBIL', label: 'Sudah Diambil' },
                    { id: 'GARANSI_AKTIF', label: 'Masih Garansi' },
                    { id: 'BATAL', label: 'Batal' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => onSetHistoryFilter(tab.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      historyFilter === tab.id
                        ? 'bg-emerald-500 text-black shadow-sm'
                        : 'text-zinc-400 hover:text-white font-semibold'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 shrink-0">
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

          {/* Dedicated In-Table Search Input */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={effectiveQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Cari nota (OR-26-...), nama pelanggan, no. WhatsApp, tipe HP, atau kerusakan..."
              className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition-all shadow-inner"
            />
            {effectiveQuery && (
              <button
                onClick={() => handleQueryChange('')}
                title="Hapus Pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Card List View (< 640px) */}
        <div className="sm:hidden divide-y divide-zinc-800/60">
          {filtered.map((s) => {
            const isBatal = s.status === 'BATAL';
            const w = getWarrantyInfo(s);

            return (
              <div
                key={s.id}
                className={`p-4 transition-colors space-y-3 ${
                  isBatal
                    ? 'bg-rose-500/5 dark:bg-rose-950/15'
                    : 'bg-emerald-500/5 dark:bg-emerald-950/15'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-white text-xs">
                      {s.ticketNo}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5 font-medium">
                      Diambil: {s.pickedUpAt || '-'}
                    </div>
                  </div>
                  {isBatal ? (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-zinc-800 text-rose-400 border border-zinc-700">
                      BATAL
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${w.color}`}
                    >
                      {w.label}
                    </span>
                  )}
                </div>

                <div className="space-y-1 bg-zinc-900/60 dark:bg-black/40 p-2.5 rounded-xl border border-zinc-800/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{s.customerName}</span>
                    <span className="text-zinc-400 font-mono text-[11px]">{s.customerPhone}</span>
                  </div>
                  <div className="font-black text-xs text-zinc-100 pt-0.5">
                    {s.deviceModel}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {s.complaints.join(', ')}
                  </div>
                  {isBatal && (
                    <div className="text-[11px] font-medium italic mt-1 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg">
                      <span className="font-bold text-rose-800 dark:text-rose-300">Alasan Batal: </span>
                      <span className="text-black dark:text-rose-200 not-italic">{s.cancelReason || 'Dibatalkan'}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="text-xs font-black text-emerald-400">
                      {formatRupiah(s.finalCost || s.estimatedCost)}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-medium">
                      {s.paymentMethod || 'Tunai'}
                    </div>
                  </div>

                  <button
                    onClick={() => onViewDetail(s.id)}
                    title="Lihat Detail Nota"
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors border border-zinc-700 cursor-pointer inline-flex items-center gap-1.5 active:scale-95 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Lihat Nota</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tablet / Desktop Table View (>= 640px) */}
        <div
          ref={containerRef}
          className="hidden sm:block overflow-x-auto scroll-smooth"
        >
          <table className="w-full text-left border-collapse text-xs min-w-[850px]">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">No. Nota & Diambil</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[150px]">Pelanggan & Kontak</th>
                <th className="py-3.5 px-4 min-w-[180px]">Unit HP & Kerusakan</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[140px]">Total Biaya & Pembayaran</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[110px]">Garansi</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[110px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filtered.map((s) => {
                const isBatal = s.status === 'BATAL';
                const w = getWarrantyInfo(s);

                return (
                  <tr
                    key={s.id}
                    className={`hover:bg-zinc-800/40 transition-colors group ${
                      isBatal
                        ? 'bg-rose-500/10 dark:bg-rose-950/20'
                        : 'bg-emerald-500/10 dark:bg-emerald-950/20'
                    }`}
                  >
                    <td className="py-3.5 px-4 align-top whitespace-nowrap">
                      <div className="font-mono font-bold text-white text-xs">
                        {s.ticketNo}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Diambil: {s.pickedUpAt || '-'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top whitespace-nowrap">
                      <div className="font-bold text-white text-xs">
                        {s.customerName}
                      </div>
                      <div className="text-xs text-zinc-400 font-mono mt-0.5">
                        {s.customerPhone}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top max-w-xs">
                      <div className="font-black text-white text-xs">
                        {s.deviceModel}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                        {s.complaints.join(', ')}
                      </div>
                      {isBatal && (
                        <div className="text-[11px] font-medium italic mt-1 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg">
                          <span className="font-bold text-rose-800 dark:text-rose-300">Alasan Batal: </span>
                          <span className="text-black dark:text-rose-200 not-italic">{s.cancelReason || 'Dibatalkan'}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-top whitespace-nowrap">
                      <div className="text-xs font-black text-emerald-400">
                        {formatRupiah(s.finalCost || s.estimatedCost)}
                      </div>
                      <div className="text-[11px] text-zinc-300 font-bold mt-0.5">
                        {s.paymentMethod || 'Tunai'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top text-center whitespace-nowrap">
                      {isBatal ? (
                        <span className="text-xs px-3 py-1 rounded-full font-bold bg-zinc-800 text-rose-400 border border-zinc-700">
                          BATAL
                        </span>
                      ) : (
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-bold ${w.color}`}
                        >
                          {w.label}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewDetail(s.id)}
                          title="Lihat Detail Nota"
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors border border-zinc-700 cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Lihat Nota</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
              <Inbox className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-zinc-300">Belum Ada Riwayat</h4>
            <p className="text-xs text-zinc-500 mt-1">
              HP yang sudah diambil atau batal servis dan diserahkan ke pelanggan akan masuk ke sini.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
