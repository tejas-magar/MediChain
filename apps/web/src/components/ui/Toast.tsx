import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertOctagon, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast container floating in top-right */}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const config = {
            success: {
              border: 'border-emerald-300',
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
            },
            error: {
              border: 'border-rose-300',
              icon: <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />,
            },
            warning: {
              border: 'border-amber-300',
              icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
            },
            info: {
              border: 'border-medical-300',
              icon: <Info className="w-4 h-4 text-medical-600 shrink-0" />,
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto bg-white rounded-lg p-3.5 shadow-clinical-lg border ${config.border} flex items-start gap-3 transition-all animate-slideDown`}
            >
              <span className="mt-0.5" aria-hidden="true">
                {config.icon}
              </span>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-semibold text-slate-900 leading-tight">
                  {toast.title}
                </h5>
                {toast.message && (
                  <p className="text-xs text-slate-500 mt-1 leading-normal">{toast.message}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 rounded p-1 hover:bg-slate-100"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
