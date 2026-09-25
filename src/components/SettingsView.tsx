import React, { useState, useEffect, useRef } from 'react';
import { StoreSettings, AuthUser } from '../types';
import {
  Store,
  MessageSquare,
  Save,
  Database,
  Download,
  Upload,
  Trash2,
  Sun,
  Moon,
  Check,
  ImageIcon,
  X,
  Crop,
  LogOut,
  UserCheck,
  AlertTriangle,
  CloudUpload,
  RefreshCw,
} from 'lucide-react';
import { LogoCropperModal } from './modals/LogoCropperModal';

interface SettingsViewProps {
  settings: StoreSettings;
  onSaveSettings: (newSettings: StoreSettings) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onResetDatabase: () => void;
  onLoadDemoData?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: (newTheme: 'dark' | 'light') => void;
  onOpenStoreSetup?: () => void;
  onOpenOnboarding?: () => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  /** Opsional: upload logo ke Storage, kembalikan public URL */
  onUploadLogo?: (base64: string) => Promise<string>;
  /** Fase 8: Handler sinkronisasi data offline/lokal ke Supabase Cloud */
  onSyncOfflineData?: () => Promise<void>;
  isSyncingOffline?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onExportBackup,
  onImportBackup,
  onResetDatabase,
  onLoadDemoData,
  theme,
  onToggleTheme,
  onOpenStoreSetup,
  onOpenOnboarding,
  currentUser,
  onLogout,
  onUploadLogo,
  onSyncOfflineData,
  isSyncingOffline = false,
}) => {
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [cropperModalOpen, setCropperModalOpen] = useState(false);
  const [tempLogoSrc, setTempLogoSrc] = useState<string>('');
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isLocalSyncing, setIsLocalSyncing] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerSync = async () => {
    if (!onSyncOfflineData) return;
    setIsLocalSyncing(true);
    try {
      await onSyncOfflineData();
    } finally {
      setIsLocalSyncing(false);
    }
  };

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resetModalOpen && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resetModalOpen, countdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran gambar logo maksimal 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setTempLogoSrc(base64);
        setCropperModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleAdjustExistingLogo = () => {
    if (formData.logoUrl) {
      setTempLogoSrc(formData.logoUrl);
      setCropperModalOpen(true);
    }
  };

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleConfirmCroppedLogo = async (croppedBase64: string) => {
    // Tutup cropper dulu agar UX tidak tertahan
    setCropperModalOpen(false);
    setTempLogoSrc('');

    if (onUploadLogo) {
      // Upload ke Supabase Storage; fallback ke Base64 jika gagal
      setIsUploadingLogo(true);
      try {
        const logoUrl = await onUploadLogo(croppedBase64);
        setFormData((prev) => ({ ...prev, logoUrl }));
      } catch {
        // Jika upload gagal, simpan Base64 sebagai fallback lokal
        setFormData((prev) => ({ ...prev, logoUrl: croppedBase64 }));
      } finally {
        setIsUploadingLogo(false);
      }
    } else {
      // Tidak ada handler upload → simpan Base64 langsung (mode offline)
      setFormData((prev) => ({ ...prev, logoUrl: croppedBase64 }));
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
    }
    e.target.value = '';
  };

  return (
    <section className="space-y-6 animate-in fade-in duration-200">
      {/* Tema Tampilan (Mode Gelap & Terang) */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-zinc-950 text-emerald-400 border border-zinc-800">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Tema Tampilan Aplikasi
              </h3>
              <p className="text-xs text-zinc-400">
                Pilih mode gelap (Dark Emerald) atau mode terang (Clean Light)
              </p>
            </div>
          </div>

          {/* Quick Toggle Button */}
          <button
            type="button"
            onClick={() => onToggleTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto shadow-sm"
            title={`Beralih ke Mode ${theme === 'dark' ? 'Terang' : 'Gelap'}`}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-white">Ganti ke Mode Terang</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-emerald-500" />
                <span className="text-white">Ganti ke Mode Gelap</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Dark Mode Card */}
          <button
            type="button"
            onClick={() => onToggleTheme('dark')}
            className={`p-4 rounded-lg border text-left flex items-start gap-3 transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-zinc-950 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700 opacity-70 hover:opacity-100'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-zinc-900 border-emerald-500/40 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              <Moon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">
                  Mode Gelap (Dark Emerald)
                </span>
                {theme === 'dark' && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <Check className="w-3 h-3" /> Aktif
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Nuansa hitam elegan dengan aksen emerald. Nyaman di mata untuk malam hari dan hemat daya layar.
              </p>
            </div>
          </button>

          {/* Light Mode Card */}
          <button
            type="button"
            onClick={() => onToggleTheme('light')}
            className={`p-4 rounded-lg border text-left flex items-start gap-3 transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-zinc-950 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700 opacity-70 hover:opacity-100'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg border ${
                theme === 'light'
                  ? 'bg-zinc-900 border-emerald-500/40 text-amber-500'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              <Sun className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">
                  Mode Terang (Clean Light)
                </span>
                {theme === 'light' && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <Check className="w-3 h-3" /> Aktif
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Tampilan cerah, bersih, dan kontras tinggi. Sangat mudah dibaca saat bekerja di tempat terang atau siang hari.
              </p>
            </div>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Konter & Nota */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-zinc-950 text-emerald-400 border border-zinc-800">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Info Konter & Nota
                </h3>
                <p className="text-xs text-zinc-400">
                  Nama ini bakal muncul di nota & pesan WhatsApp
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenStoreSetup && (
                <button
                  type="button"
                  onClick={onOpenStoreSetup}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Buka Wizard Setup</span>
                </button>
              )}
              {onOpenOnboarding && (
                <button
                  type="button"
                  onClick={onOpenOnboarding}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Tutorial 4 Langkah</span>
                </button>
              )}
            </div>
          </div>

          {/* Upload Logo Toko */}
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full bg-zinc-900 border-2 border-emerald-500/50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group">
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt="Logo Toko"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-500">
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-[9px] mt-0.5 font-bold">No Logo</span>
                  </div>
                )}
                {/* Overlay spinner saat sedang upload ke Storage */}
                {isUploadingLogo && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <svg className="animate-spin w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  Logo Toko / Konter
                  {formData.logoUrl && (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                      Terpasang
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-zinc-400 max-w-sm">
                  Foto logo akan otomatis muncul di <b>Nota Cetak</b> dan di <b>Pojok Kanan Atas</b> header. Format: PNG, JPG, WebP (maks. 2MB).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap justify-end">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-zinc-700 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isUploadingLogo ? 'Mengunggah...' : formData.logoUrl ? 'Ganti Foto' : 'Upload Foto'}</span>
              </button>
              {formData.logoUrl && (
                <>
                  <button
                    type="button"
                    onClick={handleAdjustExistingLogo}
                    title="Atur Posisi, Zoom, atau Putar Logo"
                    className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-zinc-700 cursor-pointer"
                  >
                    <Crop className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Atur Posisi</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    title="Hapus Logo"
                    className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center gap-1 transition-all border border-rose-500/30 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                Nama Konter <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={(e) =>
                  setFormData({ ...formData, storeName: e.target.value })
                }
                placeholder="Contoh: ORDO SERVIS HP"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-white font-bold focus:bg-black focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1 flex items-center justify-between">
                <span>Username Toko</span>
                <span className="text-[10px] text-zinc-500 font-normal">Identitas Unik Toko</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 font-mono font-bold text-xs">
                  @
                </span>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={formData.storeUsername || 'jayaphone'}
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg pl-8 pr-3.5 py-2.5 text-emerald-400 font-mono font-bold cursor-not-allowed opacity-90"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                Nama Pemilik
              </label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) =>
                  setFormData({ ...formData, ownerName: e.target.value })
                }
                placeholder="Contoh: Ashidiq"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-white focus:bg-black focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                Slogan Konter
              </label>
              <input
                type="text"
                value={formData.storeTagline}
                onChange={(e) =>
                  setFormData({ ...formData, storeTagline: e.target.value })
                }
                placeholder="Contoh: Pusat Servis & Ganti Sparepart"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-white focus:bg-black focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                Nomor WA Konter <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.storePhone}
                onChange={(e) =>
                  setFormData({ ...formData, storePhone: e.target.value })
                }
                placeholder="08xxxxxxxxxx"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-white font-mono font-bold focus:bg-black focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-zinc-300 font-bold mb-1">
                Alamat Lengkap <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.storeAddress}
                onChange={(e) =>
                  setFormData({ ...formData, storeAddress: e.target.value })
                }
                placeholder="Contoh: Jl. Raya Bengkel No. 42, RT 01/RW 02"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-white focus:bg-black focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                Standar Garansi Toko
              </label>
              <select
                value={formData.defaultWarrantyDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultWarrantyDays: e.target.value,
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-white font-bold focus:bg-black focus:border-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="7">7 Hari (Standar)</option>
                <option value="14">14 Hari (2 Minggu)</option>
                <option value="30">30 Hari (1 Bulan)</option>
                <option value="60">60 Hari (2 Bulan)</option>
                <option value="0">Non-Garansi</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-zinc-300 font-bold mb-1">
                Syarat & Ketentuan Garansi
              </label>
              <textarea
                rows={3}
                value={formData.warrantyTerms}
                onChange={(e) =>
                  setFormData({ ...formData, warrantyTerms: e.target.value })
                }
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-white text-xs focus:bg-black focus:border-emerald-500 focus:outline-none leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* WhatsApp Templates */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-zinc-950 text-emerald-400 border border-zinc-800">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Template Pesan WhatsApp Otomatis
                </h3>
                <p className="text-xs text-zinc-400">
                  Sesuaikan teks pesan otomatis untuk setiap tahap proses servis
                </p>
              </div>
            </div>
            <div className="text-[11px] text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 font-mono">
              Tag: {'{nama}'}, {'{unit}'}, {'{nota}'}, {'{biaya}'}, {'{dp}'}, {'{sisa}'}, {'{toko}'}
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Template 1: Terima Servis */}
            <div className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-emerald-400 font-bold">
                  1. Template Tanda Terima Servis (Saat Terima HP)
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">Tag tambahan: {'{keluhan}'}</span>
              </div>
              <textarea
                rows={4}
                value={formData.waIntakeMsg || ''}
                onChange={(e) =>
                  setFormData({ ...formData, waIntakeMsg: e.target.value })
                }
                placeholder="Template tanda terima masuk..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white font-mono text-xs focus:bg-black focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Template 2: Diagnosis & Estimasi */}
            <div className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-emerald-400 font-bold">
                  2. Template Konfirmasi Diagnosis & Estimasi Biaya
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">Tag tambahan: {'{diagnosis}'}</span>
              </div>
              <textarea
                rows={4}
                value={formData.waDiagnosisMsg || ''}
                onChange={(e) =>
                  setFormData({ ...formData, waDiagnosisMsg: e.target.value })
                }
                placeholder="Template konfirmasi diagnosis..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white font-mono text-xs focus:bg-black focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Template 3: Selesai / Siap Diambil */}
            <div className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-lg space-y-2">
              <label className="block text-amber-400 font-bold">
                3. Template Servis Selesai (Unit Siap Diambil)
              </label>
              <textarea
                rows={4}
                value={formData.waReadyMsg}
                onChange={(e) =>
                  setFormData({ ...formData, waReadyMsg: e.target.value })
                }
                placeholder="Template notifikasi siap ambil..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white font-mono text-xs focus:bg-black focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Template 4: Diambil & Garansi */}
              <div className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-emerald-300 font-bold">
                    4. Penyerahan Unit & Garansi (Servis Jadi)
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">{'{garansi}'}</span>
                </div>
                <textarea
                  rows={4}
                  value={formData.waDoneMsg}
                  onChange={(e) =>
                    setFormData({ ...formData, waDoneMsg: e.target.value })
                  }
                  placeholder="Template penyerahan unit..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white font-mono text-xs focus:bg-black focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Template 5: Pembatalan Servis (Siap Diambil) */}
              <div className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-amber-400 font-bold">
                    5. Pembatalan Servis (Siap Diambil)
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">{'{alasan}'}</span>
                </div>
                <textarea
                  rows={4}
                  value={formData.waCancelMsg || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, waCancelMsg: e.target.value })
                  }
                  placeholder="Template pembatalan saat unit siap diambil..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white font-mono text-xs focus:bg-black focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Template 6: Serah Terima Unit Batal (Saat Diambil) */}
              <div className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-lg space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="block text-rose-400 font-bold">
                    6. Serah Terima Unit Batal (Saat HP Diambil Pemilik)
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">{'{alasan}'}</span>
                </div>
                <textarea
                  rows={4}
                  value={formData.waCancelPickupMsg || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, waCancelPickupMsg: e.target.value })
                  }
                  placeholder="Template serah terima saat HP batal diambil..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white font-mono text-xs focus:bg-black focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-emerald-100 hover:bg-emerald-200/90 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/90 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 font-bold text-xs shadow-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </form>

      {/* Backup & Restore */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
          <div className="p-2 rounded-lg bg-zinc-950 text-emerald-400 border border-zinc-800">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Backup & Pulihkan Data
            </h3>
            <p className="text-xs text-zinc-400">
              Simpan data ke laptop/HP atau balikin data lama
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-bold text-white block">Backup Data</span>
              <p className="text-[11px] text-zinc-400 mt-1">
                Download semua data servis dan catatan uang (file JSON).
              </p>
            </div>
            <button
              type="button"
              onClick={onExportBackup}
              className="w-full py-2.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs border border-zinc-700 flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download Backup</span>
            </button>
          </div>

          <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-bold text-white block">Pulihkan Data</span>
              <p className="text-[11px] text-zinc-400 mt-1">
                Masukin file backup JSON ke aplikasi ini.
              </p>
            </div>
            <div>
              <label className="w-full py-2.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs border border-zinc-700 flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Pilih File Backup</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
            </div>
          </div>

          <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-bold text-zinc-300 block">
                Hapus Semua Data
              </span>
              <p className="text-[11px] text-zinc-400 mt-1">
                Kosongin data. Mulai dari awal lagi.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCountdown(5);
                setResetModalOpen(true);
              }}
              className="w-full py-2.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-rose-400 font-bold text-xs border border-zinc-700 flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Semua</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fase 8: Migration Helper - Sinkronisasi Data Offline ke Cloud */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-zinc-950 text-emerald-400 border border-zinc-800">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Sinkronisasi Data Offline ke Cloud
              </h3>
              <p className="text-xs text-zinc-400">
                Pindahkan data servis, pelanggan, dan buku kas lokal dari browser ke database Supabase
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 self-start sm:self-auto">
            Supabase Cloud Sync
          </span>
        </div>

        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                Migrasi Riwayat Transaksi Browser
              </span>
              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                Aman & Tanpa Duplikasi
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Tekan tombol ini jika Anda sebelumnya membuat nota atau kas saat mode offline atau sebelum login, dan ingin menyimpan seluruh riwayat tersebut secara permanen ke akun toko Anda di Supabase.
            </p>
          </div>

          <div className="shrink-0 self-end sm:self-auto">
            <button
              type="button"
              disabled={isLocalSyncing || isSyncingOffline || !onSyncOfflineData}
              onClick={handleTriggerSync}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 ${
                isLocalSyncing || isSyncingOffline
                  ? 'bg-zinc-800 text-zinc-400 border border-zinc-700 cursor-not-allowed opacity-80'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-emerald-950/40'
              }`}
            >
              {isLocalSyncing || isSyncingOffline ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                  <span>Menyinkronkan ke Cloud...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  <span>Sinkronkan Data Offline ke Cloud</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sesi Akun Pemilik & Tombol Keluar */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
          <div className="p-2 rounded-lg bg-zinc-950 text-emerald-400 border border-zinc-800">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Akun Pemilik & Sesi Login</h3>
            <p className="text-xs text-zinc-400">
              Kelola status sesi login dan keluar dari aplikasi
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-zinc-950 border border-zinc-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {formData.ownerName || currentUser?.name || 'Pemilik Toko'}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                Sesi Aktif
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              {currentUser?.email || formData.storePhone || 'Akun Administrator Konter'}
            </p>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar dari Akun (Logout)</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Modal Preview & Adjust Logo */}
      <LogoCropperModal
        isOpen={cropperModalOpen}
        imageSrc={tempLogoSrc}
        onClose={() => {
          setCropperModalOpen(false);
          setTempLogoSrc('');
        }}
        onConfirm={handleConfirmCroppedLogo}
      />

      {/* Modal Konfirmasi Peringatan Hapus Data (dengan Hitungan Mundur 5 detik) */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/30 shrink-0">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-white">
                  PERINGATAN: Hapus Semua Data Toko
                </h3>
                <p className="text-xs text-rose-400 font-medium">
                  Tindakan ini bersifat permanen dan tidak dapat dibatalkan!
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 text-xs text-zinc-300">
              <p className="font-semibold text-zinc-200">
                Hal-hal yang akan terjadi jika data dihapus:
              </p>
              <ul className="space-y-1.5 list-disc list-inside text-zinc-400">
                <li>
                  <strong className="text-rose-400">Seluruh tiket servis & riwayat</strong> HP baru, proses, siap diambil, dan selesai akan terhapus.
                </li>
                <li>
                  <strong className="text-rose-400">Seluruh catatan buku kas masuk & kas keluar</strong> akan dikosongkan.
                </li>
                <li>
                  <strong className="text-rose-400">Pengaturan toko</strong> akan direset kembali ke awal.
                </li>
              </ul>
            </div>

            {countdown > 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs text-amber-300 font-medium">
                <span>Tombol hapus aktif dalam hitungan mundur:</span>
                <span className="text-base font-mono font-black text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                  {countdown}s
                </span>
              </div>
            ) : (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 font-bold text-center">
                Waktu konfirmasi selesai. Tekan tombol merah di bawah untuk menghapus.
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold border border-zinc-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={countdown > 0}
                onClick={() => {
                  setResetModalOpen(false);
                  onResetDatabase();
                }}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-lg ${
                  countdown > 0
                    ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-75'
                    : 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-500 shadow-rose-600/30 cursor-pointer active:scale-95'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {countdown > 0
                    ? `Tunggu (${countdown}s)`
                    : 'Ya, Hapus Semua Data Sekarang'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
