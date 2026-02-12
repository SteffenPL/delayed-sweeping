import { ColorControls } from '@/components/controls/ColorControls';
import { ExportControls } from '@/components/controls/ExportControls';

export function AppearanceTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-2">Colors</h3>
        <ColorControls />
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-2">Export</h3>
        <ExportControls />
      </div>
    </div>
  );
}
