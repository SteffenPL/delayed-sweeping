import { useSimulationStore } from '@/store';
import { IconButton } from '@/components/ui';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export function ZoomControls() {
  const { zoom, setZoom, resetViewport } = useSimulationStore();

  const handleZoomIn = () => {
    setZoom(zoom * 1.2);
  };

  const handleZoomOut = () => {
    setZoom(zoom / 1.2);
  };

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="absolute top-3 right-3 flex flex-col gap-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-[var(--color-border)] z-10">
      <IconButton
        icon={<ZoomIn className="w-4 h-4" />}
        onClick={handleZoomIn}
        disabled={zoom >= 4.0}
        size="sm"
        title="Zoom in (Ctrl/Cmd + wheel up)"
      />
      <div className="text-xs font-mono text-center text-[var(--color-text-muted)] px-1">
        {zoomPercent}%
      </div>
      <IconButton
        icon={<ZoomOut className="w-4 h-4" />}
        onClick={handleZoomOut}
        disabled={zoom <= 0.25}
        size="sm"
        title="Zoom out (Ctrl/Cmd + wheel down)"
      />
      <div className="h-px bg-[var(--color-border)] my-1" />
      <IconButton
        icon={<Maximize2 className="w-4 h-4" />}
        onClick={resetViewport}
        size="sm"
        title="Reset viewport"
      />
    </div>
  );
}
