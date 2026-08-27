import React from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const bgStyles =
          toast.type === 'success'
            ? 'bg-emerald-900/90 text-white border-emerald-500/40'
            : toast.type === 'error'
            ? 'bg-red-900/90 text-white border-red-500/40'
            : toast.type === 'warning'
            ? 'bg-amber-900/90 text-white border-amber-500/40'
            : 'bg-slate-900/90 text-white border-slate-700';

        const icon =
          toast.type === 'success'
            ? 'check_circle'
            : toast.type === 'error'
            ? 'error'
            : toast.type === 'warning'
            ? 'warning'
            : 'info';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all animate-slideUp ${bgStyles}`}
          >
            <span className="material-symbols-outlined text-2xl shrink-0 mt-0.5">
              {icon}
            </span>
            <div className="flex-1">
              <h5 className="font-bold text-sm leading-snug">{toast.title}</h5>
              <p className="text-xs opacity-90 mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-white/70 hover:text-white p-1 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};
