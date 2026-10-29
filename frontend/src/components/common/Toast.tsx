import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'rate-limit';
  title: string;
  message: string;
  retryAfter?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: () => void }> = ({
  toast,
  onDismiss,
}) => {
  const [countdown, setCountdown] = useState(toast.retryAfter ?? 0);

  useEffect(() => {
    if (toast.retryAfter && toast.retryAfter > 0) {
      setCountdown(toast.retryAfter);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      const dismissTimer = setTimeout(onDismiss, 5000);
      return () => clearTimeout(dismissTimer);
    }
  }, [toast, onDismiss]);

  const isRateLimit = toast.type === 'rate-limit' || (toast.retryAfter && toast.retryAfter > 0);

  return (
    <div
      className={`pointer-events-auto p-4 rounded-xl border shadow-lg flex items-start space-x-3 transition-all duration-200 ${
        isRateLimit
          ? 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]'
          : toast.type === 'success'
          ? 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]'
          : 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]'
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {isRateLimit ? (
          <Clock className="w-5 h-5 text-[#f59e0b]" />
        ) : toast.type === 'success' ? (
          <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
        ) : (
          <AlertCircle className="w-5 h-5 text-[#ef4444]" />
        )}
      </div>

      <div className="flex-1 text-xs">
        <div className="font-semibold text-sm mb-0.5">{toast.title}</div>
        <p className="leading-snug">{toast.message}</p>
        {isRateLimit && countdown > 0 && (
          <div className="mt-2 text-[11px] font-mono font-semibold bg-white/70 px-2 py-0.5 rounded inline-block border border-[#fde68a]">
            Retry available in: {countdown}s
          </div>
        )}
      </div>

      <button
        onClick={onDismiss}
        className="shrink-0 p-1 rounded hover:bg-black/5 text-current opacity-70 hover:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
