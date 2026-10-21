import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isInvalid?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ isInvalid = false, leftIcon, rightIcon, className = '', id, disabled, ...props }, ref) => {
    const baseClasses =
      'w-full bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-md border transition-colors duration-150 py-2 px-3 shadow-clinical focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed';

    const stateClasses = isInvalid
      ? 'border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500 text-red-950'
      : 'border-slate-300 hover:border-slate-400 focus-visible:border-medical-600 focus-visible:ring-medical-600';

    const paddingLeft = leftIcon ? 'pl-9' : '';
    const paddingRight = rightIcon ? 'pr-9' : '';

    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <span
            className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center w-4 h-4"
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={isInvalid}
          aria-describedby={isInvalid && id ? `${id}-error` : id ? `${id}-hint` : undefined}
          className={`${baseClasses} ${stateClasses} ${paddingLeft} ${paddingRight} ${className}`}
          {...props}
        />

        {rightIcon && (
          <span
            className="absolute right-3 text-slate-400 pointer-events-none flex items-center justify-center w-4 h-4"
            aria-hidden="true"
          >
            {rightIcon}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
