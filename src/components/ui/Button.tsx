import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all rounded focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white border border-[var(--color-primary)] focus:ring-[var(--color-primary)]',
    secondary:
      'bg-[var(--color-secondary)] hover:bg-[#475569] text-white border border-[var(--color-secondary)] focus:ring-[var(--color-secondary)]',
    danger:
      'bg-[var(--color-danger)] hover:bg-[#dc2626] text-white border border-[var(--color-danger)] focus:ring-[var(--color-danger)]',
    ghost:
      'bg-transparent hover:bg-[var(--color-bg-alt)] text-[var(--color-text)] border border-[var(--color-border)] focus:ring-[var(--color-primary)]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
