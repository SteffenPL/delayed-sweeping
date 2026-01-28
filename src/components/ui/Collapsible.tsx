import React from 'react';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';

export interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  title,
  children,
  defaultOpen = true,
}) => {
  return (
    <Disclosure defaultOpen={defaultOpen}>
      {({ open }) => (
        <div className="panel">
          <DisclosureButton className="flex w-full items-center justify-between text-left focus:outline-none">
            <h3 className="panel-header m-0">{title}</h3>
            <ChevronDown
              className={`h-4 w-4 text-[var(--color-text-muted)] transition-transform ${
                open ? 'rotate-180' : ''
              }`}
            />
          </DisclosureButton>
          <DisclosurePanel className="mt-3 flex flex-col gap-3">
            {children}
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  );
};
