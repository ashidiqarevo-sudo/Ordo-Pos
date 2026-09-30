import React, { useState, useEffect, useMemo } from 'react';
import {
  ServiceItem,
  StoreSettings,
  ViewType,
  HistoryFilterType,
  CustomerAggregated,
  ToastMessage,
  CashEntry,
} from './types';
import {
  INITIAL_SERVICES,
  DEFAULT_STORE_SETTINGS,
  formatRupiah,
  formatDateTime,
  generateNextTicketNo,
} from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ToastContainer } from './components/ToastContainer';
import { DashboardView } from './components/DashboardView';
import { CustomersView } from './components/CustomersView';
import { BoardView } from './components/BoardView';
import { ReadyView } from './components/ReadyView';
import { HistoryView } from './components/HistoryView';
import { AccountingView, getLedgerTransactions } from './components/AccountingView';
import { SettingsView } from './components/SettingsView';

import { ServiceModal } from './components/modals/ServiceModal';
import { EditCustomerModal } from './components/modals/EditCustomerModal';
import { CustomerHistoryModal } from './components/modals/CustomerHistoryModal';
import { EditUnitModal } from './components/modals/EditUnitModal';
import { ReadyModal } from './components/modals/ReadyModal';
import { CheckoutModal } from './components/modals/CheckoutModal';
import { ReceiptModal } from './components/modals/ReceiptModal';
import { AccDetailDayModal } from './components/modals/AccDetailDayModal';
import { DiagnosisModal } from './components/modals/DiagnosisModal';
import { AuthModal } from './components/modals/AuthModal';
import { StoreSetupModal } from './components/modals/StoreSetupModal';
import { OnboardingModal } from './components/modals/OnboardingModal';
import { CashEntryModal } from './components/modals/CashEntryModal';
import { FeedbackModal } from './components/modals/FeedbackModal';
import { LandingPage } from './components/LandingPage';
import { AuthUser } from './types';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { fetchUserProfileAndStore, signOutOwner, getInitialAuthUser } from './services/authService';
import { updateCustomer } from './services/customerService';
import {
  createServiceTicket,
  fetchServiceTickets,
  updateDiagnosis,
  markServiceReady,
  checkoutService,
  updateServiceStatus,
  cancelServiceTicket,
} from './services/serviceTicketService';
import {
  fetchCashEntries,
  addCashEntry,
  deleteCashEntry,
} from './services/cashService';
import {
  saveAllStoreSettings,
  uploadStoreLogo,
  fetchFullStoreSettings,
  updateStoreTheme,
  updateStoreOnboardingStatus,
} from './services/storeService';
import { syncLocalDataToSupabase } from './services/migrationService';

// Kunci local storage HANYA untuk cache offline data operasional transaksi (layanan & kas)
const STORAGE_KEY_SERVICES = 'ordo_servis_services_v6';
const STORAGE_KEY_CASH_ENTRIES = 'ordo_servis_cash_entries_v2';

