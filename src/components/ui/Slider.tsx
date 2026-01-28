import React from 'react';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  showValue = true,
  valueFormatter = (v) => v.toString(),
}) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-[var(--color-text-muted)]">
          {label}
        </label>
        {showValue && (
          <span className="text-xs font-mono text-[var(--color-text)]">
            {valueFormatter(value)}
          </span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
      />
    </div>
  );
};
