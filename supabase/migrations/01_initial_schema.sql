-- ==============================================================================
-- ORDO V0 — SKEMA DATABASE PRODUCTION (SUPABASE POSTGRESQL)
-- Versi: 1.0.0
-- Deskripsi: Skema lengkap tabel, relasi, trigger pendaftaran & slug unik,
--            fungsi sequence nomor nota atomik, Row Level Security (RLS),
--            dan konfigurasi Storage Bucket untuk foto logo.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABEL-TABEL UTAMA
-- ==============================================================================

-- 2.1. TABEL PROFIL PEMILIK (PROFILES)
-- Terikat 1-to-1 dengan auth.users milik Supabase
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'OWNER' CHECK (role IN ('OWNER')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.2. TABEL TOKO / KONTER (STORES)
-- Menyimpan identitas toko, slug URL unik, preferensi tema, dan branding
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE, -- Slug URL e.g. jaya-phone-a1b2c
    tagline TEXT DEFAULT 'Pusat Servis & Ganti Sparepart',
    address TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    logo_url TEXT, -- Menyimpan Public URL dari Supabase Storage (Bukan Base64)
    default_warranty_days TEXT NOT NULL DEFAULT '7',
    warranty_terms TEXT NOT NULL DEFAULT '1. Garansi cuma buat kerusakan atau sparepart yang sama.
2. Segel konter jangan sampai sobek atau kena air.
3. Bawa nota atau tunjukin chat WA ini pas mau klaim garansi.',
    theme_preference TEXT NOT NULL DEFAULT 'dark' CHECK (theme_preference IN ('dark', 'light')),
    has_completed_onboarding BOOLEAN NOT NULL DEFAULT false,
    has_completed_store_setup BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.3. TABEL TEMPLATE WHATSAPP TOKO (STORE_WHATSAPP_TEMPLATES)
-- 6 template pesan dinamis milik toko
CREATE TABLE IF NOT EXISTS public.store_whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
    wa_intake_msg TEXT NOT NULL,
    wa_diagnosis_msg TEXT NOT NULL,
    wa_ready_msg TEXT NOT NULL,
    wa_done_msg TEXT NOT NULL,
    wa_cancel_msg TEXT NOT NULL,
    wa_cancel_pickup_msg TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.4. TABEL COUNTER SEQUENCE NOMOR TIKET (STORE_TICKET_SEQUENCES)
-- Menghitung sequence nota tahunan per toko secara atomik untuk mencegah nomor ganda
CREATE TABLE IF NOT EXISTS public.store_ticket_sequences (
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    year_short VARCHAR(2) NOT NULL, -- e.g. '26'
    last_sequence INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (store_id, year_short)
);

-- 2.5. TABEL PELANGGAN (CUSTOMERS)
-- Menyimpan kontak pelanggan terdaftar per toko
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT 'Tanpa WA',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_customers_store_id ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(store_id, phone);

-- 2.6. TABEL TIKET SERVIS HP (SERVICES)
-- Inti operasional teknisi dan serah terima unit
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    ticket_no TEXT NOT NULL, -- e.g. 'OR-26-00101'
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name_snapshot TEXT NOT NULL,
    customer_phone_snapshot TEXT NOT NULL DEFAULT 'Tanpa WA',
    device_model TEXT NOT NULL,
    screen_lock TEXT NOT NULL DEFAULT '-',
    complaints TEXT[] NOT NULL DEFAULT '{}'::text[],
    notes TEXT NOT NULL DEFAULT '-',
    status TEXT NOT NULL DEFAULT 'BARU' CHECK (status IN ('BARU', 'PROSES', 'SIAP', 'DIAMBIL', 'BATAL')),
    estimated_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
    initial_estimated_cost NUMERIC(14, 2),
    diagnosis TEXT,
    confirmation_status TEXT NOT NULL DEFAULT 'TIDAK_PERLU' CHECK (confirmation_status IN ('MENUNGGU', 'DISETUJUI', 'DITOLAK', 'TIDAK_PERLU')),
    confirmed_at TIMESTAMPTZ,
    final_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
    dp_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    sparepart_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
    warranty_days INTEGER NOT NULL DEFAULT 7,
    payment_method TEXT NOT NULL DEFAULT '-',
    ready_at TIMESTAMPTZ, -- Waktu saat status berubah jadi SIAP
    picked_up_at TIMESTAMPTZ, -- Waktu saat status berubah jadi DIAMBIL atau BATAL diserahkan
    cancel_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_store_ticket_no UNIQUE (store_id, ticket_no)
);

