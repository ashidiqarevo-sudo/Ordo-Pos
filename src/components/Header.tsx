import React, { useState, useRef, useEffect } from 'react';
import { ViewType, StoreSettings, ServiceItem, AuthUser } from '../types';
import { formatRupiah } from '../data/initialData';
import {
  Search,
  X,
  User,
  ArrowRight,
  Smartphone,
  Sun,
  Moon,
  HelpCircle,
  LogOut,
  MessageSquareHeart,
  Settings,
} from 'lucide-react';

interface HeaderProps {
  currentView: ViewType;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onClearSearch: () => void;
  onNavigateSettings: () => void;
  storeSettings: StoreSettings;
  services?: ServiceItem[];
  onSelectService?: (serviceId: string) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: (theme: 'dark' | 'light') => void;
  currentUser?: AuthUser | null;
  onOpenOnboarding?: () => void;
  onOpenFeedback?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  searchQuery,
  onSearchChange,
  onClearSearch,
  onNavigateSettings,
  storeSettings,
  services = [],
  onSelectService,
  theme = 'dark',
  onToggleTheme,
  currentUser,
  onOpenOnboarding,
  onOpenFeedback,
  onLogout,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const titles: Record<ViewType, { title: string; sub: string }> = {
    dashboard: {
      title: 'Dashboard',
      sub: '• Ringkasan servis hari ini',
    },
    customers: {
      title: 'Pelanggan',
      sub: '• Data pelanggan & riwayat servis',
    },
    board: {
      title: 'Servis Berjalan',
      sub: '• HP yang sedang diservis',
    },
    ready: {
      title: 'Siap Diambil',
      sub: '• HP yang sudah selesai dan siap diambil',
    },
    history: {
      title: 'Riwayat Servis',
      sub: '• Riwayat HP yang sudah selesai',
    },
    accounting: {
      title: 'Catatan Uang',
      sub: '• Uang masuk, biaya sparepart, dan keuntungan',
    },
    settings: {
      title: 'Pengaturan Toko',
      sub: '• Atur info toko, WhatsApp, dan data',
    },
    landing: {
      title: 'Halaman Depan',
      sub: '• Informasi & pengenalan Ordo V0',
    },
  };

  const currentInfo = titles[currentView] || { title: 'Servis HP', sub: '' };

