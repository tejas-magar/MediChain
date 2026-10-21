import React from 'react';
import { FileSearch } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-slate-300 rounded-lg bg-slate-50/50 ${className}`}
    >
      <div
        className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mb-4 shadow-sm"
        aria-hidden="true"
      >
        {icon || <FileSearch className="w-6 h-6 text-slate-400" />}
      </div>
      <h4 className="text-sm font-semibold text-slate-800 tracking-tight">{title}</h4>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
