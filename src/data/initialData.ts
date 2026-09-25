import { ServiceItem, StoreSettings } from '../types';

export const PRESET_COMPLAINTS: string[] = [
  'LCD / Layar',
  'Baterai',
  'Cas',
  'Kena Air',
  'Matot (Mati Total)',
  'Speaker / Mic',
  'Software / Bootloop',
  'Lainnya',
];

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'Ordo Pos',
  storeUsername: 'ordopos',
  ownerName: 'Admin',
  storeTagline: 'Pusat Servis & Ganti Sparepart',
  storeAddress: 'Jl. Raya Bengkel No. 42, RT 01/RW 02, Jakarta',
  storePhone: '0812-3456-7890',
  defaultWarrantyDays: '7',
  warrantyTerms:
    '1. Garansi cuma buat kerusakan atau sparepart yang sama.\n2. Segel konter jangan sampai sobek atau kena air.\n3. Bawa nota atau tunjukin chat WA ini pas mau klaim garansi.',
  waIntakeMsg:
    'Halo Kak *{nama}*,\n\nTerima kasih telah mempercayakan servis HP di *{toko}*.\n\n📋 *Tanda Terima Servis (Nota: {nota})*\n• Unit: *{unit}*\n• Keluhan: {keluhan}\n• Estimasi Biaya: {biaya}\n• DP Masuk: {dp}\n• Sisa Estimasi: {sisa}\n\nKami akan segera cek dan kabari status servisnya. Simpan pesan ini sebagai bukti tanda terima. Terima kasih! 🙏',
  waDiagnosisMsg:
    'Halo Kak *{nama}*,\n\nUpdate dari *{toko}* mengenai pengecekan HP *{unit}* (Nota: *{nota}*):\n\n🛠️ *Hasil Diagnosis:*\n{diagnosis}\n\n💰 *Estimasi Biaya:* {biaya}\n• DP Masuk: {dp}\n• Estimasi Sisa: {sisa}\n\nApakah disetujui untuk kami lanjut kerjakan? Balas pesan ini ya Kak. Terima kasih! 🙏',
  waReadyMsg:
    'Halo Bos *{nama}*,\n\nKabar baik! HP *{unit}* (Nota: *{nota}*) udah beres diservis dan siap diambil di *{toko}* 🛠️.\n\n*Rincian Biaya:*\n• Total: {biaya}\n• DP: {dp}\n• *Sisa: {sisa}*\n\nDitunggu kedatangannya ya bos. Makasih banyak! 🙏',
  waDoneMsg:
    'Halo Bos *{nama}*,\n\nMakasih banyak ya udah servis di *{toko}*.\nHP *{unit}* (Nota: {nota}) udah diambil dan ada garansi toko selama *{garansi} Hari*.\n\nSimpen chat ini buat bukti garansi ya bos. Semoga HP-nya awet terus! ✨',
  waCancelMsg:
    'Halo Kak *{nama}*,\n\nServis HP *{unit}* (Nota: *{nota}*) di *{toko}* telah dibatalkan dengan alasan: {alasan}.\n\nUnit HP sudah siap dan dapat diambil kembali di konter kami ya Kak.\n• Biaya Servis: Rp 0\n\nTerima kasih! 🙏',
  waCancelPickupMsg:
    'Halo Kak *{nama}*,\n\nUnit HP *{unit}* (Nota: *{nota}*) yang dibatalkan servisnya (Alasan: {alasan}) telah diserahkan kembali kepada pemilik di *{toko}*.\n\n📋 *Rincian Serah Terima:*\n• Biaya Servis: Rp 0\n• Status: Sudah Diambil Kembali\n\nTerima kasih telah berkunjung ke *{toko}*. 🙏',
};

