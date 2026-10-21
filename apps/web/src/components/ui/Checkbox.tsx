import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, id, className = '', disabled, checked, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={`inline-flex items-start gap-2.5 cursor-pointer select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            disabled={disabled}
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          <div className="w-4 h-4 rounded border border-slate-300 bg-white peer-checked:bg-navy-900 peer-checked:border-navy-900 peer-focus-visible:ring-2 peer-focus-visible:ring-medical-600 peer-focus-visible:ring-offset-2 transition-colors flex items-center justify-center shadow-clinical">
            <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 stroke-[3]" />
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-slate-800 leading-tight">{label}</span>
            )}
            {description && <span className="text-xs text-slate-500 mt-0.5">{description}</span>}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
