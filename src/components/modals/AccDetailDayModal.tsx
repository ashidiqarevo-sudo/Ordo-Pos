import React from 'react';
import { LedgerTransaction } from '../../types';
import { formatRupiah } from '../../data/initialData';
import { Calendar, X } from 'lucide-react';

interface AccDetailDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string | null;
  transactions: LedgerTransaction[];
}

export const AccDetailDayModal: React.FC<AccDetailDayModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  transactions,
}) => {
  if (!isOpen || !dateStr) return null;

  const dayTransactions = transactions.filter((t) => t.date === dateStr);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-zinc-900 text-emerald-400 border border-zinc-800">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                Rincian Uang Masuk: {dateStr}
              </h3>
              <p className="text-xs text-zinc-400">
                Ada {dayTransactions.length} transaksi di tanggal ini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto my-4 space-y-2.5 flex-1 text-xs">
          {dayTransactions.map((t, idx) => {
            let tag = 'Kas Masuk';
            let tagClass =
              'bg-emerald-500 text-black border-emerald-500 font-extrabold';

            if (t.type === 'DP_MASUK') {
              tag = 'Uang DP';
              tagClass = 'bg-zinc-800 text-emerald-400 border-zinc-700';
            } else if (t.type === 'UNIT_MASUK_NON_DP') {
              tag = 'Unit Masuk';
              tagClass = 'bg-zinc-800 text-zinc-400 border-zinc-700';
            } else if (t.type === 'PELUNASAN_SELESAI') {
              tag = 'Pelunasan HP';
              tagClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
            } else if (t.type === 'KAS_MASUK_MANUAL') {
              tag = 'Masukan Uang';
              tagClass = 'bg-emerald-500 text-black border-emerald-500 font-bold';
            } else if (t.type === 'KAS_KELUAR_MANUAL') {
              tag = 'Keluarkan Uang';
              tagClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
            } else if (t.type === 'KAS_TRANSFER_MANUAL') {
              tag = 'Pemindahan Uang';
              tagClass = 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold';
            }

            return (
              <div
                key={idx}
                className="p-3.5 bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {t.ticketNo && (
                      <span className="font-mono font-bold text-white text-xs">
                        {t.ticketNo}
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tagClass} border`}
                    >
                      {tag}
                    </span>
                    {t.customerName && (
                      <span className="text-xs font-bold text-white">
                        {t.customerName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 mt-1">
                    {t.deviceModel ? `${t.deviceModel} • ` : ''}
                    <span className="text-zinc-400">{t.notes || t.desc}</span>
                  </p>
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 border-zinc-800 pt-2 sm:pt-0 shrink-0">
                  {t.income > 0 && (
                    <span className="text-xs font-black text-emerald-400 font-mono">
                      + {formatRupiah(t.income)}
                    </span>
                  )}
                  {t.expense > 0 && (
                    <span className="text-xs font-bold text-rose-400 font-mono mt-0.5">
                      - {formatRupiah(t.expense)}
                    </span>
                  )}
                  {t.income === 0 && t.expense === 0 && (
                    <span className="text-xs font-bold text-zinc-500 font-mono">
                      Rp 0
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {dayTransactions.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              Tidak ada catatan transaksi pada tanggal ini.
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
