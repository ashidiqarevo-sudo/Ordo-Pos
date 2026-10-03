import React, { useState, useEffect, useRef } from 'react';
import { ServiceItem, StoreSettings } from '../../types';
import { ReceiptBody } from '../ReceiptBody';
import { printReceiptViaIframe } from '../../utils/receiptPrint';
import { isBluetoothSupported, printReceiptViaBluetooth } from '../../utils/bluetoothPrinter';
import {
  Printer,
  X,
  Bluetooth,
  Sliders,
  AlertTriangle,
  Loader2,
  CheckCircle,
} from 'lucide-react';

interface ReceiptPrintPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceItem | null;
  storeSettings: StoreSettings;
  receiptType?: 'INTAKE' | 'PICKUP';
}

const STORAGE_KEY_PRINT_WIDTH = 'ordo_receipt_print_width';

export const ReceiptPrintPreview: React.FC<ReceiptPrintPreviewProps> = ({
  isOpen,
  onClose,
  service,
  storeSettings,
  receiptType,
}) => {
  // 1. Paper width states (58mm, 80mm, Custom)
  const [sizePreset, setSizePreset] = useState<'58' | '80' | 'custom'>('58');
  const [customWidthMm, setCustomWidthMm] = useState<number>(70);

  // 2. Print method states (System Print or Web Bluetooth)
  const [printMethod, setPrintMethod] = useState<'system' | 'bluetooth'>('system');
  const [hasBluetoothSupport, setHasBluetoothSupport] = useState<boolean>(false);

  // 3. Execution states
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const receiptRef = useRef<HTMLDivElement>(null);

  // Load saved preference from localStorage
  useEffect(() => {
    setHasBluetoothSupport(isBluetoothSupported());
    try {
      const savedWidth = localStorage.getItem(STORAGE_KEY_PRINT_WIDTH);
      if (savedWidth) {
        if (savedWidth === '58' || savedWidth === '80') {
          setSizePreset(savedWidth);
        } else {
          const num = parseInt(savedWidth, 10);
          if (!isNaN(num) && num >= 40 && num <= 120) {
            setSizePreset('custom');
            setCustomWidthMm(num);
          }
        }
      }
    } catch {
      // LocalStorage access failsafe
    }
  }, []);

  if (!isOpen || !service) return null;

  // Active width in millimeters
  const activeWidthMm =
    sizePreset === '58' ? 58 : sizePreset === '80' ? 80 : Math.max(40, Math.min(120, customWidthMm || 70));

  // Save selected width to localStorage
  const handleSizeChange = (preset: '58' | '80' | 'custom', customVal?: number) => {
    setSizePreset(preset);
    setErrorMessage(null);
    try {
      if (preset === '58' || preset === '80') {
        localStorage.setItem(STORAGE_KEY_PRINT_WIDTH, preset);
      } else {
        const val = customVal ?? customWidthMm;
        localStorage.setItem(STORAGE_KEY_PRINT_WIDTH, String(val));
      }
    } catch {
      // ignore
    }
  };

  const handlePrint = async () => {
    if (!receiptRef.current) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsPrinting(true);

    try {
      if (printMethod === 'bluetooth') {
        setStatusMessage('Mempersiapkan koneksi Bluetooth...');
        await printReceiptViaBluetooth(receiptRef.current, {
          paperWidthMm: activeWidthMm,
          onStatusChange: (status) => setStatusMessage(status),
        });
        setSuccessMessage('Nota berhasil dikirim ke printer Bluetooth!');
        setTimeout(() => {
          setIsPrinting(false);
          setStatusMessage('');
        }, 1500);
      } else {
        // System Print (via isolated iframe with zero margins)
        setStatusMessage('Membuka dialog pencetakan...');
        await printReceiptViaIframe(receiptRef.current, {
          paperWidthMm: activeWidthMm,
          onComplete: () => {
            setIsPrinting(false);
            setStatusMessage('');
          },
          onError: (err) => {
            setIsPrinting(false);
            setStatusMessage('');
            setErrorMessage(`Gagal mencetak: ${err.message || err}`);
          },
        });
      }
    } catch (err: any) {
      setIsPrinting(false);
      setStatusMessage('');
      setErrorMessage(
        err.message || 'Terjadi kesalahan saat memproses pencetakan.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        // Close on backdrop click unless printing
        if (e.target === e.currentTarget && !isPrinting) {
          onClose();
        }
      }}
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                Print Preview Nota
              </h3>
              <p className="text-[11px] text-zinc-400">
                Pilih ukuran kertas thermal dan metode cetak yang diinginkan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPrinting}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Single Page Layout (Top Controls + Live Preview) */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          {/* Controls Bar: Paper Size & Print Method */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 space-y-3">
            {/* 1. Paper Size Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ukuran Kertas Thermal:</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSizeChange('58')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sizePreset === '58'
                      ? 'bg-emerald-500 text-zinc-950 font-black shadow-xs'
                      : 'bg-zinc-950 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  58 mm (Standar)
                </button>
                <button
                  type="button"
                  onClick={() => handleSizeChange('80')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sizePreset === '80'
                      ? 'bg-emerald-500 text-zinc-950 font-black shadow-xs'
                      : 'bg-zinc-950 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  80 mm (Lebar)
                </button>
                <button
                  type="button"
                  onClick={() => handleSizeChange('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sizePreset === 'custom'
                      ? 'bg-emerald-500 text-zinc-950 font-black shadow-xs'
                      : 'bg-zinc-950 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  Custom
                </button>

                {sizePreset === 'custom' && (
                  <div className="flex items-center gap-1.5 ml-1">
                    <input
                      type="number"
                      min={40}
                      max={120}
                      value={customWidthMm}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setCustomWidthMm(isNaN(val) ? 70 : val);
                        handleSizeChange('custom', isNaN(val) ? 70 : val);
                      }}
                      className="w-16 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white font-bold text-center focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-xs text-zinc-400 font-bold">mm</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Print Method Selector */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Metode Cetak:</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPrintMethod('system');
                    setErrorMessage(null);
                  }}
                  className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    printMethod === 'system'
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-xs'
                      : 'bg-zinc-950 hover:bg-zinc-800/80 border-zinc-800 text-zinc-300'
                  }`}
                >
                  <Printer className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Print Sistem</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                        Rekomendasi
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                      Kompatibel untuk thermal USB, WiFi, printer OS, dan Save as PDF
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPrintMethod('bluetooth');
                    setErrorMessage(null);
                  }}
                  className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    printMethod === 'bluetooth'
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-xs'
                      : 'bg-zinc-950 hover:bg-zinc-800/80 border-zinc-800 text-zinc-300'
                  }`}
                >
                  <Bluetooth className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Direct Bluetooth</span>
                      {!hasBluetoothSupport && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                          Perlu Chrome/Edge
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                      Kirim langsung ke thermal BLE via Web Bluetooth tanpa driver OS
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Error & Warning Alert with Fallback */}
            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="space-y-1">
                  <p className="leading-tight">{errorMessage}</p>
                  {printMethod === 'bluetooth' && (
                    <button
                      type="button"
                      onClick={() => {
                        setPrintMethod('system');
                        setErrorMessage(null);
                      }}
                      className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                    >
                      Beralih ke Print Sistem
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Success Notification */}
            {successMessage && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>

          {/* Live Preview Paper Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400 text-xs px-1">
              <span className="font-bold">Pratinjau Hasil Cetak:</span>
              <span className="text-[10px] text-zinc-500 font-mono">
                Lebar Kertas: {activeWidthMm} mm
              </span>
            </div>

            {/* Scrollable preview viewport */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-center items-start overflow-x-auto min-h-[320px] max-h-[50vh]">
              {/* Paper roll representation with dynamic millimeter width */}
              <div
                style={{
                  width: `${activeWidthMm}mm`,
                  maxWidth: '100%',
                }}
                className="bg-white text-black shadow-2xl transition-all duration-200 border border-neutral-300 shrink-0"
              >
                <div
                  ref={receiptRef}
                  className="p-3 bg-white text-black"
                >
                  <ReceiptBody
                    service={service}
                    storeSettings={storeSettings}
                    receiptType={receiptType}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-5 py-3.5 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-zinc-400">
            {isPrinting ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{statusMessage || 'Sedang memproses...'}</span>
              </span>
            ) : (
              <span>Siap mencetak ({activeWidthMm}mm)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPrinting}
              className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs border border-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-zinc-950" />
                  <span>Cetak</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