export const INITIAL_SERVICES: ServiceItem[] = [
  // ==========================================
  // 1. SERVIS BERJALAN (5 DATA DEMO: BARU & PROSES)
  // ==========================================
  {
    id: 'SRV-101',
    ticketNo: 'OR-26-00101',
    customerName: 'Rizky Ananda',
    customerPhone: '0812-9920-1845',
    deviceModel: 'Samsung Galaxy A54',
    screenLock: 'PIN: 180992',
    complaints: ['LCD / Layar'],
    notes: 'Layar bergaris hijau vertikal, kaca mulus, sentuh respon',
    status: 'PROSES',
    diagnosis: 'Perlu penggantian LCD Super AMOLED original + lem waterproof',
    confirmationStatus: 'DISETUJUI',
    confirmedAt: '2026-09-14 14:30',
    estimatedCost: 650000,
    initialEstimatedCost: 650000,
    finalCost: 650000,
    dp: 200000,
    sparepartCost: 350000,
    warrantyDays: 14,
    paymentMethod: '-',
    pickedUpAt: null,
    createdAt: '2026-09-14 14:10',
  },
  {
    id: 'SRV-102',
    ticketNo: 'OR-26-00102',
    customerName: 'Nadia Putri',
    customerPhone: '0856-7781-3062',
    deviceModel: 'iPhone 13 Pro',
    screenLock: 'Passcode: 240698',
    complaints: ['Baterai'],
    notes: 'Baterai boros drastis, BH 64%, restart mendadak saat 20%',
    status: 'PROSES',
    diagnosis: 'Baterai kembung & fleksibel baterai aus, proses kalibrasi BMS',
    confirmationStatus: 'DISETUJUI',
    confirmedAt: '2026-09-14 12:00',
    estimatedCost: 550000,
    initialEstimatedCost: 550000,
    finalCost: 550000,
    dp: 150000,
    sparepartCost: 250000,
    warrantyDays: 30,
    paymentMethod: '-',
    pickedUpAt: null,
    createdAt: '2026-09-14 11:25',
  },
  {
    id: 'SRV-103',
    ticketNo: 'OR-26-00103',
    customerName: 'Salsa Maharani',
    customerPhone: '0821-4402-6198',
    deviceModel: 'OPPO Reno 8',
    screenLock: 'Pola: L terbalik',
    complaints: ['Lainnya'],
    notes: 'Kamera belakang bergetar keras & autofocus tidak mengunci',
    status: 'BARU',
    diagnosis: 'Modul OIS kamera utama rusak akibat getaran bracket motor, butuh part modul kamera ori',
    confirmationStatus: 'MENUNGGU',
    estimatedCost: 400000,
    initialEstimatedCost: 250000,
    finalCost: 400000,
    dp: 50000,
    sparepartCost: 180000,
    warrantyDays: 14,
    paymentMethod: '-',
    pickedUpAt: null,
    createdAt: '2026-09-14 09:40',
  },
  {
    id: 'SRV-104',
    ticketNo: 'OR-26-00104',
    customerName: 'Dimas Setiawan',
    customerPhone: '0813-8877-2231',
    deviceModel: 'Realme 9 Pro+',
    screenLock: 'Tidak Ada',
    complaints: ['Cas'],
    notes: 'Port charger type-C kendor, harus ditekuk baru masuk',
    status: 'BARU',
    diagnosis: 'Pin konektor charger bengkok dan berkarat',
    confirmationStatus: 'TIDAK_PERLU',
    estimatedCost: 175000,
    initialEstimatedCost: 175000,
    finalCost: 175000,
    dp: 0,
    sparepartCost: 45000,
    warrantyDays: 7,
    paymentMethod: '-',
    pickedUpAt: null,
    createdAt: '2026-09-14 13:40',
  },
  {
    id: 'SRV-105',
    ticketNo: 'OR-26-00105',
    customerName: 'Hendra Gunawan',
    customerPhone: '0878-1122-3344',
    deviceModel: 'POCO F4 GT',
    screenLock: 'PIN: 998877',
    complaints: ['Matot (Mati Total)'],
    notes: 'Mati total saat bermain game, dicolok cas lampu indikator mati',
    status: 'PROSES',
    diagnosis: 'Kapasitor short di jalur VPH_PWR, perlu perbaikan jalur IC Power PM8350',
    confirmationStatus: 'DISETUJUI',
    confirmedAt: '2026-09-13 18:00',
    estimatedCost: 500000,
    initialEstimatedCost: 500000,
    finalCost: 500000,
    dp: 100000,
    sparepartCost: 80000,
    warrantyDays: 14,
    paymentMethod: '-',
    pickedUpAt: null,
    createdAt: '2026-09-13 16:30',
  },

  // ==========================================
  // 2. SIAP DIAMBIL (4 DATA DEMO: STATUS SIAP)
  // ==========================================
  {
    id: 'SRV-098',
    ticketNo: 'OR-26-00098',
    customerName: 'Bagus Wijaya',
    customerPhone: '0899-2210-7734',
    deviceModel: 'Xiaomi 12 Lite',
    screenLock: 'Pola: Huruf M',
    complaints: ['Cas'],
    notes: 'Ganti sub-board charging original sudah selesai & tested fast charging 67W normal',
    status: 'SIAP',
    diagnosis: 'Sub-board cas korslet',
    confirmationStatus: 'DISETUJUI',
    confirmedAt: '2026-09-13 14:00',
    estimatedCost: 220000,
    finalCost: 220000,
    dp: 50000,
    sparepartCost: 65000,
    warrantyDays: 7,
    paymentMethod: '-',
    pickedUpAt: null,
    createdAt: '2026-09-13 10:15',
  },
  {
    id: 'SRV-097',
    ticketNo: 'OR-26-00097',
    customerName: 'Maya Anggraini',
    customerPhone: '0819-5566-7788',
    deviceModel: 'Vivo V27 5G',
    screenLock: 'PIN: 010195',
    complaints: ['LCD / Layar'],
    notes: 'Ganti LCD Curved OEM tested warna tajam, touch responsif, fingerprint on-display aktif',
    status: 'SIAP',
    diagnosis: 'Layar retak dalam',
    confirmationStatus: 'DISETUJUI',
    confirmedAt: '2026-09-13 10:30',
    estimatedCost: 850000,
    finalCost: 850000,
    dp: 300000,
    sparepartCost: 480000,
    warrantyDays: 14,
    paymentMethod: '-',
    pickedUpAt: null,
    createdAt: '2026-09-12 14:00',
  },
  {
    id: 'SRV-096',
    ticketNo: 'OR-26-00096',
    customerName: 'Farhan Maulana',
    customerPhone: '0852-3344-5566',
    deviceModel: 'iPad Air 4',
    screenLock: 'Passcode: 123456',
    complaints: ['Speaker / Mic'],
    notes: 'Ganti modul speaker internal & bersihkan mesh audio, suara jernih kembali',
    status: 'SIAP',
    diagnosis: 'Membran speaker sobek',
    confirmationStatus: 'DISETUJUI',
    confirmedAt: '2026-09-12 16:00',
    estimatedCost: 350000,
    finalCost: 350000,
    dp: 100000,
    sparepartCost: 110000,
    warrantyDays: 14,
    paymentMethod: '-',
    pickedUpAt: null,
    createdAt: '2026-09-12 11:30',
  },
  {
    id: 'SRV-095',
    ticketNo: 'OR-26-00095',
    customerName: 'Anita Kusuma',
    customerPhone: '0812-4455-6677',
    deviceModel: 'Samsung Galaxy S20',
    screenLock: 'Pola: Sederhana',
    complaints: ['Lainnya'],
    notes: 'Penggantian backdoor kaca original warna Cloud Blue + lem frame rapi',
    status: 'SIAP',
    diagnosis: 'Backdoor pecah seribu',
    confirmationStatus: 'DISETUJUI',
    confirmedAt: '2026-09-12 15:00',
    estimatedCost: 200000,
    finalCost: 200000,
    dp: 50000,
    sparepartCost: 70000,
    warrantyDays: 7,
    paymentMethod: '-',
    pickedUpAt: null,
    createdAt: '2026-09-12 09:15',
  },

  // ==========================================
  // 3. RIWAYAT SERVIS: SUDAH DIAMBIL / BATAL
  // ==========================================
  {
    id: 'SRV-106',
    ticketNo: 'OR-26-00106',
    customerName: 'Rizky Ananda',
    customerPhone: '0812-9920-1845',
    deviceModel: 'Xiaomi Redmi Note 10',
    screenLock: 'Pola: L',
    complaints: ['Baterai'],
    notes: 'Unit kedua milik Rizky Ananda, ganti baterai original sudah selesai dan diambil',
    status: 'DIAMBIL',
    diagnosis: 'Baterai drop & kembung ringan',
    confirmationStatus: 'DISETUJUI',
    confirmedAt: '2026-09-13 11:00',
    estimatedCost: 195000,
    initialEstimatedCost: 195000,
    finalCost: 195000,
    dp: 195000,
    sparepartCost: 65000,
    warrantyDays: 14,
    paymentMethod: 'Tunai',
    pickedUpAt: '2026-09-13 17:00',
    createdAt: '2026-09-13 09:30',
  },
  {
    id: 'SRV-099',
    ticketNo: 'OR-26-00099',
    customerName: 'Wahyu Ramadhan',
    customerPhone: '0812-3399-8811',
    deviceModel: 'Samsung Galaxy Note 20 Ultra',
    screenLock: 'Pola: Huruf Z',
    complaints: ['LCD / Layar'],
    notes: 'Layar green screen & flickering. Pelanggan tolak biaya ganti LCD baru, unit telah diserahkan kembali.',
    status: 'BATAL',
    diagnosis: 'LCD rusak fleksibel, estimasi ganti modul baru Rp 2.850.000 ditolak pelanggan.',
    confirmationStatus: 'DITOLAK',
    cancelReason: 'Pelanggan menolak biaya ganti LCD (di luar anggaran)',
    estimatedCost: 2850000,
    initialEstimatedCost: 500000,
    finalCost: 0,
    dp: 0,
    sparepartCost: 0,
    warrantyDays: 0,
    paymentMethod: 'Batal',
    pickedUpAt: '2026-09-14 15:30',
    createdAt: '2026-09-14 10:00',
  },

  // ==========================================
  // 3. RIWAYAT SERVIS: MASIH GARANSI AKTIF (SISA BANYAK)
  // ==========================================
  {
    id: 'SRV-093',
    ticketNo: 'OR-26-00093',
    customerName: 'Kevin Sanjaya',
    customerPhone: '0812-7711-8899',
    deviceModel: 'iPhone 12 128GB',
    screenLock: 'Passcode: 556677',
    complaints: ['Baterai'],
    notes: 'Penggantian baterai premium original 2815mAh bergaransi panjang 30 hari',
    status: 'DIAMBIL',
    diagnosis: 'Kesehatan baterai 67%',
    confirmationStatus: 'DISETUJUI',
    estimatedCost: 450000,
    finalCost: 450000,
    dp: 100000,
    sparepartCost: 190000,
    warrantyDays: 30,
    paymentMethod: 'Transfer Bank (BCA)',
    pickedUpAt: '2026-09-11 15:45',
    createdAt: '2026-09-10 09:00',
  },
  {
    id: 'SRV-092',
    ticketNo: 'OR-26-00092',
    customerName: 'Dian Sastrowardoyo',
    customerPhone: '0818-9900-1122',
    deviceModel: 'Samsung Galaxy S21 FE',
    screenLock: 'PIN: 220011',
    complaints: ['LCD / Layar'],
    notes: 'Ganti LCD Dynamic AMOLED 2X 120Hz original segel utuh',
    status: 'DIAMBIL',
    diagnosis: 'LCD blank hitam setelah jatuh',
    confirmationStatus: 'DISETUJUI',
    estimatedCost: 1200000,
    finalCost: 1200000,
    dp: 500000,
    sparepartCost: 750000,
    warrantyDays: 14,
    paymentMethod: 'QRIS / E-Wallet',
    pickedUpAt: '2026-09-08 17:00',
    createdAt: '2026-09-07 13:20',
  },
  {
    id: 'SRV-091',
    ticketNo: 'OR-26-00091',
    customerName: 'Rendy Pratama',
    customerPhone: '0878-5544-3322',
    deviceModel: 'Redmi Note 12 Pro',
    screenLock: 'Pola: Z',
    complaints: ['Lainnya'],
    notes: 'Ganti modul kamera utama 50MP Sony IMX766 + uji video 4K jernih',
    status: 'DIAMBIL',
    diagnosis: 'Lensa kamera buram & retak',
    confirmationStatus: 'DISETUJUI',
    estimatedCost: 380000,
    finalCost: 380000,
    dp: 100000,
    sparepartCost: 180000,
    warrantyDays: 30,
    paymentMethod: 'QRIS / E-Wallet',
    pickedUpAt: '2026-09-12 11:20',
    createdAt: '2026-09-11 10:00',
  },

  // ==========================================
  // 4. RIWAYAT SERVIS: GARANSI SEGERA BERAKHIR (SISA 1-3 HARI)
  // ==========================================
  {
    id: 'SRV-088',
    ticketNo: 'OR-26-00088',
    customerName: 'Aditya Pratama',
    customerPhone: '0857-4433-2211',
    deviceModel: 'Redmi Note 11',
    screenLock: 'Tidak Ada',
    complaints: ['Speaker / Mic'],
    notes: 'Ganti mic digital board bawah. Garansi toko 7 hari.',
    status: 'DIAMBIL',
    diagnosis: 'Mic bawah rusak tersumbat cairan',
    confirmationStatus: 'DISETUJUI',
    estimatedCost: 150000,
    finalCost: 150000,
    dp: 0,
    sparepartCost: 30000,
    warrantyDays: 7,
    paymentMethod: 'Tunai (Cash)',
    pickedUpAt: '2026-09-09 16:30',
    createdAt: '2026-09-08 10:00',
  },
  {
    id: 'SRV-087',
    ticketNo: 'OR-26-00087',
    customerName: 'Rini Wulandari',
    customerPhone: '0813-6655-4433',
    deviceModel: 'Infinix Note 30',
    screenLock: 'PIN: 334455',
    complaints: ['Cas'],
    notes: 'Ganti modul board cas fast charging bypass 45W. Garansi toko 7 hari.',
    status: 'DIAMBIL',
    diagnosis: 'Konektor cas korslet',
    confirmationStatus: 'DISETUJUI',
    estimatedCost: 135000,
    finalCost: 135000,
    dp: 35000,
    sparepartCost: 25000,
    warrantyDays: 7,
    paymentMethod: 'Tunai (Cash)',
    pickedUpAt: '2026-09-08 14:00',
    createdAt: '2026-09-07 11:00',
  },

  // ==========================================
  // 5. RIWAYAT SERVIS: GARANSI SUDAH HABIS (EXPIRED)
  // ==========================================
  {
    id: 'SRV-075',
    ticketNo: 'OR-26-00075',
    customerName: 'Ahmad Fauzi',
    customerPhone: '0812-3456-7890',
    deviceModel: 'Xiaomi POCO X3 Pro',
    screenLock: 'PIN: 180992',
    complaints: ['Matot (Mati Total)'],
    notes: 'Reballing CPU & IC RAM dual deck sukses hidup normal. Masa garansi 14 hari sudah lewat.',
    status: 'DIAMBIL',
    diagnosis: 'CPU solder retak khas POCO X3',
    confirmationStatus: 'DISETUJUI',
    estimatedCost: 550000,
    finalCost: 550000,
    dp: 150000,
    sparepartCost: 40000,
    warrantyDays: 14,
    paymentMethod: 'Transfer Bank (Mandiri)',
    pickedUpAt: '2026-08-15 18:00',
    createdAt: '2026-08-14 09:30',
  },
  {
    id: 'SRV-070',
    ticketNo: 'OR-26-00070',
    customerName: 'Citra Lestari',
    customerPhone: '0877-2233-4455',
    deviceModel: 'iPhone XR 64GB',
    screenLock: 'Pola: Sederhana',
    complaints: ['LCD / Layar'],
    notes: 'Penggantian LCD Incell OEM. Garansi 7 hari sudah selesai.',
    status: 'DIAMBIL',
    diagnosis: 'LCD garis & blank sebagian',
    confirmationStatus: 'DISETUJUI',
    estimatedCost: 380000,
    finalCost: 380000,
    dp: 100000,
    sparepartCost: 170000,
    warrantyDays: 7,
    paymentMethod: 'QRIS / E-Wallet',
    pickedUpAt: '2026-08-05 13:15',
    createdAt: '2026-08-04 10:00',
  },
  {
    id: 'SRV-065',
    ticketNo: 'OR-26-00065',
    customerName: 'Eko Prasetyo',
    customerPhone: '0856-1122-8899',
    deviceModel: 'OPPO A53',
    screenLock: 'Tidak Ada',
    complaints: ['Speaker / Mic'],
    notes: 'Ganti speaker buzzer dering bawah. Masa garansi telah berakhir.',
    status: 'DIAMBIL',
    diagnosis: 'Speaker mati',
    confirmationStatus: 'DISETUJUI',
    estimatedCost: 1200000,
    finalCost: 120000,
    dp: 0,
    sparepartCost: 25000,
    warrantyDays: 7,
    paymentMethod: 'Tunai (Cash)',
    pickedUpAt: '2026-07-20 10:30',
    createdAt: '2026-07-19 14:00',
  },

  // ==========================================
  // 6. RIWAYAT SERVIS: DIBATALKAN (STATUS: BATAL)
  // ==========================================
  {
    id: 'SRV-090',
    ticketNo: 'OR-26-00090',
    customerName: 'Tommy Kurniawan',
    customerPhone: '0895-3322-1100',
    deviceModel: 'Asus ROG Phone 5',
    screenLock: 'PIN: 778899',
    complaints: ['Matot (Mati Total)'],
    notes: 'IC PMIC & motherboard short berat. Pelanggan menolak biaya ganti mesin karena di luar budget.',
    status: 'BATAL',
    diagnosis: 'Mainboard short parah di jalur suplai utama, solusi ganti mainboard Rp 2.400.000',
    confirmationStatus: 'DITOLAK',
    cancelReason: 'Pelanggan menolak biaya perbaikan mainboard (biaya melebihi budget pemilik)',
    estimatedCost: 2400000,
    initialEstimatedCost: 600000,
    finalCost: 0,
    dp: 0,
    sparepartCost: 0,
    warrantyDays: 0,
    paymentMethod: '-',
    pickedUpAt: '2026-09-10 11:00',
    createdAt: '2026-09-09 14:00',
  },
  {
    id: 'SRV-085',
    ticketNo: 'OR-26-00085',
    customerName: 'Ratna Juwita',
    customerPhone: '0822-1133-5577',
    deviceModel: 'Sony Xperia 1 III',
    screenLock: 'Pola: Z',
    complaints: ['LCD / Layar'],
    notes: 'Layar 4K OLED pecah & touchscreen tidak merespon. Sparepart langka di semua distributor supplier.',
    status: 'BATAL',
    diagnosis: 'Sparepart LCD original Sony Xperia 1 III kosong/langka di seluruh supplier resmi',
    confirmationStatus: 'DITOLAK',
    cancelReason: 'Sparepart tidak tersedia di distributor/supplier, unit dikembalikan utuh tanpa biaya',
    estimatedCost: 1800000,
    initialEstimatedCost: 1800000,
    finalCost: 0,
    dp: 50000,
    sparepartCost: 0,
    warrantyDays: 0,
    paymentMethod: '-',
    pickedUpAt: '2026-09-06 16:00',
    createdAt: '2026-09-05 10:30',
  },
];

