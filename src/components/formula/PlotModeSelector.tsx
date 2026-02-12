import type { PlotMode } from '@/formula';

interface PlotModeSelectorProps {
  value: PlotMode;
  onChange: (mode: PlotMode) => void;
}

export function PlotModeSelector({ value, onChange }: PlotModeSelectorProps) {
  return (
    <div className="plot-mode-selector">
      <button
        className={`btn btn-small ${value === 'instantaneous' ? 'btn-primary' : ''}`}
        onClick={() => onChange('instantaneous')}
      >
        Instantaneous
      </button>
      <button
        className={`btn btn-small ${value === 'parameter-study' ? 'btn-primary' : ''}`}
        onClick={() => onChange('parameter-study')}
      >
        Parameter Study
      </button>
    </div>
  );
}
