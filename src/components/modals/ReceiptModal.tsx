import React, { useState, useEffect } from 'react';
import { ServiceItem, StoreSettings } from '../../types';
import { formatRupiah } from '../../data/initialData';
import {
  Receipt,
  X,
  PhoneCall,
  MessageSquare,
  Printer,
  ShieldCheck,
  FileText,
  Clock,
} from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceItem | null;
  storeSettings: StoreSettings;
  onSendWhatsApp: (
    service: ServiceItem,
    templateType?: 'INTAKE' | 'DIAGNOSIS' | 'READY' | 'PICKUP' | 'CANCEL'
  ) => void;
  initialType?: 'INTAKE' | 'PICKUP';
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  service,
  storeSettings,
  onSendWhatsApp,
  initialType,
}) => {
  if (!isOpen || !service) return null;

  const isBatal = service.status === 'BATAL';
  // Nota 1 (INTAKE): Khusus Terima Servis & Servis Berjalan (BARU, PROSES)
  // Nota 2 (PICKUP): Khusus Siap Diambil & Sudah Selesai/Diambil (SIAP, DIAMBIL, BATAL)
  const isPickupOrReady = service.status === 'SIAP' || service.status === 'DIAMBIL' || isBatal;
  const receiptType: 'INTAKE' | 'PICKUP' = initialType || (isPickupOrReady ? 'PICKUP' : 'INTAKE');

  const totalCost = isBatal
    ? 0
    : Number(service.finalCost) || Number(service.estimatedCost) || 0;
  const dp = Number(service.dp) || 0;
  const balance = Math.max(0, totalCost - dp);

  // Calculate warranty expiry date if applicable
  const getWarrantyExpiry = () => {
    if (isBatal || !service.pickedUpAt || !service.warrantyDays) return '-';
    try {
      const parts = service.pickedUpAt.split(' ')[0].split('-');
      const d = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2])
      );
      d.setDate(d.getDate() + Number(service.warrantyDays));
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return `${service.warrantyDays} Hari`;
    }
  };

  return (
    <div
      id="detailModal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="detailModalCard"
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header - Not printed */}
        <div className="px-6 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900 no-print">
          <div className="flex items-center gap-2.5">
            {isBatal ? (
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <FileText className="w-5 h-5" />
              </div>
            ) : receiptType === 'INTAKE' ? (
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FileText className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                {isBatal
                  ? 'Nota Pengembalian Unit (Batal Servis)'
                  : receiptType === 'INTAKE'
                  ? 'Nota 1: Tanda Terima Servis'
                  : 'Nota 2: Pengambilan & Garansi'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {isBatal
                  ? 'Khusus serah terima pengembalian HP yang dibatalkan'
                  : receiptType === 'INTAKE'
                  ? 'Khusus tahap Penerimaan & Servis Berjalan'
                  : 'Khusus tahap Siap Diambil & Pengambilan'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Body */}
        <div
          id="printableReceipt"
          className="overflow-y-auto p-6 flex-1 space-y-4 text-xs bg-white text-black"
        >
          {/* Store Branding */}
          <div className="text-center pb-3 border-b-2 border-black">
            {storeSettings.logoUrl && (
              <div className="flex justify-center mb-1">
                <div className="w-32 h-32 rounded-full overflow-hidden flex items-center justify-center">
                  <img
                    src={storeSettings.logoUrl}
                    alt={storeSettings.storeName || 'Logo Toko'}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            <h2 className="text-xl font-black tracking-tight text-black uppercase mt-1">
              {storeSettings.storeName || 'ORDO SERVIS HP'}
            </h2>
            <p className="text-xs text-neutral-600 font-medium mt-0.5">
              {storeSettings.storeTagline || 'Pusat Servis & Ganti Sparepart HP'}
            </p>
            <div className="pt-1 text-[11px] text-neutral-700 space-y-0.5">
              <p>{storeSettings.storeAddress}</p>
              <p className="font-bold text-black">
                WhatsApp Konter:{' '}
                <span className="font-mono">{storeSettings.storePhone}</span>
              </p>
            </div>
          </div>

          {/* Receipt Document Title */}
          <div
            className={`text-center py-1.5 rounded-md font-black tracking-wider uppercase text-xs ${
              isBatal ? 'bg-neutral-900 text-white' : 'bg-black text-white'
            }`}
          >
            {isBatal
              ? 'NOTA PENGEMBALIAN UNIT (BATAL SERVIS)'
              : receiptType === 'INTAKE'
              ? 'NOTA TANDA TERIMA SERVIS HP'
              : 'NOTA PENGAMBILAN & KARTU GARANSI'}
          </div>

          {/* Ticket Information Header */}
          <div className="grid grid-cols-2 gap-2 text-neutral-800 bg-neutral-100 p-3 rounded-xl border border-neutral-300">
            <div>
              <span className="text-neutral-500 block text-[10px] font-bold">
                NO. NOTA:
              </span>
              <span className="font-mono font-black text-black text-sm">
                {service.ticketNo}
              </span>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 block text-[10px] font-bold">
                TANGGAL MASUK:
              </span>
              <span className="font-medium text-black font-mono">
                {service.createdAt}
              </span>
            </div>
            <div className="mt-1">
              <span className="text-neutral-500 block text-[10px] font-bold">
                NAMA PELANGGAN:
              </span>
              <span className="font-bold text-black text-xs">
                {service.customerName}
              </span>
              <span className="block text-neutral-600 font-mono text-[11px]">
                {service.customerPhone || 'Tanpa WA'}
              </span>
            </div>
            <div className="text-right mt-1">
              <span className="text-neutral-500 block text-[10px] font-bold">
                {isBatal
                  ? 'STATUS / TGL. KEMBALI:'
                  : receiptType === 'INTAKE'
                  ? 'STATUS SERVIS:'
                  : 'TGL. SELESAI / DIAMBIL:'}
              </span>
              {isBatal ? (
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                    BATAL SERVIS
                  </span>
                  {service.pickedUpAt && (
                    <span className="font-mono text-neutral-700 text-[10px] block mt-0.5">
                      Diambil: {service.pickedUpAt}
                    </span>
                  )}
                </div>
              ) : receiptType === 'INTAKE' ? (
                <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-neutral-200 text-black border border-neutral-300">
                  UNIT DITERIMA
                </span>
              ) : (
                <span className="font-mono font-bold text-black text-xs block mt-0.5">
                  {service.pickedUpAt || 'Selesai & Lunas'}
                </span>
              )}
            </div>
          </div>

          {/* Device and Complaint Section */}
          <div className="bg-white border border-neutral-300 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between">
              <span className="text-neutral-500">Unit HP:</span>
              <span className="font-black text-black text-right">
                {service.deviceModel}
              </span>
            </div>

            {receiptType === 'INTAKE' && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Kunci Layar (Pola/PIN):</span>
                <span className="font-mono font-bold text-black text-right">
                  {service.screenLock || 'Tidak Ada'}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-neutral-500">Keluhan Kerusakan:</span>
              <span className="font-semibold text-neutral-900 text-right max-w-[240px]">
                {service.complaints.join(', ')}
              </span>
            </div>

            {service.diagnosis && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Hasil Diagnosis:</span>
                <span className="font-bold text-neutral-900 text-right max-w-[240px]">
                  {service.diagnosis}
                </span>
              </div>
            )}

            {isBatal && (
              <div className="flex justify-between bg-rose-50 p-2 rounded-lg border border-rose-200">
                <span className="text-rose-800 font-bold">Alasan Batal:</span>
                <span className="font-bold text-rose-900 text-right max-w-[240px]">
                  {service.cancelReason || 'Dibatalkan oleh pelanggan/teknisi'}
                </span>
              </div>
            )}

            {service.notes && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Catatan Fisik:</span>
                <span className="text-neutral-700 text-right max-w-[240px]">
                  {service.notes}
                </span>
              </div>
            )}

            {!isBatal && receiptType === 'PICKUP' && (
              <>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Metode Bayar:</span>
                  <span className="font-bold text-black text-right">
                    {service.paymentMethod !== '-'
                      ? service.paymentMethod
                      : 'Tunai'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-neutral-100 p-2 rounded-lg border border-neutral-300">
                  <div>
                    <span className="text-neutral-500 text-[10px] block font-bold">
                      GARANSI RESMI TOKO:
                    </span>
                    <span className="font-black text-black text-xs">
                      {service.warrantyDays ? `${service.warrantyDays} Hari` : 'Non-Garansi'}
                    </span>
                  </div>
                  {Boolean(service.warrantyDays) && (
                    <div className="text-right">
                      <span className="text-neutral-500 text-[10px] block font-bold">
                        BERLAKU SAMPAI:
                      </span>
                      <span className="font-mono font-black text-black text-xs">
                        {getWarrantyExpiry()}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-1.5 pt-2 border-t border-neutral-300">
            <div className="flex justify-between text-neutral-600">
              <span>
                {isBatal
                  ? 'Total Biaya Servis:'
                  : receiptType === 'INTAKE'
                  ? 'Estimasi Total Biaya:'
                  : 'Total Biaya Servis:'}
              </span>
              <span className="font-bold text-black">
                {isBatal ? 'Rp 0 (Batal)' : formatRupiah(totalCost)}
              </span>
            </div>

            {dp > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>{isBatal ? 'DP Dikembalikan ke Pelanggan:' : 'DP / Uang Muka Masuk:'}</span>
                <span className="font-bold text-black">
                  {isBatal ? formatRupiah(dp) : `- ${formatRupiah(dp)}`}
                </span>
              </div>
            )}

            <div className="flex justify-between text-base font-black pt-2 border-t-2 border-dashed border-neutral-400 text-black">
              <span>
                {isBatal
                  ? 'Status Tagihan:'
                  : receiptType === 'INTAKE'
                  ? 'Estimasi Sisa Bayar:'
                  : 'Status Pelunasan:'}
              </span>
              <span className="text-black text-base font-mono font-black">
                {isBatal
                  ? 'DIBATALKAN (Rp 0)'
                  : receiptType === 'PICKUP'
                  ? 'LUNAS'
                  : formatRupiah(balance)}
              </span>
            </div>
          </div>

          {/* Specific Terms based on Receipt Type */}
          {isBatal ? (
            <div className="p-3 bg-neutral-100 border border-neutral-300 rounded-xl space-y-1 text-[11px] leading-relaxed text-neutral-700">
              <p className="font-bold text-black">Ketentuan Pengembalian Unit (Batal Servis):</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-neutral-600">
                <li>Unit HP telah diserahkan kembali kepada pemilik dalam kondisi apa adanya sesuai saat masuk/dibatalkan.</li>
                <li>Tidak ada tagihan biaya perbaikan untuk servis yang dibatalkan.</li>
                <li>Hubungi konter jika ada pertanyaan terkait unit yang telah diambil kembali.</li>
              </ul>
            </div>
          ) : receiptType === 'INTAKE' ? (
            <div className="p-3 bg-neutral-100 border border-neutral-300 rounded-xl space-y-1 text-[11px] leading-relaxed text-neutral-700">
              <p className="font-bold text-black">Ketentuan Penitipan Unit:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-neutral-600">
                <li>Nota ini adalah bukti sah pengambilan unit HP.</li>
                <li>Pelanggan wajib menunjukkan nota ini atau konfirmasi chat WA resmi saat mengambil unit.</li>
                <li>Konter tidak bertanggung jawab atas kehilangan data pada memori internal HP.</li>
                <li>Unit yang tidak diambil lebih dari 30 hari setelah konfirmasi selesai berada di luar tanggung jawab konter.</li>
              </ul>
            </div>
          ) : (
            <div className="p-3 bg-neutral-100 border border-neutral-300 rounded-xl space-y-1 text-[11px] leading-relaxed text-neutral-700">
              <p className="font-bold text-black">Syarat & Ketentuan Garansi:</p>
              <div className="space-y-0.5 text-[10px] text-neutral-600">
                {storeSettings.warrantyTerms.split('\n').map((line, idx) => (
                  <p key={idx}>{line.trim()}</p>
                ))}
              </div>
            </div>
          )}

          {/* Signatures */}
          {(isBatal || receiptType === 'PICKUP') && (
            <div className="pt-4 border-t-2 border-dashed border-neutral-400 grid grid-cols-2 gap-4 text-center text-xs text-neutral-600">
              <div className="space-y-8">
                <span>Pelanggan</span>
                <div className="border-b border-neutral-400 w-3/4 mx-auto"></div>
                <span className="font-bold text-black block">
                  ( {service.customerName} )
                </span>
              </div>
              <div className="space-y-8">
                <span>Teknisi / Konter</span>
                <div className="border-b border-neutral-400 w-3/4 mx-auto"></div>
                <span className="font-bold text-black block">
                  ( {storeSettings.storeName} )
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions - Not printed */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onSendWhatsApp(
                  service,
                  isBatal ? 'CANCEL' : receiptType === 'INTAKE' ? 'INTAKE' : 'PICKUP'
                )
              }
              className="px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>
                {isBatal
                  ? 'Kirim WA Serah Terima (Batal)'
                  : receiptType === 'INTAKE'
                  ? 'Kirim WA Tanda Terima'
                  : 'Kirim WA Garansi'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>
                Cetak {isBatal ? 'Nota Pengembalian' : receiptType === 'INTAKE' ? 'Tanda Terima' : 'Nota Garansi'}
              </span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs shadow-sm transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
