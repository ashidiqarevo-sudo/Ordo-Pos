import React, { useState, useEffect } from 'react';
import { ServiceItem } from '../../types';
import { formatRupiah } from '../../data/initialData';
import { Handshake, X, Check, XCircle, AlertCircle } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceItem | null;
  defaultWarrantyDays: string;
  onConfirm: (
    ticketId: string,
    actionType: 'DIAMBIL' | 'BATAL',
    paymentMethod: string,
    warrantyDays: number,
    cancelReason: string
  ) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  service,
  defaultWarrantyDays,
  onConfirm,
}) => {
  const [actionType, setActionType] = useState<'DIAMBIL' | 'BATAL'>('DIAMBIL');
  const [paymentMethod, setPaymentMethod] = useState(
    'Tunai (Cash)'
  );
  const [warrantyPreset, setWarrantyPreset] = useState<string>(() => {
    const val = defaultWarrantyDays || '7';
    if (['7', '14', '30', '60', '0'].includes(val)) return val;
    return 'custom';
  });
  const [customWarrantyDays, setCustomWarrantyDays] = useState<string>(
    defaultWarrantyDays && !['7', '14', '30', '60', '0'].includes(defaultWarrantyDays)
      ? defaultWarrantyDays
      : '3'
  );
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (service) {
      if (service.status === 'BATAL') {
        setActionType('BATAL');
        setCancelReason(service.cancelReason || '');
      } else {
        setActionType('DIAMBIL');
        setCancelReason('');
      }
    }
  }, [service]);

  if (!isOpen || !service) return null;

  const isAlreadyBatal = service.status === 'BATAL';
  const totalCost = Number(service.finalCost) || Number(service.estimatedCost) || 0;
  const dp = Number(service.dp) || 0;
  const balance = Math.max(0, totalCost - dp);

  const effectiveWarrantyDays =
    warrantyPreset === 'custom'
      ? parseInt(customWarrantyDays) || 0
      : parseInt(warrantyPreset) || 0;

  const handleConfirm = () => {
    onConfirm(
      service.id,
      actionType,
      paymentMethod,
      effectiveWarrantyDays,
      cancelReason.trim()
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isAlreadyBatal
                  ? 'bg-rose-500 text-black shadow-md shadow-rose-500/20'
                  : 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
              }`}
            >
              {isAlreadyBatal ? (
                <XCircle className="w-5 h-5 text-black" />
              ) : (
                <Handshake className="w-5 h-5 text-black" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                {isAlreadyBatal ? 'Serah Terima HP (Batal Servis)' : 'Ambil HP & Pelunasan'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {isAlreadyBatal
                  ? 'Konfirmasi pengembalian unit HP ke pemilik'
                  : 'Proses serah terima unit jadi ke pelanggan'}
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

        <div className="my-4 space-y-3 text-xs">
          <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-400">No. Nota:</span>
              <span className="font-mono font-bold text-white">
                {service.ticketNo}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Unit HP:</span>
              <span className="font-bold text-white">{service.deviceModel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Pelanggan:</span>
              <span className="text-zinc-300 font-semibold">
                {service.customerName}
              </span>
            </div>
          </div>

          {isAlreadyBatal && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Status: Servis Dibatalkan</span>
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                HP ini batal perbaikan. Setelah diserahkan ke pelanggan, unit akan otomatis pindah dari <b>Siap Diambil</b> ke <b>Riwayat Servis</b>.
              </p>
            </div>
          )}

          {!isAlreadyBatal ? (
            <div className="space-y-3 pt-1">
              <div className="p-3.5 bg-zinc-900 rounded-xl border border-zinc-800 space-y-1">
                <div className="flex justify-between text-zinc-400">
                  <span>Harga Total:</span>
                  <span className="text-white font-bold">
                    {formatRupiah(totalCost)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>DP Masuk:</span>
                  <span className="text-zinc-300 font-bold">
                    - {formatRupiah(dp)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-1.5 font-bold text-sm">
                  <span className="text-white">Sisa Bayar:</span>
                  <span className="text-emerald-400 font-mono font-black text-base">
                    {formatRupiah(balance)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Metode Bayar:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-bold focus:bg-black focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="Tunai (Cash)">Tunai (Cash)</option>
                  <option value="Transfer Bank (BCA / Mandiri / BRI / BNI)">
                    Transfer Bank
                  </option>
                  <option value="QRIS / E-Wallet (Dana / Gopay / Ovo / ShopeePay)">
                    QRIS / E-Wallet
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Masa Garansi Toko:
                </label>
                <select
                  value={warrantyPreset}
                  onChange={(e) => setWarrantyPreset(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-bold focus:bg-black focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="7">7 Hari (Standar)</option>
                  <option value="14">14 Hari (2 Minggu)</option>
                  <option value="30">30 Hari (1 Bulan)</option>
                  <option value="60">60 Hari (2 Bulan)</option>
                  <option value="0">Non-Garansi</option>
                  <option value="custom">⚙️ Custom (Tulis Hari Sendiri)</option>
                </select>

                {warrantyPreset === 'custom' && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={customWarrantyDays}
                      onChange={(e) => setCustomWarrantyDays(e.target.value)}
                      placeholder="Jumlah hari"
                      className="w-32 bg-zinc-900 border border-emerald-500 rounded-xl px-3 py-1.5 text-white font-bold focus:outline-none"
                    />
                    <span className="text-zinc-400 font-medium text-xs">
                      Hari garansi kustom
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {dp > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex justify-between items-center">
                  <span>DP yang dikembalikan ke pelanggan:</span>
                  <span className="font-bold font-mono">{formatRupiah(dp)}</span>
                </div>
              )}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Alasan Pembatalan:
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Contoh: Biaya sparepart tidak disepakati / Dibatalkan pelanggan"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:bg-black focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-colors cursor-pointer"
          >
            Kembali
          </button>
          <button
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all ${
              isAlreadyBatal
                ? 'bg-rose-500 hover:bg-rose-400 text-black shadow-rose-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
            }`}
          >
            <Check className="w-4 h-4 text-black" />
            <span>{isAlreadyBatal ? 'Konfirmasi HP Sudah Diambil' : 'Simpan & Serahkan HP'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
