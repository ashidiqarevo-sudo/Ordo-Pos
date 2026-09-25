import React, { useRef } from 'react';
import { ServiceItem } from '../types';
import { formatRupiah } from '../data/initialData';
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface ReadyViewProps {
  services: ServiceItem[];
  searchQuery: string;
  onOpenCheckoutModal: (ticketId: string) => void;
  onOpenEditUnitModal: (ticketId: string) => void;
  onViewDetail?: (ticketId: string) => void;
  onInstantPrint?: (ticketId: string) => void;
  onDirectWhatsApp: (ticketId: string) => void;
}

export const ReadyView: React.FC<ReadyViewProps> = ({
  services,
  searchQuery,
  onOpenCheckoutModal,
  onOpenEditUnitModal,
  onViewDetail,
  onInstantPrint,
  onDirectWhatsApp,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (offset: number) => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const filtered = services.filter((s) => {
    // Siap Diambil mencakup: unit yang sudah selesai diservis (SIAP) ATAU unit yang dibatalkan dan belum diambil kembali (BATAL tanpa pickedUpAt)
    const isReady = s.status === 'SIAP' || (s.status === 'BATAL' && !s.pickedUpAt);
    if (!isReady) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.ticketNo.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      s.deviceModel.toLowerCase().includes(q) ||
      s.customerPhone.includes(q)
    );
  });

  return (
    <section className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-bold text-white">HP Siap Diambil</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
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
            <span className="text-xs font-bold px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800/60 text-amber-800 dark:text-amber-400">
              {filtered.length} Unit Siap Diambil
            </span>
          </div>
        </div>

        {/* Mobile Card List View (< 640px) */}
        <div className="sm:hidden divide-y divide-zinc-800/60">
          {filtered.map((s) => {
            const isBatal = s.status === 'BATAL';
            const sisa = isBatal
              ? 0
              : Math.max(0, (s.finalCost || s.estimatedCost) - s.dp);

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
                      Masuk: {s.createdAt}
                    </div>
                  </div>
                  {isBatal ? (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-lg font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 inline-flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-rose-400" />
                      DIBATALKAN
                    </span>
                  ) : (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-lg font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-amber-800 dark:text-amber-400" />
                      SIAP DIAMBIL
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 bg-zinc-900/60 dark:bg-black/40 p-3 rounded-xl border border-zinc-800/60">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{s.customerName}</span>
                      <button
                        onClick={() => onOpenEditUnitModal(s.id)}
                        title="Edit Data HP / Pemilik"
                        className="text-zinc-400 hover:text-white p-0.5 rounded-md hover:bg-zinc-800"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                    {s.customerPhone && s.customerPhone !== 'Tanpa WA' ? (
                      <button
                        onClick={() => onDirectWhatsApp(s.id)}
                        title="Hubungi via WhatsApp"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-[11px] font-semibold"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WA</span>
                      </button>
                    ) : (
                      <span className="text-zinc-500 text-[10px]">Tanpa WA</span>
                    )}
                  </div>

                  <div className="font-bold text-xs text-zinc-100 flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span>{s.deviceModel}</span>
                    {s.screenLock && s.screenLock !== '-' && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 text-emerald-400 font-mono rounded font-bold border border-zinc-700">
                        {s.screenLock}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-300">
                    {s.complaints.join(', ')}
                  </div>

                  {isBatal && (
                    <div className="mt-1.5 p-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-[11px] leading-relaxed font-medium">
                      <span className="font-bold text-rose-800 dark:text-rose-300">Alasan Batal: </span>
                      <span className="text-black dark:text-rose-200">{s.cancelReason || 'Dibatalkan'}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    {isBatal ? (
                      <div className="text-xs font-bold text-rose-400">
                        Servis Dibatalkan
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs font-black text-emerald-400">
                          Sisa: {formatRupiah(sisa)}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Total: {formatRupiah(s.finalCost || s.estimatedCost)}
                        </div>
                      </div>
                    )}
                  </div>

                  {isBatal ? (
                    <button
                      onClick={() => onOpenCheckoutModal(s.id)}
                      className="px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-bold text-xs shadow-md shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Serahkan HP</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onOpenCheckoutModal(s.id)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200/90 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/90 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 font-extrabold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                      <span>Ambil HP</span>
                    </button>
                  )}
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
          <table className="w-full text-left border-collapse text-xs min-w-[800px]">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-950/80 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="py-4 px-4 whitespace-nowrap min-w-[130px]">No. Nota & Status</th>
                <th className="py-4 px-4 whitespace-nowrap min-w-[150px]">Pelanggan & Kontak</th>
                <th className="py-4 px-4 min-w-[180px]">Unit HP & Kerusakan</th>
                <th className="py-4 px-4 whitespace-nowrap min-w-[140px]">Biaya & Sisa Tagihan</th>
                <th className="py-4 px-4 text-right whitespace-nowrap min-w-[140px]">Aksi Penyerahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.map((s) => {
                const isBatal = s.status === 'BATAL';
                const sisa = isBatal
                  ? 0
                  : Math.max(0, (s.finalCost || s.estimatedCost) - s.dp);

                return (
                  <tr
                    key={s.id}
                    className={`hover:bg-zinc-800/30 transition-colors group ${
                      isBatal
                        ? 'bg-rose-500/10 dark:bg-rose-950/20'
                        : 'bg-emerald-500/10 dark:bg-emerald-950/20'
                    }`}
                  >
                    <td className="py-4 px-4 align-top whitespace-nowrap">
                      <div className="font-mono font-bold text-white text-xs mb-1">
                        {s.ticketNo}
                      </div>
                      {isBatal ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 inline-flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          DIBATALKAN
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-amber-800 dark:text-amber-400" />
                          SIAP DIAMBIL
                        </span>
                      )}
                      <div className="text-[10px] text-zinc-500 mt-1.5 font-medium">
                        {s.createdAt}
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs">
                          {s.customerName}
                        </span>
                        <button
                          onClick={() => onOpenEditUnitModal(s.id)}
                          title="Edit Data HP / Pemilik"
                          className="text-zinc-500 hover:text-white p-0.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-xs text-zinc-400 font-mono mt-0.5">
                        {s.customerPhone}
                      </div>
                      <div>
                        {s.customerPhone && s.customerPhone !== 'Tanpa WA' ? (
                          <button
                            onClick={() => onDirectWhatsApp(s.id)}
                            title="Hubungi via WhatsApp"
                            className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-emerald-400 border border-zinc-700/80 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Chat WA</span>
                          </button>
                        ) : (
                          <span className="mt-1 inline-block text-[11px] text-zinc-500 italic">
                            Tanpa WA
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top max-w-xs">
                      <div className="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
                        <span>{s.deviceModel}</span>
                        {s.screenLock && s.screenLock !== '-' && (
                          <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-emerald-400 font-mono rounded-lg font-bold border border-zinc-700">
                            {s.screenLock}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-300 mt-1 leading-relaxed">
                        {s.complaints.join(', ')}
                      </div>
                      {s.notes && s.notes !== '-' && (
                        <div className="text-[11px] text-zinc-500 mt-1 italic">
                          {s.notes}
                        </div>
                      )}
                      {isBatal && (
                        <div className="mt-1.5 p-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-[11px] leading-relaxed font-medium">
                          <div className="flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-rose-800 dark:text-rose-300">Alasan Batal: </span>
                              <span className="text-black dark:text-rose-200">{s.cancelReason || 'Dibatalkan oleh pelanggan/teknisi'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 align-top whitespace-nowrap">
                      {isBatal ? (
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-rose-400">
                            Servis Dibatalkan
                          </div>
                          {s.dp > 0 && (
                            <div className="text-[11px] text-amber-400 font-medium">
                              DP Masuk: {formatRupiah(s.dp)}
                            </div>
                          )}
                          <div className="text-[11px] text-zinc-400">
                            Tagihan: Rp 0
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs font-semibold text-zinc-300">
                            Total: {formatRupiah(s.finalCost || s.estimatedCost)}
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            DP: {formatRupiah(s.dp || 0)}
                          </div>
                          <div className="text-xs font-bold text-emerald-400 mt-1">
                            Sisa: {formatRupiah(sisa)}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end">
                        {isBatal ? (
                          <button
                            onClick={() => onOpenCheckoutModal(s.id)}
                            title="Serahkan kembali HP yang dibatalkan ke pemilik"
                            className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-black font-bold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Serahkan HP</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onOpenCheckoutModal(s.id)}
                            title="Pelunasan dan serahkan HP ke pelanggan"
                            className="px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200/90 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/90 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                            <span>Ambil HP</span>
                          </button>
                        )}
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
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <CheckSquare className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-zinc-300">
              Belum Ada HP Siap Diambil
            </h4>
            <p className="text-xs text-zinc-500 mt-1 mb-4">
              HP yang sudah selesai diservis atau dibatalkan akan menunggu diambil di sini.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
