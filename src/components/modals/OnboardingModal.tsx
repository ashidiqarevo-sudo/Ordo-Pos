import React from 'react';
import {
  BookOpen,
  X,
  Sparkles,
  Wrench,
  Calculator,
  Printer,
  FilePlus,
  CheckCircle2,
  Receipt,
  Lightbulb,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onFinish?: () => void;
  storeName?: string;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onFinish,
  storeName = 'ORDO POS',
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    if (onClose) onClose();
    if (onFinish) onFinish();
  };

  const keyFeatures = [
    {
      icon: Wrench,
      title: 'Manajemen Tiket Servis',
      desc: 'Kelola status unit (Antre, Proses, Selesai), diagnosis teknisi, catatan pola kunci layar, hingga konfirmasi biaya ke pelanggan via WhatsApp.',
    },
    {
      icon: Calculator,
      title: 'Catatan Kas & Laba Otomatis',
      desc: 'Setiap transaksi servis, pelunasan sisa, DP, modal sparepart, dan biaya operasional langsung terhitung otomatis tanpa perlu buku tulis.',
    },
    {
      icon: Printer,
      title: 'Cetak Nota Thermal Siap Pakai',
      desc: 'Cetak nota 58mm/80mm instan via Bluetooth BLE langsung di web browser atau RawBT untuk printer Bluetooth Classic dan USB Android.',
    },
  ];

  const workflowSteps = [
    {
      step: '1',
      title: 'Terima Servis',
      subtitle: 'Penerimaan Unit & Cetak Tanda Terima',
      desc: 'Klik tombol "+ Terima Servis". Masukkan keluhan awal, data pelanggan, estimasi biaya, dan DP (jika ada). Sistem membuat nomor nota unik dan nota tanda terima siap dicetak atau dikirim via WhatsApp.',
      badge: 'Nota Tanda Terima',
      icon: FilePlus,
    },
    {
      step: '2',
      title: 'Servis Berjalan',
      subtitle: 'Antrean Teknisi & Diagnosis Kerusakan',
      desc: 'HP masuk ke antrean teknisi (Antre → Dikerjakan). Teknisi dapat mencatat hasil diagnosis, pola kunci layar, dan meminta persetujuan biaya tambahan kepada pemilik melalui chat WhatsApp.',
      badge: 'Papan Servis',
      icon: Wrench,
    },
    {
      step: '3',
      title: 'Siap Diambil',
      subtitle: 'Notifikasi Pelanggan & Menunggu Pengambilan',
      desc: 'HP yang selesai diperbaiki dipindahkan ke status "Siap Diambil". Anda bisa langsung mengirim pesan WhatsApp otomatis yang ramah untuk mengabarkan bahwa unit telah selesai dan siap diambil.',
      badge: 'Notifikasi WA',
      icon: CheckCircle2,
    },
    {
      step: '4',
      title: 'Riwayat Servis',
      subtitle: 'Pelunasan Kasir (LUNAS) & Masuk Buku Kas',
      desc: 'Saat pelanggan mengambil HP dan melunasi sisa tagihan, cetak nota pelunasan/garansi toko. Tiket otomatis berpindah ke Riwayat Servis (LUNAS), dan seluruh uang masuk otomatis dicatat di menu Catatan Uang.',
      badge: 'LUNAS & Buku Kas',
      icon: Receipt,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>Panduan & Alur Kerja Ordo POS</span>
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Buku panduan operasional dan siklus servis HP di {storeName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Tutup"
            title="Tutup Panduan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-zinc-200">
          
          {/* Bagian 1: ✨ Fitur Utama */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 tracking-wide flex items-center gap-1.5 uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>✨ Fitur Utama</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                3 Fondasi Sistem
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {keyFeatures.map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col justify-between space-y-2 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0 text-emerald-400 group-hover:scale-105 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-white leading-tight">
                        {feat.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bagian 2: 🔄 Workflow (Alur Kerja Servis) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 tracking-wide flex items-center gap-1.5 uppercase">
                <span>🔄 Workflow (Alur Kerja Servis)</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                Siklus 4 Langkah
              </span>
            </div>

            <div className="space-y-2.5">
              {workflowSteps.map((wf, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/70 hover:border-zinc-700/80 transition-all flex items-start gap-3.5 group"
                >
                  {/* Step Number Badge */}
                  <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-700 text-emerald-400 font-mono font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-inner group-hover:border-emerald-500/50 group-hover:text-emerald-300 transition-colors">
                    {wf.step}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-[13px] font-bold text-white">
                          {wf.title}
                        </h4>
                        <span className="text-[10px] text-zinc-500 hidden sm:inline">
                          • {wf.subtitle}
                        </span>
                      </div>
                      <span className="text-[9.5px] px-2 py-0.5 rounded-md font-semibold font-mono bg-zinc-800 text-zinc-300 border border-zinc-700/80 shrink-0">
                        {wf.badge}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-zinc-400 leading-relaxed">
                      {wf.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pro-Tips Callout */}
          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3 text-xs text-zinc-300">
            <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed text-[11px]">
              <span className="font-bold text-emerald-400 block">
                Tips Efisiensi Konter:
              </span>
              <span>
                Gunakan fitur pencarian global di header atas untuk menemukan nota, nama pelanggan, atau tipe HP dalam sekejap. Anda juga dapat mencetak nota langsung dari tabel tanpa membuka rincian modal.
              </span>
            </div>
          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="px-5 py-3.5 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dokumentasi Resmi {storeName}</span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs transition-colors cursor-pointer shadow-md active:scale-95"
          >
            Mengerti & Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
