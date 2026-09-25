import React, { useState, useEffect } from 'react';
import { CustomerAggregated } from '../../types';
import { UserCog, X, Info, Check } from 'lucide-react';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerAggregated | null;
  onSubmit: (originalKey: string, newName: string, newPhone: string) => void;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (customer) {
      setName(customer.customerName);
      setPhone(customer.customerPhone);
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(customer.primaryKey, name.trim(), phone.trim() || 'Tanpa WA');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-zinc-900 text-emerald-400 border border-zinc-800">
              <UserCog className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                Edit Data Pelanggan
              </h3>
              <p className="text-[11px] text-zinc-400">
                Pembaruan nama atau kontak akan masuk ke semua nota
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="my-4 space-y-3.5 text-xs">
          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              Nama Lengkap <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-bold focus:bg-black focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              Nomor WhatsApp / HP <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:bg-black focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>
              Nama atau nomor yang diubah bakal ngefek ke semua riwayat servis
              orang ini.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 font-bold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-black flex items-center gap-1.5 shadow-sm hover:bg-emerald-400 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-black" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
