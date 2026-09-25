import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Layers,
  PackageCheck,
  Wallet,
  MessageSquare,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';
import { AuthUser } from '../types';

// Custom lightweight hook for trigger-once Intersection Observer scroll reveal
function useScrollReveal(options?: IntersectionObserverInit) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -30px 0px',
      ...options,
    });

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [elementRef, isVisible] as const;
}

// Reusable animated section wrapper
const RevealSection: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className = '' }) => {
  const [ref, inView] = useScrollReveal();

  return (
    <div
      ref={ref}
      style={{
        transitionDuration: '650ms',
        transitionDelay: `${delay}ms`,
      }}
      className={`transition-all ease-out transform ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      } ${className}`}
    >
      {children}
    </div>
  );
};

interface LandingPageProps {
  onStart: () => void;
  onLogin: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: (newTheme: 'dark' | 'light') => void;
  currentUser: AuthUser | null;
  onOpenDashboard?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStart,
  onLogin,
  theme,
  onToggleTheme,
  currentUser,
  onOpenDashboard,
}) => {
  const [isDesktop, setIsDesktop] = useState(false);
  const glowRef = useRef<HTMLDivElement>(null);
  const targetPos = useRef({ x: -1000, y: -1000 });
  const currentPos = useRef({ x: -1000, y: -1000 });
  const isVisible = useRef(false);
  const rafId = useRef<number | null>(null);

  // Check if device supports hover and pointer fine (desktop/mouse cursor)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    setIsDesktop(media.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };

    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    } else {
      media.addListener(handleChange);
      return () => media.removeListener(handleChange);
    }
  }, []);

  // Smooth cursor glow tracking with requestAnimationFrame and lerp interpolation
  useEffect(() => {
    if (!isDesktop) return;

    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current.x = e.clientX;
      targetPos.current.y = e.clientY;

      if (!isVisible.current) {
        isVisible.current = true;
        currentPos.current.x = e.clientX;
        currentPos.current.y = e.clientY;
        if (glowRef.current) {
          glowRef.current.style.opacity = '1';
        }
      }
    };

    const handleMouseLeave = () => {
      isVisible.current = false;
      if (glowRef.current) {
        glowRef.current.style.opacity = '0';
      }
    };

    const handleMouseEnter = (e: MouseEvent) => {
      targetPos.current.x = e.clientX;
      targetPos.current.y = e.clientY;
      currentPos.current.x = e.clientX;
      currentPos.current.y = e.clientY;
      isVisible.current = true;
      if (glowRef.current) {
        glowRef.current.style.opacity = '1';
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    document.documentElement.addEventListener('mouseenter', handleMouseEnter);

    // Smooth interpolation (lerp)
    const lerp = (start: number, end: number, factor: number) => {
      return start + (end - start) * factor;
    };

    const animate = () => {
      if (glowRef.current && isVisible.current) {
        currentPos.current.x = lerp(currentPos.current.x, targetPos.current.x, 0.16);
        currentPos.current.y = lerp(currentPos.current.y, targetPos.current.y, 0.16);

        glowRef.current.style.transform = `translate3d(${currentPos.current.x}px, ${currentPos.current.y}px, 0) translate(-50%, -50%)`;
      }
      rafId.current = requestAnimationFrame(animate);
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [isDesktop]);

  const highlights = [
    {
      icon: Smartphone,
      title: 'Catat Servis',
      desc: 'Simpan data pelanggan, HP, keluhan, estimasi, dan DP secara rapi.',
    },
    {
      icon: Layers,
      title: 'Pantau Proses',
      desc: 'Ketahui HP mana yang baru masuk, sedang dikerjakan, dan sudah selesai.',
    },
    {
      icon: PackageCheck,
      title: 'Kelola Pengambilan',
      desc: 'Lihat HP yang siap diambil dan rincian sisa pembayaran yang harus dilunasi.',
    },
    {
      icon: Wallet,
      title: 'Catat Keuangan',
      desc: 'Pantau uang masuk, biaya suku cadang/sparepart, dan keuntungan bersih konter.',
    },
    {
      icon: MessageSquare,
      title: 'Hubungi Pelanggan',
      desc: 'Kirim informasi nota & status servis via WhatsApp dengan template otomatis.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 relative overflow-hidden">
      {/* Real-time Cursor Glow / Spotlight Effect (Desktop Only) */}
      {isDesktop && (
        <div
          ref={glowRef}
          aria-hidden="true"
          className="fixed top-0 left-0 w-[440px] h-[440px] rounded-full pointer-events-none z-20 transition-opacity duration-300 opacity-0 will-change-transform"
          style={{
            background:
              theme === 'dark'
                ? 'radial-gradient(circle, rgba(52, 211, 153, 0.20) 0%, rgba(52, 211, 153, 0.08) 40%, transparent 70%)'
                : 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.06) 40%, transparent 70%)',
          }}
        />
      )}

      {/* Top Simple Navigation */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-black tracking-tight text-slate-900 dark:text-white uppercase">
              ORDO POS
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Toggle Dark/Light Mode */}
            <button
              type="button"
              onClick={() => onToggleTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
              title={theme === 'dark' ? 'Ganti ke Tema Terang' : 'Ganti ke Tema Gelap'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {currentUser && onOpenDashboard ? (
              <button
                type="button"
                onClick={onOpenDashboard}
                className="px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200/90 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/90 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 font-black text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Buka Aplikasi</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-400" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onStart}
                className="px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200/90 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/90 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 font-black text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Mulai Ordo POS</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-400" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 sm:pt-18 pb-16 space-y-14">
          {/* 1. Hero Section */}
          <RevealSection delay={0}>
            <div className="text-center space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                  ORDO POS / SISTEM SERVIS HP
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                Kelola Servis HP Tanpa Ribet
              </h1>

              <p className="text-sm sm:text-base text-slate-700 dark:text-zinc-300 leading-relaxed max-w-2xl mx-auto font-medium">
                Ordo Pos membantu konter servis HP mencatat dan mengelola setiap servis, dari HP masuk sampai selesai diambil pelanggan — sederhana, jelas, dan mudah digunakan.
              </p>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed max-w-xl mx-auto font-normal">
                Tidak perlu pembukuan yang rumit. Ordo Pos dibuat khusus untuk konter servis HP yang ingin mulai mengatur pekerjaan dan keuangan dengan cara yang lebih sederhana.
              </p>

              <div className="pt-3 flex items-center justify-center">
                <button
                  type="button"
                  onClick={currentUser && onOpenDashboard ? onOpenDashboard : onStart}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-100 hover:bg-emerald-200/90 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/90 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 font-black text-sm transition-all shadow-xs active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{currentUser ? 'Masuk ke Dashboard' : 'Mulai Ordo POS'}</span>
                  <ArrowRight className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                </button>
              </div>
            </div>
          </RevealSection>

          {/* Highlight Utama Section (Staggered items) */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
            <RevealSection delay={50}>
              <div className="text-center pb-1">
                <h2 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  Kemudahan Utama
                </h2>
              </div>
            </RevealSection>

            <div className="grid grid-cols-1 gap-3 sm:gap-3.5">
              {highlights.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <RevealSection key={idx} delay={80 * idx}>
                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs hover:shadow-sm flex items-start gap-4 transition-all">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                        <ItemIcon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">
                          {item.title}
                        </h3>
                        <p className="text-xs sm:text-[13px] text-slate-600 dark:text-zinc-400 leading-relaxed font-medium">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </RevealSection>
                );
              })}
            </div>
          </div>

          {/* 4. Closing & Final CTA */}
          <RevealSection delay={100}>
            <div className="pt-6 border-t border-slate-200 dark:border-zinc-800 text-center space-y-5">
              <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Mulai kelola konter servis dengan cara yang lebih sederhana.
              </p>

              <div>
                <button
                  type="button"
                  onClick={currentUser && onOpenDashboard ? onOpenDashboard : onStart}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-100 hover:bg-emerald-200/90 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/90 text-emerald-800 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-700/60 font-black text-sm transition-all shadow-xs active:scale-98 inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{currentUser ? 'Buka Papan Servis' : 'Mulai Ordo POS'}</span>
                  <ArrowRight className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                </button>
              </div>
            </div>
          </RevealSection>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200 dark:border-zinc-800 py-6 text-center text-xs text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-950">
        <p className="font-medium">Ordo Pos • Solusi sederhana untuk pemilik konter servis HP</p>
      </footer>
    </div>
  );
};
