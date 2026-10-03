import React from 'react';
import { ServiceItem, StoreSettings } from '../../types';
import { ReceiptBody } from '../ReceiptBody';
import {
  X,
  MessageSquare,
  Printer,
  ShieldCheck,
  FileText,
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
  onOpenPrintPreview?: (service: ServiceItem, receiptType: 'INTAKE' | 'PICKUP') => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  service,
  storeSettings,
  onSendWhatsApp,
  initialType,
  onOpenPrintPreview,
}) => {
  if (!isOpen || !service) return null;

  const isBatal = service.status === 'BATAL';
  // Nota 1 (INTAKE): Khusus Terima Servis & Servis Berjalan (BARU, PROSES)
  // Nota 2 (PICKUP): Khusus Siap Diambil & Sudah Selesai/Diambil (SIAP, DIAMBIL, BATAL)
  const isPickupOrReady = service.status === 'SIAP' || service.status === 'DIAMBIL' || isBatal;
  const receiptType: 'INTAKE' | 'PICKUP' = initialType || (isPickupOrReady ? 'PICKUP' : 'INTAKE');

  return (
    <div
      id="detailModal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 print:p-0 print:static print:bg-white"
    >
      <div
        id="detailModalCard"
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden shadow-2xl print:border-none print:shadow-none print:w-full print:max-w-full print:rounded-none print:bg-white"
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
          className="overflow-y-auto p-4 sm:p-5 flex-1 space-y-2.5 text-xs bg-white text-black print:bg-white print:text-black print:w-full print:max-w-full print:p-0"
        >
          <ReceiptBody
            service={service}
            storeSettings={storeSettings}
            receiptType={receiptType}
          />
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
              onClick={() => {
                if (onOpenPrintPreview) {
                  onOpenPrintPreview(service, receiptType);
                } else {
                  window.print();
                }
              }}
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
