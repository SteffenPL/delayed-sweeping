import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface DraggableNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  exponentialFactor?: number;
  label: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

export function DraggableNumberInput({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 0.1,
  precision = 3,
  exponentialFactor = 0.01,
  label,
  className,
  inputClassName,
  disabled = false,
}: DraggableNumberInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startValueRef = useRef(0);

  const clamp = useCallback(
    (val: number) => Math.min(max, Math.max(min, val)),
    [min, max]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      startValueRef.current = value;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current;
        // Exponential scaling: larger values change faster
        const scale = Math.abs(startValueRef.current) * exponentialFactor + step;
        const newValue = clamp(startValueRef.current + delta * scale);
        onChange(Number(newValue.toFixed(precision)));
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [value, onChange, clamp, step, precision, exponentialFactor, disabled]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      if (!isNaN(newValue)) {
        onChange(clamp(newValue));
      }
    },
    [onChange, clamp]
  );

  const handleInputBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      if (!isNaN(newValue)) {
        onChange(Number(clamp(newValue).toFixed(precision)));
      }
    },
    [onChange, clamp, precision]
  );

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'text-sm font-medium text-muted-foreground select-none min-w-[80px]',
          !disabled && 'cursor-ew-resize hover:text-foreground',
          isDragging && 'text-primary'
        )}
        onMouseDown={handleMouseDown}
      >
        {label}
      </span>
      <Input
        type="number"
        value={value}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn(
          'w-24 no-spinner',
          inputClassName
        )}
      />
    </div>
  );
}
