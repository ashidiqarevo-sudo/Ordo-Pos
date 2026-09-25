import React, { useState, useEffect } from 'react';
import { AuthUser } from '../../types';
import {
  Mail,
  Lock,
  User,
  Phone,
  Store,
  ArrowRight,
  Eye,
  EyeOff,
  X,
  Sparkles,
} from 'lucide-react';
import { signInOwner, signUpOwner } from '../../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: AuthUser, isNewRegistration?: boolean) => void;
  defaultEmail?: string;
  initialMode?: 'login' | 'register';
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onLoginSuccess,
  defaultEmail = '',
  initialMode = 'login',
  onClose,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
      if (defaultEmail) {
        setEmail(defaultEmail);
      }
    }
  }, [isOpen, initialMode, defaultEmail]);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState('');
  const [storeName, setStoreName] = useState('');
  const [password, setPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'login') {
      const cleanEmail = email.trim();
      if (!cleanEmail || !password) {
        setErrorMsg('Email dan kata sandi wajib diisi.');
        return;
      }

      if (password.length < 5) {
        setErrorMsg('Kata sandi minimal 5 karakter.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await signInOwner({ email: cleanEmail, password });
        setIsLoading(false);

        if (res.error) {
          setErrorMsg(res.error);
          return;
        }

        if (res.user) {
          onLoginSuccess(res.user, false);
        }
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err?.message || 'Gagal masuk ke akun.');
      }
    } else {
      // Register Mode
      if (!name.trim()) {
        setErrorMsg('Nama lengkap pemilik wajib diisi.');
        return;
      }

      if (!storeName.trim()) {
        setErrorMsg('Nama konter wajib diisi.');
        return;
      }

      if (!email.trim() || !password) {
        setErrorMsg('Email dan kata sandi wajib diisi.');
        return;
      }

      if (password.length < 5) {
        setErrorMsg('Kata sandi minimal 5 karakter.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await signUpOwner({
          name: name.trim(),
          storeName: storeName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
        });
        setIsLoading(false);

        if (res.error) {
          setErrorMsg(res.error);
          return;
        }

        if (res.user) {
          onLoginSuccess(res.user, res.isNewRegistration);
        }
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err?.message || 'Terjadi kesalahan saat pendaftaran.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Banner Header */}
        <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border-b border-emerald-500/20 p-6 text-center relative">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            ORDO SERVIS HP
          </h2>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
            {mode === 'login'
              ? 'Masuk ke akun pemilik konter servis'
              : 'Daftar akun pemilik konter servis baru'}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'register' && (
            <>
              {/* Nama Pemilik */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Nama Pemilik
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg pl-10 pr-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Nama Konter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Nama Konter
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Contoh: Jaya Phone Service"
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg pl-10 pr-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Catatan Informatif URL Slug */}
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Link toko dan identitas sistem akan dibuat otomatis dari nama konter Anda.</span>
              </div>

              {/* No WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Nomor WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg pl-10 pr-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email Pemilik (Selalu muncul di Login & Register) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
              Email Pemilik
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Contoh: owner@ordopos.com"
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg pl-10 pr-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi..."
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                Memproses...
              </span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Masuk ke Aplikasi' : 'Daftar & Mulai Setup Toko'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Switch Login / Register link */}
          <div className="pt-2 text-center">
            {mode === 'login' ? (
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Belum punya akun konter?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                  }}
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Daftar di sini
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Sudah punya akun konter?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Masuk di sini
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
