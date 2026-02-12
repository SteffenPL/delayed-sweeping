import { useCallback } from 'react';
import { exportSVG } from '@/utils/svgExport';

export function ExportControls() {
  const handleDownloadSVG = useCallback(() => {
    const svg = document.querySelector('svg') as SVGSVGElement | null;
    if (svg) {
      exportSVG(svg);
    }
  }, []);

  return (
    <div>
      <button onClick={handleDownloadSVG} className="btn btn-secondary w-full">
        Download SVG
      </button>
    </div>
  );
}
