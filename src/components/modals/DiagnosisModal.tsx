import React, { useState, useEffect } from 'react';
import { ServiceItem, StoreSettings } from '../../types';
import { formatRupiah, formatNumberWithDots, parseNumberFromDots } from '../../data/initialData';
import {
  Stethoscope,
  X,
  MessageCircle,
  Copy,
  Check,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface DiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceItem | null;
  storeSettings: StoreSettings;
  onSubmit: (
    ticketId: string,
    data: {
      diagnosis: string;
      newEstimatedCost: number;
      confirmationStatus: 'MENUNGGU' | 'DISETUJUI' | 'TIDAK_PERLU';
    }
  ) => void;
}

export const DiagnosisModal: React.FC<DiagnosisModalProps> = ({
  isOpen,
  onClose,
  service,
  storeSettings,
  onSubmit,
}) => {
  const [diagnosis, setDiagnosis] = useState('');
  const [estimatedCostInput, setEstimatedCostInput] = useState<string>('');
  const [confirmationStatus, setConfirmationStatus] = useState<
    'MENUNGGU' | 'DISETUJUI' | 'TIDAK_PERLU'
  >('MENUNGGU');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (service) {
      setDiagnosis(service.diagnosis || '');
      setEstimatedCostInput(String(service.estimatedCost || ''));
      setConfirmationStatus(
        service.confirmationStatus === 'DISETUJUI' || service.confirmationStatus === 'TIDAK_PERLU'
          ? service.confirmationStatus
          : 'MENUNGGU'
      );
    }
  }, [service]);

  if (!isOpen || !service) return null;

  const initialEstimate = service.initialEstimatedCost ?? service.estimatedCost ?? 0;
  const currentEstimate = parseNumberFromDots(estimatedCostInput);
  const dp = service.dp || 0;
  const balance = Math.max(0, currentEstimate - dp);
  const costDiff = currentEstimate - initialEstimate;

  // Generate WA text
  const template =
    storeSettings.waDiagnosisMsg ||
    'Halo Kak *{nama}*,\n\nUpdate dari *{toko}* mengenai pengecekan HP *{unit}* (Nota: *{nota}*):\n\n🛠️ *Hasil Diagnosis:*\n{diagnosis}\n\n💰 *Estimasi Biaya:* {biaya}\n• DP Masuk: {dp}\n• Estimasi Sisa: {sisa}\n\nApakah disetujui untuk kami lanjut kerjakan? Balas pesan ini ya Kak. Terima kasih! 🙏';

  const waText = template
    .replace(/{nama}/g, service.customerName)
    .replace(/{toko}/g, storeSettings.storeName || 'ORDO SERVIS HP')
    .replace(/{unit}/g, service.deviceModel)
    .replace(/{nota}/g, service.ticketNo)
    .replace(/{diagnosis}/g, diagnosis || '(Menunggu pemeriksaan lanjutan)')
    .replace(/{biaya}/g, formatRupiah(currentEstimate))
    .replace(/{dp}/g, formatRupiah(dp))
    .replace(/{sisa}/g, formatRupiah(balance));

  const handleCopyWA = () => {
    navigator.clipboard.writeText(waText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWA = () => {
    if (!service.customerPhone || service.customerPhone === 'Tanpa WA') {
      alert('Pelanggan tidak memiliki nomor WhatsApp.');
      return;
    }
    let p = service.customerPhone.replace(/[^0-9]/g, '');
    if (p.startsWith('0')) p = '62' + p.substring(1);
    const url = `https://wa.me/${p}?text=${encodeURIComponent(waText)}`;
    window.open(url, '_blank');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(service.id, {
      diagnosis: diagnosis.trim(),
      newEstimatedCost: currentEstimate,
      confirmationStatus,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Konfirmasi Diagnosis & Estimasi</span>
                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-800 text-emerald-400 font-mono border border-zinc-700">
                  {service.ticketNo}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Pengecekan teknisi, update estimasi biaya terbaru & konfirmasi ke customer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1 text-xs">
          {/* Unit & Customer Card */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                Unit HP & Kerusakan Awal
              </span>
              <div className="text-sm font-bold text-white mt-0.5">
                {service.deviceModel}
              </div>
              <div className="text-xs text-zinc-300 mt-0.5 font-normal">
                Keluhan: {service.complaints.join(', ')}
              </div>
              {service.screenLock && service.screenLock !== '-' && (
                <div className="text-[11px] text-emerald-400 font-mono mt-1">
                  Kunci Layar: {service.screenLock}
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                Pelanggan & Kontak
              </span>
              <div className="text-sm font-bold text-white mt-0.5">
                {service.customerName}
              </div>
              <div className="text-xs text-zinc-400 font-mono mt-0.5">
                {service.customerPhone}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                Tanggal Masuk: {service.createdAt}
              </div>
            </div>
          </div>

          {/* Section: Hasil Diagnosis */}
          <div className="space-y-2">
            <label className="block text-zinc-200 font-bold text-xs">
              Hasil Diagnosis / Kerusakan yang Ditemukan <span className="text-emerald-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Contoh: Jalur VDD_MAIN konslet akibat korosi air, IC Power harus diganti & re-jalur..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-xs placeholder:text-zinc-500 focus:bg-black focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Section: Perubahan Estimasi Biaya */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> Perubahan Estimasi Biaya (Data Terbaru)
              </span>
              <span className="text-[11px] text-zinc-400">
                Estimasi Awal: <b className="text-zinc-200">{formatRupiah(initialEstimate)}</b>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Estimasi Biaya Terbaru (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={formatNumberWithDots(estimatedCostInput)}
                  onChange={(e) => setEstimatedCostInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white font-bold text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">
                  DP Masuk (Rp)
                </label>
                <div className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-400 font-bold text-sm">
                  {formatRupiah(dp)}
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Sisa Tagihan Estimasi
                </label>
                <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-emerald-400 font-bold text-sm">
                  {formatRupiah(balance)}
                </div>
              </div>
            </div>

            {/* Price Change Comparison Indicator */}
            {costDiff !== 0 && (
              <div
                className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                  costDiff > 0
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Perubahan Estimasi: <b>{formatRupiah(initialEstimate)}</b> <ArrowRight className="inline w-3 h-3 mx-1" /> <b>{formatRupiah(currentEstimate)}</b> ({costDiff > 0 ? `+${formatRupiah(costDiff)}` : formatRupiah(costDiff)})
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-black/40">
                  Data Baru
                </span>
              </div>
            )}
          </div>

          {/* Section: Status Respon Customer */}
          <div className="space-y-2.5">
            <label className="block text-zinc-200 font-bold text-xs">
              Status Respon & Komunikasi Pelanggan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmationStatus('MENUNGGU')}
                className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  confirmationStatus === 'MENUNGGU'
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Clock className={`w-4 h-4 mt-0.5 shrink-0 ${confirmationStatus === 'MENUNGGU' ? 'text-amber-400' : 'text-zinc-500'}`} />
                <div>
                  <div className="font-bold text-xs text-white">Menunggu Konfirmasi</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 font-normal">
                    Kirim rincian hasil cek via WA & tunggu persetujuan.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setConfirmationStatus('DISETUJUI')}
                className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  confirmationStatus === 'DISETUJUI'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${confirmationStatus === 'DISETUJUI' ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <div>
                  <div className="font-bold text-xs text-white">Pelanggan Menyetujui</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 font-normal">
                    Pelanggan setuju biaya. Tiket lanjut ke DIPROSES.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setConfirmationStatus('TIDAK_PERLU')}
                className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  confirmationStatus === 'TIDAK_PERLU'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Check className={`w-4 h-4 mt-0.5 shrink-0 ${confirmationStatus === 'TIDAK_PERLU' ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <div>
                  <div className="font-bold text-xs text-white">Sesuai Estimasi Awal</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 font-normal">
                    Biaya & kerusakan pas sesuai kesepakatan awal.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Section: Live WhatsApp Message Generator */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                Template Pesan WhatsApp Konfirmasi Diagnosis
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyWA}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin' : 'Salin Pesan'}</span>
                </button>
                {service.customerPhone && service.customerPhone !== 'Tanpa WA' && (
                  <button
                    type="button"
                    onClick={handleOpenWA}
                    className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-black" />
                    <span>Kirim WA Sekarang</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-[11px] text-zinc-300 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
              {waText}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <Check className="w-4 h-4 text-black" />
              <span>Simpan Perubahan Diagnosis & Estimasi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
