import React, { useState, useEffect } from 'react';
import { ServiceItem } from '../../types';
import { formatRupiah, formatNumberWithDots, parseNumberFromDots } from '../../data/initialData';
import { CheckCircle2, XCircle, X, MessageSquare, AlertCircle, Check } from 'lucide-react';

interface ReadyModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceItem | null;
  onSubmit: (
    ticketId: string,
    data: {
      actionType: 'JADI' | 'BATAL';
      finalCost: number;
      sparepartCost: number;
      cancelReason?: string;
    }
  ) => void;
}

export const ReadyModal: React.FC<ReadyModalProps> = ({
  isOpen,
  onClose,
  service,
  onSubmit,
}) => {
  const [actionType, setActionType] = useState<'JADI' | 'BATAL'>('JADI');
  const [finalCost, setFinalCost] = useState<string>('');
  const [sparepartCost, setSparepartCost] = useState<string>('');
  const [cancelReason, setCancelReason] = useState<string>('');

  useEffect(() => {
    if (service) {
      setActionType('JADI');
      setFinalCost((service.finalCost || service.estimatedCost || '').toString());
      setSparepartCost((service.sparepartCost || '').toString());
      setCancelReason(service.cancelReason || '');
    }
  }, [service]);

  if (!isOpen || !service) return null;

  const finalCostNum = parseNumberFromDots(finalCost);
  const sparepartCostNum = parseNumberFromDots(sparepartCost);
  const dpNum = Number(service.dp) || 0;
  const balance = Math.max(0, finalCostNum - dpNum);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (actionType === 'JADI') {
      onSubmit(service.id, {
        actionType: 'JADI',
        finalCost: finalCostNum,
        sparepartCost: sparepartCostNum,
      });
    } else {
      onSubmit(service.id, {
        actionType: 'BATAL',
        finalCost: 0,
        sparepartCost: 0,
        cancelReason: cancelReason.trim() || 'Dibatalkan oleh teknisi/pelanggan',
      });
    }
  };

  const quickCancelReasons = [
    'Sparepart kosong / langka',
    'Pelanggan tolak biaya estimasi',
    'Mati total / jalur mesin rusak parah',
    'Dibatalkan oleh pelanggan',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                actionType === 'JADI'
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                  : 'bg-rose-500 text-black shadow-md shadow-rose-500/20'
              }`}
            >
              {actionType === 'JADI' ? (
                <CheckCircle2 className="w-5 h-5 text-black" />
              ) : (
                <XCircle className="w-5 h-5 text-black" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                {actionType === 'JADI' ? 'Penyelesaian Servis (Sudah Jadi)' : 'Pembatalan Servis (Batal)'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {actionType === 'JADI'
                  ? 'Kunci biaya akhir & siapkan unit untuk diambil'
                  : 'Catat pembatalan & alihkan ke tab Siap Diambil'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Type Selector: JADI vs BATAL */}
        <div className="mt-4 p-1 bg-zinc-900 rounded-2xl grid grid-cols-2 gap-1 border border-zinc-800">
          <button
            type="button"
            onClick={() => setActionType('JADI')}
            className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              actionType === 'JADI'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Unit Jadi (Selesai)</span>
          </button>

          <button
            type="button"
            onClick={() => setActionType('BATAL')}
            className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              actionType === 'BATAL'
                ? 'bg-rose-500 text-black shadow-md shadow-rose-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span>Batal Servis</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          {/* Unit & Customer Info */}
          <div className="p-3.5 bg-zinc-900/90 rounded-2xl border border-zinc-800 space-y-1.5">
            <div className="flex justify-between text-zinc-400 text-xs">
              <span>No. Nota:</span>
              <span className="font-mono font-bold text-white">
                {service.ticketNo}
              </span>
            </div>
            <div className="flex justify-between text-zinc-400 text-xs">
              <span>Pelanggan & HP:</span>
              <span className="font-bold text-white text-right">
                {service.customerName} - {service.deviceModel}
              </span>
            </div>
            {dpNum > 0 && (
              <div className="flex justify-between text-zinc-400 text-xs">
                <span>DP Masuk:</span>
                <span className="text-emerald-400 font-bold font-mono">
                  {formatRupiah(dpNum)}
                </span>
              </div>
            )}
          </div>

          {actionType === 'JADI' ? (
            /* ================= MODE: JADI ================= */
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Total Biaya Servis (Rp) <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={formatNumberWithDots(finalCost)}
                  onChange={(e) => setFinalCost(e.target.value)}
                  placeholder="0"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-black text-sm focus:bg-black focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Modal Sparepart (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumberWithDots(sparepartCost)}
                  onChange={(e) => setSparepartCost(e.target.value)}
                  placeholder="0"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-300 font-bold focus:bg-black focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400 block text-[11px]">Sisa Tagihan:</span>
                  <span className="text-white font-black font-mono text-sm">
                    {formatRupiah(balance)}
                  </span>
                </div>
                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400 block text-[11px]">Keuntungan Servis:</span>
                  <span className="text-emerald-400 font-black font-mono text-sm">
                    {formatRupiah(finalCostNum - (parseFloat(sparepartCost) || 0))}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* ================= MODE: BATAL ================= */
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Informasi Pembatalan Servis</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  Unit HP akan dipindahkan ke tab <b>Siap Diambil</b> agar bisa diserahkan kembali ke pemilik. Biaya servis menjadi Rp 0.
                </p>
              </div>

              <div>
                <label className="block text-zinc-200 font-bold mb-1.5">
                  Alasan Pembatalan / Tidak Selesai: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required={actionType === 'BATAL'}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Contoh: Sparepart kosong / Pelanggan batalkan"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs focus:bg-black focus:border-rose-500 focus:outline-none"
                />

                {/* Quick Suggestion Pills */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {quickCancelReasons.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setCancelReason(reason)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors cursor-pointer"
                    >
                      + {reason}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold transition-colors cursor-pointer"
            >
              Tutup
            </button>

            {actionType === 'JADI' ? (
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-emerald-100 hover:bg-emerald-200/90 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/90 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 font-black flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <MessageSquare className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                <span>Simpan & Kirim WA</span>
              </button>
            ) : (
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-black flex items-center gap-1.5 shadow-lg shadow-rose-500/20 cursor-pointer active:scale-95 transition-all"
              >
                <Check className="w-4 h-4 text-black" />
                <span>Simpan Batal (Siap Diambil)</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
