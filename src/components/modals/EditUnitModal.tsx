import React, { useState, useEffect } from 'react';
import { ServiceItem } from '../../types';
import { Edit3, X } from 'lucide-react';

interface EditUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceItem | null;
  onSubmit: (
    ticketId: string,
    data: {
      customerName: string;
      customerPhone: string;
      deviceModel: string;
      screenLock: string;
      notes: string;
    }
  ) => void;
}

export const EditUnitModal: React.FC<EditUnitModalProps> = ({
  isOpen,
  onClose,
  service,
  onSubmit,
}) => {
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [screenLock, setScreenLock] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (service) {
      setCustName(service.customerName);
      setCustPhone(service.customerPhone);
      setDeviceModel(service.deviceModel);
      setScreenLock(service.screenLock === '-' ? '' : service.screenLock);
      setNotes(service.notes === '-' ? '' : service.notes);
    }
  }, [service]);

  if (!isOpen || !service) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(service.id, {
      customerName: custName.trim(),
      customerPhone: custPhone.trim() || 'Tanpa WA',
      deviceModel: deviceModel.trim(),
      screenLock: screenLock.trim() || '-',
      notes: notes.trim() || '-',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-black text-white">
              Edit Data HP & Pemilik
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="my-4 space-y-3.5 text-xs">
          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              Nama Pemilik
            </label>
            <input
              type="text"
              required
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:bg-black focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              Nomor WhatsApp / HP
            </label>
            <input
              type="text"
              required
              value={custPhone}
              onChange={(e) => setCustPhone(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:bg-black focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              Merk & Tipe HP
            </label>
            <input
              type="text"
              required
              value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-bold focus:bg-black focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              PIN / Pola Layar
            </label>
            <input
              type="text"
              value={screenLock}
              onChange={(e) => setScreenLock(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:bg-black focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              Catatan Fisik
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:bg-black focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 font-bold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-black shadow-sm hover:bg-emerald-400 cursor-pointer"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