CREATE INDEX IF NOT EXISTS idx_services_store_id ON public.services(store_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(store_id, status);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON public.services(store_id, created_at DESC);

-- 2.7. TABEL TRANSAKSI PEMBAYARAN SERVIS (PAYMENTS)
-- Menampung uang muka (DP) dan pelunasan saat unit diambil
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('DP', 'PELUNASAN')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    payment_method TEXT NOT NULL, -- e.g. 'Tunai (Cash)', 'BCA', 'QRIS'
    payment_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_store_service ON public.payments(store_id, service_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(store_id, payment_date DESC);

-- 2.8. TABEL GARANSI SERVIS (WARRANTIES)
-- Menyimpan status garansi aktif untuk unit yang telah diambil
CREATE TABLE IF NOT EXISTS public.warranties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    service_id UUID NOT NULL UNIQUE REFERENCES public.services(id) ON DELETE CASCADE,
    duration_days INTEGER NOT NULL CHECK (duration_days >= 0),
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    terms TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_warranties_expiry ON public.warranties(store_id, expiry_date);

-- 2.9. TABEL BUKU KAS MANUAL & ARUS KEUANGAN (CASH_ENTRIES)
-- Menyimpan pemasukan manual, pengeluaran manual, dan mutasi saldo kas (TRANSFER)
CREATE TABLE IF NOT EXISTS public.cash_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('IN', 'OUT', 'TRANSFER')),
    category TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    notes TEXT NOT NULL,
    payment_method TEXT, -- 'TUNAI' | 'BCA' | 'QRIS' (NULL untuk transfer)
    transfer_from TEXT,  -- 'TUNAI' | 'BCA' | 'QRIS' (Khusus TRANSFER)
    transfer_to TEXT,    -- 'TUNAI' | 'BCA' | 'QRIS' (Khusus TRANSFER)
    entry_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cash_entries_date ON public.cash_entries(store_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_entries_type ON public.cash_entries(store_id, entry_type);

-- ==============================================================================
-- 3. FUNGSI PEMBANTU & OTOMATISASI (TRIGGERS & FUNCTIONS)
-- ==============================================================================

-- 3.1. FUNGSI HELPER: MENDAPATKAN STORE ID USER AKTIF
CREATE OR REPLACE FUNCTION public.get_current_store_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT id FROM public.stores WHERE owner_id = auth.uid() LIMIT 1;
$$;

-- 3.2. FUNGSI HELPER: MEMBUAT SLUG TOKO OTOMATIS DARI NAMA KONTER
-- Contoh: "Jaya Phone Service" -> "jaya-phone-service-a1b2c"
CREATE OR REPLACE FUNCTION public.generate_store_slug(store_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
    clean_base TEXT;
    random_code TEXT;
    final_slug TEXT;
    slug_exists BOOLEAN;
BEGIN
    -- Bersihkan karakter non-alphanumeric menjadi strip (-)
    clean_base := lower(regexp_replace(trim(store_name), '[^a-zA-Z0-9]+', '-', 'g'));
    clean_base := trim(both '-' from clean_base);
    
    IF clean_base = '' THEN
        clean_base := 'konter';
    END IF;

    LOOP
        -- Buat 5 karakter acak unik (a-z, 0-9)
        random_code := lower(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
        final_slug := clean_base || '-' || random_code;
        
        -- Pastikan belum digunakan
        SELECT EXISTS(SELECT 1 FROM public.stores WHERE username = final_slug) INTO slug_exists;
        EXIT WHEN NOT slug_exists;
    END LOOP;

    RETURN final_slug;
END;
$$;

-- 3.3. FUNGSI OTOMATISASI PENDAFTARAN AKUN BARU (HANDLE NEW USER)
-- Dijalankan oleh trigger saat user mendaftar di auth.users Supabase
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    owner_name TEXT;
    counter_name TEXT;
    owner_phone TEXT;
    generated_slug TEXT;
    new_store_id UUID;
BEGIN
    -- Ambil metadata yang dikirim saat supabase.auth.signUp()
    owner_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Pemilik Konter');
    counter_name := coalesce(new.raw_user_meta_data->>'store_name', 'Ordo Servis HP');
    owner_phone := coalesce(new.raw_user_meta_data->>'phone', '');

    -- 1. Buat Profil Pemilik
    INSERT INTO public.profiles (id, full_name, phone, role)
    VALUES (new.id, owner_name, owner_phone, 'OWNER')
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone;

    -- 2. Generate Slug Toko Unik Otomatis di Balik Layar
    generated_slug := public.generate_store_slug(counter_name);

    -- 3. Buat Toko Baru
    INSERT INTO public.stores (
        owner_id,
        name,
        username,
        phone,
        has_completed_onboarding,
        has_completed_store_setup
    )
    VALUES (
        new.id,
        counter_name,
        generated_slug,
        owner_phone,
        false,
        false
    )
    RETURNING id INTO new_store_id;

    -- 4. Isi Template WhatsApp Standar V0 untuk Toko Ini
    INSERT INTO public.store_whatsapp_templates (
        store_id,
        wa_intake_msg,
        wa_diagnosis_msg,
        wa_ready_msg,
        wa_done_msg,
        wa_cancel_msg,
        wa_cancel_pickup_msg
    )
    VALUES (
        new_store_id,
        'Halo Kak *{nama}*,

Terima kasih telah mempercayakan servis HP di *{toko}*.

📋 *Tanda Terima Servis (Nota: {nota})*
• Unit: *{unit}*
• Keluhan: {keluhan}
• Estimasi Biaya: {biaya}
• DP Masuk: {dp}
• Sisa Estimasi: {sisa}

Kami akan segera cek dan kabari status servisnya. Simpan pesan ini sebagai bukti tanda terima. Terima kasih! 🙏',

        'Halo Kak *{nama}*,

Update dari *{toko}* mengenai pengecekan HP *{unit}* (Nota: *{nota}*):

🛠️ *Hasil Diagnosis:*
{diagnosis}

💰 *Estimasi Biaya:* {biaya}
• DP Masuk: {dp}
• Estimasi Sisa: {sisa}

Apakah disetujui untuk kami lanjut kerjakan? Balas pesan ini ya Kak. Terima kasih! 🙏',

        'Halo Bos *{nama}*,

Kabar baik! HP *{unit}* (Nota: *{nota}*) udah beres diservis dan siap diambil di *{toko}* 🛠️.

*Rincian Biaya:*
• Total: {biaya}
• DP: {dp}
• *Sisa: {sisa}*

Ditunggu kedatangannya ya bos. Makasih banyak! 🙏',

        'Halo Bos *{nama}*,

Makasih banyak ya udah servis di *{toko}*.
HP *{unit}* (Nota: {nota}) udah diambil dan ada garansi toko selama *{garansi} Hari*.

Simpen chat ini buat bukti garansi ya bos. Semoga HP-nya awet terus! ✨',

        'Halo Kak *{nama}*,

Servis HP *{unit}* (Nota: *{nota}*) di *{toko}* telah dibatalkan dengan alasan: {alasan}.

Unit HP sudah siap dan dapat diambil kembali di konter kami ya Kak.
• Biaya Servis: Rp 0

Terima kasih! 🙏',

        'Halo Kak *{nama}*,

Unit HP *{unit}* (Nota: *{nota}*) yang dibatalkan servisnya (Alasan: {alasan}) telah diserahkan kembali kepada pemilik di *{toko}*.

📋 *Rincian Serah Terima:*
• Biaya Servis: Rp 0
• Status: Sudah Diambil Kembali

Terima kasih telah berkunjung ke *{toko}*. 🙏'
    );

    RETURN new;
END;
$$;

-- Pasang trigger pada auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3.4. FUNGSI PENGUNCI NOMOR TIKET ATOMIK (GENERATE NEXT TICKET NO)
-- Format: OR-YY-XXXXX (contoh: OR-26-00001)
-- Menggunakan SELECT ... FOR UPDATE untuk mengunci sequence secara atomik
CREATE OR REPLACE FUNCTION public.generate_next_ticket_no(
    p_store_id UUID,
    p_year_short VARCHAR(2) DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_year_short VARCHAR(2);
    v_next_seq INTEGER;
    v_ticket_no TEXT;
BEGIN
    -- Jika p_year_short tidak diberikan, ambil 2 digit tahun sekarang
    IF p_year_short IS NULL OR p_year_short = '' THEN
        v_year_short := to_char(now(), 'YY');
    ELSE
        v_year_short := p_year_short;
    END IF;

    -- Kunci dan naikkan sequence untuk store dan tahun terkait
    INSERT INTO public.store_ticket_sequences (store_id, year_short, last_sequence)
    VALUES (p_store_id, v_year_short, 1)
    ON CONFLICT (store_id, year_short)
    DO UPDATE SET last_sequence = store_ticket_sequences.last_sequence + 1
    RETURNING last_sequence INTO v_next_seq;

    -- Format nomor tiket: OR-YY-XXXXX (5 digit dengan padding 0)
    v_ticket_no := 'OR-' || v_year_short || '-' || lpad(v_next_seq::text, 5, '0');

    RETURN v_ticket_no;
END;
$$;

-- ==============================================================================
-- 4. KEAMANAN ROW LEVEL SECURITY (RLS) & ISOLASI DATA TOKO
-- ==============================================================================

-- Aktifkan RLS di semua tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_ticket_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;

-- 4.1. POLICIES: PROFILES
DROP POLICY IF EXISTS "Profiles: User can view own profile" ON public.profiles;
CREATE POLICY "Profiles: User can view own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());

DROP POLICY IF EXISTS "Profiles: User can update own profile" ON public.profiles;
CREATE POLICY "Profiles: User can update own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid());

-- 4.2. POLICIES: STORES
DROP POLICY IF EXISTS "Stores: Owner can view own store" ON public.stores;
CREATE POLICY "Stores: Owner can view own store"
    ON public.stores FOR SELECT
    USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Stores: Owner can update own store" ON public.stores;
CREATE POLICY "Stores: Owner can update own store"
    ON public.stores FOR UPDATE
    USING (owner_id = auth.uid());

-- 4.3. POLICIES: STORE WHATSAPP TEMPLATES
DROP POLICY IF EXISTS "WA Templates: Store isolation policy" ON public.store_whatsapp_templates;
CREATE POLICY "WA Templates: Store isolation policy"
    ON public.store_whatsapp_templates FOR ALL
    USING (store_id = public.get_current_store_id())
    WITH CHECK (store_id = public.get_current_store_id());

-- 4.4. POLICIES: STORE TICKET SEQUENCES
DROP POLICY IF EXISTS "Ticket Sequences: Store isolation policy" ON public.store_ticket_sequences;
CREATE POLICY "Ticket Sequences: Store isolation policy"
    ON public.store_ticket_sequences FOR ALL
    USING (store_id = public.get_current_store_id())
    WITH CHECK (store_id = public.get_current_store_id());

-- 4.5. POLICIES: CUSTOMERS
DROP POLICY IF EXISTS "Customers: Store isolation policy" ON public.customers;
CREATE POLICY "Customers: Store isolation policy"
    ON public.customers FOR ALL
    USING (store_id = public.get_current_store_id())
    WITH CHECK (store_id = public.get_current_store_id());

-- 4.6. POLICIES: SERVICES
DROP POLICY IF EXISTS "Services: Store isolation policy" ON public.services;
CREATE POLICY "Services: Store isolation policy"
    ON public.services FOR ALL
    USING (store_id = public.get_current_store_id())
    WITH CHECK (store_id = public.get_current_store_id());

-- 4.7. POLICIES: PAYMENTS
DROP POLICY IF EXISTS "Payments: Store isolation policy" ON public.payments;
CREATE POLICY "Payments: Store isolation policy"
    ON public.payments FOR ALL
    USING (store_id = public.get_current_store_id())
    WITH CHECK (store_id = public.get_current_store_id());

-- 4.8. POLICIES: WARRANTIES
DROP POLICY IF EXISTS "Warranties: Store isolation policy" ON public.warranties;
CREATE POLICY "Warranties: Store isolation policy"
    ON public.warranties FOR ALL
    USING (store_id = public.get_current_store_id())
    WITH CHECK (store_id = public.get_current_store_id());

-- 4.9. POLICIES: CASH ENTRIES
DROP POLICY IF EXISTS "Cash Entries: Store isolation policy" ON public.cash_entries;
CREATE POLICY "Cash Entries: Store isolation policy"
    ON public.cash_entries FOR ALL
    USING (store_id = public.get_current_store_id())
    WITH CHECK (store_id = public.get_current_store_id());

-- ==============================================================================
-- 5. SETUP SUPABASE STORAGE BUCKET (STORE-LOGOS)
-- ==============================================================================

-- Buat bucket penyimpanan foto logo publik
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-logos', 'store-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Kebijakan Akses Storage: Siapa saja dapat melihat logo publik konter
DROP POLICY IF EXISTS "Store Logos: Public Access" ON storage.objects;
CREATE POLICY "Store Logos: Public Access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'store-logos');

-- Kebijakan Akses Storage: Pemilik toko yang terotentikasi dapat mengunggah logo
DROP POLICY IF EXISTS "Store Logos: Authenticated Upload" ON storage.objects;
CREATE POLICY "Store Logos: Authenticated Upload"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'store-logos');

-- Kebijakan Akses Storage: Pemilik toko yang terotentikasi dapat memperbarui/menghapus logonya
DROP POLICY IF EXISTS "Store Logos: Authenticated Update" ON storage.objects;
CREATE POLICY "Store Logos: Authenticated Update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'store-logos');

DROP POLICY IF EXISTS "Store Logos: Authenticated Delete" ON storage.objects;
CREATE POLICY "Store Logos: Authenticated Delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'store-logos');
