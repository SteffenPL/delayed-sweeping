import React from 'react';

export interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  error,
  helperText,
}) => {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--color-text-muted)]">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-1.5 text-sm text-[var(--color-text)] bg-white border rounded focus:outline-none focus:ring-2 ${
          error
            ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
            : 'border-[var(--color-border)] focus:ring-[var(--color-primary)] focus:border-transparent'
        }`}
      />
      {error && (
        <span className="text-xs text-[var(--color-danger)]">{error}</span>
      )}
      {helperText && !error && (
        <span className="text-xs text-[var(--color-text-muted)]">{helperText}</span>
      )}
    </div>
  );
};
