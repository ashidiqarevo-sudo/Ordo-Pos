import React, { useState } from 'react';
import {
  MessageSquareHeart,
  X,
  Send,
  Mail,
  CheckCircle2,
  Copy,
  Lightbulb,
  AlertCircle,
  MessageCircle,
  HelpCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { StoreSettings, AuthUser } from '../../types';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeSettings?: StoreSettings;
  currentUser?: AuthUser | null;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

type FeedbackType = 'saran' | 'kritik' | 'bug' | 'tanya';

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  storeSettings,
  currentUser,
  onShowToast,
}) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('saran');
  const [senderName, setSenderName] = useState(
    storeSettings?.ownerName || currentUser?.name || ''
  );
  const [storeName, setStoreName] = useState(
    storeSettings?.storeName || currentUser?.storeName || ''
  );
  const [contactInfo, setContactInfo] = useState(
    storeSettings?.storePhone || currentUser?.phone || ''
  );
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const targetEmail = 'ordoposofficial@gmail.com';

  const typeLabels: Record<FeedbackType, { label: string; icon: React.ReactNode; color: string }> = {
    saran: {
      label: 'Saran Fitur Baru',
      icon: <Lightbulb className="w-3.5 h-3.5" />,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
    kritik: {
      label: 'Kritik & Masukan',
      icon: <MessageCircle className="w-3.5 h-3.5" />,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    },
    bug: {
      label: 'Lapor Bug / Kendala',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    },
    tanya: {
      label: 'Pertanyaan / Lainnya',
      icon: <HelpCircle className="w-3.5 h-3.5" />,
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    },
  };

  const constructEmailBody = () => {
    return `Halo Tim Pengembang ORDO SERVIS,

Saya ingin menyampaikan ${typeLabels[feedbackType].label.toLowerCase()}:

--------------------------------------------------
Topik: ${title.trim() || 'Kritik & Saran Aplikasi'}
Kategori: ${typeLabels[feedbackType].label}
Pengirim: ${senderName.trim() || 'Pengguna Ordo'}
Nama Toko: ${storeName.trim() || '-'}
Kontak / WA: ${contactInfo.trim() || '-'}
--------------------------------------------------

Isi Pesan:
${message.trim()}

--------------------------------------------------
Dikirim dari Aplikasi Web ORDO SERVIS HP
Waktu: ${new Date().toLocaleString('id-ID')}
`;
  };

  const getMailtoUrl = () => {
    const emailSubject = encodeURIComponent(
      `[ORDO SERVIS - ${typeLabels[feedbackType].label}] ${title.trim() || 'Masukan Pengguna'}`
    );
    const emailBody = encodeURIComponent(constructEmailBody());
    return `mailto:${targetEmail}?subject=${emailSubject}&body=${emailBody}`;
  };

  const getGmailWebUrl = () => {
    const emailSubject = encodeURIComponent(
      `[ORDO SERVIS - ${typeLabels[feedbackType].label}] ${title.trim() || 'Masukan Pengguna'}`
    );
    const emailBody = encodeURIComponent(constructEmailBody());
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(targetEmail)}&su=${emailSubject}&body=${emailBody}`;
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      if (onShowToast) onShowToast('Mohon isi pesan kritik atau saran terlebih dahulu!', 'error');
      return;
    }

    // Try mailto first via safe window.open / location
    const mailtoUrl = getMailtoUrl();
    try {
      window.location.href = mailtoUrl;
    } catch {
      window.open(mailtoUrl, '_blank');
    }

    if (onShowToast) {
      onShowToast('Membuka aplikasi email... Pastikan klik "Kirim" di email Anda!', 'success');
    }
  };

  const handleCopyMessage = () => {
    if (!message.trim()) {
      if (onShowToast) onShowToast('Tulis pesan terlebih dahulu sebelum menyalin!', 'error');
      return;
    }
    const fullText = `Kepada: ${targetEmail}\nSubjek: [ORDO SERVIS - ${typeLabels[feedbackType].label}] ${title.trim() || 'Masukan Pengguna'}\n\n${constructEmailBody()}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    if (onShowToast) {
      onShowToast(`Format pesan berhasil disalin! Silakan kirim ke ${targetEmail}`, 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-4 sm:my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <MessageSquareHeart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Kritik & Saran
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  Langsung ke Email
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Kirim masukan untuk pengembangan aplikasi ke{' '}
                <span className="text-amber-300 font-mono font-medium">{targetEmail}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSendEmail} className="p-4 sm:p-5 space-y-4">
          {/* Category Chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">
              Kategori Masukan:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(typeLabels) as FeedbackType[]).map((typeKey) => {
                const item = typeLabels[typeKey];
                const isSelected = feedbackType === typeKey;
                return (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => setFeedbackType(typeKey)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? item.color + ' ring-1 ring-amber-400/40 shadow-sm'
                        : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/60 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pengirim Info (2 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1">
                Nama Anda / Toko:
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Contoh: Budi (Budi Cell)"
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700/80 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1">
                Kontak / No. WA (Opsional):
              </label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700/80 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
              />
            </div>
          </div>

          {/* Topic Title */}
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Judul / Topik Singkat:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Tambah fitur cetak nota via Bluetooth thermal"
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700/80 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
            />
          </div>

          {/* Message Area */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1 flex items-center justify-between">
              <span>Isi Kritik / Saran / Pesan: <span className="text-rose-400">*</span></span>
              <span className="text-[10px] text-zinc-500">Wajib diisi</span>
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tuliskan kritik, masukan fitur baru, atau kendala yang Anda alami secara detail..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Destination Email Info Card */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-400 block">Tujuan Email:</span>
                <span className="text-xs font-mono font-semibold text-zinc-200 truncate block">
                  {targetEmail}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 flex items-center gap-1 border border-zinc-700 shrink-0 transition-colors"
              title="Salin isi pesan ke clipboard"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Salin Teks</span>
                </>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            {message.trim() && (
              <a
                href={getGmailWebUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Buka langsung di Gmail Web"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka di Gmail Web</span>
              </a>
            )}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold border border-zinc-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-black" />
                <span>Kirim via Email App</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
