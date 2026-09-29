import React, { useRef } from 'react';
import { ServiceItem } from '../types';
import { formatRupiah } from '../data/initialData';
import {
  Wrench,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Edit3,
  Printer,
  CheckCircle,
  Plus,
  Stethoscope,
  Clock,
} from 'lucide-react';

interface BoardViewProps {
  services: ServiceItem[];
  searchQuery: string;
  onUpdateStatus: (ticketId: string, newStatus: 'BARU' | 'PROSES' | 'SIAP') => void;
  onOpenReadyModal: (ticketId: string) => void;
  onOpenEditUnitModal: (ticketId: string) => void;
  onOpenDiagnosisModal: (ticketId: string) => void;
  onViewDetail?: (ticketId: string) => void;
  onInstantPrint: (ticketId: string) => void;
  onDirectWhatsApp: (ticketId: string) => void;
  onOpenServiceModal: () => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  services,
  searchQuery,
  onUpdateStatus,
  onOpenReadyModal,
  onOpenEditUnitModal,
  onOpenDiagnosisModal,
  onViewDetail,
  onInstantPrint,
  onDirectWhatsApp,
  onOpenServiceModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (offset: number) => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const filtered = services.filter((s) => {
    const isAct = s.status === 'BARU' || s.status === 'PROSES';
    if (!isAct) return false;

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
            <Wrench className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white">
              Daftar HP yang sedang diservis
            </span>
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
            <span className="text-xs font-bold px-3 py-1 rounded-lg bg-zinc-950 border border-zinc-700 text-emerald-400">
              {filtered.length} Unit Aktif
            </span>
          </div>
        </div>

        <div
          ref={containerRef}
          className="overflow-x-auto scroll-smooth"
        >
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-950/80 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="py-4 px-4">No. Nota & Status</th>
                <th className="py-4 px-4">Pelanggan & Kontak</th>
                <th className="py-4 px-4">Unit HP & Keluhan</th>
                <th className="py-4 px-4">Biaya & Sisa Tagihan</th>
                <th className="py-4 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.map((s) => {
                const sisa = Math.max(
                  0,
                  (s.finalCost || s.estimatedCost) - s.dp
                );

                return (
                  <tr
                    key={s.id}
                    className="hover:bg-zinc-800/30 transition-colors group"
                  >
                    <td className="py-4 px-4 align-top">
                      <div className="font-mono font-bold text-white text-xs mb-1">
                        {s.ticketNo}
                      </div>
                      <div className="flex flex-col gap-1 items-start">
                        {s.status === 'BARU' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                            ANTRE
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-400 border border-blue-400/80 dark:border-blue-700/60">
                            DIPROSES
                          </span>
                        )}

                        {s.confirmationStatus === 'MENUNGGU' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-lg font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> Tunggu Konfirmasi
                          </span>
                        )}
                        {s.confirmationStatus === 'DISETUJUI' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-lg font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                            ✓ Disetujui
                          </span>
                        )}
                        {s.confirmationStatus === 'DITOLAK' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-lg font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                            ✕ Ditolak
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1.5 font-medium">
                        {s.createdAt}
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top">
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
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {s.customerPhone && s.customerPhone !== 'Tanpa WA' ? (
                          <button
                            onClick={() => onDirectWhatsApp(s.id)}
                            title="Hubungi via WhatsApp"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-emerald-400 border border-zinc-700/80 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Chat WA</span>
                          </button>
                        ) : (
                          <span className="inline-block text-[11px] text-zinc-500 italic py-1">
                            Tanpa WA
                          </span>
                        )}

                        <button
                          onClick={() => onInstantPrint(s.id)}
                          title="Cetak Tanda Terima Servis (Nota 1)"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Cetak Nota</span>
                        </button>
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
                      {s.diagnosis && (
                        <div className="mt-2 p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] leading-relaxed font-medium">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300">Diagnosis: </span>
                          <span className="text-black dark:text-emerald-200">{s.diagnosis}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 align-top">
                      <div className="text-xs font-semibold text-zinc-300">
                        Total: {formatRupiah(s.finalCost || s.estimatedCost)}
                      </div>
                      {s.initialEstimatedCost &&
                        s.initialEstimatedCost !== s.estimatedCost && (
                          <div className="text-[10px] text-amber-400 font-medium mt-0.5">
                            Awal: {formatRupiah(s.initialEstimatedCost)}
                          </div>
                        )}
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        DP: {formatRupiah(s.dp || 0)}
                      </div>
                      <div className="text-xs font-bold text-emerald-400 mt-1">
                        Sisa: {formatRupiah(sisa)}
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => onOpenDiagnosisModal(s.id)}
                          title="Diagnosis & Konfirmasi Estimasi"
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-emerald-400 border border-zinc-700/90 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Diagnosis</span>
                        </button>

                        {s.status === 'BARU' ? (
                          <button
                            onClick={() => onUpdateStatus(s.id, 'PROSES')}
                            title="Kerjakan HP ini"
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200/90 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/90 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 font-bold text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                          >
                            <span>Kerjakan</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onOpenReadyModal(s.id)}
                            title="Tandai HP selesai & kirim WA"
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200/90 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/90 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 font-bold text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                          >
                            <span>Sudah Jadi</span>
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
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-zinc-300">
              Belum Ada Servis Berjalan
            </h4>
            <p className="text-xs text-zinc-500 mt-1 mb-4">
              Kerjaan lagi kosong nih, nunggu servisan masuk.
            </p>
            <button
              onClick={onOpenServiceModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + Terima Servis
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
