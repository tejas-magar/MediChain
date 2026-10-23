import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error' | 'danger';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
  ...props
}) => {
  const effectiveVariant = variant === 'danger' ? 'error' : variant;
  const config = {
    info: {
      container: 'bg-medical-50/70 border-medical-200 text-medical-950',
      icon: <Info className="w-4 h-4 text-medical-700 shrink-0 mt-0.5" />,
      role: 'status',
    },
    success: {
      container: 'bg-emerald-50/70 border-emerald-200 text-emerald-950',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />,
      role: 'status',
    },
    warning: {
      container: 'bg-amber-50/70 border-amber-200 text-amber-950',
      icon: <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />,
      role: 'alert',
    },
    error: {
      container: 'bg-rose-50/70 border-rose-200 text-rose-950',
      icon: <AlertOctagon className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />,
      role: 'alert',
    },
  }[effectiveVariant];

  return (
    <div
      role={config.role}
      className={`flex items-start gap-3 p-3.5 rounded-lg border text-xs sm:text-sm leading-relaxed ${config.container} ${className}`}
      {...props}
    >
      <span aria-hidden="true">{config.icon}</span>

      <div className="flex-1">
        {title && <h4 className="font-semibold text-slate-900 mb-0.5">{title}</h4>}
        <div className="text-slate-700">{children}</div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 rounded p-1 transition-colors hover:bg-black/5"
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
