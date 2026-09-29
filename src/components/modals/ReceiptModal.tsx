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
  const techName =
    service.technicianName ||
    (service as any).technician_name ||
    storeSettings.ownerName ||
    'Teknisi';

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

        {/* Printable Receipt Body - Modern Compact Flow */}
        <div
          id="printableReceipt"
          className="overflow-y-auto p-4 sm:p-5 flex-1 space-y-2.5 text-xs bg-white text-black"
        >
          {/* Store Branding */}
          <div className="text-center pb-2 border-b border-black">
            {storeSettings.logoUrl && (
              <div className="flex justify-center mb-1">
                <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-black">
                  <img
                    src={storeSettings.logoUrl}
                    alt={storeSettings.storeName || 'Logo Toko'}
                    className="w-full h-full object-cover bg-black"
                  />
                </div>
              </div>
            )}
            <h2 className="text-base font-black tracking-tight text-black uppercase">
              {storeSettings.storeName || 'ORDO SERVIS HP'}
            </h2>
            {storeSettings.storeTagline && (
              <p className="text-[11px] text-neutral-600 font-medium">
                {storeSettings.storeTagline}
              </p>
            )}
            <div className="text-[10px] text-neutral-700 space-y-0.5 mt-0.5">
              {storeSettings.storeAddress && <p>{storeSettings.storeAddress}</p>}
              <p className="font-bold text-black">
                WhatsApp: <span className="font-mono">{storeSettings.storePhone}</span>
              </p>
            </div>
          </div>

          {/* Receipt Document Title Banner */}
          <div
            className={`text-center py-1 rounded font-black tracking-wider uppercase text-[11px] ${
              isBatal ? 'bg-neutral-900 text-white' : 'bg-black text-white'
            }`}
          >
            {isBatal
              ? 'NOTA PENGEMBALIAN UNIT (BATAL SERVIS)'
              : receiptType === 'INTAKE'
              ? 'NOTA TANDA TERIMA SERVIS HP'
              : 'NOTA PENGAMBILAN & KARTU GARANSI'}
          </div>

          {/* Ticket Metadata Flow */}
          <div className="py-2 border-b border-dashed border-neutral-400 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-neutral-600">No. Nota:</span>
              <span className="font-mono font-black text-black text-sm">{service.ticketNo}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-600">Tanggal:</span>
              <span className="font-mono text-black">
                {receiptType === 'PICKUP' && service.pickedUpAt ? service.pickedUpAt : service.createdAt}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-600">Teknisi:</span>
              <span className="font-bold text-black">{techName}</span>
            </div>
            <div className="flex justify-between items-start gap-2 pt-0.5">
              <span className="text-neutral-600 shrink-0">Pelanggan:</span>
              <span className="font-bold text-black text-right">
                {service.customerName}
                {service.customerPhone && service.customerPhone !== 'Tanpa WA' && (
                  <span className="font-mono font-normal text-neutral-600 block text-[11px]">
                    {service.customerPhone}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Device & Service Information */}
          <div className="py-2 border-b border-dashed border-neutral-400 space-y-1.5 text-xs">
            <div className="flex justify-between items-start gap-2">
              <span className="text-neutral-600 shrink-0">Unit HP:</span>
              <span className="font-black text-black text-right">{service.deviceModel}</span>
            </div>

            {receiptType === 'INTAKE' && service.screenLock && service.screenLock !== '-' && (
              <div className="flex justify-between items-center gap-2">
                <span className="text-neutral-600 shrink-0">Kunci Layar:</span>
                <span className="font-mono font-bold text-black text-right">{service.screenLock}</span>
              </div>
            )}

            <div className="flex justify-between items-start gap-2">
              <span className="text-neutral-600 shrink-0">Keluhan:</span>
              <span className="font-medium text-black text-right">{service.complaints.join(', ')}</span>
            </div>

            {service.diagnosis && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-neutral-600 shrink-0">Diagnosis:</span>
                <span className="font-bold text-black text-right">{service.diagnosis}</span>
              </div>
            )}

            {service.actionTaken && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-neutral-600 shrink-0">Tindakan:</span>
                <span className="font-bold text-black text-right">{service.actionTaken}</span>
              </div>
            )}

            {isBatal && (
              <div className="flex justify-between items-start gap-2 bg-neutral-100 p-1.5 rounded border border-neutral-300">
                <span className="font-bold text-neutral-800 shrink-0">Alasan Batal:</span>
                <span className="font-bold text-black text-right">
                  {service.cancelReason || 'Dibatalkan oleh pelanggan/teknisi'}
                </span>
              </div>
            )}

            {service.notes && service.notes !== '-' && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-neutral-600 shrink-0">Catatan Fisik:</span>
                <span className="text-neutral-800 text-right">{service.notes}</span>
              </div>
            )}

            {!isBatal && receiptType === 'PICKUP' && (
              <div className="flex justify-between items-center gap-2 pt-1 border-t border-neutral-200">
                <span className="text-neutral-600 shrink-0">Garansi Toko:</span>
                <span className="font-bold text-black text-right">
                  {service.warrantyDays ? `${service.warrantyDays} Hari (s/d ${getWarrantyExpiry()})` : 'Non-Garansi'}
                </span>
              </div>
            )}
          </div>

          {/* Financial Breakdown (Rata Kanan) */}
          <div className="py-2 border-b border-dashed border-neutral-400 space-y-1 text-xs">
            <div className="flex justify-between items-center text-neutral-600">
              <span>
                {isBatal
                  ? 'Total Biaya Servis:'
                  : receiptType === 'INTAKE'
                  ? 'Estimasi Total Biaya:'
                  : 'Total Biaya Servis:'}
              </span>
              <span className="font-bold font-mono text-black text-right">
                {isBatal ? 'Rp 0' : formatRupiah(totalCost)}
              </span>
            </div>

            {dp > 0 && (
              <div className="flex justify-between items-center text-neutral-600">
                <span>{isBatal ? 'DP Dikembalikan:' : 'DP / Uang Muka Masuk:'}</span>
                <span className="font-bold font-mono text-black text-right">
                  {isBatal ? formatRupiah(dp) : `- ${formatRupiah(dp)}`}
                </span>
              </div>
            )}

            {!isBatal && receiptType === 'PICKUP' && service.paymentMethod && service.paymentMethod !== '-' && (
              <div className="flex justify-between items-center text-neutral-600">
                <span>Metode Pembayaran:</span>
                <span className="font-bold text-black text-right">
                  {service.paymentMethod}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-1.5 border-t border-black text-xs font-black text-black">
              <span>
                {isBatal
                  ? 'Status Tagihan:'
                  : receiptType === 'INTAKE'
                  ? 'Estimasi Sisa Bayar:'
                  : 'Status Pelunasan:'}
              </span>
              <span className="text-sm font-mono font-black text-right text-black">
                {isBatal
                  ? 'DIBATALKAN (Rp 0)'
                  : receiptType === 'PICKUP'
                  ? 'LUNAS'
                  : formatRupiah(balance)}
              </span>
            </div>
          </div>

          {/* Specific Terms based on Receipt Type (Ultra-Compact) */}
          {isBatal ? (
            <div className="py-1 text-[8px] leading-none text-neutral-600 border-b border-dashed border-neutral-400">
              <p className="font-bold text-black text-[8.5px] pb-0.5">Ketentuan Pengembalian Unit (Batal Servis):</p>
              <p className="leading-tight">• Unit HP diserahkan kembali dalam kondisi apa adanya sesuai saat masuk/dibatalkan.</p>
              <p className="leading-tight">• Tidak ada tagihan biaya servis untuk perbaikan yang dibatalkan.</p>
            </div>
          ) : receiptType === 'INTAKE' ? (
            <div className="py-1 text-[8px] leading-none text-neutral-600 border-b border-dashed border-neutral-400">
              <p className="font-bold text-black text-[8.5px] pb-0.5">Ketentuan Penitipan Unit:</p>
              <p className="leading-tight">• Nota ini adalah bukti sah serah terima dan pengambilan HP.</p>
              <p className="leading-tight">• Konter tidak bertanggung jawab atas data di memori internal HP.</p>
              <p className="leading-tight">• Unit yang tidak diambil &gt; 30 hari di luar tanggung jawab konter.</p>
            </div>
          ) : (
            <div className="py-1 text-[8px] leading-none text-neutral-600 border-b border-dashed border-neutral-400">
              <p className="font-bold text-black text-[8.5px] pb-0.5">Syarat & Ketentuan Garansi:</p>
              {storeSettings.warrantyTerms
                ? storeSettings.warrantyTerms.split('\n').filter(Boolean).map((line, idx) => (
                    <p key={idx} className="leading-tight">• {line.trim().replace(/^[-*•\d.]+\s*/, '')}</p>
                  ))
                : (
                  <p className="leading-tight">• Garansi berlaku untuk sparepart & kerusakan yang sama dengan menunjukkan nota ini.</p>
                )}
            </div>
          )}

          {/* Signatures */}
          {(isBatal || receiptType === 'PICKUP') && (
            <div className="pt-2 grid grid-cols-2 gap-4 text-center text-[10px] text-neutral-600">
              <div className="space-y-6">
                <span>Pelanggan</span>
                <div className="border-b border-neutral-400 w-3/4 mx-auto"></div>
                <span className="font-bold text-black block text-[11px]">
                  ( {service.customerName} )
                </span>
              </div>
              <div className="space-y-6">
                <span>Teknisi / Konter</span>
                <div className="border-b border-neutral-400 w-3/4 mx-auto"></div>
                <span className="font-bold text-black block text-[11px]">
                  ( {techName} )
                </span>
              </div>
            </div>
          )}

          {receiptType === 'INTAKE' && (
            <div className="text-center pt-0.5 text-[8px] text-neutral-500 font-medium leading-tight">
              Terima kasih telah mempercayakan servis HP Anda di {storeSettings.storeName || 'konter kami'}.
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
