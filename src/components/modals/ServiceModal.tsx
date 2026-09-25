import React, { useState, useRef, useEffect } from 'react';
import { CustomerAggregated } from '../../types';
import { PRESET_COMPLAINTS, formatNumberWithDots, parseNumberFromDots } from '../../data/initialData';
import {
  FilePlus,
  X,
  User,
  Smartphone,
  Receipt,
  Check,
  Phone,
  History,
  Sparkles,
} from 'lucide-react';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: CustomerAggregated[];
  onSubmit: (formData: {
    customerName: string;
    customerPhone: string;
    deviceModel: string;
    screenLock: string;
    complaints: string[];
    notes: string;
    estimatedCost: number;
    dp: number;
  }) => void;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  customers,
  onSubmit,
}) => {
  // Form Fields
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [screenLock, setScreenLock] = useState('');
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<string>('');
  const [dp, setDp] = useState<string>('0');

  // Suggestion visibility state
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);

  const nameContainerRef = useRef<HTMLDivElement>(null);
  const phoneContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (nameContainerRef.current && !nameContainerRef.current.contains(e.target as Node)) {
        setShowNameSuggestions(false);
      }
      if (phoneContainerRef.current && !phoneContainerRef.current.contains(e.target as Node)) {
        setShowPhoneSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const toggleComplaint = (c: string) => {
    if (selectedComplaints.includes(c)) {
      setSelectedComplaints(selectedComplaints.filter((item) => item !== c));
    } else {
      setSelectedComplaints([...selectedComplaints, c]);
    }
  };

  const handleBypassWA = () => {
    setCustPhone('Tanpa WA');
    setShowPhoneSuggestions(false);
  };

  // Filter matching customers by Name
  const cleanNameQuery = custName.trim().toLowerCase();
  const nameSuggestions = cleanNameQuery
    ? customers
        .filter((c) => c.customerName.toLowerCase().includes(cleanNameQuery))
        .slice(0, 5)
    : [];

  // Filter matching customers by Phone
  const rawPhoneQuery = custPhone.trim().toLowerCase();
  const phoneDigits = custPhone.replace(/[^0-9]/g, '');
  const phoneSuggestions =
    rawPhoneQuery && rawPhoneQuery !== 'tanpa wa'
      ? customers
          .filter((c) => {
            const cDigits = c.customerPhone.replace(/[^0-9]/g, '');
            return (
              (phoneDigits.length >= 2 && cDigits.includes(phoneDigits)) ||
              c.customerPhone.toLowerCase().includes(rawPhoneQuery)
            );
          })
          .slice(0, 5)
      : [];

  const handleSelectCustomer = (customer: CustomerAggregated) => {
    setCustName(customer.customerName);
    setCustPhone(customer.customerPhone);
    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = custName.trim();
    if (!finalName) {
      alert('Nama pelanggan wajib diisi.');
      return;
    }

    onSubmit({
      customerName: finalName,
      customerPhone: custPhone.trim() || 'Tanpa WA',
      deviceModel: deviceModel.trim(),
      screenLock: screenLock.trim() || '-',
      complaints:
        selectedComplaints.length > 0
          ? selectedComplaints
          : ['Pemeriksaan Umum'],
      notes: notes.trim() || '-',
      estimatedCost: parseNumberFromDots(estimatedCost),
      dp: parseNumberFromDots(dp),
    });

    // Reset form
    setCustName('');
    setCustPhone('');
    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);
    setDeviceModel('');
    setScreenLock('');
    setSelectedComplaints([]);
    setNotes('');
    setEstimatedCost('');
    setDp('0');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500 text-black">
              <FilePlus className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Terima Servis Baru
              </h3>
              <p className="text-xs text-zinc-400">
                Input data pelanggan, unit HP, keluhan & cetak tanda terima
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form
          onSubmit={handleFormSubmit}
          className="overflow-y-auto p-6 space-y-5 flex-1 text-xs"
        >
          {/* Section 1: Data Pelanggan */}
          <div className="bg-zinc-900/60 border border-zinc-800/90 rounded-2xl p-4.5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <User className="w-4 h-4" /> 1. Data Pelanggan
              </h4>
              <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Auto-suggest Nama & WhatsApp
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Input Nama Pelanggan with Modern Dropdown */}
              <div className="relative" ref={nameContainerRef}>
                <label className="block text-zinc-300 font-bold mb-1">
                  Nama Pelanggan <span className="text-emerald-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    autoFocus
                    autoComplete="off"
                    value={custName}
                    onFocus={() => setShowNameSuggestions(true)}
                    onChange={(e) => {
                      setCustName(e.target.value);
                      setShowNameSuggestions(true);
                    }}
                    placeholder="Ketik nama pelanggan..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-semibold focus:bg-black focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                  {custName && (
                    <button
                      type="button"
                      onClick={() => setCustName('')}
                      className="absolute right-2.5 p-1 text-zinc-500 hover:text-white rounded-md cursor-pointer"
                      title="Hapus"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Modern Floating Suggestions Dropdown for Name */}
                {showNameSuggestions && nameSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-zinc-900/95 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 bg-zinc-950 border-b border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Pelanggan Terdaftar</span>
                      <span className="text-emerald-400 font-normal">Klik untuk pilih</span>
                    </div>
                    <div className="max-h-52 overflow-y-auto divide-y divide-zinc-800/60">
                      {nameSuggestions.map((c) => {
                        const lastTicket = c.tickets[0];
                        return (
                          <button
                            key={c.primaryKey}
                            type="button"
                            onClick={() => handleSelectCustomer(c)}
                            className="w-full text-left p-2.5 hover:bg-emerald-500/10 transition-colors flex items-center justify-between gap-2.5 group cursor-pointer"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs truncate group-hover:text-emerald-400 transition-colors">
                                  {c.customerName}
                                </span>
                                {c.customerPhone && c.customerPhone !== 'Tanpa WA' && (
                                  <span className="text-[10px] font-mono font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800/50">
                                    {c.customerPhone}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5">
                                <span className="flex items-center gap-1">
                                  <History className="w-3 h-3 text-zinc-500" />
                                  {c.tickets.length}x servis
                                </span>
                                {lastTicket && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate text-zinc-300">
                                      {lastTicket.deviceModel}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded bg-zinc-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-zinc-300 transition-colors">
                              Pilih
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Input WhatsApp / HP with Modern Dropdown */}
              <div className="relative" ref={phoneContainerRef}>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-zinc-300 font-bold">
                    Nomor WhatsApp / HP
                  </label>
                  <button
                    type="button"
                    onClick={handleBypassWA}
                    className="text-[11px] text-emerald-400 bg-zinc-950 hover:bg-zinc-800 px-2 py-0.5 rounded-lg font-bold border border-zinc-700 transition-colors cursor-pointer"
                  >
                    [ Tanpa WA ]
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    autoComplete="off"
                    value={custPhone}
                    onFocus={() => setShowPhoneSuggestions(true)}
                    onChange={(e) => {
                      setCustPhone(e.target.value);
                      setShowPhoneSuggestions(true);
                    }}
                    placeholder="Contoh: 08123456789"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:bg-black focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                  {custPhone && (
                    <button
                      type="button"
                      onClick={() => setCustPhone('')}
                      className="absolute right-2.5 p-1 text-zinc-500 hover:text-white rounded-md cursor-pointer"
                      title="Hapus"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Modern Floating Suggestions Dropdown for WhatsApp */}
                {showPhoneSuggestions && phoneSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-zinc-900/95 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 bg-zinc-950 border-b border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Pelanggan Sesuai No. HP</span>
                      <span className="text-emerald-400 font-normal">Klik untuk pilih</span>
                    </div>
                    <div className="max-h-52 overflow-y-auto divide-y divide-zinc-800/60">
                      {phoneSuggestions.map((c) => {
                        const lastTicket = c.tickets[0];
                        return (
                          <button
                            key={c.primaryKey}
                            type="button"
                            onClick={() => handleSelectCustomer(c)}
                            className="w-full text-left p-2.5 hover:bg-emerald-500/10 transition-colors flex items-center justify-between gap-2.5 group cursor-pointer"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-emerald-400 text-xs truncate">
                                  {c.customerPhone}
                                </span>
                                <span className="text-[11px] font-bold text-white group-hover:text-emerald-300 truncate">
                                  ({c.customerName})
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5">
                                <span>{c.tickets.length}x servis</span>
                                {lastTicket && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate text-zinc-300">
                                      {lastTicket.deviceModel}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded bg-zinc-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-zinc-300 transition-colors">
                              Pilih
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: HP & Kerusakan */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-2.5 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" /> 2. HP & Kerusakan
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-zinc-300 font-bold mb-1">
                  Merk & Tipe HP <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  placeholder="Contoh: Samsung A15 / Oppo A58"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-semibold focus:bg-black focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Kunci Layar / PIN
                </label>
                <input
                  type="text"
                  value={screenLock}
                  onChange={(e) => setScreenLock(e.target.value)}
                  placeholder="PIN: 1234 / Pola L"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white focus:bg-black focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-zinc-300 font-bold mb-1.5">
                Pilih Kerusakan:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COMPLAINTS.map((c) => {
                  const isSelected = selectedComplaints.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleComplaint(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 text-black font-extrabold shadow-md'
                          : 'bg-zinc-900 text-zinc-300 border border-zinc-700 hover:bg-zinc-800'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-zinc-300 font-bold mb-1">
                Catatan Kondisi HP
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Kaca retak, lecet pemakaian, casing belakang ngangkat..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-white focus:bg-black focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Perkiraan Biaya & DP */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-2.5 flex items-center gap-1.5">
              <Receipt className="w-4 h-4" /> 3. Perkiraan Biaya & DP
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Perkiraan Biaya (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumberWithDots(estimatedCost)}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  placeholder="0"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-black focus:bg-black focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  DP Masuk (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumberWithDots(dp)}
                  onChange={(e) => setDp(e.target.value)}
                  placeholder="0"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-black focus:bg-black focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <Check className="w-4 h-4 text-black" />
              <span>Simpan & Cetak Nota</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
