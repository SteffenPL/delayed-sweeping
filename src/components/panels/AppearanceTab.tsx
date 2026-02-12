import { ColorControls } from '@/components/controls/ColorControls';
import { ExportControls } from '@/components/controls/ExportControls';

export function AppearanceSection() {
  return (
    <details className="w-full">
      <summary className="cursor-pointer text-sm font-semibold select-none py-1">
        Appearance &amp; Export
      </summary>
      <div className="mt-2 space-y-4 pb-2">
        <ColorControls />
        <div className="border-t pt-3">
          <h4 className="text-sm font-medium mb-2">Export</h4>
          <ExportControls />
        </div>
      </div>
    </details>
  );
}
