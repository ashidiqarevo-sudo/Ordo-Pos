import React, { useState, useEffect } from 'react';
import { CashEntry } from '../../types';
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  X,
  Check,
  Banknote,
  Landmark,
  QrCode,
} from 'lucide-react';

interface CashEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCashEntry?: (entry: Omit<CashEntry, 'id' | 'createdAt'>) => void;
  onSubmit?: (entry: Omit<CashEntry, 'id' | 'createdAt'>) => void;
  defaultType?: 'IN' | 'OUT' | 'TRANSFER';
}

export const CashEntryModal: React.FC<CashEntryModalProps> = ({
  isOpen,
  onClose,
  onAddCashEntry,
  onSubmit,
  defaultType = 'OUT',
}) => {
  const [type, setType] = useState<'IN' | 'OUT' | 'TRANSFER'>(defaultType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'TUNAI' | 'BCA' | 'QRIS'>('TUNAI');
  const [transferFrom, setTransferFrom] = useState<'TUNAI' | 'BCA' | 'QRIS'>('TUNAI');
  const [transferTo, setTransferTo] = useState<'TUNAI' | 'BCA' | 'QRIS'>('BCA');

  const [date, setDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setAmountStr('');
      setNotes('');
      setPaymentMethod('TUNAI');
      setTransferFrom('TUNAI');
      setTransferTo('BCA');
      const today = new Date();
      const y = today.getFullYear();
      const m = (today.getMonth() + 1).toString().padStart(2, '0');
      const d = today.getDate().toString().padStart(2, '0');
      setDate(`${y}-${m}-${d}`);
    }
  }, [isOpen, defaultType]);

  if (!isOpen) return null;

  const handleQuickAmount = (val: number) => {
    const current = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;
    setAmountStr((current + val).toString());
  };

  const getChannelName = (channel: 'TUNAI' | 'BCA' | 'QRIS') => {
    if (channel === 'TUNAI') return 'Uang Tunai (Laci Kasir)';
    if (channel === 'BCA') return 'Transfer BCA (Rekening)';
    return 'QRIS Konter (Statis)';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amountStr.replace(/\D/g, ''), 10);
    if (!numAmount || numAmount <= 0) {
      return;
    }
    if (!notes.trim()) {
      return;
    }

    if (type === 'TRANSFER' && transferFrom === transferTo) {
      alert('Sumber dana dan tujuan dana pemindahan tidak boleh sama!');
      return;
    }

    let category = '';
    if (type === 'IN') {
      category = `Masukan Uang (${getChannelName(paymentMethod)})`;
    } else if (type === 'OUT') {
      category = `Keluarkan Uang (${getChannelName(paymentMethod)})`;
    } else {
      category = `Pemindahan (${transferFrom} ➔ ${transferTo})`;
    }

    const payload: Omit<CashEntry, 'id' | 'createdAt'> = {
      type,
      amount: numAmount,
      category,
      notes: notes.trim(),
      date,
      paymentMethod: type === 'TRANSFER' ? undefined : paymentMethod,
      transferFrom: type === 'TRANSFER' ? transferFrom : undefined,
      transferTo: type === 'TRANSFER' ? transferTo : undefined,
    };

    if (onAddCashEntry) {
      onAddCashEntry(payload);
    }
    if (onSubmit) {
      onSubmit(payload);
    }

    setAmountStr('');
    setNotes('');
    onClose();
  };

  const currentAmount = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col p-5 sm:p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border ${
                type === 'IN'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : type === 'OUT'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              }`}
            >
              {type === 'IN' ? (
                <ArrowDownRight className="w-5 h-5" />
              ) : type === 'OUT' ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : (
                <ArrowLeftRight className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                {type === 'IN'
                  ? 'Masukan Uang'
                  : type === 'OUT'
                  ? 'Keluarkan Uang'
                  : 'Pemindahan Uang (Transfer Kas)'}
              </h3>
              <p className="text-xs text-zinc-400">
                {type === 'IN'
                  ? 'Catat uang masuk ke kas toko'
                  : type === 'OUT'
                  ? 'Catat uang keluar dari kas toko'
                  : 'Pindahkan saldo antar Tunai, Bank BCA, atau QRIS'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tipe Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 mt-3 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setType('IN')}
            className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              type === 'IN'
                ? 'bg-emerald-500 text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Masuk</span>
          </button>
          <button
            type="button"
            onClick={() => setType('OUT')}
            className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              type === 'OUT'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
          <button
            type="button"
            onClick={() => setType('TRANSFER')}
            className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              type === 'TRANSFER'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Pindah Kas</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-3.5 space-y-3.5">
          {/* TRANSFER SPECIFIC: Sumber Dana -> Tujuan Dana */}
          {type === 'TRANSFER' && (
            <div className="space-y-3 p-3 bg-zinc-900/90 rounded-xl border border-blue-500/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Dari Akun */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1">
                    <span>Sumber Dana (Dari):</span>
                  </label>
                  <select
                    value={transferFrom}
                    onChange={(e) => {
                      const val = e.target.value as 'TUNAI' | 'BCA' | 'QRIS';
                      setTransferFrom(val);
                      if (val === transferTo) {
                        setTransferTo(val === 'TUNAI' ? 'BCA' : 'TUNAI');
                      }
                    }}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs font-bold text-white focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="TUNAI">💵 Tunai (Laci Kasir)</option>
                    <option value="BCA">🏦 Transfer BCA (Rekening)</option>
                    <option value="QRIS">📱 QRIS Konter (Statis)</option>
                  </select>
                </div>

                {/* Ke Akun */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1">
                    <span>Tujuan Dana (Ke):</span>
                  </label>
                  <select
                    value={transferTo}
                    onChange={(e) => {
                      const val = e.target.value as 'TUNAI' | 'BCA' | 'QRIS';
                      setTransferTo(val);
                      if (val === transferFrom) {
                        setTransferFrom(val === 'TUNAI' ? 'BCA' : 'TUNAI');
                      }
                    }}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs font-bold text-white focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="BCA">🏦 Transfer BCA (Rekening)</option>
                    <option value="TUNAI">💵 Tunai (Laci Kasir)</option>
                    <option value="QRIS">📱 QRIS Konter (Statis)</option>
                  </select>
                </div>
              </div>

              {/* Quick Template Chips for Transfer */}
              <div className="pt-1">
                <span className="text-[10px] text-zinc-400 font-semibold block mb-1.5">
                  Template Cepat Pemindahan:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setTransferFrom('TUNAI');
                      setTransferTo('BCA');
                      setNotes('Setor tunai laci kasir ke rekening bank BCA');
                    }}
                    className="px-2 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    Setor Tunai ke BCA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTransferFrom('BCA');
                      setTransferTo('TUNAI');
                      setNotes('Tarik uang dari BCA untuk kas laci kasir');
                    }}
                    className="px-2 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    Tarik Tunai ke Kasir
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTransferFrom('QRIS');
                      setTransferTo('BCA');
                      setNotes('Pencairan settlement saldo QRIS ke rekening BCA');
                    }}
                    className="px-2 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    Cairkan QRIS ke BCA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTransferFrom('QRIS');
                      setTransferTo('TUNAI');
                      setNotes('Pencairan saldo QRIS ke tunai kasir');
                    }}
                    className="px-2 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    Cairkan QRIS ke Tunai
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* IN / OUT SPECIFIC: Akun / Metode Kas */}
          {type !== 'TRANSFER' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 block">
                Akun / Posisi Kas
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('TUNAI')}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'TUNAI'
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Banknote className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] font-bold truncate">Tunai Laci</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('BCA')}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'BCA'
                      ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Landmark className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] font-bold truncate">BCA Bank</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('QRIS')}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'QRIS'
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] font-bold truncate">QRIS</span>
                </button>
              </div>
            </div>
          )}

          {/* Nominal */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 block">
              Jumlah Nominal (Rp) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-sm text-zinc-400">
                Rp
              </span>
              <input
                type="text"
                required
                autoFocus
                value={amountStr ? parseInt(amountStr.replace(/\D/g, ''), 10).toLocaleString('id-ID') : ''}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0"
                className={`w-full pl-10 pr-4 py-2.5 bg-zinc-900 border rounded-xl text-sm font-black text-white placeholder-zinc-500 outline-none ${
                  type === 'IN'
                    ? 'border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                    : type === 'OUT'
                    ? 'border-zinc-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                }`}
              />
            </div>

            {/* Quick amount chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {[25000, 50000, 100000, 200000, 500000, 1000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[11px] font-bold hover:text-white transition-colors cursor-pointer"
                >
                  +{val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}rb`}
                </button>
              ))}
              {currentAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmountStr('')}
                  className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Tanggal Transaksi */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 block">
              Tanggal Transaksi
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-bold text-white outline-none ${
                type === 'IN'
                  ? 'focus:border-emerald-500'
                  : type === 'OUT'
                  ? 'focus:border-rose-500'
                  : 'focus:border-blue-500'
              }`}
            />
          </div>

          {/* Catatan / Keterangan Keperluan */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 block">
                Catatan / Keterangan Keperluan <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] text-zinc-500">Wajib diisi</span>
            </div>
            <textarea
              required
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                type === 'IN'
                  ? 'Contoh: Penjualan tempered glass 3 pcs / casing / modal awal'
                  : type === 'OUT'
                  ? 'Contoh: Beli LCD Redmi Note 10 / bayar token listrik / beli solder'
                  : 'Contoh: Setor tunai dari laci kasir ke rekening BCA'
              }
              className={`w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-medium text-white placeholder-zinc-500 outline-none resize-none ${
                type === 'IN'
                  ? 'focus:border-emerald-500'
                  : type === 'OUT'
                  ? 'focus:border-rose-500'
                  : 'focus:border-blue-500'
              }`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!currentAmount || !notes.trim()}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer ${
                type === 'IN'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                  : type === 'OUT'
                  ? 'bg-rose-500 hover:bg-rose-400 text-black shadow-rose-500/20'
                  : 'bg-blue-500 hover:bg-blue-400 text-white shadow-blue-500/20'
              } disabled:opacity-50 disabled:pointer-events-none`}
            >
              <Check className="w-4 h-4" />
              <span>
                Simpan{' '}
                {type === 'IN'
                  ? 'Masukan Uang'
                  : type === 'OUT'
                  ? 'Keluarkan Uang'
                  : 'Pemindahan Uang'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
