import { useRef, useCallback } from 'react';
import { useSimulationStore } from '@/store';
import { exportSVG } from '@/utils/svgExport';

export function ExportControls() {
  const timesInputRef = useRef<HTMLInputElement>(null);

  const {
    showPastConstraints,
    setShowPastConstraints,
    pastConstraintTimes,
    setPastConstraintTimes,
  } = useSimulationStore();

  const handleDownloadSVG = useCallback(() => {
    const svg = document.querySelector('svg') as SVGSVGElement | null;
    if (svg) {
      exportSVG(svg);
    }
  }, []);

  const handleTimesChange = useCallback(() => {
    const raw = timesInputRef.current?.value ?? '';
    const times = raw
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && n >= 0);
    setPastConstraintTimes(times);
  }, [setPastConstraintTimes]);

  return (
    <div className="space-y-3">
      <div>
        <button onClick={handleDownloadSVG} className="btn btn-secondary w-full">
          Download SVG
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showPastConstraints"
          checked={showPastConstraints}
          onChange={(e) => setShowPastConstraints(e.target.checked)}
        />
        <label htmlFor="showPastConstraints" className="text-sm">
          Show past constraints
        </label>
      </div>

      {showPastConstraints && (
        <div>
          <label className="text-sm text-muted-foreground">Times (comma-separated)</label>
          <input
            ref={timesInputRef}
            type="text"
            defaultValue={pastConstraintTimes.join(', ')}
            onBlur={handleTimesChange}
            onKeyDown={(e) => e.key === 'Enter' && handleTimesChange()}
            placeholder="0.5, 1.0, 2.0"
            className="w-full mt-1 px-2 py-1 border rounded text-sm"
          />
        </div>
      )}
    </div>
  );
}
