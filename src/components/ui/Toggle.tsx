import React from 'react';
import { Switch } from '@headlessui/react';

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange, description }) => {
  return (
    <Switch.Group>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Switch.Label className="text-xs font-medium text-[var(--color-text-muted)] cursor-pointer">
            {label}
          </Switch.Label>
          {description && (
            <span className="text-xs text-[var(--color-text-muted)] opacity-75">{description}</span>
          )}
        </div>
        <Switch
          checked={checked}
          onChange={onChange}
          className={`${
            checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2`}
        >
          <span
            className={`${
              checked ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
          />
        </Switch>
      </div>
    </Switch.Group>
  );
};
