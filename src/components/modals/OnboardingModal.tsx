import React, { useState } from 'react';
import {
  FilePlus,
  Kanban,
  CheckCircle,
  FileText,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Smartphone,
  Receipt,
  Check,
  Zap,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onFinish: () => void;
  storeName?: string;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onFinish,
  storeName = 'ORDO SERVIS HP',
}) => {
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const stepsData = [
    {
      stepNumber: 1,
      title: 'Terima Servis & Cetak Nota Awal',
      tag: 'Langkah 1 dari 4',
      badge: '+ Terima Servis',
      icon: FilePlus,
      color: 'emerald',
      description:
        'Saat pelanggan datang membawa HP rusak, klik tombol "+ Terima Servis". Masukkan nama pelanggan, tipe HP, keluhan, estimasi biaya, dan DP (bila ada). Sistem langsung membuatkan nomor nota tahunan resmi (OR-26-XXXXX) dan nota tanda terima siap dicetak/dikirim via WhatsApp.',
      bulletPoints: [
        'Nomor nota otomatis & unik per tahun',
        'Cari cepat pelanggan lama (otomatis terisi)',
        'Kirim rincian tanda terima langsung ke WhatsApp pelanggan',
      ],
      previewHint: 'Nota Tanda Terima Fisik & WhatsApp Otomatis',
    },
    {
      stepNumber: 2,
      title: 'Pantau Alur Kerja di Papan Servis (Board)',
      tag: 'Langkah 2 dari 4',
      badge: 'Papan Servis',
      icon: Kanban,
      color: 'amber',
      description:
        'Semua HP yang sedang dikerjakan terbagi rapi dalam 3 kolom alur kerja: Antrean Baru, Sedang Dikerjakan, dan Siap Diambil. Anda bisa memperbarui hasil diagnosis kerusakan atau mengubah status pengerjaan cukup dengan satu klik.',
      bulletPoints: [
        'Fitur Diagnosis & ACC biaya ke pelanggan via WhatsApp',
        'Catatan teknisi & pola kunci layar HP tercatat rapi',
        'Filter pencarian kilat berdasarkan nomor nota, nama, atau tipe HP',
      ],
      previewHint: 'Kolom Antrean: Baru → Proses Pengerjaan → Selesai',
    },
    {
      stepNumber: 3,
      title: 'Pengambilan Unit & Pelunasan Kasir',
      tag: 'Langkah 3 dari 4',
      badge: 'Siap Diambil & Kasir',
      icon: CheckCircle,
      color: 'blue',
      description:
        'Begitu HP selesai diservis, pindahkan ke status "Siap Diambil". Anda bisa langsung kirim notifikasi WhatsApp ke pelanggan. Saat diambil, kasir memproses pelunasan (Cash / Transfer / QRIS) dan nota garansi resmi otomatis tercetak.',
      bulletPoints: [
        'Hitung otomatis sisa tagihan (Total Biaya - DP)',
        'Kartu garansi toko dengan masa berlaku otomatis dihitung',
        'Pemberitahuan ramah ke pelanggan bahwa unit siap dijemput',
      ],
      previewHint: 'Kasir Pelunasan Cepat & Nota Kartu Garansi Toko',
    },
    {
      stepNumber: 4,
      title: 'Laporan Buku Kas & Keuntungan Bersih',
      tag: 'Langkah 4 dari 4',
      badge: 'Buku Kas & Riwayat',
      icon: FileText,
      color: 'purple',
      description:
        'Tidak perlu lagi hitung manual di buku tulis. Di menu "Buku Kas", semua pemasukan servis, uang DP, modal sparepart, dan laba bersih Anda terekam otomatis harian dan bulanan dengan akurasi 100%.',
      bulletPoints: [
        'Rekap laba bersih otomatis (Pendapatan - Modal Sparepart)',
        'Detail transaksi harian & bulanan siap audit',
        'Database pelanggan & riwayat servis aman tersimpan',
      ],
      previewHint: 'Pembukuan Otomatis Real-Time Tanpa Ribet',
    },
  ];

  const current = stepsData[step - 1];
  const CurrentIcon = current.icon;

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Progress Indicators */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Panduan Singkat {storeName}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
              Langkah {step} dari 4
            </span>
          </div>

          {/* 4 Step Progress Bar */}
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i <= step
                    ? 'bg-emerald-500'
                    : 'bg-slate-200 dark:bg-zinc-800'
                }`}
              ></div>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
              <CurrentIcon className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                {current.tag}
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white leading-snug">
                {current.title}
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-normal">
            {current.description}
          </p>

          {/* Key Feature Highlights */}
          <div className="bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-4 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-1">
              Keunggulan Fitur:
            </span>
            {current.bulletPoints.map((point, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 font-bold" />
                <span>{point}</span>
              </div>
            ))}
          </div>

          {/* Preview Tag */}
          <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> {current.previewHint}
            </span>
            <span className="font-bold text-[10px] uppercase bg-emerald-500 text-black px-1.5 py-0.5 rounded">
              Otomatis
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-6 pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-zinc-950/40">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onFinish}
              className="text-xs text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-400 font-medium cursor-pointer"
            >
              Lewati Tutorial
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer ml-auto"
          >
            <span>{step === 4 ? 'Selesai & Buka Dashboard' : 'Lanjut Berikutnya'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
