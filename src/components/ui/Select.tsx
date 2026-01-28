import React from 'react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

export const Select: React.FC<SelectProps> = ({ label, value, options, onChange }) => {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--color-text-muted)]">{label}</label>
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <ListboxButton className="relative w-full cursor-pointer rounded bg-white py-1.5 pl-3 pr-10 text-left border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm">
            <span className="block truncate text-[var(--color-text)]">
              {selectedOption?.label || 'Select...'}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
            </span>
          </ListboxButton>
          <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            {options.map((option) => (
              <ListboxOption
                key={option.value}
                value={option.value}
                className={({ focus }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    focus ? 'bg-[var(--color-bg-alt)] text-[var(--color-text)]' : 'text-[var(--color-text)]'
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                      {option.label}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-primary)]">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
    </div>
  );
};