  // Global search filtering
  const query = searchQuery.trim().toLowerCase();
  const searchResults = query
    ? services.filter(
        (s) =>
          s.ticketNo.toLowerCase().includes(query) ||
          s.customerName.toLowerCase().includes(query) ||
          s.customerPhone.toLowerCase().includes(query) ||
          s.deviceModel.toLowerCase().includes(query) ||
          s.complaints.some((c) => c.toLowerCase().includes(query)) ||
          (s.diagnosis && s.diagnosis.toLowerCase().includes(query))
      )
    : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusBadge = (status: ServiceItem['status']) => {
    switch (status) {
      case 'BARU':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'PROSES':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'SIAP':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'DIAMBIL':
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
      case 'BATAL':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-4 shadow-xs no-print">
      <div className="flex items-center gap-2.5 min-w-0 shrink-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 dark:text-white whitespace-nowrap tracking-tight">
            {currentInfo.title}
          </h2>
          <span className="text-xs text-slate-500 dark:text-zinc-400 hidden lg:inline truncate font-medium">
            {currentInfo.sub}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 flex-1 justify-end max-w-2xl min-w-0">
        {/* Global Search Bar */}
        <div ref={containerRef} className="relative w-full max-w-xs md:max-w-sm lg:max-w-md hidden md:block">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setIsDropdownOpen(true)}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setIsDropdownOpen(true);
            }}
            placeholder="Cari nota, nama pelanggan, tipe HP, keluhan..."
            className="w-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-black focus:border-emerald-500 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-medium shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => {
                onClearSearch();
                setIsDropdownOpen(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Floating Dropdown Results */}
          {isDropdownOpen && query && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 max-h-80 overflow-y-auto space-y-1 text-xs">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center justify-between border-b border-slate-200 dark:border-zinc-800/80">
                <span>Hasil Pencarian Global ({searchResults.length})</span>
                <span className="text-slate-400 dark:text-zinc-500">Tekan item untuk buka nota</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="py-6 text-center text-slate-500 dark:text-zinc-500 text-xs">
                  Tidak ditemukan servis dengan kata kunci &quot;{searchQuery}&quot;
                </div>
              ) : (
                searchResults.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (onSelectService) {
                        onSelectService(s.id);
                      }
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors flex items-center justify-between gap-3 group cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-zinc-800"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                          {s.ticketNo}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-lg font-medium border uppercase ${getStatusBadge(
                            s.status
                          )}`}
                        >
                          {s.status}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5 truncate flex items-center gap-1.5">
                        <Smartphone className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
                        <span>{s.deviceModel}</span>
                        <span className="text-slate-400 dark:text-zinc-500 font-normal">
                          • {s.customerName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate font-normal">
                        {s.complaints.join(', ')}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        {formatRupiah(s.finalCost || s.estimatedCost)}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-400 group-hover:text-emerald-500 flex items-center justify-end gap-0.5 mt-0.5 font-medium">
                        Buka <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Owner Profile & Theme Shortcut */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Theme Toggle Button (Dark / Light) */}
          {onToggleTheme && (
            <button
              onClick={() => onToggleTheme(theme === 'dark' ? 'light' : 'dark')}
              title={
                theme === 'dark'
                  ? 'Ganti ke Tema Terang (Light Mode)'
                  : 'Ganti ke Tema Gelap (Dark Mode)'
              }
              aria-label="Toggle Dark / Light Mode"
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800/90 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-700/80 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          )}

          {/* Panduan Tutorial Icon */}
          {onOpenOnboarding && (
            <button
              type="button"
              onClick={onOpenOnboarding}
              title="Buka Buku Panduan / Tutorial"
              aria-label="Buku Panduan"
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800/90 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-700/80 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
            >
              <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </button>
          )}

          {/* Tombol Kritik & Saran (di kanan tombol Buku Panduan) */}
          {onOpenFeedback && (
            <button
              type="button"
              onClick={onOpenFeedback}
              title="Kritik & Saran Pengembang"
              aria-label="Kritik & Saran"
              className="w-8 h-8 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 border border-amber-500/30 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
            >
              <MessageSquareHeart className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </button>
          )}

          {/* Profil Pemilik - Nama Menonjol */}
          <div
            onClick={onNavigateSettings}
            className="flex items-center gap-2 sm:gap-3 pl-1.5 sm:pl-2 py-1 sm:py-1.5 pr-1.5 sm:pr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer group"
            title="Klik untuk buka Pengaturan Profil Pemilik & Toko"
          >
            <div className="hidden sm:flex flex-col items-end gap-0.5">
              <span className="text-[13px] font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                {storeSettings.ownerName || currentUser?.name || 'Pemilik Toko'}
                <span
                  className="inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50"
                  title="Aktif & Terhubung"
                ></span>
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 group-hover:text-slate-700 dark:group-hover:text-zinc-300">
                {storeSettings.storeName || 'Ordo Servis HP'}
              </span>
            </div>

            {/* Avatar / Foto Logo */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-zinc-800 border-2 border-slate-300 dark:border-zinc-700 group-hover:border-emerald-500 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-600 dark:group-hover:text-white group-hover:bg-emerald-500/10 dark:group-hover:bg-emerald-500/20 transition-all shadow-inner overflow-hidden shrink-0">
              {/* Layar Komputer / Desktop (>= lg): Tampilkan Foto Logo Toko */}
              <div className="hidden lg:block w-full h-full">
                {storeSettings.logoUrl ? (
                  <img
                    src={storeSettings.logoUrl}
                    alt={storeSettings.storeName || 'Logo'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Layar Tablet & HP (< lg): Tombol Gear Settings */}
              <div className="flex lg:hidden w-full h-full items-center justify-center text-slate-700 dark:text-zinc-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
