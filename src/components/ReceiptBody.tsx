import React from 'react';
import { ServiceItem, StoreSettings } from '../types';
import { formatRupiah } from '../data/initialData';

export interface ReceiptBodyProps {
  service: ServiceItem;
  storeSettings: StoreSettings;
  receiptType?: 'INTAKE' | 'PICKUP';
  containerId?: string;
  className?: string;
}

export const ReceiptBody: React.FC<ReceiptBodyProps> = ({
  service,
  storeSettings,
  receiptType: forcedReceiptType,
  containerId,
  className,
}) => {
  const isBatal = service.status === 'BATAL';
  // Nota 1 (INTAKE): Khusus Terima Servis & Servis Berjalan (BARU, PROSES)
  // Nota 2 (PICKUP): Khusus Siap Diambil & Sudah Selesai/Diambil (SIAP, DIAMBIL, BATAL)
  const isPickupOrReady = service.status === 'SIAP' || service.status === 'DIAMBIL' || isBatal;
  const receiptType: 'INTAKE' | 'PICKUP' = forcedReceiptType || (isPickupOrReady ? 'PICKUP' : 'INTAKE');

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
    <div id={containerId} className={className || 'space-y-2.5 text-xs bg-white text-black'}>
      {/* Store Branding */}
      <div className="text-center pb-2 border-b border-black">
        {storeSettings.logoUrl && (
          <div className="flex justify-center mb-1">
            <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-transparent">
              <img
                src={storeSettings.logoUrl}
                alt={storeSettings.storeName || 'Logo Toko'}
                className="w-full h-full object-cover bg-transparent"
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
      <div className="text-center py-1 border-y border-black bg-white text-black font-bold tracking-wider uppercase text-[11px]">
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
          <span className="font-bold text-black text-right break-words min-w-0">
            {service.customerName}
            {service.customerPhone && service.customerPhone !== 'Tanpa WA' && (
              <span className="font-mono font-normal text-neutral-600 block text-[11px] break-all">
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
          <span className="font-black text-black text-right break-words min-w-0">{service.deviceModel}</span>
        </div>

        {receiptType === 'INTAKE' && service.screenLock && service.screenLock !== '-' && (
          <div className="flex justify-between items-center gap-2">
            <span className="text-neutral-600 shrink-0">Kunci Layar:</span>
            <span className="font-mono font-bold text-black text-right break-all min-w-0">{service.screenLock}</span>
          </div>
        )}

        <div className="flex justify-between items-start gap-2">
          <span className="text-neutral-600 shrink-0">Keluhan:</span>
          <span className="font-medium text-black text-right break-words min-w-0">{service.complaints.join(', ')}</span>
        </div>

        {service.diagnosis && (
          <div className="flex justify-between items-start gap-2">
            <span className="text-neutral-600 shrink-0">Diagnosis:</span>
            <span className="font-bold text-black text-right break-words min-w-0">{service.diagnosis}</span>
          </div>
        )}

        {service.actionTaken && (
          <div className="flex justify-between items-start gap-2">
            <span className="text-neutral-600 shrink-0">Tindakan:</span>
            <span className="font-bold text-black text-right break-words min-w-0">{service.actionTaken}</span>
          </div>
        )}

        {isBatal && (
          <div className="flex justify-between items-start gap-2 bg-white p-1.5 rounded border border-neutral-300">
            <span className="font-bold text-neutral-800 shrink-0">Alasan Batal:</span>
            <span className="font-bold text-black text-right break-words min-w-0">
              {service.cancelReason || 'Dibatalkan oleh pelanggan/teknisi'}
            </span>
          </div>
        )}

        {service.notes && service.notes !== '-' && (
          <div className="flex justify-between items-start gap-2">
            <span className="text-neutral-600 shrink-0">Catatan Fisik:</span>
            <span className="text-neutral-800 text-right break-words min-w-0">{service.notes}</span>
          </div>
        )}

        {!isBatal && receiptType === 'PICKUP' && (
          <div className="flex justify-between items-center gap-2 pt-1 border-t border-neutral-200">
            <span className="text-neutral-600 shrink-0">Garansi Toko:</span>
            <span className="font-bold text-black text-right break-words min-w-0">
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
          <p className="font-bold text-black text-[8.5px] pb-0.5 break-words">Ketentuan Pengembalian Unit (Batal Servis):</p>
          <p className="leading-tight break-words">• Unit HP diserahkan kembali dalam kondisi apa adanya sesuai saat masuk/dibatalkan.</p>
          <p className="leading-tight break-words">• Tidak ada tagihan biaya servis untuk perbaikan yang dibatalkan.</p>
        </div>
      ) : receiptType === 'INTAKE' ? (
        <div className="py-1 text-[8px] leading-none text-neutral-600 border-b border-dashed border-neutral-400">
          <p className="font-bold text-black text-[8.5px] pb-0.5 break-words">Ketentuan Penitipan Unit:</p>
          <p className="leading-tight break-words">• Nota ini adalah bukti sah serah terima dan pengambilan HP.</p>
          <p className="leading-tight break-words">• Konter tidak bertanggung jawab atas data di memori internal HP.</p>
          <p className="leading-tight break-words">• Unit yang tidak diambil &gt; 30 hari di luar tanggung jawab konter.</p>
        </div>
      ) : (
        <div className="py-1 text-[8px] leading-none text-neutral-600 border-b border-dashed border-neutral-400">
          <p className="font-bold text-black text-[8.5px] pb-0.5 break-words">Syarat & Ketentuan Garansi:</p>
          {storeSettings.warrantyTerms
            ? storeSettings.warrantyTerms.split('\n').filter(Boolean).map((line, idx) => (
                <p key={idx} className="leading-tight break-words">• {line.trim().replace(/^[-*•\d.]+\s*/, '')}</p>
              ))
            : (
              <p className="leading-tight break-words">• Garansi berlaku untuk sparepart & kerusakan yang sama dengan menunjukkan nota ini.</p>
            )}
        </div>
      )}

      {/* Signatures */}
      {(isBatal || receiptType === 'PICKUP') && (
        <div className="pt-2 grid grid-cols-2 gap-4 text-center text-[10px] text-neutral-600">
          <div className="space-y-6">
            <span>Pelanggan</span>
            <div className="border-b border-neutral-400 w-3/4 mx-auto"></div>
            <span className="font-bold text-black block text-[11px] break-words">
              ( {service.customerName} )
            </span>
          </div>
          <div className="space-y-6">
            <span>Teknisi / Konter</span>
            <div className="border-b border-neutral-400 w-3/4 mx-auto"></div>
            <span className="font-bold text-black block text-[11px] break-words">
              ( {techName} )
            </span>
          </div>
        </div>
      )}

      {receiptType === 'INTAKE' && (
        <div className="text-center pt-0.5 text-[8px] text-neutral-500 font-medium leading-tight break-words">
          Terima kasih telah mempercayakan servis HP Anda di {storeSettings.storeName || 'konter kami'}.
        </div>
      )}
    </div>
  );
};
