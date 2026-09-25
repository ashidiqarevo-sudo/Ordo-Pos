import React from 'react';
import { CustomerAggregated } from '../../types';
import { formatRupiah } from '../../data/initialData';
import { History, X } from 'lucide-react';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerAggregated | null;
  onViewDetail: (ticketId: string) => void;
}

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  isOpen,
  onClose,
  customer,
  onViewDetail,
}) => {
  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Riwayat: {customer.customerName}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Kontak: {customer.customerPhone} • Total {customer.tickets.length} Unit HP
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

        <div className="overflow-y-auto my-4 space-y-3 flex-1 text-xs">
          {customer.tickets.map((t) => {
            let badgeClass = 'bg-zinc-800 text-zinc-300 border border-zinc-700';
            let badgeLabel = 'SERVIS BERJALAN';

            if (t.status === 'DIAMBIL') {
              badgeClass =
                'bg-emerald-500 text-black border border-emerald-500 font-bold';
              badgeLabel = 'SUDAH DIAMBIL';
            } else if (t.status === 'SIAP') {
              badgeClass =
                'bg-amber-400 text-black border border-amber-400 font-bold';
              badgeLabel = 'SIAP DIAMBIL';
            } else if (t.status === 'PROSES') {
              badgeClass =
                'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-400 border border-blue-400/80 dark:border-blue-700/60 font-bold';
              badgeLabel = 'SEDANG DIPROSES';
            } else if (t.status === 'BATAL') {
              badgeClass = 'bg-zinc-800 text-zinc-400 border border-zinc-700';
              badgeLabel = 'BATAL';
            }

            return (
              <div
                key={t.id}
                className="p-3.5 bg-zinc-900 rounded-lg border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-xs">
                      {t.ticketNo}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${badgeClass}`}
                    >
                      {badgeLabel}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {t.createdAt}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    {t.deviceModel}
                  </h4>
                  <p className="text-xs text-zinc-300">
                    Kerusakan:{' '}
                    <span className="font-semibold text-emerald-400">
                      {t.complaints.join(', ')}
                    </span>
                  </p>
                </div>
                <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 border-zinc-800 pt-2 sm:pt-0">
                  <span className="text-xs font-bold text-emerald-400">
                    {formatRupiah(t.finalCost || t.estimatedCost)}
                  </span>
                  <button
                    onClick={() => {
                      onClose();
                      onViewDetail(t.id);
                    }}
                    className="text-xs text-emerald-400 hover:underline font-bold mt-1 cursor-pointer"
                  >
                    Buka Nota
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
