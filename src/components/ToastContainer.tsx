import React from 'react';
import { ToastMessage } from '../types';
import { Info, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
}

/**
 * Sanitasi string pesan toast: hanya izinkan tag <b> dan </b>.
 * Semua tag HTML lain dan karakter berbahaya diubah menjadi teks biasa.
 * Ini mencegah serangan XSS dari nama pelanggan atau data user input lain.
 */
function renderSafeToastMessage(raw: string): React.ReactNode {
  // Escape seluruh HTML terlebih dahulu, lalu restore hanya tag <b> yang sudah di-escape
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Restore hanya &lt;b&gt; dan &lt;/b&gt; menjadi <b> dan </b>
  const safeHtml = escaped
    .replace(/&lt;b&gt;/g, '<b>')
    .replace(/&lt;\/b&gt;/g, '</b>');

  return <span dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  return (
    <div
      id="toastContainer"
      className="fixed bottom-4 left-4 z-50 flex flex-col-reverse gap-1.5 pointer-events-none no-print max-w-xs"
    >
      {toasts.map((toast) => {
        let bgClass = 'bg-zinc-900/95 border-zinc-700/80 text-zinc-100 shadow-md backdrop-blur-sm';
        let iconColor = 'text-emerald-400';
        let Icon = Info;

        if (toast.type === 'success') {
          bgClass = 'bg-emerald-950/95 text-emerald-100 shadow-lg border-emerald-500/40 backdrop-blur-sm';
          iconColor = 'text-emerald-400';
          Icon = CheckCircle2;
        } else if (toast.type === 'warning') {
          bgClass = 'bg-amber-950/95 text-amber-100 shadow-lg border-amber-500/40 backdrop-blur-sm';
          iconColor = 'text-amber-400';
          Icon = AlertTriangle;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-lg border ${bgClass} text-[11px] leading-tight transition-all duration-300 shadow-md animate-in fade-in slide-in-from-bottom-2`}
          >
            <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
            <div className="flex-1 font-medium truncate">
              {renderSafeToastMessage(toast.message)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
