export type ServiceStatus = 'BARU' | 'PROSES' | 'SIAP' | 'DIAMBIL' | 'BATAL';

export interface ServiceItem {
  id: string;
  ticketNo: string;
  customerName: string;
  customerPhone: string;
  deviceModel: string;
  screenLock: string;
  complaints: string[];
  notes: string;
  status: ServiceStatus;
  estimatedCost: number;
  initialEstimatedCost?: number;
  diagnosis?: string;
  confirmationStatus?: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK' | 'TIDAK_PERLU';
  confirmedAt?: string;
  finalCost: number;
  dp: number;
  sparepartCost: number;
  warrantyDays: number;
  paymentMethod: string;
  pickedUpAt: string | null;
  cancelReason?: string;
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  storeUsername?: string;
  ownerName: string;
  storeTagline: string;
  storeAddress: string;
  storePhone: string;
  defaultWarrantyDays: string;
  warrantyTerms: string;
  logoUrl?: string;
  waIntakeMsg?: string;
  waDiagnosisMsg?: string;
  waReadyMsg: string;
  waDoneMsg: string;
  waCancelMsg?: string;
  waCancelPickupMsg?: string;
}

export interface CustomerAggregated {
  primaryKey: string;
  customerName: string;
  customerPhone: string;
  tickets: ServiceItem[];
  totalSpending: number;
  lastActive: string;
}

export interface CashEntry {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'IN' | 'OUT' | 'TRANSFER'; // IN: Masukan Uang, OUT: Keluarkan Uang, TRANSFER: Pemindahan Uang
  category: string;
  amount: number;
  notes: string;
  paymentMethod?: string;
  transferFrom?: string;
  transferTo?: string;
  createdAt: string;
}

export interface LedgerTransaction {
  id?: string;
  date: string;
  ticketId?: string;
  ticketNo?: string;
  customerName?: string;
  deviceModel?: string;
  type:
    | 'DP_MASUK'
    | 'UNIT_MASUK_NON_DP'
    | 'PELUNASAN_SELESAI'
    | 'KAS_MASUK_MANUAL'
    | 'KAS_KELUAR_MANUAL'
    | 'KAS_TRANSFER_MANUAL';
  desc: string;
  category?: string;
  notes?: string;
  income: number;
  expense: number;
  transferFrom?: string;
  transferTo?: string;
  unitEvent?: 'MASUK' | 'SELESAI';
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

export type ViewType =
  | 'dashboard'
  | 'customers'
  | 'board'
  | 'ready'
  | 'history'
  | 'accounting'
  | 'settings'
  | 'landing';

export type HistoryFilterType = 'SEMUA' | 'DIAMBIL' | 'GARANSI_AKTIF' | 'BATAL';
export type AccountingPeriodType = 'DAILY' | 'MONTHLY' | 'YEARLY';

export type UserRole = 'OWNER';

export interface AuthUser {
  id: string;
  storeId?: string;
  name: string;
  email: string;
  phone: string;
  role?: UserRole;
  storeName: string;
  storeUsername?: string;
  avatarUrl?: string;
  hasCompletedOnboarding?: boolean;
  hasCompletedStoreSetup?: boolean;
  createdAt: string;
}
