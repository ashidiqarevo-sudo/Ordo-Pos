import React from 'react';
import { ViewType, StoreSettings, AuthUser } from '../types';
import { OrdoLogo } from './OrdoLogo';
import {
  LayoutDashboard,
  Users,
  Table2,
  CheckSquare,
  Archive,
  Calculator,
  Store,
  PlusCircle,
  HelpCircle,
  LogOut,
  Shield,
  Compass,
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onOpenServiceModal: () => void;
  storeSettings: StoreSettings;
  counts: {
    total: number;
    customers: number;
    active: number;
    ready: number;
    history: number;
  };
  currentUser?: AuthUser | null;
  onOpenOnboarding?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  onOpenServiceModal,
  storeSettings,
  counts,
  currentUser,
  onOpenOnboarding,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ViewType,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: '',
      showBadgeAlways: false,
    },
    {
      id: 'customers' as ViewType,
      label: 'Pelanggan',
      icon: Users,
      badge: counts.customers.toString(),
      showBadgeAlways: false,
    },
    {
      id: 'board' as ViewType,
      label: 'Servis Berjalan',
      icon: Table2,
      badge: counts.active.toString(),
      badgeClass:
        currentView === 'board'
          ? 'bg-black/30 text-white'
          : 'bg-zinc-800 text-emerald-400 font-medium border border-zinc-700',
      showBadgeAlways: true,
    },
    {
      id: 'ready' as ViewType,
      label: 'Siap Diambil',
      icon: CheckSquare,
      badge: counts.ready.toString(),
      badgeClass:
        currentView === 'ready'
          ? 'bg-black/30 text-white'
          : 'bg-zinc-800 text-amber-400 font-medium border border-zinc-700',
      showBadgeAlways: true,
    },
    {
      id: 'history' as ViewType,
      label: 'Riwayat Servis',
      icon: Archive,
      badge: counts.history.toString(),
      showBadgeAlways: false,
    },
    {
      id: 'accounting' as ViewType,
      label: 'Catatan Uang',
      icon: Calculator,
      badge: 'Rp',
      showBadgeAlways: false,
    },
    {
      id: 'settings' as ViewType,
      label: 'Pengaturan Toko',
      icon: Store,
      badge: 'Opsi',
      showBadgeAlways: false,
    },
  ];

  return (
    <aside className="w-14 sm:w-16 md:w-20 lg:w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between shrink-0 h-screen select-none shadow-xl z-40 no-print">
      <div className="p-2 sm:p-3 lg:p-5 space-y-3 sm:space-y-4 lg:space-y-5 overflow-y-auto">
        {/* Brand Header */}
        <div
          className="cursor-pointer group py-1 border-b border-zinc-800/80 pb-2.5 sm:pb-3 flex items-center justify-center lg:justify-start gap-2.5"
          onClick={() => onViewChange('dashboard')}
          title={storeSettings.storeName || 'ORDO SERVIS HP'}
        >
          {/* Compact Logo Mark (< lg) - Tablet & HP: Menampilkan foto logo toko yang diunggah */}
          <div className="flex lg:hidden flex-col items-center justify-center">
            {storeSettings.logoUrl ? (
              <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl overflow-hidden border border-zinc-700/80 bg-zinc-900 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
                <img
                  src={storeSettings.logoUrl}
                  alt={storeSettings.storeName || 'Logo Toko'}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0 p-1.5 text-white">
                <OrdoLogo className="w-full h-full" />
              </div>
            )}
            <span className="text-[9px] font-black tracking-widest text-white mt-1 uppercase truncate max-w-[48px] text-center">
              {storeSettings.storeName ? storeSettings.storeName.slice(0, 5) : 'ORDO'}
            </span>
          </div>

          {/* Expanded Brand (>= lg) */}
          <div className="hidden lg:flex items-center gap-2.5 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="text-sm font-black tracking-wider text-white uppercase shrink-0">
                  ORDO
                </span>
                <span className="text-emerald-500 font-bold text-xs">|</span>
                <span
                  className="text-xs font-bold tracking-tight text-zinc-300 truncate"
                  title={storeSettings.storeName}
                >
                  {storeSettings.storeName || 'ORDO SERVIS HP'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">
                <span className="text-emerald-400 font-mono font-bold">@{storeSettings.storeUsername || currentUser?.storeUsername || 'jayaphone'}</span> • {storeSettings.storeTagline || 'Pusat Servis HP'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: + Terima Servis */}
        <button
          onClick={onOpenServiceModal}
          className="w-full flex items-center justify-center gap-2 p-2.5 lg:px-4 lg:py-3 rounded-xl bg-emerald-100 hover:bg-emerald-200/90 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/90 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 font-black text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
          title="Terima Servis Baru"
        >
          <PlusCircle className="w-4 h-4 shrink-0 text-emerald-800 dark:text-emerald-400" />
          <span className="hidden lg:inline whitespace-nowrap font-bold">
            + Terima Servis
          </span>
        </button>

        {/* Navigation Menu */}
        <nav className="space-y-1 sm:space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-3 mb-2 hidden lg:block">
            Menu Utama
          </div>

          {navItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                title={item.label}
                className={`w-full flex items-center justify-center lg:justify-between p-2.5 lg:px-3.5 lg:py-2.5 rounded-xl text-xs transition-all cursor-pointer relative group ${
                  isActive
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 font-black shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden lg:inline">{item.label}</span>
                </div>

                {/* Badge for Desktop (>= lg) */}
                {item.showBadgeAlways && (
                  <span
                    className={`hidden lg:inline text-[10px] px-2 py-0.5 rounded-lg font-bold ${
                      item.badgeClass || 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Mini Badge Dot / Count for Compact (< lg) */}
                {item.showBadgeAlways && (
                  <span
                    className={`lg:hidden absolute -top-1 -right-1 text-[9px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-bold shadow-sm ${
                      isActive
                        ? 'bg-black text-emerald-400'
                        : 'bg-emerald-500 text-black'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Link to Landing Page V0 */}
          <button
            type="button"
            onClick={() => onViewChange('landing')}
            className={`w-full flex items-center justify-center lg:justify-start gap-2.5 p-2.5 lg:px-3.5 lg:py-2 rounded-xl text-xs transition-all cursor-pointer mt-1 ${
              currentView === 'landing'
                ? 'bg-emerald-500/10 text-emerald-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
            title="Tentang Ordo V0"
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span className="hidden lg:inline">Tentang Ordo V0</span>
          </button>
        </nav>
      </div>

      {/* Footer System Status & User Account */}
      <div className="p-2 sm:p-3 lg:p-4 border-t border-zinc-800/80 bg-zinc-950/70 space-y-2">
        {currentUser && (
          <div className="hidden lg:flex items-center justify-between gap-2 px-1">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-white truncate block">
                {storeSettings.ownerName || currentUser.name || 'Pemilik Konter'}
              </span>
              <span className="text-[10px] text-zinc-400 truncate block">
                <span className="font-mono text-emerald-400">@{storeSettings.storeUsername || currentUser.storeUsername || 'jayaphone'}</span> • {currentUser.email}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center lg:justify-between text-xs text-zinc-400 font-medium pt-2 pb-0.5 border-t border-zinc-800/60">
          <span className="flex items-center gap-2" title="Sistem Aktif V0.1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            <span className="hidden lg:inline font-bold text-sm text-zinc-100">
              Sistem Aktif <span className="font-mono text-xs text-emerald-400 font-black ml-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 inline-block align-middle">V0.1</span>
            </span>
          </span>
          <span className="text-zinc-400 text-xs hidden lg:inline font-medium">
            Siap Dipakai
          </span>
        </div>
      </div>
    </aside>
  );
};