export function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(num) || 0);
}

/**
 * Format mata uang ringkas: contoh 4585000 -> "4,5 jt", 500000 -> "500 rb", 0 -> "0"
 */
export function formatRupiahCompact(num: number): string {
  const val = Number(num) || 0;
  if (val === 0) return 'Rp 0';
  
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    const formatted = (abs / 1_000_000_000)
      .toFixed(1)
      .replace(/\.0$/, '')
      .replace('.', ',');
    return `${sign}${formatted} M`;
  }
  if (abs >= 1_000_000) {
    const formatted = (abs / 1_000_000)
      .toFixed(1)
      .replace(/\.0$/, '')
      .replace('.', ',');
    return `${sign}${formatted} jt`;
  }
  if (abs >= 1_000) {
    const formatted = (abs / 1_000)
      .toFixed(1)
      .replace(/\.0$/, '')
      .replace('.', ',');
    return `${sign}${formatted} rb`;
  }

  return `${sign}${abs.toLocaleString('id-ID')}`;
}

/**
 * Format string atau number dengan pemisah ribuan titik (contoh: 100000 -> 100.000)
 */
export function formatNumberWithDots(val: string | number | undefined | null): string {
  if (val === '' || val === null || val === undefined) return '';
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('id-ID');
}

/**
 * Parse input bernilai titik menjadi angka murni (contoh: 100.000 -> 100000)
 */
