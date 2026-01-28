import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all rounded focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white border border-[var(--color-primary)] focus:ring-[var(--color-primary)]',
    ghost:
      'bg-transparent hover:bg-[var(--color-bg-alt)] text-[var(--color-text)] border border-transparent hover:border-[var(--color-border)] focus:ring-[var(--color-primary)]',
  };

  const sizes = {
    sm: 'w-7 h-7 text-sm',
    md: 'w-9 h-9 text-base',
    lg: 'w-11 h-11 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
};
