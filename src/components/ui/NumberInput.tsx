import React from 'react';

export interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
}) => {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--color-text-muted)]">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 text-sm text-[var(--color-text)] bg-white border border-[var(--color-border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
      />
    </div>
  );
};