export function parseNumberFromDots(val: string | number | undefined | null): number {
  if (val === '' || val === null || val === undefined) return 0;
  const digits = String(val).replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

export function getMonthNameIndo(monthIndex: number): string {
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  return months[monthIndex] || '';
}

export function formatDateTime(d = new Date()): string {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hour = d.getHours().toString().padStart(2, '0');
  const minute = d.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * Generate nomor nota tahunan dengan format: OR-YY-XXXXX
 * Contoh: OR-26-00001 s/d OR-26-99999
 * Otomatis mencari nomor tertinggi di tahun yang sama, lalu increment +1.
 * Jika berganti tahun (misal 2027), nomor urut otomatis reset kembali ke 00001 (OR-27-00001).
 */
export function generateNextTicketNo(services: ServiceItem[], date = new Date()): string {
  const yearShort = date.getFullYear().toString().slice(-2); // e.g., '26'
  const prefix = `OR-${yearShort}-`;

  let maxSeq = 0;

  services.forEach((item) => {
    if (!item.ticketNo) return;
    const trimmed = item.ticketNo.trim().toUpperCase();

    // Support matching both new format OR-YY-XXXXX and legacy ORD-YY-XXXXX / ORD-XXXXX
    if (trimmed.startsWith(prefix)) {
      const numPart = trimmed.substring(prefix.length);
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    } else if (trimmed.startsWith(`ORD-${yearShort}-`)) {
      const numPart = trimmed.substring(`ORD-${yearShort}-`.length);
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    } else if (trimmed.startsWith('ORD-')) {
      // Legacy format like ORD-00101 -> check if same year from item.createdAt
      const itemYear = item.createdAt ? item.createdAt.substring(2, 4) : '';
      if (itemYear === yearShort) {
        const numPart = trimmed.replace(/\D/g, '');
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxSeq) {
          maxSeq = parsed;
        }
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const padded = nextSeq.toString().padStart(5, '0'); // 5 digit: 00001 - 99999 (dan otomatis melebar jika > 99999)
  return `${prefix}${padded}`;
}