export default function App() {
  // Theme state: in-memory state, disinkronkan langsung dengan kolom stores.theme_preference di Supabase
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const applyThemeToDOM = (t: 'dark' | 'light') => {
    const root = document.documentElement;
    const body = document.body;
    if (t === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      if (body) {
        body.classList.add('dark');
        body.classList.remove('light');
      }
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      if (body) {
        body.classList.add('light');
        body.classList.remove('dark');
      }
    }
  };

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const handleToggleTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    applyThemeToDOM(newTheme);
    addToast(
      newTheme === 'dark'
        ? 'Mode Gelap (Dark Emerald) aktif'
        : 'Mode Terang (Clean Light) aktif',
      'info'
    );
    // Cloud Sync: Simpan preferensi tema langsung ke Supabase
    if (currentUser?.storeId) {
      updateStoreTheme(currentUser.storeId, newTheme).catch((err) =>
        console.error('[App] updateStoreTheme error:', err)
      );
    }
  };

  // Local storage state
  // CATATAN: Tidak ada seed/dummy data otomatis. Aplikasi mulai kosong jika localStorage kosong.
  const [services, setServices] = useState<ServiceItem[]>(() => {
    try {
      // Bersihkan kunci demo sync lama jika masih ada (mencegah re-inject data dummy)
      localStorage.removeItem('ordo_demo_sync_v5');

      const saved = localStorage.getItem(STORAGE_KEY_SERVICES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Auto-migrate legacy ORD-00xxx format to clean OR-YY-xxxxx format
          return parsed.map((item: ServiceItem) => {
            if (item.ticketNo && item.ticketNo.startsWith('ORD-')) {
              const yearShort = item.createdAt ? item.createdAt.substring(2, 4) : '26';
              const digits = item.ticketNo.replace(/\D/g, '').padStart(5, '0');
              return {
                ...item,
                ticketNo: `OR-${yearShort}-${digits}`,
              };
            }
            return item;
          });
        }
      }
    } catch {
      // ignore
    }
    // Default: array kosong — BUKAN dummy data
    return [];
  });

  // Store Settings State: Inisialisasi in-memory dengan DEFAULT_STORE_SETTINGS.
  // 100% cloud-synced: saat user login, di-fetch langsung dari Supabase tanpa localStorage.
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);

  const [cashEntries, setCashEntries] = useState<CashEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CASH_ENTRIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    // Default: array kosong — BUKAN dummy data
    return [];
  });

  // Persist to localStorage untuk transaksi offline
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(services));
    } catch {
      // ignore
    }
  }, [services]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CASH_ENTRIES, JSON.stringify(cashEntries));
    } catch {
      // ignore
    }
  }, [cashEntries]);

  // Helper navigasi URL: Menentukan view awal berdasarkan pathname.
  // Root path ('/') SELALU mengarah ke 'landing' terlepas dari status login user.
  const getInitialView = (): ViewType => {
    if (typeof window === 'undefined') return 'landing';
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/' || path === '') return 'landing';
    if (path === '/dashboard' || path.endsWith('/dashboard')) return 'dashboard';
    if (path === '/customers' || path.endsWith('/customers')) return 'customers';
    if (path === '/board' || path.endsWith('/board')) return 'board';
    if (path === '/ready' || path.endsWith('/ready')) return 'ready';
    if (path === '/history' || path.endsWith('/history')) return 'history';
    if (path === '/accounting' || path.endsWith('/accounting')) return 'accounting';
    if (path === '/settings' || path.endsWith('/settings')) return 'settings';
    if (path === '/landing' || path.endsWith('/landing')) return 'landing';
    return 'landing';
  };

  // Navigation & Filtering
  const [currentView, setCurrentView] = useState<ViewType>(getInitialView);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilterType>('SEMUA');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (
    message: string,
    type: 'info' | 'success' | 'warning' = 'info'
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Auth User State
  // Inisialisasi null — session aktif akan diisi oleh onAuthStateChange listener di bawah
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Supabase Auth Listener: menggantikan pembacaan auth dari localStorage
  // Menangani: inisialisasi awal, login, logout, dan refresh token otomatis
  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured()) {
      // Fallback: baca dari localStorage jika Supabase belum dikonfigurasi
      (async () => {
        const localUser = await getInitialAuthUser();
        if (isMounted) {
          if (localUser) {
            setCurrentUser(localUser);
            setStoreSettings((prev) => ({
              ...prev,
              storeName: localUser.storeName || prev.storeName,
              storeUsername: localUser.storeUsername || prev.storeUsername || 'ordo',
              ownerName: localUser.name || prev.ownerName,
              storePhone: localUser.phone || prev.storePhone,
            }));
          }
          setIsAuthLoading(false);
        }
      })();
      return;
    }

    // Supabase dikonfigurasi — pasang listener perubahan sesi
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT' || !session?.user) {
          setCurrentUser(null);
          setStoreSettings(DEFAULT_STORE_SETTINGS);
          setTheme('dark');
          applyThemeToDOM('dark');
          setIsStoreSetupDone(false);
          setIsOnboardingDone(false);
          setIsAuthLoading(false);
          return;
        }

        // SIGNED_IN, TOKEN_REFRESHED, INITIAL_SESSION
        if (session?.user) {
          try {
            const authUser = await fetchUserProfileAndStore(session.user.id);
            if (isMounted) {
              setCurrentUser(authUser);
              if (authUser && authUser.storeId) {
                // Fetch SEMUA pengaturan toko (profil, nota, garansi, tema, WhatsApp) langsung dari Supabase
                try {
                  const storeConfig = await fetchFullStoreSettings(authUser.storeId);
                  if (isMounted && storeConfig) {
                    setStoreSettings(storeConfig.settings);
                    setTheme(storeConfig.theme);
                    applyThemeToDOM(storeConfig.theme);
                    setIsStoreSetupDone(storeConfig.hasCompletedStoreSetup);
                    setIsOnboardingDone(storeConfig.hasCompletedOnboarding);
                  } else if (isMounted) {
                    setStoreSettings((prev) => ({
                      ...prev,
                      storeName: authUser.storeName || prev.storeName,
                      storeUsername: authUser.storeUsername || prev.storeUsername || 'ordo',
                      ownerName: authUser.name || prev.ownerName,
                      storePhone: authUser.phone || prev.storePhone,
                    }));
                    setIsStoreSetupDone(authUser.hasCompletedStoreSetup ?? false);
                    setIsOnboardingDone(authUser.hasCompletedOnboarding ?? false);
                  }
                } catch (configErr) {
                  console.error('[App] Gagal memuat pengaturan toko dari Supabase:', configErr);
                }

                // Load tiket servis dari Supabase — SELALU override state (termasuk jika kosong)
                // Ini mencegah data lama di localStorage muncul lagi setelah data Supabase dihapus
                try {
                  const dbTickets = await fetchServiceTickets(authUser.storeId);
                  if (isMounted && Array.isArray(dbTickets)) {
                    setServices(dbTickets);
                    // Sinkronkan ke localStorage agar konsisten saat offline
                    try { localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(dbTickets)); } catch { /* ignore */ }
                  }
                } catch (ticketErr) {
                  console.error('[App] Gagal memuat tiket servis toko:', ticketErr);
                }

                // Load catatan kas dari Supabase — SELALU override state
                try {
                  const dbCashEntries = await fetchCashEntries(authUser.storeId);
                  if (isMounted && Array.isArray(dbCashEntries)) {
                    setCashEntries(dbCashEntries);
                    try { localStorage.setItem(STORAGE_KEY_CASH_ENTRIES, JSON.stringify(dbCashEntries)); } catch { /* ignore */ }
                  }
                } catch (cashErr) {
                  console.error('[App] Gagal memuat catatan kas toko:', cashErr);
                }
              }
            }
          } catch (err) {
            console.error('[App] Gagal memuat profil dari sesi Supabase:', err);
          } finally {
            if (isMounted) setIsAuthLoading(false);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen to popstate (browser back/forward button)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync URL slug: path '/' untuk landing page, dan path '/dashboard' atau '/:username/:view' untuk dashboard
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (currentView === 'landing') {
      if (window.location.pathname !== '/') {
        window.history.replaceState(null, '', '/');
      }
      return;
    }

    if (currentUser) {
      const activeUsername =
        currentUser.storeUsername ||
        storeSettings.storeUsername;
      const targetPath = activeUsername
        ? `/${activeUsername}/${currentView}`
        : `/${currentView}`;
      if (
        window.location.pathname !== targetPath &&
        window.location.pathname !== `/${currentView}`
      ) {
        window.history.replaceState(null, '', targetPath);
      }
    } else {
      if (window.location.pathname !== '/') {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [currentUser, storeSettings.storeUsername, currentView]);

  // Realtime Supabase Subscription untuk sinkronisasi Pengaturan Toko & Template WA antar-sesi
  useEffect(() => {
    if (!isSupabaseConfigured() || !currentUser?.storeId) return;

    const storeId = currentUser.storeId;
    const channel = supabase
      .channel(`store_settings_rt_${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stores',
          filter: `id=eq.${storeId}`,
        },
        async () => {
          try {
            const refreshed = await fetchFullStoreSettings(storeId);
            if (refreshed) {
              setStoreSettings(refreshed.settings);
              setTheme(refreshed.theme);
              applyThemeToDOM(refreshed.theme);
              setIsStoreSetupDone(refreshed.hasCompletedStoreSetup);
              setIsOnboardingDone(refreshed.hasCompletedOnboarding);
            }
          } catch (err) {
            console.error('[App] Realtime store update error:', err);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_whatsapp_templates',
          filter: `store_id=eq.${storeId}`,
        },
        async () => {
          try {
            const refreshed = await fetchFullStoreSettings(storeId);
            if (refreshed) {
              setStoreSettings(refreshed.settings);
            }
          } catch (err) {
            console.error('[App] Realtime WA template update error:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.storeId]);

  // Onboarding & Setup flags — dikelola oleh state cloud Supabase
  const [isStoreSetupDone, setIsStoreSetupDone] = useState<boolean>(false);
  const [isOnboardingDone, setIsOnboardingDone] = useState<boolean>(false);

  // Explicit trigger to view onboarding or setup anytime
  const [showManualOnboarding, setShowManualOnboarding] = useState(false);
  const [showManualStoreSetup, setShowManualStoreSetup] = useState(false);

  // Auth modal state (opened from Landing Page)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Modals state
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [cashModalDefaultType, setCashModalDefaultType] = useState<'IN' | 'OUT' | 'TRANSFER'>('IN');
  const [editCustomerKey, setEditCustomerKey] = useState<string | null>(null);
  const [historyCustomerKey, setHistoryCustomerKey] = useState<string | null>(null);
  const [editTicketId, setEditTicketId] = useState<string | null>(null);
  const [readyTicketId, setReadyTicketId] = useState<string | null>(null);
  const [diagnosisTicketId, setDiagnosisTicketId] = useState<string | null>(null);
  const [checkoutTicketId, setCheckoutTicketId] = useState<string | null>(null);
  const [receiptTicketId, setReceiptTicketId] = useState<string | null>(null);
  const [accDetailDate, setAccDetailDate] = useState<string | null>(null);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  // Aggregated Customers calculation
  const customers = useMemo<CustomerAggregated[]>(() => {
    const map = new Map<string, CustomerAggregated>();
    services.forEach((s) => {
      const key =
        s.customerPhone && s.customerPhone !== 'Tanpa WA'
          ? s.customerPhone
          : s.customerName.toLowerCase().trim();

      if (!map.has(key)) {
        map.set(key, {
          primaryKey: key,
          customerName: s.customerName,
          customerPhone: s.customerPhone || 'Tanpa WA',
          tickets: [],
          totalSpending: 0,
          lastActive: s.createdAt,
        });
      }
      const cust = map.get(key)!;
      cust.tickets.push(s);
      if (s.status !== 'BATAL') {
        cust.totalSpending +=
          Number(s.finalCost) || Number(s.estimatedCost) || 0;
      }
      cust.customerName = s.customerName;
    });
    return Array.from(map.values());
  }, [services]);

  // Counts for sidebar badges
  const counts = useMemo(() => {
    return {
      total: services.length,
      customers: customers.length,
      active: services.filter(
        (s) => s.status === 'BARU' || s.status === 'PROSES'
      ).length,
      ready: services.filter(
        (s) => s.status === 'SIAP' || (s.status === 'BATAL' && !s.pickedUpAt)
      ).length,
      history: services.filter(
        (s) => s.status === 'DIAMBIL' || (s.status === 'BATAL' && !!s.pickedUpAt)
      ).length,
    };
  }, [services, customers]);

  // Auth & Onboarding Handlers
  const handleAuthSuccess = (user: AuthUser, isNewRegistration?: boolean) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
    } catch {
      // ignore
    }

    // Ketika membuat akun baru, semua data service & catatan kas dimulai dalam kondisi kosong
    if (isNewRegistration) {
      setServices([]);
      setCashEntries([]);
      try {
        localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEY_CASH_ENTRIES, JSON.stringify([]));
      } catch {
        // ignore
      }
    }

    addToast(`Selamat datang, ${user.name}!`, 'success');

    // Update storeSettings with full store settings from Supabase
    if (user.storeId) {
      fetchFullStoreSettings(user.storeId).then((storeConfig) => {
        if (storeConfig) {
          setStoreSettings(storeConfig.settings);
          setTheme(storeConfig.theme);
          applyThemeToDOM(storeConfig.theme);
          setIsStoreSetupDone(storeConfig.hasCompletedStoreSetup);
          setIsOnboardingDone(storeConfig.hasCompletedOnboarding);
        }
      });
    }

    // Muat tiket servis dan catatan kas dari database — SELALU override state
    if (user.storeId && !isNewRegistration) {
      fetchServiceTickets(user.storeId).then((dbTickets) => {
        if (Array.isArray(dbTickets)) {
          setServices(dbTickets);
          try { localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(dbTickets)); } catch { /* ignore */ }
        }
      });
      fetchCashEntries(user.storeId).then((dbCash) => {
        if (Array.isArray(dbCash)) {
          setCashEntries(dbCash);
          try { localStorage.setItem(STORAGE_KEY_CASH_ENTRIES, JSON.stringify(dbCash)); } catch { /* ignore */ }
        }
      });
    }
  };

  const handleLogout = async () => {
    await signOutOwner(); // Memanggil supabase.auth.signOut() — onAuthStateChange akan otomatis menangani reset state
    setCurrentUser(null);
    setStoreSettings(DEFAULT_STORE_SETTINGS);
    setTheme('dark');
    applyThemeToDOM('dark');
    setIsStoreSetupDone(false);
    setIsOnboardingDone(false);
    // Bersihkan sisa-sisa storage lama jika masih ada
    try {
      localStorage.removeItem('ordo_servis_settings_v4');
      localStorage.removeItem('ordo_servis_theme_v4');
      localStorage.removeItem('ordo_servis_onboarding_done_v4');
      localStorage.removeItem('ordo_servis_store_setup_done_v4');
      localStorage.removeItem('ordo_servis_auth_user_v4');
      sessionStorage.removeItem('ordo_servis_auth_user_v4');
    } catch {
      // ignore
    }
    setCurrentView('landing');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/');
    }
    setIsAuthModalOpen(false);
    addToast('Anda telah keluar (Logout).', 'info');
  };

  const handleStoreSetupComplete = async (newSettings: StoreSettings) => {
    setStoreSettings(newSettings);
    setIsStoreSetupDone(true);
    setShowManualStoreSetup(false);
    if (currentUser && newSettings.ownerName) {
      const updatedUser: AuthUser = {
        ...currentUser,
        name: newSettings.ownerName.trim() || currentUser.name,
        storeName: newSettings.storeName?.trim() || currentUser.storeName,
        storeUsername: newSettings.storeUsername || currentUser.storeUsername || 'jayaphone',
        phone: newSettings.storePhone?.trim() || currentUser.phone,
        hasCompletedStoreSetup: true,
      };
      setCurrentUser(updatedUser);
    }
    addToast('Profil konter & format nota berhasil dikonfigurasi!', 'success');

    // Sinkronkan ke Supabase (non-blocking)
    if (currentUser?.storeId) {
      try {
        const [saveResult] = await Promise.all([
          saveAllStoreSettings({
            storeId: currentUser.storeId,
            settings: newSettings,
          }),
          updateStoreOnboardingStatus(currentUser.storeId, {
            hasCompletedStoreSetup: true,
          }),
        ]);
        if (saveResult.updatedSettings) {
          setStoreSettings(saveResult.updatedSettings);
        }
      } catch (err) {
        console.error('[App] saveAllStoreSettings (StoreSetup) error:', err);
      }
    }
  };

  const handleOnboardingFinish = () => {
    setIsOnboardingDone(true);
    setShowManualOnboarding(false);
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        hasCompletedOnboarding: true,
      });
    }
    addToast('Tutorial selesai! Sistem siap digunakan untuk mengelola servis HP.', 'success');

    // Sinkronkan status onboarding ke Supabase
    if (currentUser?.storeId) {
      updateStoreOnboardingStatus(currentUser.storeId, {
        hasCompletedOnboarding: true,
      }).catch((err) => console.error('[App] updateStoreOnboardingStatus error:', err));
    }
  };

  // Handlers: Service Intake
  const handleIntakeSubmit = async (formData: {
    customerName: string;
    customerPhone: string;
    deviceModel: string;
    screenLock: string;
    complaints: string[];
    notes: string;
    estimatedCost: number;
    dp: number;
  }) => {
    const isExisting = customers.some(
      (c) =>
        (formData.customerPhone &&
          formData.customerPhone !== 'Tanpa WA' &&
          c.customerPhone === formData.customerPhone) ||
        c.customerName.toLowerCase().trim() ===
          formData.customerName.toLowerCase().trim()
    );

    // Panggil service layer: parse angka murni, upsert customer, buat tiket & catat DP di payments
    const { ticket: newTicket, error } = await createServiceTicket({
      storeId: currentUser?.storeId,
      formData,
      defaultWarrantyDays: storeSettings.defaultWarrantyDays,
      existingTickets: services,
    });

    if (error && error !== 'Tersimpan secara offline') {
      console.warn('[App] Catatan penyimpanan tiket:', error);
    }

    setServices((prev) => [newTicket, ...prev]);
    setIsServiceModalOpen(false);

    const toastMsg = isExisting
      ? `Tiket <b>${newTicket.ticketNo}</b> dibuat untuk pelanggan terdaftar <b>${formData.customerName}</b>.`
      : `Tiket <b>${newTicket.ticketNo}</b> dibuat & pelanggan baru <b>${formData.customerName}</b> otomatis tersimpan!`;

    addToast(toastMsg, 'success');

    // Automatically open receipt modal (PASTIKAN alur cetak nota tetap berjalan 100% sama seperti V0)
    setTimeout(() => {
      setReceiptTicketId(newTicket.id);
    }, 200);
  };

  // Handlers: Edit customer across all tickets
  const handleEditCustomerSubmit = async (
    originalKey: string,
    newName: string,
    newPhone: string
  ) => {
    // Panggil service layer untuk update tabel customers & snapshot services di database
    if (currentUser?.storeId) {
      await updateCustomer({
        storeId: currentUser.storeId,
        originalKey,
        newName,
        newPhone,
      });
    }

    setServices((prev) =>
      prev.map((s) => {
        const key =
          s.customerPhone && s.customerPhone !== 'Tanpa WA'
            ? s.customerPhone
            : s.customerName.toLowerCase().trim();
        if (key === originalKey) {
          return {
            ...s,
            customerName: newName,
            customerPhone: newPhone,
          };
        }
        return s;
      })
    );
    setEditCustomerKey(null);
    addToast(`Data pelanggan <b>${newName}</b> berhasil diperbarui!`, 'success');
  };

  // Handlers: Edit single unit
  const handleEditUnitSubmit = (
    ticketId: string,
    data: {
      customerName: string;
      customerPhone: string;
      deviceModel: string;
      screenLock: string;
      notes: string;
    }
  ) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === ticketId) {
          return {
            ...s,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            deviceModel: data.deviceModel,
            screenLock: data.screenLock,
            notes: data.notes,
          };
        }
        return s;
      })
    );
    setEditTicketId(null);
    addToast(`Data HP berhasil diubah!`, 'success');
  };

  // Handlers: Diagnosis confirmation and updated estimate
  const handleDiagnosisSubmit = async (
    ticketId: string,
    data: {
      diagnosis: string;
      newEstimatedCost: number;
      confirmationStatus: 'MENUNGGU' | 'DISETUJUI' | 'TIDAK_PERLU';
    }
  ) => {
    const dateStr = formatDateTime();
    const willBeProses =
      data.confirmationStatus === 'DISETUJUI' || data.confirmationStatus === 'TIDAK_PERLU';

    // Update state lokal terlebih dahulu agar UI responsif
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === ticketId) {
          const initialEst = s.initialEstimatedCost ?? s.estimatedCost;

          return {
            ...s,
            diagnosis: data.diagnosis,
            initialEstimatedCost: initialEst,
            estimatedCost: data.newEstimatedCost,
            finalCost: data.newEstimatedCost,
            confirmationStatus: data.confirmationStatus,
            confirmedAt: dateStr,
            status: willBeProses && s.status === 'BARU' ? 'PROSES' : s.status,
          };
        }
        return s;
      })
    );
    setDiagnosisTicketId(null);

    // Sinkronkan ke Supabase (non-blocking terhadap UI)
    const target = services.find((s) => s.id === ticketId);
    if (currentUser?.storeId && target) {
      updateDiagnosis({
        ticketId,
        storeId: currentUser.storeId,
        diagnosis: data.diagnosis,
        newEstimatedCost: data.newEstimatedCost,
        confirmationStatus: data.confirmationStatus,
        currentStatus: target.status,
        initialEstimatedCost: target.initialEstimatedCost ?? target.estimatedCost,
      }).catch((err) =>
        console.error('[App] updateDiagnosis error:', err)
      );
    }

    if (data.confirmationStatus === 'DISETUJUI') {
      addToast(
        `Pelanggan setuju! Status otomatis masuk <b>DIPROSES</b> dengan estimasi <b>${formatRupiah(
          data.newEstimatedCost
        )}</b>.`,
        'success'
      );
    } else if (data.confirmationStatus === 'MENUNGGU') {
      addToast(
        `Estimasi biaya diupdate ke <b>${formatRupiah(
          data.newEstimatedCost
        )}</b>. Menunggu balasan konfirmasi dari pelanggan.`,
        'info'
      );
    } else {
      addToast(`Diagnosis & estimasi tersimpan!`, 'success');
    }
  };

  // Handlers: Update status (e.g. from BARU to PROSES)
  const handleUpdateStatus = (
    ticketId: string,
    newStatus: 'BARU' | 'PROSES' | 'SIAP'
  ) => {
    setServices((prev) => {
      const target = prev.find((s) => s.id === ticketId);
      if (!target) return prev;
      const updated = { ...target, status: newStatus };
      if (newStatus === 'SIAP') {
        return [updated, ...prev.filter((s) => s.id !== ticketId)];
      }
      return prev.map((s) => (s.id === ticketId ? updated : s));
    });
    addToast(`Status tiket berhasil diubah jadi <b>${newStatus}</b>`, 'success');

    // Sinkronkan ke Supabase (non-blocking)
    if (currentUser?.storeId) {
      updateServiceStatus(ticketId, currentUser.storeId, newStatus).catch((err) =>
        console.error('[App] updateServiceStatus error:', err)
      );
    }
  };

  // Handlers: Batalkan servis (Servis Berjalan -> Siap Diambil)
  const handleCancelService = async (ticketId: string, reason?: string) => {
    const target = services.find((s) => s.id === ticketId);
    if (!target) return;

    const cancelReason = reason || 'Dibatalkan oleh pelanggan/teknisi';
    const updated: ServiceItem = {
      ...target,
      status: 'BATAL',
      finalCost: 0,
      sparepartCost: 0,
      cancelReason,
      pickedUpAt: null, // Masuk ke Siap Diambil sampai customer mengambil
    };

    // 1. Ubah status tiket di database Supabase
    if (currentUser?.storeId) {
      try {
        await cancelServiceTicket({
          ticketId,
          storeId: currentUser.storeId,
          cancelReason,
        });
      } catch (err) {
        console.error('[App] Gagal membatalkan tiket di Supabase:', err);
      }
    }

    // 2. Perbarui state lokal & alihkan tampilan langsung ke 'Siap Diambil' tanpa refresh
    setServices((prev) => [updated, ...prev.filter((s) => s.id !== ticketId)]);
    setReadyTicketId(null);
    setCurrentView('ready');
    addToast(
      `Servis HP <b>${target.ticketNo}</b> ditandai <b>BATAL</b> & dipindahkan ke <b>Siap Diambil</b>.`,
      'warning'
    );

    // 3. Setelah status berhasil di-update, barulah eksekusi buka link WhatsApp-nya
    handleSendWhatsAppReceipt(updated, 'CANCEL');
  };

  // Handlers: Ready modal submit (handles JADI and BATAL)
  const handleReadySubmit = (
    ticketId: string,
    data: {
      actionType: 'JADI' | 'BATAL';
      finalCost: number;
      sparepartCost: number;
      actionTaken?: string;
      technicianName?: string;
      cancelReason?: string;
    }
  ) => {
    const target = services.find((s) => s.id === ticketId);
    if (!target) return;

    if (data.actionType === 'BATAL') {
      handleCancelService(ticketId, data.cancelReason);
      return;
    }

    // Otherwise actionType === 'JADI'
    const updated: ServiceItem = {
      ...target,
      finalCost: data.finalCost,
      sparepartCost: data.sparepartCost,
      actionTaken: data.actionTaken,
      technicianName: data.technicianName || currentUser?.name || storeSettings.ownerName || 'Owner',
      status: 'SIAP' as const,
    };

    setServices((prev) => [updated, ...prev.filter((s) => s.id !== ticketId)]);
    setReadyTicketId(null);
    setCurrentView('ready');
    addToast(`Sip, HP <b>${target.ticketNo}</b> udah siap diambil!`, 'success');

    // Sinkronkan ke Supabase: status SIAP + final_cost + sparepart_cost + action_taken + technician_name + ready_at (non-blocking)
    if (currentUser?.storeId) {
      markServiceReady({
        ticketId,
        storeId: currentUser.storeId,
        finalCost: data.finalCost,
        sparepartCost: data.sparepartCost,
        actionTaken: data.actionTaken,
        technicianName: updated.technicianName,
      }).catch((err) => console.error('[App] markServiceReady error:', err));
    }

    // Send WhatsApp
    handleSendReadyWhatsApp(updated);
  };

  const handleSendReadyWhatsApp = (item: ServiceItem) => {
    if (item.customerPhone === 'Tanpa WA' || !item.customerPhone) {
      addToast('Pelanggan ini tidak mencantumkan nomor WA.', 'info');
      return;
    }

    let phone = item.customerPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);

    const sisa = Math.max(
      0,
      (item.finalCost || item.estimatedCost) - item.dp
    );

    let template =
      storeSettings.waReadyMsg || DEFAULT_STORE_SETTINGS.waReadyMsg;
    template = template
      .replace(/{nama}/g, item.customerName)
      .replace(/{unit}/g, item.deviceModel)
      .replace(/{nota}/g, item.ticketNo)
      .replace(/{toko}/g, storeSettings.storeName)
      .replace(
        /{biaya}/g,
        formatRupiah(item.finalCost || item.estimatedCost)
      )
      .replace(/{dp}/g, formatRupiah(item.dp || 0))
      .replace(/{sisa}/g, formatRupiah(sisa));

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(template)}`,
      '_blank'
    );
  };

  // Handlers: Checkout
  const handleCheckoutConfirm = (
    ticketId: string,
    actionType: 'DIAMBIL' | 'BATAL',
    paymentMethod: string,
    warrantyDays: number,
    cancelReason: string
  ) => {
    const nowStr = formatDateTime();
    let updatedTarget: ServiceItem | null = null;

    // Ambil data tiket saat ini sebelum update state (untuk kalkulasi sisa pelunasan)
    const currentTicket = services.find((s) => s.id === ticketId);

    setServices((prev) =>
      prev.map((s) => {
        if (s.id === ticketId) {
          if (actionType === 'DIAMBIL') {
            const final = {
              ...s,
              status: 'DIAMBIL' as const,
              paymentMethod,
              warrantyDays,
              pickedUpAt: nowStr,
              dp: s.finalCost || s.estimatedCost,
            };
            updatedTarget = final;
            return final;
          } else {
            const final = {
              ...s,
              status: 'BATAL' as const,
              cancelReason,
              paymentMethod: 'Batal',
              warrantyDays: 0,
              pickedUpAt: nowStr,
            };
            updatedTarget = final;
            return final;
          }
        }
        return s;
      })
    );

    setCheckoutTicketId(null);
    if (actionType === 'DIAMBIL') {
      addToast(
        `Mantap! HP berhasil diambil. Garansi aktif ${warrantyDays} Hari.`,
        'success'
      );
      if (updatedTarget) {
        handleSendWhatsAppReceipt(updatedTarget, 'PICKUP');
      }
    } else {
      addToast(
        `HP yang dibatalkan telah diserahkan kembali ke pemilik & masuk ke Riwayat Servis.`,
        'info'
      );
      if (updatedTarget) {
        handleSendWhatsAppReceipt(updatedTarget, 'CANCEL');
      }
    }

    // Sinkronkan ke Supabase: update status, catat pelunasan & garansi (non-blocking)
    if (currentUser?.storeId && currentTicket) {
      checkoutService({
        ticketId,
        storeId: currentUser.storeId,
        actionType,
        paymentMethod,
        warrantyDays,
        cancelReason,
        currentDp: currentTicket.dp || 0,
        finalCost: currentTicket.finalCost || currentTicket.estimatedCost || 0,
        ticketNo: currentTicket.ticketNo,
      }).catch((err) => console.error('[App] checkoutService error:', err));
    }

    setTimeout(() => {
      setReceiptTicketId(ticketId);
    }, 200);
  };

  // Handlers: Reopen ticket
  const handleReopenTicket = (ticketId: string) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === ticketId) {
          return {
            ...s,
            status: 'BARU' as const,
            pickedUpAt: null,
          };
        }
        return s;
      })
    );
    addToast('HP berhasil dikembalikan ke Servis Berjalan!', 'info');

    // Sinkronkan perubahan status ke Supabase (non-blocking)
    if (currentUser?.storeId) {
      updateServiceStatus(ticketId, currentUser.storeId, 'BARU').catch((err) =>
        console.error('[App] updateServiceStatus (handleReopenTicket) error:', err)
      );
    }
  };

  // Handlers: WhatsApp direct chat
  const handleNavigateToService = (ticketId: string) => {
    const item = services.find((s) => s.id === ticketId);
    if (!item) return;
    if (item.status === 'BARU' || item.status === 'PROSES') {
      setCurrentView('board');
    } else if (item.status === 'SIAP' || (item.status === 'BATAL' && !item.pickedUpAt)) {
      setCurrentView('ready');
    } else {
      setCurrentView('history');
    }
  };

  const handleDirectWhatsApp = (ticketId: string) => {
    const item = services.find((s) => s.id === ticketId);
    if (!item || !item.customerPhone || item.customerPhone === 'Tanpa WA') {
      addToast('Pelanggan ini tidak mencantumkan nomor WA.', 'warning');
      return;
    }

    let phone = item.customerPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);

    const msg = `Halo Bos *${item.customerName}*,\n\nKami dari *${storeSettings.storeName}* mau konfirmasi soal servis HP *${item.deviceModel}* (Nota: *${item.ticketNo}*).\n\nAda yang bisa kami bantu? Makasih ya Bos.`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
      '_blank'
    );
  };

  // Handlers: Receipt WhatsApp Reminder
  const handleSendWhatsAppReceipt = (
    item: ServiceItem,
    templateType?: 'INTAKE' | 'DIAGNOSIS' | 'READY' | 'PICKUP' | 'CANCEL'
  ) => {
    if (item.customerPhone === 'Tanpa WA' || !item.customerPhone) {
      addToast('Pelanggan ini tidak memiliki nomor WA.', 'warning');
      return;
    }

    let phone = item.customerPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);

    const isBatal = item.status === 'BATAL';
    const replacePlaceholders = (template: string) => {
      return template
        .replace(/{nama}/g, item.customerName)
        .replace(/{unit}/g, item.deviceModel)
        .replace(/{nota}/g, item.ticketNo)
        .replace(/{toko}/g, storeSettings.storeName)
        .replace(
          /{biaya}/g,
          isBatal
            ? 'Rp 0 (Batal)'
            : formatRupiah(item.finalCost || item.estimatedCost)
        )
        .replace(/{dp}/g, formatRupiah(item.dp || 0))
        .replace(
          /{sisa}/g,
          isBatal
            ? 'Rp 0 (Batal)'
            : item.status === 'DIAMBIL'
            ? 'LUNAS'
            : formatRupiah(
                Math.max(
                  0,
                  (item.finalCost || item.estimatedCost) - (item.dp || 0)
                )
              )
        )
        .replace(/{keluhan}/g, item.complaints.join(', '))
        .replace(/{diagnosis}/g, item.diagnosis || 'Pengecekan teknisi')
        .replace(/{garansi}/g, (item.warrantyDays || 0).toString())
        .replace(/{alasan}/g, item.cancelReason || 'Dibatalkan oleh pelanggan/teknisi')
        .replace(/{metode}/g, item.paymentMethod || 'Tunai');
    };

    const type =
      templateType ||
      (item.status === 'DIAMBIL'
        ? 'PICKUP'
        : item.status === 'BATAL'
        ? 'CANCEL'
        : item.status === 'SIAP'
        ? 'READY'
        : 'INTAKE');

    let msg = '';
    if (type === 'INTAKE') {
      msg = replacePlaceholders(
        storeSettings.waIntakeMsg || DEFAULT_STORE_SETTINGS.waIntakeMsg || ''
      );
    } else if (type === 'DIAGNOSIS') {
      msg = replacePlaceholders(
        storeSettings.waDiagnosisMsg || DEFAULT_STORE_SETTINGS.waDiagnosisMsg || ''
      );
    } else if (type === 'READY') {
      msg = replacePlaceholders(
        storeSettings.waReadyMsg || DEFAULT_STORE_SETTINGS.waReadyMsg || ''
      );
    } else if (type === 'PICKUP') {
      msg = replacePlaceholders(
        storeSettings.waDoneMsg || DEFAULT_STORE_SETTINGS.waDoneMsg || ''
      );
    } else if (type === 'CANCEL') {
      if (item.pickedUpAt) {
        msg = replacePlaceholders(
          storeSettings.waCancelPickupMsg ||
            DEFAULT_STORE_SETTINGS.waCancelPickupMsg ||
            ''
        );
      } else {
        msg = replacePlaceholders(
          storeSettings.waCancelMsg ||
            DEFAULT_STORE_SETTINGS.waCancelMsg ||
            ''
        );
      }
    }

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
      '_blank'
    );
  };

  // Handlers: Instant Print
  const handleInstantPrint = (ticketId: string) => {
    setReceiptTicketId(ticketId);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Handlers: Cash Entries (Masukan, Keluarkan, & Pemindahan Uang)
  const handleOpenCashModal = (type: 'IN' | 'OUT' | 'TRANSFER') => {
    setCashModalDefaultType(type);
    setIsCashModalOpen(true);
  };

  const handleAddCashEntry = async (newEntry: Omit<CashEntry, 'id' | 'createdAt'>) => {
    // Panggil service layer untuk simpan ke Supabase (atau fallback lokal)
    const { entry, error } = await addCashEntry({
      storeId: currentUser?.storeId,
      payload: newEntry,
    });

    if (error && error !== 'Tersimpan secara offline') {
      console.warn('[App] addCashEntry warning:', error);
    }

    if (entry) {
      setCashEntries((prev) => [entry, ...prev]);
    }

    if (newEntry.type === 'TRANSFER') {
      const from = newEntry.transferFrom || 'Kas';
      const to = newEntry.transferTo || 'Kas';
      addToast(
        `Pemindahan uang ${formatRupiah(newEntry.amount)} (${from} ➡ ${to}) berhasil dicatat!`,
        'success'
      );
    } else {
      addToast(
        newEntry.type === 'IN'
          ? `Uang masuk ${formatRupiah(newEntry.amount)} (${newEntry.category}) berhasil dicatat!`
          : `Uang keluar ${formatRupiah(newEntry.amount)} (${newEntry.category}) berhasil dicatat!`,
        'success'
      );
    }
  };

  const handleDeleteCashEntry = async (id: string) => {
    // Update state lokal dulu agar UI langsung responsif
    setCashEntries((prev) => prev.filter((c) => c.id !== id));
    addToast('Catatan kas berhasil dihapus.', 'info');

    // Sinkronkan penghapusan ke Supabase (non-blocking)
    deleteCashEntry({ id, storeId: currentUser?.storeId }).catch((err) =>
      console.error('[App] deleteCashEntry error:', err)
    );
  };


  // Handlers: Backup JSON export & import
  const handleExportBackup = () => {
    const dataToExport = {
      app: 'Sistem Servis HP & Keuangan (Dark Emerald)',
      version: '4.3',
      exportedAt: new Date().toISOString(),
      storeSettings,
      services,
      cashEntries,
    };

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateFileName = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `backup_servis_${dateFileName}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addToast('File backup berhasil didownload!', 'success');
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.services && Array.isArray(parsed.services)) {
          setServices(parsed.services);
          if (parsed.storeSettings) {
            setStoreSettings({
              ...DEFAULT_STORE_SETTINGS,
              ...parsed.storeSettings,
            });
          }
          if (parsed.cashEntries && Array.isArray(parsed.cashEntries)) {
            setCashEntries(parsed.cashEntries);
          }
          addToast(
            `Mantap, berhasil memulihkan data ${parsed.services.length} nota & ${
              parsed.cashEntries ? parsed.cashEntries.length : 0
            } buku kas!`,
            'success'
          );
        } else {
          addToast('Format file backup tidak sesuai!', 'warning');
        }
      } catch {
        addToast('Gagal membaca file backup.', 'warning');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDatabase = async () => {
    // 1. Reset state React segera agar UI langsung responsif
    setServices([]);
    setCashEntries([]);

    // 2. Bersihkan localStorage secara agresif \u2014 semua kunci yang mungkin berisi data
    const keysToWipe = [
      STORAGE_KEY_SERVICES,
      STORAGE_KEY_CASH_ENTRIES,
      'ordo_demo_sync_v5',           // kunci seed dummy lama
      'ordo_servis_services_v5',
      'ordo_servis_services_v4',
      'ordo_servis_services_v3',
      'ordo_servis_cash_entries_v1',
    ];
    keysToWipe.forEach((key) => {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    });
    // Tulis array kosong secara eksplisit agar re-read dari localStorage tetap kosong
    try {
      localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_CASH_ENTRIES, JSON.stringify([]));
    } catch { /* ignore */ }

    // 3. Hapus dari Supabase: tabel 'services' dan 'cash_entries' milik toko ini
    // Nama tabel sesuai serviceTicketService.ts (.from('services')) dan cashService.ts (.from('cash_entries'))
    if (currentUser?.storeId) {
      try {
        const storeId = currentUser.storeId;
        // Hapus tiket servis (tabel: services)
        const { error: svcErr } = await supabase
          .from('services' as any)
          .delete()
          .eq('store_id', storeId);
        if (svcErr) console.error('[App] Hapus services error:', svcErr);

        // Hapus catatan kas (tabel: cash_entries)
        const { error: cashErr } = await supabase
          .from('cash_entries' as any)
          .delete()
          .eq('store_id', storeId);
        if (cashErr) console.error('[App] Hapus cash_entries error:', cashErr);

      } catch (err) {
        console.error('[App] handleResetDatabase Supabase error:', err);
      }
    }

    addToast('Data tiket & kas berhasil dihapus. Pengaturan toko & pelanggan tetap aman!', 'info');
  };

  const handleLoadDemoData = () => {
    setServices(INITIAL_SERVICES);
    try {
      localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(INITIAL_SERVICES));
    } catch {
      // ignore
    }
    addToast('Data contoh lengkap berhasil dimuat ke semua menu!', 'success');
  };

  const handleSyncOfflineData = async () => {
    if (!currentUser?.storeId) {
      addToast('Silakan login terlebih dahulu untuk menyinkronkan data ke cloud.', 'warning');
      return;
    }

    setIsSyncingOffline(true);
    addToast('Memulai sinkronisasi data offline ke cloud...', 'info');

    try {
      const result = await syncLocalDataToSupabase({
        storeId: currentUser.storeId,
        fallbackServices: services,
        fallbackCashEntries: cashEntries,
      });

      if (result.success) {
        addToast(result.message, 'success');

        // Muat data terbaru dari Supabase ke state agar UI langsung ter-update
        try {
          const freshTickets = await fetchServiceTickets(currentUser.storeId);
          if (freshTickets && freshTickets.length > 0) {
            setServices(freshTickets);
          }
          const freshCash = await fetchCashEntries(currentUser.storeId);
          if (freshCash && freshCash.length > 0) {
            setCashEntries(freshCash);
          }
        } catch (fetchErr) {
          console.warn('[App] Gagal refresh state pasca-sinkronisasi:', fetchErr);
        }
      } else {
        addToast(result.message || 'Gagal menyinkronkan data ke cloud.', 'warning');
      }
    } catch (err: any) {
      console.error('[App] Error handleSyncOfflineData:', err);
      addToast(err?.message || 'Terjadi kesalahan saat sinkronisasi.', 'warning');
    } finally {
      setIsSyncingOffline(false);
    }
  };

  // Target object helpers for modals
  const activeReceiptTicket = useMemo(
    () => services.find((s) => s.id === receiptTicketId) || null,
    [services, receiptTicketId]
  );
  const activeEditUnit = useMemo(
    () => services.find((s) => s.id === editTicketId) || null,
    [services, editTicketId]
  );
  const activeReadyUnit = useMemo(
    () => services.find((s) => s.id === readyTicketId) || null,
    [services, readyTicketId]
  );
  const activeDiagnosisUnit = useMemo(
    () => services.find((s) => s.id === diagnosisTicketId) || null,
    [services, diagnosisTicketId]
  );
  const activeCheckoutUnit = useMemo(
    () => services.find((s) => s.id === checkoutTicketId) || null,
    [services, checkoutTicketId]
  );
  const activeEditCustomer = useMemo(
    () => customers.find((c) => c.primaryKey === editCustomerKey) || null,
    [customers, editCustomerKey]
  );
  const activeHistoryCustomer = useMemo(
    () => customers.find((c) => c.primaryKey === historyCustomerKey) || null,
    [customers, historyCustomerKey]
  );

  const allLedgerTransactions = useMemo(
    () => getLedgerTransactions(services, cashEntries),
    [services, cashEntries]
  );

  // ── SECURITY GATE 1: Auth Loading ──────────────────────────────────────────
  // Selama Supabase masih memverifikasi sesi (token refresh, INITIAL_SESSION),
  // tampilkan loading screen untuk mencegah flash of unauthenticated content.
  // Ini juga memblokir upaya bypass URL langsung ke /dashboard saat token belum terverifikasi.
  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Memverifikasi sesi...</p>
        </div>
      </div>
    );
  }

  // ── SECURITY GATE 2: Unauthenticated User ──────────────────────────────────
  // Jika sedang di landing page ATAU belum login, tampilkan Landing Page
  if (currentView === 'landing' || !currentUser) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-white">
        <ToastContainer toasts={toasts} />
        <LandingPage
          onStart={() => {
            if (currentUser) {
              setCurrentView('dashboard');
              if (typeof window !== 'undefined') {
                window.history.pushState(null, '', '/dashboard');
              }
            } else {
              setAuthModalMode('login');
              setIsAuthModalOpen(true);
            }
          }}
          onLogin={() => {
            if (currentUser) {
              setCurrentView('dashboard');
              if (typeof window !== 'undefined') {
                window.history.pushState(null, '', '/dashboard');
              }
            } else {
              setAuthModalMode('login');
              setIsAuthModalOpen(true);
            }
          }}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          currentUser={currentUser}
          onOpenDashboard={() => {
            setCurrentView('dashboard');
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', '/dashboard');
            }
          }}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          initialMode={authModalMode}
          onLoginSuccess={(user, isNewReg) => {
            handleAuthSuccess(user, isNewReg);
            setCurrentView('dashboard');
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', '/dashboard');
            }
          }}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full flex justify-center selection:bg-emerald-500 selection:text-black bg-white dark:bg-zinc-950 text-gray-900 dark:text-white"
    >
      {/* Wrapper Layout Utama: Dibatasi max-w-[1440px] agar konten tetap terpusat rapi di monitor ultrawide */}
      <div
        className="w-full max-w-[1440px] h-screen overflow-hidden antialiased flex flex-row shadow-2xl relative border-x border-slate-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white"
      >
        {/* Toast Notification Container */}
        <ToastContainer toasts={toasts} />

      {/* Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={(v) => setCurrentView(v)}
        onOpenServiceModal={() => setIsServiceModalOpen(true)}
        storeSettings={storeSettings}
        counts={counts}
        currentUser={currentUser}
        onOpenOnboarding={() => setShowManualOnboarding(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-white dark:bg-zinc-950 text-gray-900 dark:text-white"
      >
        <Header
          currentView={currentView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery('')}
          onNavigateSettings={() => setCurrentView('settings')}
          storeSettings={storeSettings}
          services={services}
          onSelectService={(id) => setReceiptTicketId(id)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          currentUser={currentUser}
          onOpenOnboarding={() => setShowManualOnboarding(true)}
          onOpenFeedback={() => setIsFeedbackModalOpen(true)}
          onLogout={handleLogout}
        />

        <main className="max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6 flex-1">
          {currentView === 'dashboard' && (
            <DashboardView
              services={services}
              cashEntries={cashEntries}
              onNavigateBoard={() => setCurrentView('board')}
              onNavigateReady={() => setCurrentView('ready')}
              onNavigateHistory={() => setCurrentView('history')}
              onNavigateAccounting={() => setCurrentView('accounting')}
              onNavigateCustomers={() => setCurrentView('customers')}
              onOpenServiceModal={() => setIsServiceModalOpen(true)}
              onViewDetail={(id) => setReceiptTicketId(id)}
              onNavigateToService={handleNavigateToService}
              onDirectWhatsApp={handleDirectWhatsApp}
            />
          )}

          {currentView === 'customers' && (
            <CustomersView
              customers={customers}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenCustomerHistory={(key) => setHistoryCustomerKey(key)}
              onOpenEditCustomer={(key) => setEditCustomerKey(key)}
              onOpenServiceModal={() => setIsServiceModalOpen(true)}
            />
          )}

          {currentView === 'board' && (
            <BoardView
              services={services}
              searchQuery={searchQuery}
              onUpdateStatus={handleUpdateStatus}
              onOpenReadyModal={(id) => setReadyTicketId(id)}
              onOpenDiagnosisModal={(id) => setDiagnosisTicketId(id)}
              onOpenEditUnitModal={(id) => setEditTicketId(id)}
              onViewDetail={(id) => setReceiptTicketId(id)}
              onInstantPrint={handleInstantPrint}
              onDirectWhatsApp={handleDirectWhatsApp}
              onOpenServiceModal={() => setIsServiceModalOpen(true)}
            />
          )}

          {currentView === 'ready' && (
            <ReadyView
              services={services}
              searchQuery={searchQuery}
              onOpenCheckoutModal={(id) => setCheckoutTicketId(id)}
              onOpenEditUnitModal={(id) => setEditTicketId(id)}
              onViewDetail={(id) => setReceiptTicketId(id)}
              onInstantPrint={handleInstantPrint}
              onDirectWhatsApp={handleDirectWhatsApp}
            />
          )}

          {currentView === 'history' && (
            <HistoryView
              services={services}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              historyFilter={historyFilter}
              onSetHistoryFilter={setHistoryFilter}
              onViewDetail={(id) => setReceiptTicketId(id)}
              onReopenTicket={handleReopenTicket}
            />
          )}

          {currentView === 'accounting' && (
            <AccountingView
              services={services}
              cashEntries={cashEntries}
              onOpenDayDetail={(d) => setAccDetailDate(d)}
              onOpenAddCash={handleOpenCashModal}
              onDeleteCashEntry={handleDeleteCashEntry}
              storeName={storeSettings.storeName}
              onToast={addToast}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              settings={storeSettings}
              onSaveSettings={async (s) => {
                // Optimistic UI update
                setStoreSettings(s);
                if (currentUser) {
                  const updatedUser: AuthUser = {
                    ...currentUser,
                    name: s.ownerName?.trim() || currentUser.name,
                    storeName: s.storeName?.trim() || currentUser.storeName,
                    phone: s.storePhone?.trim() || currentUser.phone,
                  };
                  setCurrentUser(updatedUser);
                }

                // Cloud Sync: Operasi UPDATE langsung ke Supabase, lalu sinkronkan respons kembali ke global state
                if (currentUser?.storeId) {
                  try {
                    const res = await saveAllStoreSettings({
                      storeId: currentUser.storeId,
                      settings: s,
                    });
                    if (res.success && res.updatedSettings) {
                      setStoreSettings(res.updatedSettings);
                      addToast('Pengaturan toko & format nota berhasil disimpan ke Cloud!', 'success');
                    } else if (res.errors && res.errors.length > 0) {
                      console.error('[App] saveAllStoreSettings errors:', res.errors);
                      addToast('Sebagian pengaturan gagal disimpan: ' + res.errors.join(', '), 'warning');
                    }
                  } catch (err) {
                    console.error('[App] saveAllStoreSettings error:', err);
                    addToast('Gagal menyinkronkan pengaturan ke Supabase Cloud', 'warning');
                  }
                } else {
                  addToast('Pengaturan toko berhasil disimpan (mode lokal)!', 'success');
                }
              }}
              onUploadLogo={async (base64: string) => {
                if (!currentUser?.storeId) return base64;
                const { publicUrl } = await uploadStoreLogo(currentUser.storeId, base64);
                return publicUrl || base64;
              }}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              onResetDatabase={handleResetDatabase}
              onLoadDemoData={handleLoadDemoData}
              theme={theme}
              onToggleTheme={handleToggleTheme}
              onOpenStoreSetup={() => setShowManualStoreSetup(true)}
              onOpenOnboarding={() => setShowManualOnboarding(true)}
              currentUser={currentUser}
              onLogout={handleLogout}
              onSyncOfflineData={handleSyncOfflineData}
              isSyncingOffline={isSyncingOffline}
            />
          )}

          {currentView === 'landing' && (
            <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs">
              <LandingPage
                onStart={() => setCurrentView('dashboard')}
                onLogin={() => setCurrentView('dashboard')}
                theme={theme}
                onToggleTheme={handleToggleTheme}
                currentUser={currentUser}
                onOpenDashboard={() => setCurrentView('dashboard')}
              />
            </div>
          )}
        </main>
      </div>
    </div>

      {/* MODALS */}
      {/* 1. Intake Service Modal */}
      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        customers={customers}
        onSubmit={handleIntakeSubmit}
      />

      {/* 2. Edit Customer Modal */}
      <EditCustomerModal
        isOpen={Boolean(editCustomerKey)}
        onClose={() => setEditCustomerKey(null)}
        customer={activeEditCustomer}
        onSubmit={handleEditCustomerSubmit}
      />

      {/* 3. Customer History Modal */}
      <CustomerHistoryModal
        isOpen={Boolean(historyCustomerKey)}
        onClose={() => setHistoryCustomerKey(null)}
        customer={activeHistoryCustomer}
        onViewDetail={(id) => setReceiptTicketId(id)}
      />

      {/* 4. Edit Unit Modal */}
      <EditUnitModal
        isOpen={Boolean(editTicketId)}
        onClose={() => setEditTicketId(null)}
        service={activeEditUnit}
        onSubmit={handleEditUnitSubmit}
      />

      {/* 5. Ready Modal (Kunci Harga) */}
      <ReadyModal
        isOpen={Boolean(readyTicketId)}
        onClose={() => setReadyTicketId(null)}
        service={activeReadyUnit}
        technicianName={currentUser?.name || storeSettings.ownerName || 'Owner'}
        onSubmit={handleReadySubmit}
      />

      {/* 5b. Diagnosis Modal (Konfirmasi Estimasi & Diagnosa) */}
      <DiagnosisModal
        isOpen={Boolean(diagnosisTicketId)}
        onClose={() => setDiagnosisTicketId(null)}
        service={activeDiagnosisUnit}
        storeSettings={storeSettings}
        onSubmit={handleDiagnosisSubmit}
      />

      {/* 6. Checkout Modal (Pelunasan / Batal) */}
      <CheckoutModal
        isOpen={Boolean(checkoutTicketId)}
        onClose={() => setCheckoutTicketId(null)}
        service={activeCheckoutUnit}
        defaultWarrantyDays={storeSettings.defaultWarrantyDays}
        onConfirm={handleCheckoutConfirm}
      />

      {/* 7. Receipt Modal (Cetak Nota & WhatsApp) */}
      <ReceiptModal
        isOpen={Boolean(receiptTicketId)}
        onClose={() => setReceiptTicketId(null)}
        service={activeReceiptTicket}
        storeSettings={storeSettings}
        onSendWhatsApp={handleSendWhatsAppReceipt}
      />

      {/* 8. Accounting Day Detail Modal */}
      <AccDetailDayModal
        isOpen={Boolean(accDetailDate)}
        onClose={() => setAccDetailDate(null)}
        dateStr={accDetailDate}
        transactions={allLedgerTransactions}
      />

      {/* 8b. Cash Entry Modal (Masukan & Keluarkan Uang) */}
      <CashEntryModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
        defaultType={cashModalDefaultType}
        onSubmit={handleAddCashEntry}
      />

      {/* 9. Prioritas 2: Store Setup Modal (Profil Toko & Nota) */}
      <StoreSetupModal
        isOpen={Boolean(currentUser && (!isStoreSetupDone || showManualStoreSetup))}
        currentUser={currentUser}
        initialSettings={storeSettings}
        onComplete={handleStoreSetupComplete}
      />

      {/* 11. Prioritas 3: Tutorial Onboarding (4 Langkah) */}
      <OnboardingModal
        isOpen={Boolean(currentUser && isStoreSetupDone && (!isOnboardingDone || showManualOnboarding))}
        storeName={storeSettings.storeName}
        onFinish={handleOnboardingFinish}
      />

      {/* 12. Modal Kritik & Saran (Kirim ke Email Pengembang) */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        storeSettings={storeSettings}
        currentUser={currentUser}
        onShowToast={addToast}
      />
    </div>
  );
}
