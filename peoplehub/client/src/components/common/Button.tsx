import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all active:scale-[0.97]';
  
  const variants = {
    primary: 'bg-tg-button text-tg-buttonText hover:opacity-90',
    secondary: 'bg-tg-secondaryBg text-tg-text hover:opacity-80',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'bg-transparent text-tg-link hover:bg-tg-secondaryBg',
  };

  const sizes = {
    sm: 'text-sm px-3 py-1.5 gap-1.5',
    md: 'text-base px-4 py-2.5 gap-2',
    lg: 'text-lg px-6 py-3.5 gap-2.5',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        ${baseStyles} ${variants[variant]} ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50 pointer-events-none' : ''}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}
