import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import katex from 'katex';

interface HelpButtonProps {
  title: string;
  description: string;
  formula?: string;
}

export function HelpButton({ title, description, formula }: HelpButtonProps) {
  const renderFormula = (latex: string) => {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: true,
      });
    } catch {
      return latex;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded-full p-0 text-muted-foreground hover:text-foreground"
        >
          <QuestionMarkCircledIcon className="h-4 w-4" />
          <span className="sr-only">Help</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
          {formula && (
            <div
              className="mt-2 p-2 bg-muted rounded-md overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: renderFormula(formula) }}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
