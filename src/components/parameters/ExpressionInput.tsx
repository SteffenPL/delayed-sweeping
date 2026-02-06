import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HelpButton } from './HelpButton';

interface HelpContent {
  title: string;
  description: string;
  formula?: string;
}

interface ExpressionInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: HelpContent;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

export function ExpressionInput({
  label,
  value,
  onChange,
  help,
  placeholder = 'Enter expression...',
  rows = 2,
  className,
  disabled = false,
}: ExpressionInputProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-medium text-muted-foreground">
          {label}
        </Label>
        {help && (
          <HelpButton
            title={help.title}
            description={help.description}
            formula={help.formula}
          />
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="font-mono text-sm resize-none"
      />
    </div>
  );
}
