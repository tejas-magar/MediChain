import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  isInvalid?: boolean;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ isInvalid = false, options, children, className = '', id, disabled, ...props }, ref) => {
    const baseClasses =
      'w-full appearance-none bg-white text-slate-900 text-sm rounded-md border transition-colors duration-150 py-2 pl-3 pr-9 shadow-clinical focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed';

    const stateClasses = isInvalid
      ? 'border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500 text-red-950'
      : 'border-slate-300 hover:border-slate-400 focus-visible:border-medical-600 focus-visible:ring-medical-600';

    return (
      <div className="relative flex items-center w-full">
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={isInvalid}
          aria-describedby={isInvalid && id ? `${id}-error` : id ? `${id}-hint` : undefined}
          className={`${baseClasses} ${stateClasses} ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <span
          className="absolute right-3 text-slate-400 pointer-events-none flex items-center justify-center w-4 h-4"
          aria-hidden="true"
        >
          <ChevronDown className="w-4 h-4" />
        </span>
      </div>
    );
  }
);

Select.displayName = 'Select';
