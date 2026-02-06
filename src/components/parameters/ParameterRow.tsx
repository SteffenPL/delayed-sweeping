import { cn } from '@/lib/utils';
import { HelpButton } from './HelpButton';

interface HelpContent {
  title: string;
  description: string;
  formula?: string;
}

interface ParameterRowProps {
  label: string;
  help?: HelpContent;
  children: React.ReactNode;
  className?: string;
}

export function ParameterRow({ label, help, children, className }: ParameterRowProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-2', className)}>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm font-medium text-muted-foreground truncate">
          {label}
        </span>
        {help && (
          <HelpButton
            title={help.title}
            description={help.description}
            formula={help.formula}
          />
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
