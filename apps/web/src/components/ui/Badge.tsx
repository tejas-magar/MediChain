import React from 'react';

export type BadgeStatus =
  | 'verified'
  | 'pending'
  | 'revoked'
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

export type BadgeVariant =
  | 'subtle'
  | 'outline'
  | 'solid'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus;
  variant?: BadgeVariant;
  showDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  status = 'neutral',
  variant = 'subtle',
  showDot = true,
  children,
  className = '',
  ...props
}) => {
  // Normalize status if variant was passed as a status alias (e.g. variant="success")
  let effectiveStatus: 'verified' | 'pending' | 'revoked' | 'neutral' | 'info' = 'neutral';
  let effectiveVariant: 'subtle' | 'outline' | 'solid' = 'subtle';

  const raw = (variant === 'success' || variant === 'warning' || variant === 'danger' || variant === 'neutral')
    ? variant
    : status;

  if (raw === 'verified' || raw === 'success') effectiveStatus = 'verified';
  else if (raw === 'pending' || raw === 'warning') effectiveStatus = 'pending';
  else if (raw === 'revoked' || raw === 'danger') effectiveStatus = 'revoked';
  else if (raw === 'info') effectiveStatus = 'info';
  else effectiveStatus = 'neutral';

  if (variant === 'outline' || variant === 'solid') {
    effectiveVariant = variant;
  }

  const baseClasses =
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide uppercase font-mono select-none';

  const statusConfig = {
    verified: {
      subtle: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
      outline: 'bg-transparent text-emerald-800 border border-emerald-600',
      solid: 'bg-emerald-700 text-white border border-transparent',
      dot: 'bg-emerald-600',
    },
    pending: {
      subtle: 'bg-amber-50 text-amber-800 border border-amber-200/80',
      outline: 'bg-transparent text-amber-800 border border-amber-600',
      solid: 'bg-amber-600 text-white border border-transparent',
      dot: 'bg-amber-600',
    },
    revoked: {
      subtle: 'bg-rose-50 text-rose-800 border border-rose-200/80',
      outline: 'bg-transparent text-rose-800 border border-rose-600',
      solid: 'bg-rose-700 text-white border border-transparent',
      dot: 'bg-rose-600',
    },
    neutral: {
      subtle: 'bg-slate-100 text-slate-700 border border-slate-200',
      outline: 'bg-transparent text-slate-700 border border-slate-300',
      solid: 'bg-slate-700 text-white border border-transparent',
      dot: 'bg-slate-400',
    },
    info: {
      subtle: 'bg-medical-50 text-medical-800 border border-medical-200/80',
      outline: 'bg-transparent text-medical-800 border border-medical-600',
      solid: 'bg-medical-700 text-white border border-transparent',
      dot: 'bg-medical-600',
    },
  };

  const currentStyles = statusConfig[effectiveStatus];

  return (
    <span
      className={`${baseClasses} ${currentStyles[effectiveVariant]} ${className}`}
      {...props}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentStyles.dot}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};
