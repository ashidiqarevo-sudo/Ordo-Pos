import React, { useState } from 'react';
import { CustomerAggregated } from '../types';
import { formatRupiah } from '../data/initialData';
import { Users, History, Edit3, UserX, Plus, Search, X } from 'lucide-react';
import { WhatsAppSolidIcon } from './icons/WhatsAppIcon';

interface CustomersViewProps {
  customers: CustomerAggregated[];
  searchQuery: string;
  onSearchChange?: (q: string) => void;
  onOpenCustomerHistory: (primaryKey: string) => void;
  onOpenEditCustomer: (primaryKey: string) => void;
  onOpenServiceModal: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  searchQuery,
  onSearchChange,
  onOpenCustomerHistory,
  onOpenEditCustomer,
  onOpenServiceModal,
}) => {
  const [localQuery, setLocalQuery] = useState('');
  const effectiveQuery = onSearchChange ? searchQuery : (searchQuery || localQuery);

  const handleQueryChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setLocalQuery(val);
    }
  };

  let filtered = customers;
  if (effectiveQuery.trim()) {
    const q = effectiveQuery.toLowerCase().trim();
    filtered = customers.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        c.customerPhone.toLowerCase().includes(q)
    );
  }

  const handleDirectWhatsApp = (customer: CustomerAggregated) => {
    let phone = customer.customerPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    const text = encodeURIComponent(`Halo Kak ${customer.customerName}, salam dari teknisi kami 🙏`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <section className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-lg">
        {/* Header & In-Page Search Bar */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/60 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Daftar Pelanggan
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                Kelola data kontak, riwayat servis, dan total transaksi pelanggan
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1.5 bg-zinc-900 text-white border border-zinc-700 rounded-xl text-xs font-bold w-fit">
                {filtered.length} {filtered.length !== customers.length ? `dari ${customers.length}` : ''} Pelanggan
              </span>
            </div>
          </div>

          {/* Dedicated In-Page Search Input */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={effectiveQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Cari nama pelanggan atau nomor WhatsApp..."
              className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition-all shadow-inner"
            />
            {effectiveQuery && (
              <button
                onClick={() => handleQueryChange('')}
                title="Hapus Pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Card List View (< 640px) */}
        <div className="sm:hidden divide-y divide-zinc-800/60">
          {filtered.map((c) => (
            <div
              key={c.primaryKey}
              className="p-4 space-y-3 hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => onOpenEditCustomer(c.primaryKey)}
                    title="Edit Data Pelanggan"
                    className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-emerald-500 text-zinc-300 hover:text-black border border-zinc-700/80 hover:border-emerald-500 flex items-center justify-center transition-all shrink-0 shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <div>
                    <h4 className="font-bold text-white text-xs">
                      {c.customerName}
                    </h4>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {c.customerPhone}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-zinc-800 text-emerald-400 text-[11px] font-bold border border-zinc-700">
                  {c.tickets.length} Servis
                </span>
              </div>

              <div className="flex items-center justify-between bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/60 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 block font-medium">Total Pengeluaran</span>
                  <span className="font-mono font-black text-emerald-400 text-xs">
                    {formatRupiah(c.totalSpending)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 block font-medium">Servis Terakhir</span>
                  <span className="font-mono text-zinc-300 text-xs">
                    {c.lastActive.split(' ')[0]}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => handleDirectWhatsApp(c)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-bold text-xs transition-colors flex items-center gap-1 border border-emerald-500/30"
                  title="Buka WhatsApp"
                >
                  <WhatsAppSolidIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WA</span>
                </button>
                <button
                  onClick={() => onOpenCustomerHistory(c.primaryKey)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors flex items-center gap-1 border border-zinc-700"
                >
                  <History className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Riwayat</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Tablet / Desktop Table View (>= 640px) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 text-[11px] font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                <th className="py-3.5 px-4">Nama Pelanggan</th>
                <th className="py-3.5 px-4">Nomor WhatsApp</th>
                <th className="py-3.5 px-4 text-center">Total Servis</th>
                <th className="py-3.5 px-4">Total Biaya</th>
                <th className="py-3.5 px-4">Servis Terakhir</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filtered.map((c) => (
                <tr
                  key={c.primaryKey}
                  className="hover:bg-zinc-800/40 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-bold text-white text-xs whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => onOpenEditCustomer(c.primaryKey)}
                        title="Edit Data Pelanggan"
                        className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-emerald-500 text-zinc-300 hover:text-black border border-zinc-700/80 hover:border-emerald-500 flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-95"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <div>
                        <span className="font-bold text-white block whitespace-nowrap">
                          {c.customerName}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-xs font-medium text-zinc-300 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                       <span className="whitespace-nowrap">{c.customerPhone}</span>
                       <button
                         onClick={() => handleDirectWhatsApp(c)}
                         title="Chat WhatsApp"
                         className="p-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors cursor-pointer shrink-0"
                       >
                         <WhatsAppSolidIcon className="w-3.5 h-3.5 text-emerald-400" />
                       </button>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-xs font-semibold text-zinc-200 text-center whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-emerald-400 font-bold border border-zinc-700 whitespace-nowrap inline-flex items-center">
                      {c.tickets.length} Unit HP
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-xs font-bold text-emerald-400 whitespace-nowrap font-mono">
                    {formatRupiah(c.totalSpending)}
                  </td>

                  <td className="py-3.5 px-4 text-xs text-zinc-400 whitespace-nowrap font-mono">
                    {c.lastActive.split(' ')[0]}
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleDirectWhatsApp(c)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-bold text-xs transition-colors flex items-center gap-1.5 border border-emerald-500/30 cursor-pointer"
                        title="Buka WhatsApp"
                      >
                        <WhatsAppSolidIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>
                      <button
                        onClick={() => onOpenCustomerHistory(c.primaryKey)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors flex items-center gap-1 border border-zinc-700 cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Riwayat</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
              <UserX className="w-7 h-7" />
            </div>
            {effectiveQuery ? (
              <>
                <h4 className="text-base font-bold text-zinc-300">
                  Pelanggan Tidak Ditemukan
                </h4>
                <p className="text-xs text-zinc-500 mt-1 mb-4">
                  Tidak ada data pelanggan yang cocok dengan kata kunci &quot;<span className="text-zinc-300 font-semibold">{effectiveQuery}</span>&quot;
                </p>
                <button
                  onClick={() => handleQueryChange('')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-emerald-400 font-bold text-xs hover:bg-zinc-700 border border-zinc-700 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" /> Reset Pencarian
                </button>
              </>
            ) : (
              <>
                <h4 className="text-base font-bold text-zinc-300">
                  Belum Ada Pelanggan
                </h4>
                <p className="text-xs text-zinc-500 mt-1 mb-4">
                  Data pelanggan akan otomatis tersimpan pas nerima servis.
                </p>
                <button
                  onClick={onOpenServiceModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-white font-bold text-xs hover:bg-zinc-700 border border-zinc-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-400" /> Terima Servis Baru
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
