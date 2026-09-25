import React, { useState } from 'react';
import { StoreSettings, AuthUser } from '../../types';
import {
  Store,
  User,
  Phone,
  MapPin,
  Tag,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Upload,
} from 'lucide-react';

interface StoreSetupModalProps {
  isOpen: boolean;
  currentUser: AuthUser | null;
  initialSettings: StoreSettings;
  onComplete: (updatedSettings: StoreSettings) => void;
}

export const StoreSetupModal: React.FC<StoreSetupModalProps> = ({
  isOpen,
  currentUser,
  initialSettings,
  onComplete,
}) => {
  const [storeName, setStoreName] = useState(currentUser?.storeName || initialSettings.storeName || 'ORDO SERVIS HP');
  const [ownerName, setOwnerName] = useState(currentUser?.name || initialSettings.ownerName || 'Budi Teknisi');
  const [storeTagline, setStoreTagline] = useState(initialSettings.storeTagline || 'Pusat Servis & Ganti Sparepart HP Cepat Bergaransi');
  const [storeAddress, setStoreAddress] = useState(initialSettings.storeAddress || 'Jl. Raya Bengkel No. 42, Jakarta');
  const [storePhone, setStorePhone] = useState(currentUser?.phone || initialSettings.storePhone || '0812-3456-7890');
  const [defaultWarrantyDays, setDefaultWarrantyDays] = useState(initialSettings.defaultWarrantyDays || '14');
  const [warrantyTerms, setWarrantyTerms] = useState(
    initialSettings.warrantyTerms ||
      '1. Garansi berlaku untuk kerusakan/sparepart yang sama.\n2. Segel konter tidak boleh rusak atau terkena air.\n3. Harap bawa nota fisik atau tunjukkan bukti WhatsApp saat klaim garansi.'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StoreSettings = {
      ...initialSettings,
      storeName: storeName.trim() || 'ORDO SERVIS HP',
      storeUsername: currentUser?.storeUsername || initialSettings.storeUsername || 'jayaphone',
      ownerName: ownerName.trim() || 'Owner Konter',
      storeTagline: storeTagline.trim(),
      storeAddress: storeAddress.trim(),
      storePhone: storePhone.trim(),
      defaultWarrantyDays: defaultWarrantyDays || '14',
      warrantyTerms: warrantyTerms.trim(),
    };
    onComplete(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Setup Profil Toko */}
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-black flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black tracking-wider uppercase border border-emerald-500/30">
                Langkah Awal Konter
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                Pengaturan Profil Konter & Nota
              </h2>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Data ini akan otomatis dicetak di atas kepala nota cetak pelanggan dan pesan WhatsApp.
              </p>
            </div>
          </div>
        </div>

        {/* Form Isi Data */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Baris 1: Nama Konter & Nama Pemilik */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-emerald-500" />
                Nama Konter Servis
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="ORDO SERVIS HP"
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500 uppercase tracking-tight"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-500" />
                Nama Pemilik / Penanggung Jawab
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Budi Santoso"
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Baris 2: Tagline / Slogan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-500" />
              Slogan / Tagline Usaha
            </label>
            <input
              type="text"
              value={storeTagline}
              onChange={(e) => setStoreTagline(e.target.value)}
              placeholder="Pusat Servis & Ganti Sparepart HP Cepat Bergaransi"
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Baris 3: WhatsApp Konter & Default Garansi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                WhatsApp Konter (Untuk Nota)
              </label>
              <input
                type="text"
                required
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="0812-3456-7890"
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Standar Garansi Toko (Hari)
              </label>
              <select
                value={defaultWarrantyDays}
                onChange={(e) => setDefaultWarrantyDays(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="3">3 Hari</option>
                <option value="7">7 Hari (1 Minggu)</option>
                <option value="14">14 Hari (2 Minggu - Disarankan)</option>
                <option value="30">30 Hari (1 Bulan)</option>
                <option value="60">60 Hari (2 Bulan)</option>
                <option value="90">90 Hari (3 Bulan)</option>
              </select>
            </div>
          </div>

          {/* Baris 4: Alamat Konter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              Alamat Lengkap Konter
            </label>
            <input
              type="text"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              placeholder="Jl. Merdeka No. 12, Kel. Sukamaju, Kec. Cililitan"
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Baris 5: Ketentuan Garansi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
              Syarat & Ketentuan Garansi di Nota
            </label>
            <textarea
              rows={3}
              value={warrantyTerms}
              onChange={(e) => setWarrantyTerms(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
            ></textarea>
          </div>

          {/* Tombol Simpan & Selesai */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Simpan Profil Konter & Lanjut ke Tutorial</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
