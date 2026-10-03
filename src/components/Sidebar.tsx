import React, { useState, useEffect, useRef } from 'react';
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

const STORAGE_KEY_SIDEBAR_WIDTH = 'ordo_sidebar_width';
const MIN_WIDTH = 80;
const DEFAULT_WIDTH = 240;
const MAX_WIDTH = 320;
const COMPACT_THRESHOLD = 180;

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  onOpenServiceModal,
  storeSettings,
  counts,
  currentUser,
}) => {
  const sidebarRef = useRef<HTMLElement>(null);

  // Desktop width state with localStorage persistence
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SIDEBAR_WIDTH);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= MIN_WIDTH && val <= MAX_WIDTH) {
          return val;
        }
      }
    } catch {
      // LocalStorage access failsafe
    }
    return DEFAULT_WIDTH;
  });

  const [isResizing, setIsResizing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Detect desktop breakpoint (>= 1024px)
  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);
    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  // Save width to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SIDEBAR_WIDTH, sidebarWidth.toString());
    } catch {
      // ignore
    }
  }, [sidebarWidth]);

  // Handle drag resizing on desktop
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();
      const rawWidth = e.clientX - rect.left;
      const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, rawWidth));
      setSidebarWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Compact mode when not desktop or when desktop sidebar is dragged below threshold (< 180px)
  const isCompact = !isDesktop || sidebarWidth < COMPACT_THRESHOLD;

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
    <aside
      ref={sidebarRef}
      style={isDesktop ? { width: `${sidebarWidth}px` } : undefined}
      className={`relative w-14 sm:w-16 md:w-20 bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between shrink-0 h-screen select-none shadow-xl z-40 no-print ${
        isResizing ? '' : 'transition-[width] duration-150'
      }`}
    >
      {/* Desktop Resize Handle on Right Border */}
      <div
        onMouseDown={startResizing}
        className="hidden lg:block absolute top-0 -right-1.5 w-3 h-full cursor-col-resize z-50 group hover:bg-emerald-500/10 active:bg-emerald-500/20 transition-colors"
        title="Tarik untuk mengatur lebar sidebar (80px - 320px)"
      >
        <div
          className={`w-[2px] h-full mx-auto transition-colors ${
            isResizing ? 'bg-emerald-500' : 'bg-transparent group-hover:bg-emerald-500/70'
          }`}
        />
      </div>

      <div className={`space-y-3 sm:space-y-4 overflow-y-auto ${isCompact ? 'p-2 sm:p-3' : 'p-3 sm:p-4 lg:p-5'}`}>
        {/* Brand Header */}
        <div
          className="cursor-pointer group py-1 border-b border-zinc-800/80 pb-2.5 sm:pb-3 flex items-center justify-center lg:justify-start gap-2.5"
          onClick={() => onViewChange('dashboard')}
          title={storeSettings.storeName || 'ORDO SERVIS HP'}
        >
          {isCompact ? (
            /* Compact Mode: Icon Mark Only */
            <div className="flex flex-col items-center justify-center mx-auto">
              {storeSettings.logoUrl ? (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border border-zinc-700/80 bg-black flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
                  <img
                    src={storeSettings.logoUrl}
                    alt={storeSettings.storeName || 'Logo Toko'}
                    className="w-full h-full object-cover bg-black rounded-xl"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-black border border-zinc-700/80 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0 p-1.5 text-white">
                  <OrdoLogo className="w-full h-full" />
                </div>
              )}
              <span className="text-[9px] font-black tracking-widest text-white mt-1 uppercase truncate max-w-[56px] text-center">
                {storeSettings.storeName ? storeSettings.storeName.slice(0, 5) : 'ORDO'}
              </span>
            </div>
          ) : (
            /* Expanded Mode: Full Brand + ORDO + Slogan (natural wrap) */
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {storeSettings.logoUrl ? (
                <div className="w-9 h-9 rounded-xl overflow-hidden border border-zinc-700/80 bg-black flex items-center justify-center shadow-md shrink-0">
                  <img
                    src={storeSettings.logoUrl}
                    alt={storeSettings.storeName || 'Logo Toko'}
                    className="w-full h-full object-cover bg-black rounded-xl"
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-black border border-zinc-700/80 flex items-center justify-center shadow-md shrink-0 p-1.5 text-white">
                  <OrdoLogo className="w-full h-full" />
                </div>
              )}
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
                    {storeSettings.storeName || 'ORDO POS SERVICE'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-medium leading-snug mt-1 break-words">
                  Solusi sederhana untuk pemilik konter servis HP
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Button: + Terima Servis */}
        <button
          onClick={onOpenServiceModal}
          className={`w-full flex items-center justify-center ${
            isCompact ? 'p-2.5' : 'gap-2 px-4 py-3'
          } rounded-xl bg-emerald-100 hover:bg-emerald-200/90 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/90 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 font-black text-xs shadow-xs active:scale-95 transition-all cursor-pointer`}
          title="Terima Servis Baru"
        >
          <PlusCircle className="w-4 h-4 shrink-0 text-emerald-800 dark:text-emerald-400" />
          {!isCompact && (
            <span className="whitespace-nowrap font-bold">
              + Terima Servis
            </span>
          )}
        </button>

        {/* Navigation Menu */}
        <nav className="space-y-1 sm:space-y-1.5">
          {!isCompact && (
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-3 mb-2">
              Menu Utama
            </div>
          )}

          {navItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                title={item.label}
                className={`w-full flex items-center ${
                  isCompact ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
                } rounded-xl text-xs transition-all cursor-pointer relative group ${
                  isActive
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 font-black shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isCompact && <span className="truncate">{item.label}</span>}
                </div>

                {/* Badge for Expanded Mode */}
                {!isCompact && item.showBadgeAlways && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-lg font-bold shrink-0 ${
                      item.badgeClass || 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Mini Badge for Compact Mode */}
                {isCompact && item.showBadgeAlways && (
                  <span
                    className={`absolute -top-1 -right-1 text-[9px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-bold shadow-sm ${
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
            className={`w-full flex items-center ${
              isCompact ? 'justify-center p-2.5' : 'justify-start gap-2.5 px-3.5 py-2'
            } rounded-xl text-xs transition-all cursor-pointer mt-1 ${
              currentView === 'landing'
                ? 'bg-emerald-500/10 text-emerald-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
            title="Tentang Ordo POS Service"
          >
            <Compass className="w-4 h-4 shrink-0" />
            {!isCompact && <span className="truncate">Tentang Ordo POS Service</span>}
          </button>
        </nav>
      </div>

      {/* Footer System Status & User Account */}
      <div className={`border-t border-zinc-800/80 bg-zinc-950/70 space-y-2 ${
        isCompact ? 'p-2 sm:p-3' : 'p-2 sm:p-3 lg:p-4'
      }`}>
        {currentUser && (
          <div className={`flex items-center ${isCompact ? 'justify-center' : 'justify-between'} gap-2 px-1`}>
            {isCompact ? (
              <div
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-xs font-black text-emerald-400 shadow-sm shrink-0"
                title={`${storeSettings.ownerName || currentUser.name || 'Pemilik Konter'} (@${storeSettings.storeUsername || currentUser.storeUsername || 'jayaphone'})`}
              >
                {(storeSettings.ownerName || currentUser.name || 'P')[0].toUpperCase()}
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-white truncate block">
                  {storeSettings.ownerName || currentUser.name || 'Pemilik Konter'}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono truncate block mt-0.5">
                  @{storeSettings.storeUsername || currentUser.storeUsername || 'jayaphone'}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium truncate block">
                  {currentUser.email}
                </span>
              </div>
            )}
          </div>
        )}

        <div className={`flex items-center ${
          isCompact ? 'justify-center' : 'justify-between'
        } text-xs text-zinc-400 font-medium pt-2 pb-0.5 border-t border-zinc-800/60`}>
          <span className="flex items-center gap-2" title="Sistem Aktif V0.1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            {!isCompact && (
              <span className="font-bold text-sm text-zinc-100">
                Sistem Aktif{' '}
                <span className="font-mono text-xs text-emerald-400 font-black ml-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 inline-block align-middle">
                  V0.1
                </span>
              </span>
            )}
          </span>
        </div>
      </div>
    </aside>
  );
};
