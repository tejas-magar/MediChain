import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styles: clear typography, restrained radius, high-contrast focus rings
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-medical-600 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none select-none';

    // Clinical variants
    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-navy-900 text-white hover:bg-navy-800 shadow-clinical active:bg-navy-950 border border-transparent',
      secondary:
        'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-clinical active:bg-slate-100',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      danger:
        'bg-red-700 text-white hover:bg-red-800 shadow-clinical active:bg-red-900 border border-transparent',
      link: 'bg-transparent text-medical-700 hover:underline underline-offset-4 p-0 h-auto font-normal',
    };

    // Standardized sizes
    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-3.5 py-2 gap-2 h-9',
      lg: 'text-base px-4 py-2.5 gap-2.5 h-11',
    };

    const finalSizeClass = variant === 'link' ? '' : sizeStyles[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${finalSizeClass} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current" aria-hidden="true" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
